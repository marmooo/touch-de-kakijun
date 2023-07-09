var CACHE_NAME = "2023-07-09 16:00";
var urlsToCache = [
  "/touch-de-kakijun/",
  "/touch-de-kakijun/index.js",
  "/touch-de-kakijun/mp3/correct1.mp3",
  "/touch-de-kakijun/mp3/correct3.mp3",
  "/touch-de-kakijun/mp3/incorrect1.mp3",
  "/touch-de-kakijun/mp3/end.mp3",
  "/touch-de-kakijun/favicon/favicon.svg",
  "/kanjivg/09806.svg",
  "/kanjivg/06f22.svg",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(urlsToCache);
      }),
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }),
  );
});

self.addEventListener("activate", function (event) {
  var cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});
