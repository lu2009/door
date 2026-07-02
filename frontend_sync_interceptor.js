(function () {
  var PROD_ORIGIN = "https://www.samrtdoor.com.cn";
  var PROD_PRINT_ORIGIN = "https://www.samrtdoor.com.cn:17521";

  function appOrigin() {
    return window.location.origin;
  }

  function printOrigin() {
    return window.location.protocol + "//" + window.location.hostname + ":17521";
  }

  function rewriteString(input) {
    if (typeof input !== "string") return input;
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
    ["getHtml", "getHtmlAsync", "getSimpleHtml", "getSimpleHtmlAsync", "print", "print2", "toPdf"].forEach(function (name) {
      var original = proto[name];
      if (typeof original !== "function") return;
      proto[name] = function () {
        return original.apply(this, rewriteArgs(arguments));
      };
    });
  }

  hookPrintTemplate();
  var printHookTimer = setInterval(function () {
    hookPrintTemplate();
    if (window.hiprint && window.hiprint.PrintTemplate) clearInterval(printHookTimer);
  }, 200);
})();
