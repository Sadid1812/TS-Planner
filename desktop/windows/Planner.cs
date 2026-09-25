using System;
using System.IO;
using System.Drawing;
using System.Windows.Forms;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Web;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

class Planner : Form {
 readonly WebView2 view = new WebView2();
 readonly NotifyIcon tray = new NotifyIcon();
 readonly bool smoke;
 readonly string dataDirectory;
 bool quitting;
 string authCallback;
 DateTime authDeadline;
 TcpListener server;
 const string AppUrl="http://127.0.0.1:43178/";
 readonly Timer timeout = new Timer();
 public Planner(bool test) {
  smoke=test;
  dataDirectory=Environment.GetEnvironmentVariable("TS_PLANNER_USER_DATA");
  if(String.IsNullOrEmpty(dataDirectory))dataDirectory=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"TS Planner","WebView2");
  Directory.CreateDirectory(dataDirectory);
  Text="TS Planner";Width=1440;Height=1040;MinimumSize=new Size(390,600);
  BackColor=Color.FromArgb(17,22,25);StartPosition=FormStartPosition.CenterScreen;
  if(smoke){ShowInTaskbar=false;Opacity=0;}
  string iconPath=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"planner.ico");
  if(File.Exists(iconPath))Icon=new Icon(iconPath);
  view.Dock=DockStyle.Fill;view.DefaultBackgroundColor=BackColor;Controls.Add(view);
  tray.Icon=Icon;tray.Text="TS Planner";tray.Visible=!smoke;
  var menu=new ContextMenuStrip();
  menu.Items.Add("Open TS Planner",null,delegate{Show();WindowState=FormWindowState.Normal;Activate();});
  menu.Items.Add("Quit TS Planner",null,delegate{quitting=true;Close();});
  tray.ContextMenuStrip=menu;tray.DoubleClick+=delegate{Show();Activate();};
  FormClosing+=delegate(object sender,FormClosingEventArgs e){if(!quitting&&!smoke&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();}};
  FormClosed+=delegate{tray.Dispose();if(server!=null)server.Stop();};
  Shown+=async delegate {
   try {
    server=new TcpListener(IPAddress.Loopback,43178);server.Start();Serve();
    var environment=await CoreWebView2Environment.CreateAsync(null,dataDirectory);
    await view.EnsureCoreWebView2Async(environment);
    var core=view.CoreWebView2;
    core.Settings.AreDefaultContextMenusEnabled=false;
    core.Settings.IsStatusBarEnabled=false;
    core.NewWindowRequested+=delegate(object sender,CoreWebView2NewWindowRequestedEventArgs e){e.Handled=true;};
    core.NavigationStarting+=delegate(object sender,CoreWebView2NavigationStartingEventArgs e){if(!e.Uri.StartsWith(AppUrl,StringComparison.OrdinalIgnoreCase))e.Cancel=true;};
    core.PermissionRequested+=delegate(object sender,CoreWebView2PermissionRequestedEventArgs e){e.State=CoreWebView2PermissionState.Deny;};
    core.WebMessageReceived+=delegate(object sender,CoreWebView2WebMessageReceivedEventArgs e){
     if(!e.Source.StartsWith(AppUrl,StringComparison.OrdinalIgnoreCase))return;
     string message;try{message=e.TryGetWebMessageAsString();}catch{return;}
     if(message=="planner-ready") { Log("Planner UI ready");if(smoke){quitting=true;Close();} }
     else if(message.StartsWith("schedule:",StringComparison.Ordinal)) {
      try { Reminders.Configure(message.Substring(9));core.PostWebMessageAsJson("{\"type\":\"reminder-status\",\"ok\":true}"); }
      catch(Exception error) { Log("Reminder setup: "+error.Message);core.PostWebMessageAsJson("{\"type\":\"reminder-status\",\"ok\":false}"); }
     }
     else if(message.StartsWith("login:",StringComparison.Ordinal)) {
      try {
       var split=message.IndexOf(':',6);if(split<0)return;
       var nonce=message.Substring(6,split-6);Uri target;
       if(!System.Text.RegularExpressions.Regex.IsMatch(nonce,"^[a-f0-9]{48}$")||!Uri.TryCreate(message.Substring(split+1),UriKind.Absolute,out target))return;
       var callback=AppUrl+"auth/callback/"+nonce;
       var query=HttpUtility.ParseQueryString(target.Query);
       if(target.Scheme!="https"||!target.IsDefaultPort||target.UserInfo!=""||!target.Host.EndsWith(".supabase.co",StringComparison.OrdinalIgnoreCase)||target.AbsolutePath!="/auth/v1/authorize"||query["provider"]!="google"||query["redirect_to"]!=callback||String.IsNullOrEmpty(query["code_challenge"]))return;
       authCallback="/auth/callback/"+nonce;authDeadline=DateTime.UtcNow.AddMinutes(10);
       Process.Start(new ProcessStartInfo(target.AbsoluteUri){UseShellExecute=true});
      }catch{authCallback=null;MessageBox.Show("The sign-in browser could not open. Please try again.","TS Planner");}
     }
     else if(message.StartsWith("notify:",StringComparison.Ordinal)) { string title=message.Substring(7);if(title.Length>180)title=title.Substring(0,180);tray.ShowBalloonTip(5000,"TS Planner",title,ToolTipIcon.Info); }
    };
    core.ProcessFailed+=delegate(object sender,CoreWebView2ProcessFailedEventArgs e){Log("Runtime process failure: "+e.ProcessFailedKind);};
    await core.AddScriptToExecuteOnDocumentCreatedAsync("window.tsDesktop=Object.freeze({schedule:function(s){window.chrome.webview.postMessage('schedule:'+JSON.stringify(s));},login:function(n,u){window.chrome.webview.postMessage('login:'+n+':'+u);},notify:function(t){window.chrome.webview.postMessage('notify:'+String(t));},ready:function(){window.chrome.webview.postMessage('planner-ready');}});window.chrome.webview.addEventListener('message',function(e){if(e.data.type==='reminder-status')window.dispatchEvent(new CustomEvent('ts-reminder-status',{detail:e.data}));});");
    core.Navigate(AppUrl);
    if(smoke){timeout.Interval=30000;timeout.Tick+=delegate{Log("Startup timed out");Environment.ExitCode=1;quitting=true;Close();};timeout.Start();}
   } catch(Exception error) {
    var socketError=error as SocketException;
    if(socketError!=null&&socketError.SocketErrorCode==SocketError.AddressAlreadyInUse){if(!smoke)MessageBox.Show("TS Planner is already running. Open it from its tray icon. If another app is using port 43178, close that app first.","TS Planner",MessageBoxButtons.OK,MessageBoxIcon.Information);quitting=true;Close();return;}
    Log(error.ToString());Environment.ExitCode=1;
    if(!smoke)MessageBox.Show("TS Planner could not start.\n\n"+error.Message+"\n\nStartup details: "+Path.Combine(dataDirectory,"startup.log"),"TS Planner",MessageBoxButtons.OK,MessageBoxIcon.Error);
    quitting=true;Close();
   }
  };
 }
 async void Serve(){
  while(!quitting){try{var client=await server.AcceptTcpClientAsync();HandleRequest(client);}catch(ObjectDisposedException){break;}catch(SocketException){break;}}
 }
 async void HandleRequest(TcpClient client){
  using(client)try{
   var stream=client.GetStream();var reader=new StreamReader(stream,Encoding.ASCII,false,1024,true);
   var request=await reader.ReadLineAsync();if(request==null)return;
   var parts=request.Split(' ');if(parts.Length<2||parts[0]!="GET")return;
   var header="";int size=0;bool validHost=false;
   while(!String.IsNullOrEmpty(header=await reader.ReadLineAsync())){size+=header.Length;if(size>8192)return;if(header.Equals("Host: 127.0.0.1:43178",StringComparison.OrdinalIgnoreCase))validHost=true;}
   if(!validHost)return;
   var root=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"web");
   var urlPath=Uri.UnescapeDataString(parts[1].Split('?')[0]);
   if(urlPath.StartsWith("/auth/callback/",StringComparison.Ordinal)){
    bool valid=authCallback!=null&&urlPath==authCallback&&DateTime.UtcNow<authDeadline;
    var queryAt=parts[1].IndexOf('?');var query=HttpUtility.ParseQueryString(queryAt<0?"":parts[1].Substring(queryAt+1));
    var code=query["code"];var error=query["error"];
    valid=valid&&((!String.IsNullOrEmpty(code)&&code.Length<=2048)||!String.IsNullOrEmpty(error));
    if(valid){authCallback=null;view.CoreWebView2.Navigate(AppUrl+(String.IsNullOrEmpty(code)?"?error=access_denied":"?code="+Uri.EscapeDataString(code)));Show();WindowState=FormWindowState.Normal;Activate();}
    var html=Encoding.UTF8.GetBytes(valid?"<!doctype html><title>TS Planner</title><p>Return to TS Planner to finish signing in. You can close this tab.</p>":"<!doctype html><title>TS Planner</title><p>This sign-in attempt expired or does not match. Start again from TS Planner.</p>");
    var headers=Encoding.ASCII.GetBytes("HTTP/1.1 "+(valid?"200 OK":"400 Bad Request")+"\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: default-src 'none'; frame-ancestors 'none'\r\nContent-Length: "+html.Length+"\r\nConnection: close\r\n\r\n");
    await stream.WriteAsync(headers,0,headers.Length);await stream.WriteAsync(html,0,html.Length);return;
   }
   var file=Path.GetFullPath(Path.Combine(root,urlPath.TrimStart('/').Replace('/',Path.DirectorySeparatorChar)));
   if(urlPath=="/")file=Path.Combine(root,"index.html");
   if(!file.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)||!File.Exists(file)){var missing=Encoding.ASCII.GetBytes("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");await stream.WriteAsync(missing,0,missing.Length);return;}
   string type="application/octet-stream";
   switch(Path.GetExtension(file).ToLowerInvariant()){case ".html":type="text/html; charset=utf-8";break;case ".js":type="text/javascript; charset=utf-8";break;case ".css":type="text/css; charset=utf-8";break;case ".png":type="image/png";break;case ".ico":type="image/x-icon";break;case ".woff2":type="font/woff2";break;case ".webmanifest":type="application/manifest+json";break;}
   var body=File.ReadAllBytes(file);var response=Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: "+type+"\r\nContent-Length: "+body.Length+"\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n");await stream.WriteAsync(response,0,response.Length);await stream.WriteAsync(body,0,body.Length);
  }catch(Exception e){Log("Local file request failed: "+e.Message);}
 }
 void Log(string message){File.AppendAllText(Path.Combine(dataDirectory,"startup.log"),DateTime.Now.ToString("s")+" "+message+Environment.NewLine);}
 [STAThread] static void Main(string[] args){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);if(Array.IndexOf(args,"--deliver-due")>=0){Reminders.Deliver();return;}Application.Run(new Planner(Array.IndexOf(args,"--smoke-test")>=0));}
}
