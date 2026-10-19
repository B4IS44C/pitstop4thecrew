self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 event.waitUntil(self.registration.showNotification(data.title||'PitStop · Nueva venta',{body:data.body||'Hay una nueva venta para revisar en el panel.',icon:'./icon-192.png',badge:'./icon-192.png',tag:data.tag||'pitstop-sale',data:{url:self.registration.scope},renotify:false}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const url=self.registration.scope;for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))if(client.url.startsWith(url)){await client.focus();return;}await self.clients.openWindow(url);})());});
