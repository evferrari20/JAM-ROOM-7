/* Jam Room offline helper. Sound packs have the content hash in their name, so once cached they never change:
   serve them from the cache first. The page itself is fetched fresh when online and falls back to the cache offline. */
var PAGE='jr-page-@@BUILD@@',PACKS='jr-packs';
self.addEventListener('install',function(e){e.waitUntil(caches.open(PAGE).then(function(c){return c.addAll(['./','index.html','manifest.webmanifest','icon.svg','vendor/lame.min.js']);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf('jr-page-')===0&&k!==PAGE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){
  var u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  if(/\/s\/[^\/]+\.bin$/.test(u.pathname)){
    e.respondWith(caches.open(PACKS).then(function(c){return c.match(e.request).then(function(hit){return hit||fetch(e.request).then(function(r){if(r.ok)c.put(e.request,r.clone());return r;});});}));
    return;
  }
  e.respondWith(fetch(e.request).then(function(r){if(r.ok){var cp=r.clone();caches.open(PAGE).then(function(c){c.put(e.request,cp);});}return r;}).catch(function(){return caches.match(e.request,{ignoreSearch:true}).then(function(h){return h||caches.match('index.html');});}));
});
