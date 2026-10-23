/*
 * Service worker do Simula Alcides. Só existe para o site poder ser instalado como app e para
 * mostrar um aviso amigável quando abrir sem internet. Não guarda páginas nem dados: tudo vem
 * sempre da rede, então uma versão nova do site aparece na hora.
 */
const CACHE = "simula-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE, "/icons/icone-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      // Começa a buscar a página enquanto o service worker acorda (não atrasa a abertura).
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (evento) => {
  // Só a abertura de páginas passa por aqui; imagens, scripts e o Supabase vão direto à rede.
  if (evento.request.mode !== "navigate") return;
  evento.respondWith(
    (async () => {
      try {
        const adiantada = await evento.preloadResponse;
        if (adiantada) return adiantada;
        return await fetch(evento.request);
      } catch {
        return (await caches.match(OFFLINE)) ?? Response.error();
      }
    })(),
  );
});
