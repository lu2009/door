import os
import re
import shutil
import socket
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


HOST = "www.samrtdoor.com.cn"
HOST_IP = "42.193.116.211"
BASE = f"https://{HOST}"
ASSET_ROOTS = ("js/", "css/", "png/", "img/", "images/", "assets/", "fonts/")
INTERCEPTOR_PATH = "js/local-request-interceptor.js"
PROD_PRINT_LITERAL = '"https://www.samrtdoor.com.cn:17521"'
LOCAL_PRINT_EXPR = 'window.location.protocol+"//"+window.location.hostname+":17521"'


class FrontendSyncError(RuntimeError):
    pass


class _HostResolver:
    def __enter__(self):
        self._orig = socket.getaddrinfo

        def getaddrinfo(host, port, *args, **kwargs):
            if host == HOST:
                return self._orig(HOST_IP, port, *args, **kwargs)
            return self._orig(host, port, *args, **kwargs)

        socket.getaddrinfo = getaddrinfo
        return self

    def __exit__(self, exc_type, exc, tb):
        socket.getaddrinfo = self._orig


def _quote_url(url):
    parsed = urllib.parse.urlsplit(url)
    path = urllib.parse.quote(parsed.path, safe="/%")
    query = urllib.parse.quote(parsed.query, safe="=&?/%:+,")
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, path, query, parsed.fragment))


def _request(url):
    req = urllib.request.Request(
        _quote_url(url),
        headers={
            "User-Agent": "Mozilla/5.0 SmartDoorFrontendSync/1.0",
            "Host": HOST,
            "Accept": "text/html,application/javascript,text/css,image/*,font/*,*/*",
        },
        method="GET",
    )
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=25, context=context) as resp:
            raw = resp.read()
            return {
                "ok": 200 <= resp.status < 300,
                "status": resp.status,
                "url": resp.geturl(),
                "content_type": resp.headers.get("Content-Type", ""),
                "raw": raw,
                "text": raw.decode("utf-8", "replace"),
            }
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        return {
            "ok": False,
            "status": exc.code,
            "url": url,
            "content_type": exc.headers.get("Content-Type", ""),
            "raw": raw,
            "text": raw.decode("utf-8", "replace"),
            "error": str(exc),
        }
    except Exception as exc:
        return {
            "ok": False,
            "status": 0,
            "url": url,
            "content_type": "",
            "raw": b"",
            "text": "",
            "error": str(exc),
        }


def _production_asset_url(raw, base_url=BASE + "/", asset_roots=()):
    if raw.startswith("//"):
        url = "https:" + raw
    elif raw.startswith("/"):
        url = urllib.parse.urljoin(BASE + "/", raw)
    elif raw.startswith(asset_roots):
        url = urllib.parse.urljoin(BASE + "/", raw)
    elif raw.startswith("http"):
        url = raw
    else:
        url = urllib.parse.urljoin(base_url, raw)
    return url if urllib.parse.urlparse(url).netloc == HOST else None


def _asset_urls(index_html):
    urls = set(re.findall(r'(?:src|href)="([^"]+)"', index_html or ""))
    return [
        url
        for url in (_production_asset_url(raw) for raw in sorted(urls) if not raw.startswith("data:"))
        if url
    ]


def _referenced_asset_urls(text, base_url):
    refs = set()
    for pattern in (
        r'["\']((?:\./)?(?:js|css|png|img|images|assets|fonts)/[^"\'`\\\s)]+)["\']',
        r'["\'](/(?:js|css|png|img|images|assets|fonts)/[^"\'`\\\s)]+)["\']',
        r'url\(([^)]+)\)',
    ):
        for raw in re.findall(pattern, text or ""):
            cleaned = raw.strip().strip('"\'').lstrip("\\\"'")
            if (
                not cleaned
                or cleaned.startswith("data:")
                or any(token in cleaned for token in ("${", "+", "(", ")", "{", "}", "<", ">"))
            ):
                continue
            url = _production_asset_url(cleaned, base_url=base_url, asset_roots=ASSET_ROOTS)
            if url:
                refs.add(url)
    return sorted(refs)


def _safe_asset_path(url):
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.strip("/") or "index.html"
    parts = [part for part in path.split("/") if part and part not in (".", "..")]
    return Path(*parts) if parts else Path("index.html")


def _localize_asset(raw, path, content_type):
    lower_path = (path or "").lower()
    if not (
        lower_path.endswith(".js")
        or "javascript" in (content_type or "").lower()
    ):
        return raw
    text = raw.decode("utf-8", "replace")
    if PROD_PRINT_LITERAL not in text:
        return raw
    return text.replace(PROD_PRINT_LITERAL, LOCAL_PRINT_EXPR).encode("utf-8")


def _interceptor_script():
    return Path(__file__).with_name("frontend_sync_interceptor.js").read_text(encoding="utf-8")


def _inject_interceptor(index_html):
    tag = f'<script src="/{INTERCEPTOR_PATH}"></script>'
    if INTERCEPTOR_PATH in index_html:
        return index_html
    match = re.search(r'<script\b[^>]*\btype=["\']module["\'][^>]*>', index_html or "", flags=re.I)
    if match:
        return index_html[:match.start()] + tag + index_html[match.start():]
    if "</head>" in index_html:
        return index_html.replace("</head>", tag + "</head>", 1)
    return tag + (index_html or "")


def _assert_safe_target(target):
    target = Path(target).resolve()
    if not str(target) or str(target) in ("/", "\\"):
        raise FrontendSyncError(f"unsafe frontend target: {target}")
    if len(target.parts) < 3:
        raise FrontendSyncError(f"unsafe frontend target: {target}")
    target.mkdir(parents=True, exist_ok=True)
    return target


def _clear_target(target, keep):
    for child in target.iterdir():
        if child.resolve() == keep.resolve():
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


def _move_tree_contents(src, dest):
    for child in src.iterdir():
        shutil.move(str(child), str(dest / child.name))


def _download_frontend_assets(tmp):
    downloaded = []
    failed = []

    index = _request(BASE + "/")
    if not index.get("ok") or not index.get("raw"):
        raise FrontendSyncError(f"production index download failed: {index.get('status')} {index.get('error') or ''}".strip())
    (tmp / "index.html").write_text(_inject_interceptor(index.get("text") or ""), encoding="utf-8")

    queue = _asset_urls(index.get("text") or "")
    seen = set()
    while queue:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        resp = _request(url)
        item = {
            "path": urllib.parse.urlparse(url).path,
            "status": resp.get("status"),
            "length": len(resp.get("raw") or b""),
        }
        if not resp.get("ok"):
            failed.append(item)
            continue
        target_path = tmp / _safe_asset_path(url)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        raw = _localize_asset(resp.get("raw") or b"", item["path"], resp.get("content_type") or "")
        target_path.write_bytes(raw)
        downloaded.append(item)

        path = urllib.parse.urlparse(url).path.lower()
        content_type = resp.get("content_type") or ""
        if (
            path.endswith((".js", ".css", ".html"))
            or "javascript" in content_type
            or "text/css" in content_type
            or "text/html" in content_type
        ):
            for ref in _referenced_asset_urls(resp.get("text") or "", url):
                if ref not in seen and ref not in queue:
                    queue.append(ref)

    return downloaded, failed


def _finalize_frontend_sync(target, tmp, downloaded, failed):
    interceptor = tmp / INTERCEPTOR_PATH
    interceptor.parent.mkdir(parents=True, exist_ok=True)
    interceptor.write_text(_interceptor_script(), encoding="utf-8")

    _clear_target(target, tmp)
    _move_tree_contents(tmp, target)
    shutil.rmtree(tmp, ignore_errors=True)
    return {
        "target": str(target),
        "asset_count": len(downloaded),
        "failed_count": len(failed),
        "failed_assets": failed[:20],
        "interceptor": f"/{INTERCEPTOR_PATH}",
    }


class FrontendSyncService:
    @staticmethod
    def sync(target_dir):
        target = _assert_safe_target(target_dir)
        tmp = target / f".frontend-sync-tmp-{int(time.time())}"
        if tmp.exists():
            shutil.rmtree(tmp)
        tmp.mkdir(parents=True)

        try:
            with _HostResolver():
                downloaded, failed = _download_frontend_assets(tmp)
            return _finalize_frontend_sync(target, tmp, downloaded, failed)
        except Exception:
            shutil.rmtree(tmp, ignore_errors=True)
            raise
