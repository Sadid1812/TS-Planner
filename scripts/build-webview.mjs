import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const sdk=process.argv[2];
if(!sdk)throw Error('Pass the extracted Microsoft.Web.WebView2 1.0.4191.47 NuGet package directory.');
const output=path.resolve(process.argv[3]||'release/TS-Planner-Windows');
if(!output.startsWith(path.resolve('release')+path.sep))throw Error('Output must stay inside the release directory.');
await fs.mkdir(output,{recursive:true});
for(const file of ['lib/net462/Microsoft.Web.WebView2.Core.dll','lib/net462/Microsoft.Web.WebView2.WinForms.dll','runtimes/win-x64/native/WebView2Loader.dll'])await fs.copyFile(path.join(sdk,file),path.join(output,path.basename(file)));
await fs.cp('dist/client',path.join(output,'web'),{recursive:true});
await fs.copyFile('public/planner.ico',path.join(output,'planner.ico'));
await fs.copyFile('desktop/windows/Planner.exe.config',path.join(output,'TS Planner.exe.config'));
await fs.copyFile('desktop/windows/README.txt',path.join(output,'README.txt'));
await fs.copyFile(path.join(sdk,'LICENSE.txt'),path.join(output,'WebView2-LICENSE.txt'));
await fs.copyFile(path.join(sdk,'NOTICE.txt'),path.join(output,'WebView2-NOTICE.txt'));
const compiler=path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
const result=spawnSync(compiler,['/nologo','/target:winexe','/platform:x64','/optimize+','/out:'+path.join(output,'TS Planner.exe'),'/win32icon:'+path.join(output,'planner.ico'),'/reference:System.dll','/reference:System.Core.dll','/reference:System.Web.dll','/reference:System.Web.Extensions.dll','/reference:System.Security.dll','/reference:Microsoft.CSharp.dll','/reference:System.Drawing.dll','/reference:System.Windows.Forms.dll','/reference:'+path.join(output,'Microsoft.Web.WebView2.Core.dll'),'/reference:'+path.join(output,'Microsoft.Web.WebView2.WinForms.dll'),path.resolve('desktop/windows/Planner.cs'),path.resolve('desktop/windows/Reminders.cs')],{stdio:'inherit',windowsHide:true});
if(result.status!==0)throw Error('Windows compilation failed.');
console.log(output);


