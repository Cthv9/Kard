// Service worker "di congedo": sostituisce quello della vecchia PWA allo
// stesso indirizzo, svuota le cache, si disinstalla e ricarica le pagine
// aperte, così chi aveva la PWA installata vede la pagina di dismissione.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
    await self.registration.unregister()
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach((c) => c.navigate(c.url))
  })())
})
