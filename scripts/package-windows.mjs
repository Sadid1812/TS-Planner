import fs from 'node:fs/promises';
import path from 'node:path';
import {packager} from '@electron/packager';
const stage=path.resolve('desktop-stage');
await fs.mkdir(stage,{recursive:true});
await fs.cp('dist/client',path.join(stage,'dist/client'),{recursive:true});
await fs.cp('desktop',path.join(stage,'desktop'),{recursive:true});
await fs.writeFile(path.join(stage,'package.json'),JSON.stringify({name:'ts-planner',productName:'TS Planner',version:'0.1.0',main:'desktop/main.cjs'}));
const pkg=JSON.parse(await fs.readFile('node_modules/electron/package.json','utf8'));
const result=await packager({dir:stage,name:'TS Planner',platform:'win32',arch:'x64',electronVersion:pkg.version,out:'release',overwrite:true,asar:true,prune:false,download:{cacheRoot:path.resolve('../../work/electron-cache')}});
console.log(result.join('\n'));

