import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
// Run after tests, build, and build-webview.mjs. Only named source files ship.
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const source=path.resolve('release','source-'+version);
await fs.mkdir(source,{recursive:true});
const files=['.github','.openai','desktop','public','scripts','src','supabase','tests','worker','.env.example','.gitignore','.npmrc','AGENTS.md','BUILD-STATUS.md','PRIORITY-A.md','README.md',`RELEASE-${version}.md`,'index.html','package.json','package-lock.json','vite.config.mjs'];
for(const file of files)await fs.cp(file,path.join(source,file),{recursive:true});
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const archives=[['Windows',path.resolve('release','TS-Planner-Windows-'+version)],['web',path.resolve('dist/client')],['source',source]];
for(const [kind,folder] of archives){
 const target=path.resolve('..',`TS-Planner-${kind}-${version}.zip`);
 const command=`Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory(${quote(folder)},${quote(target)},[System.IO.Compression.CompressionLevel]::Optimal,${kind==='Windows'?'$true':'$false'})`;
 const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{stdio:'inherit',windowsHide:true});
 if(result.status!==0)throw Error('Archive failed: '+kind);console.log(target);
}
