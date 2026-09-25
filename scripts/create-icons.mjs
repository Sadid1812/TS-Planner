import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Sprout} from 'lucide-react';
import fs from 'node:fs/promises';
import sharp from 'sharp';
const svg=renderToStaticMarkup(createElement(Sprout,{size:512,color:'#f7b453',strokeWidth:1.5}));
for(const size of [192,512])await sharp(Buffer.from(svg)).resize(Math.round(size*.65),Math.round(size*.65)).extend({top:Math.floor(size*.175),bottom:size-Math.round(size*.65)-Math.floor(size*.175),left:Math.floor(size*.175),right:size-Math.round(size*.65)-Math.floor(size*.175),background:'#111619'}).flatten({background:'#111619'}).png().toFile('public/icon-'+size+'.png');
const p='public/manifest.webmanifest';const m=JSON.parse(await fs.readFile(p,'utf8'));m.icons=[192,512].map(n=>({src:'./icon-'+n+'.png',sizes:n+'x'+n,type:'image/png',purpose:'any'}));await fs.writeFile(p,JSON.stringify(m));


