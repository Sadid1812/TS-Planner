import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root='dist/client';
async function walk(dir){let all=[];for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())all.push(...await walk(p));else if(f.name!=='sw.js')all.push(p);}return all;}
const files=await walk(root);
const paths=files.map(f=>'./'+path.relative(root,f).replaceAll('\\','/'));
const hash=crypto.createHash('sha256');for(const f of files)hash.update(await fs.readFile(f));
await fs.writeFile(path.join(root,'sw.js'),`const CACHE='ts-planner-${hash.digest('hex').slice(0,12)}';
const FILES=${JSON.stringify(paths)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('ts-planner-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(new URL('./index.html',self.registration.scope))));return;}
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});`);
console.log('Offline cache prepared for '+files.length+' files');
