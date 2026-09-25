const {app,BrowserWindow,protocol,net,ipcMain,Notification,Tray,Menu}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'tsplanner',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
if(process.env.TS_PLANNER_USER_DATA)app.setPath('userData',process.env.TS_PLANNER_USER_DATA);
let win,tray,quitting=false;
const smoke=process.argv.includes('--smoke-test');
if(!app.requestSingleInstanceLock())app.quit();
else {
app.on('second-instance',()=>{win?.show();win?.focus();});
app.whenReady().then(()=>{
 app.setAppUserModelId('com.tsplanner.desktop');
 const root=path.join(__dirname,'../dist/client');
 protocol.handle('tsplanner',request=>{
  const url=new URL(request.url);if(url.hostname!=='planner'||request.method!=='GET')return new Response('Forbidden',{status:403});
  let relative;try{relative=decodeURIComponent(url.pathname);}catch{return new Response('Bad path',{status:400});}
  const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
  if(!file.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
  return net.fetch(pathToFileURL(file).href);
 });
 win=new BrowserWindow({width:1440,height:1040,minWidth:390,minHeight:600,title:'TS Planner',backgroundColor:'#111619',icon:path.join(root,'icon-512.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
 win.setMenuBarVisibility(false);
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('tsplanner://planner/'))e.preventDefault();});
 win.webContents.session.setPermissionRequestHandler((_wc,permission,callback)=>callback(permission==='notifications'));
 ipcMain.on('notify',(event,title)=>{if(event.senderFrame?.url.startsWith('tsplanner://planner/')&&typeof title==='string'&&Notification.isSupported())new Notification({title:'TS Planner',body:title.slice(0,180)}).show();});
 tray=new Tray(path.join(root,'icon-192.png'));
 tray.setToolTip('TS Planner · running for reminders');
 tray.setContextMenu(Menu.buildFromTemplate([{label:'Open TS Planner',click:()=>win.show()},{type:'separator'},{label:'Quit TS Planner',click:()=>{quitting=true;app.quit();}}]));
 tray.on('double-click',()=>win.show());
 win.on('close',e=>{if(!quitting){e.preventDefault();win.hide();}});
 if(smoke){win.hide();win.webContents.once('did-finish-load',()=>{console.log('TS Planner desktop shell loaded');quitting=true;app.quit();});win.webContents.once('did-fail-load',(_e,code,message)=>{console.error(code,message);app.exit(1);});}
 win.loadURL('tsplanner://planner/');
});
app.on('before-quit',()=>{quitting=true;});
}
