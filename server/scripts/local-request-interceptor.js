(function () {
  var PROD_ORIGIN = "https://www.samrtdoor.com.cn";
  var PROD_PRINT_ORIGIN = "https://www.samrtdoor.com.cn:17521";
  var LOCAL_PRINT_PREFIXES = [
    "wss://localhost:17521",
    "ws://localhost:17521",
    "https://localhost:17521",
    "http://localhost:17521",
    "wss://127.0.0.1:17521",
    "ws://127.0.0.1:17521",
    "https://127.0.0.1:17521",
    "http://127.0.0.1:17521",
    "//localhost:17521",
    "//127.0.0.1:17521"
  ];

  function appOrigin() {
    return window.location.origin;
  }

  function printOrigin() {
    return window.location.protocol + "//" + window.location.hostname + ":17521";
  }

  function rewriteOriginPrefix(input, fromOrigin, toOrigin) {
    if (input.indexOf(fromOrigin) !== 0) return null;
    return toOrigin + input.slice(fromOrigin.length);
  }

  function rewriteString(input) {
    if (typeof input !== "string") return input;
    for (var i = 0; i < LOCAL_PRINT_PREFIXES.length; i += 1) {
      var prefix = LOCAL_PRINT_PREFIXES[i];
      var target = prefix.indexOf("ws") === 0
        ? printOrigin().replace(/^http/, "ws")
        : printOrigin();
      var rewrittenLocal = rewriteOriginPrefix(input, prefix, target);
      if (rewrittenLocal) return rewrittenLocal;
    }
    if (input.indexOf("wss://www.samrtdoor.com.cn:17521") === 0) {
      return printOrigin().replace(/^http/, "ws") + input.slice("wss://www.samrtdoor.com.cn:17521".length);
    }
    if (input.indexOf("ws://www.samrtdoor.com.cn:17521") === 0) {
      return printOrigin().replace(/^http/, "ws") + input.slice("ws://www.samrtdoor.com.cn:17521".length);
    }
    if (input.indexOf(PROD_PRINT_ORIGIN) === 0) {
      return printOrigin() + input.slice(PROD_PRINT_ORIGIN.length);
    }
    if (input.indexOf(PROD_ORIGIN) === 0) {
      return appOrigin() + input.slice(PROD_ORIGIN.length);
    }
    if (input.indexOf("//www.samrtdoor.com.cn:17521") === 0) {
      return printOrigin() + input.slice("//www.samrtdoor.com.cn:17521".length);
    }
    if (input.indexOf("//www.samrtdoor.com.cn") === 0) {
      return appOrigin() + input.slice("//www.samrtdoor.com.cn".length);
    }
    return input;
  }

  function rewriteInput(input) {
    if (typeof input === "string") return rewriteString(input);
    if (input instanceof URL) return new URL(rewriteString(input.href));
    if (input instanceof Request) return new Request(rewriteString(input.url), input);
    return input;
  }

  function rewriteSocketUrl(input) {
    if (typeof input === "string") return rewriteString(input);
    if (input && typeof input.href === "string") return rewriteString(input.href);
    return input;
  }

  var ACTIVE_IDENTITY_KEY = "smartdoor_active_identity";
  var TENANT_LOCAL_STORAGE_KEYS = [
    "smartdoor_last_order",
    "openDirectionCustomNames",
    "newFinanceSystem",
    "try_time"
  ];

  function isLoginUrl(input) {
    var url = typeof input === "string" ? input : input && input.url;
    if (!url) return false;
    try {
      var parsed = new URL(url, window.location.href);
      return parsed.searchParams.get("param1") === "login";
    } catch (error) {
      return String(url).indexOf("param1=login") !== -1;
    }
  }

  function identityFromLoginResponse(payload) {
    var row = Array.isArray(payload) ? payload[0] : payload;
    if (!row || row.statu !== 1 || !row.userinfo) return "";
    return [
      row.userinfo.name || "",
      row.userinfo.ds || "",
      row.userinfo.registrant || ""
    ].join("|");
  }

  function clearStore(db, storeName) {
    return new Promise(function (resolve) {
      try {
        if (!db.objectStoreNames.contains(storeName)) return resolve();
        var tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      } catch (error) {
        resolve();
      }
    });
  }

  function clearTenantIndexedDbCaches() {
    if (!window.indexedDB) return;
    try {
      var req = indexedDB.open("ImageDatabase");
      req.onsuccess = function () {
        var db = req.result;
        Promise.all([
          clearStore(db, "images"),
          clearStore(db, "options")
        ]).finally(function () {
          try { db.close(); } catch (error) {}
        });
      };
    } catch (error) {}
  }

  function clearTenantBrowserCaches(nextIdentity) {
    try {
      TENANT_LOCAL_STORAGE_KEYS.forEach(function (key) {
        localStorage.removeItem(key);
      });
      sessionStorage.clear();
      clearTenantIndexedDbCaches();
      localStorage.setItem(ACTIVE_IDENTITY_KEY, nextIdentity);
    } catch (error) {}
  }

  function handleLoginResponse(input, response) {
    if (!isLoginUrl(input)) return;
    try {
      response.clone().json().then(function (payload) {
        var nextIdentity = identityFromLoginResponse(payload);
        if (!nextIdentity) return;
        var previousIdentity = localStorage.getItem(ACTIVE_IDENTITY_KEY) || "";
        if (previousIdentity && previousIdentity !== nextIdentity) {
          clearTenantBrowserCaches(nextIdentity);
        } else {
          localStorage.setItem(ACTIVE_IDENTITY_KEY, nextIdentity);
        }
      }).catch(function () {});
    } catch (error) {}
  }

  function rewriteValue(value, seen) {
    if (typeof value === "string") return rewriteString(value);
    if (!value || typeof value !== "object") return value;
    if (seen.has(value)) return value;
    seen.add(value);
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) value[i] = rewriteValue(value[i], seen);
      return value;
    }
    Object.keys(value).forEach(function (key) {
      value[key] = rewriteValue(value[key], seen);
    });
    return value;
  }

  function rewriteArgs(args) {
    return Array.prototype.map.call(args, function (arg) {
      return rewriteValue(arg, new WeakSet());
    });
  }

  function isSuccessfulPrintProgressResponse(input, response) {
    if (!response || response.status !== 200) return false;
    try {
      var url = typeof input === "string" ? input : input && input.url;
      if (!url) return false;
      var parsed = new URL(url, window.location.href);
      if (parsed.searchParams.get("param1") !== "updataProgress") return false;
      var action = parsed.searchParams.get("param3") || "";
      if (!action || /^工序\d+$/.test(action)) return false;
      return true;
    } catch (error) {
      return false;
    }
  }

  function refreshHomeTableAfterPrintProgress() {
    if (window.location.pathname !== "/home") return;
    window.setTimeout(function () {
      var buttons = Array.prototype.slice.call(document.querySelectorAll("button"));
      var refreshButton = buttons.find(function (button) {
        return (button.textContent || "").trim() === "刷新";
      });
      if (refreshButton) refreshButton.click();
    }, 300);
  }

  var originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function (input, init) {
      var rewrittenInput = rewriteInput(input);
      return originalFetch.call(this, rewrittenInput, init).then(function (response) {
        handleLoginResponse(rewrittenInput, response);
        if (isSuccessfulPrintProgressResponse(rewrittenInput, response)) {
          refreshHomeTableAfterPrintProgress();
        }
        return response;
      });
    };
  }

  var originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    arguments[1] = rewriteString(url);
    return originalOpen.apply(this, arguments);
  };

  var OriginalWebSocket = window.WebSocket;
  if (OriginalWebSocket) {
    window.WebSocket = function (url, protocols) {
      var rewrittenUrl = rewriteSocketUrl(url);
      return protocols === undefined
        ? new OriginalWebSocket(rewrittenUrl)
        : new OriginalWebSocket(rewrittenUrl, protocols);
    };
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    Object.keys(OriginalWebSocket).forEach(function (key) {
      try { window.WebSocket[key] = OriginalWebSocket[key]; } catch (error) {}
    });
  }

  function hookSocketIoFactory() {
    var io = window.io || window.ioClient || (window.socket && window.socket.io);
    if (!io || io.__smartdoorLocalSocketHooked) return;
    var originalIo = io;
    var wrapped = function (url, options) {
      return originalIo.call(this, rewriteSocketUrl(url), options);
    };
    Object.keys(originalIo).forEach(function (key) {
      try { wrapped[key] = originalIo[key]; } catch (error) {}
    });
    wrapped.__smartdoorLocalSocketHooked = true;
    window.io = wrapped;
    if (window.ioClient === originalIo) window.ioClient = wrapped;
  }

  hookSocketIoFactory();
  var socketHookTimer = setInterval(function () {
    hookSocketIoFactory();
    if (window.io && window.io.__smartdoorLocalSocketHooked) clearInterval(socketHookTimer);
  }, 200);

  function hookPrintTemplate() {
    var proto = window.hiprint && window.hiprint.PrintTemplate && window.hiprint.PrintTemplate.prototype;
    if (!proto || proto.__smartdoorLocalQrHooked) return;
    proto.__smartdoorLocalQrHooked = true;
    ["getHtml", "getHtmlAsync", "getSimpleHtml", "getSimpleHtmlAsync"].forEach(function (name) {
      var original = proto[name];
      if (typeof original !== "function") return;
      proto[name] = function () {
        var args = rewriteArgs(arguments);
        var result = original.apply(this, args);
        if (typeof result === "string") return swapCachedImages(result);
        if (result && typeof result.then === "function") {
          return result.then(function (html) { return swapCachedImages(html); });
        }
        return result;
      };
    });

    ["print", "print2", "toPdf"].forEach(function (name) {
      var original = proto[name];
      if (typeof original !== "function") return;
      proto[name] = function () {
        return original.apply(this, rewriteArgs(arguments));
      };
    });
  }

  function swapCachedImages(html) {
    if (typeof html !== "string" || !html) return html;
    var hasCache = false;
    for (var _k in memoryCache) { hasCache = true; break; }
    if (!hasCache) return html;

    return html.replace(/src="\/api\/v1\/files\/([^"?]+)(\?[^"]*)?"/g, function (match, id) {
      var dataUri = memoryCache[id];
      return dataUri ? 'src="' + dataUri + '"' : match;
    });
  }

  hookPrintTemplate();
  var printHookTimer = setInterval(function () {
    hookPrintTemplate();
    if (window.hiprint && window.hiprint.PrintTemplate) clearInterval(printHookTimer);
  }, 200);

  var IMAGE_CACHE_DB_NAME = "ImageCache";
  var IMAGE_CACHE_STORE = "blobs";
  var IMAGE_CACHE_VERSION = 1;
  var memoryCache = {};

  function openImageCacheDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("indexedDB unavailable"));
      var req = indexedDB.open(IMAGE_CACHE_DB_NAME, IMAGE_CACHE_VERSION);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(IMAGE_CACHE_STORE)) {
          req.result.createObjectStore(IMAGE_CACHE_STORE);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function cacheImageToDb(id, dataUri) {
    return openImageCacheDb().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(IMAGE_CACHE_STORE, "readwrite");
          tx.objectStore(IMAGE_CACHE_STORE).put(dataUri, id);
          tx.oncomplete = function () { resolve(); };
          tx.onerror = function () { resolve(); };
        } catch (e) { resolve(); }
      }).finally(function () { try { db.close(); } catch (e) {} });
    });
  }

  function getImageFromDb(id) {
    return openImageCacheDb().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(IMAGE_CACHE_STORE, "readonly");
          var req = tx.objectStore(IMAGE_CACHE_STORE).get(id);
          req.onsuccess = function () { resolve(req.result || null); };
          req.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      }).finally(function () { try { db.close(); } catch (e) {} });
    });
  }

  window.__smartdoor_preloadImages = function (ids, ds) {
    if (!ids || !ids.length) return Promise.resolve(0);

    var missing = [];
    for (var i = 0; i < ids.length; i++) {
      if (!memoryCache[ids[i]]) missing.push(ids[i]);
    }
    if (!missing.length) return Promise.resolve(ids.length);

    return Promise.all(missing.map(function (id) {
      return getImageFromDb(id).then(function (dataUri) {
        if (dataUri) memoryCache[id] = dataUri;
        return dataUri ? null : id;
      });
    })).then(function (results) {
      var stillMissing = results.filter(Boolean);
      if (!stillMissing.length) return ids.length;

      var origin = appOrigin();
      return fetch(origin + "/api/v1/files/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: stillMissing, ds: ds || "smartdoor" }),
      }).then(function (res) {
        if (!res.ok) throw new Error("batch fetch failed: " + res.status);
        return res.json();
      }).then(function (payload) {
        var images = (payload && payload.data && payload.data.images) || {};
        var cached = 0;
        var promises = [];
        for (var id in images) {
          if (!images.hasOwnProperty(id)) continue;
          var img = images[id];
          if (!img) continue;
          var dataUri = "data:" + (img.contentType || "image/png") + ";base64," + img.base64;
          memoryCache[id] = dataUri;
          promises.push(cacheImageToDb(id, dataUri));
          cached++;
        }
        return Promise.all(promises).then(function () { return cached; });
      });
    });
  };

  window.__smartdoor_getCachedImageSrc = function (id) {
    return memoryCache[id] || null;
  };

  window.__smartdoor_clearImageCache = function () {
    memoryCache = {};
    return openImageCacheDb().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(IMAGE_CACHE_STORE, "readwrite");
          tx.objectStore(IMAGE_CACHE_STORE).clear();
          tx.oncomplete = function () { resolve(); };
          tx.onerror = function () { resolve(); };
        } catch (e) { resolve(); }
      }).finally(function () { try { db.close(); } catch (e) {} });
    });
  };
})();
