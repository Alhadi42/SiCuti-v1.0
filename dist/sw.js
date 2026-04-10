/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-137dedbd'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "index.html",
    "revision": "dd8c8939083e88635d4019984f1c883c"
  }, {
    "url": "favicon.ico",
    "revision": "172651a7878d59ae3406049f91578d49"
  }, {
    "url": "icons/icon.svg",
    "revision": "1f22e8f8c5aa89b72a58b6201fb730ae"
  }, {
    "url": "icons/icon-96x96.svg",
    "revision": "c91057ccabfe27797310b3346ef6b1f3"
  }, {
    "url": "icons/icon-72x72.svg",
    "revision": "efb1a5e8a2fe5099384f6b29a0d7ac3c"
  }, {
    "url": "icons/icon-512x512.svg",
    "revision": "f04865607c14ddd58fe20f2adcceb3f8"
  }, {
    "url": "icons/icon-384x384.svg",
    "revision": "e6625f39238cd8d0779b918486ee8659"
  }, {
    "url": "icons/icon-192x192.svg",
    "revision": "44be6b0180534a0d96588fe9a58dd2d1"
  }, {
    "url": "icons/icon-152x152.svg",
    "revision": "b31a484c3b693a1a24b20d02a96fd85d"
  }, {
    "url": "icons/icon-144x144.svg",
    "revision": "dbd7b071343bff61b9d2475865f50c6b"
  }, {
    "url": "icons/icon-128x128.svg",
    "revision": "84169a20bce4adca88e44c7735e4b019"
  }, {
    "url": "assets/resizeObserverTest-1a13e104.js",
    "revision": null
  }, {
    "url": "assets/purify.es-31816194.js",
    "revision": null
  }, {
    "url": "assets/index.es-31142bda.js",
    "revision": null
  }, {
    "url": "assets/index-f7714462.js",
    "revision": null
  }, {
    "url": "assets/index-5e9a2472.css",
    "revision": null
  }, {
    "url": "assets/immediateConsoleTest-fbcf1beb.js",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-e0a7d97b.js",
    "revision": null
  }, {
    "url": "assets/errorTestUtility-4e29f7e9.js",
    "revision": null
  }, {
    "url": "assets/consoleTest-dc914dc3.js",
    "revision": null
  }, {
    "url": "favicon.ico",
    "revision": "172651a7878d59ae3406049f91578d49"
  }, {
    "url": "icons/icon-128x128.svg",
    "revision": "84169a20bce4adca88e44c7735e4b019"
  }, {
    "url": "icons/icon-144x144.svg",
    "revision": "dbd7b071343bff61b9d2475865f50c6b"
  }, {
    "url": "icons/icon-152x152.svg",
    "revision": "b31a484c3b693a1a24b20d02a96fd85d"
  }, {
    "url": "icons/icon-192x192.svg",
    "revision": "44be6b0180534a0d96588fe9a58dd2d1"
  }, {
    "url": "icons/icon-384x384.svg",
    "revision": "e6625f39238cd8d0779b918486ee8659"
  }, {
    "url": "icons/icon-512x512.svg",
    "revision": "f04865607c14ddd58fe20f2adcceb3f8"
  }, {
    "url": "icons/icon-72x72.svg",
    "revision": "efb1a5e8a2fe5099384f6b29a0d7ac3c"
  }, {
    "url": "icons/icon-96x96.svg",
    "revision": "c91057ccabfe27797310b3346ef6b1f3"
  }, {
    "url": "icons/icon.svg",
    "revision": "1f22e8f8c5aa89b72a58b6201fb730ae"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/.*\.supabase\.co\/.*/i, new workbox.NetworkFirst({
    "cacheName": "supabase-api-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 300
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/images\.unsplash\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "images-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 604800
    })]
  }), 'GET');

}));
