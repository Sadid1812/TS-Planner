import fs from 'node:fs';
import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
const es=JSON.parse(fs.readFileSync('src/locales/es.json','utf8')),missing=new Set();
for(const file of fs.readdirSync('src').filter(f=>f.endsWith('.jsx'))){const ast=parse(fs.readFileSync('src/'+file,'utf8'),{sourceType:'module',plugins:['jsx']});traverseModule.default(ast,{CallExpression(p){if(p.node.callee.name==='tx'&&p.node.arguments[0]?.type==='StringLiteral'){const key=p.node.arguments[0].value.trim();if(!es[key]&&!['TS Planner','Español'].includes(key))missing.add(key);}}});}
console.log([...missing].join('\n'));
if(missing.size)process.exitCode=1;
