using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Net;
using System.Windows.Forms;

class LocalAI : Form {
 readonly Label status=new Label();readonly Button start=new Button(),stop=new Button();
 readonly Timer timer=new Timer();Process server;bool checking;
 public LocalAI(){
  Text="TS Planner · Local AI";ClientSize=new Size(470,190);StartPosition=FormStartPosition.CenterScreen;
  status.SetBounds(20,20,430,90);status.Text="A local model for private task breakdown.\nKeep this helper open while using AI in TS Planner.";Controls.Add(status);
  start.Text="Start local AI";start.SetBounds(20,130,150,32);start.Click+=delegate{Start();};Controls.Add(start);
  stop.Text="Stop local AI";stop.SetBounds(185,130,150,32);stop.Enabled=false;stop.Click+=delegate{Stop();};Controls.Add(stop);
  timer.Interval=1500;timer.Tick+=async delegate{
   if(checking||server==null)return;
   if(server.HasExited){status.Text="The local model stopped. Close another app using port 11435 and try again.";timer.Stop();start.Enabled=true;stop.Enabled=false;return;}
   checking=true;try{using(var client=new WebClient()){var text=await client.DownloadStringTaskAsync("http://127.0.0.1:11435/health");if(server!=null&&!server.HasExited&&text.Contains("ok"))status.Text="Local AI is ready.\nIn TS Planner: Settings > Local AI > Enable > TS Planner portable AI.\nTask text stays on this computer. Close this helper to stop AI.";}}catch{}finally{checking=false;}
  };
  FormClosing+=delegate{Stop();};Shown+=delegate{Start();};
 }
 void Start(){
  if(server!=null&&!server.HasExited)return;
  var root=AppDomain.CurrentDomain.BaseDirectory;var executable=Path.Combine(root,"engine","llama-server.exe");var model=Path.Combine(root,"model.gguf");
  if(!File.Exists(executable)||!File.Exists(model)){status.Text="The engine or model is missing. Keep the full Local AI folder together.";return;}
  try{
   // A bound port means another service already owns it. Never stop that process.
   using(var probe=new System.Net.Sockets.TcpClient()){var result=probe.BeginConnect("127.0.0.1",11435,null,null);if(result.AsyncWaitHandle.WaitOne(300)&&probe.Connected){status.Text="Port 11435 is already in use. If TS Planner AI is running, use it; otherwise close that service and retry.";return;}}
   server=Process.Start(new ProcessStartInfo(executable,"-m \""+model+"\" --host 127.0.0.1 --port 11435 --alias ts-planner --ctx-size 4096 --threads 4 --parallel 1 --no-webui --cors-origins localhost --no-cors-credentials"){UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=root});
   status.Text="Loading the local model…";start.Enabled=false;stop.Enabled=true;timer.Start();
  }catch(Exception e){status.Text="Could not start local AI: "+e.Message;}
 }
 void Stop(){timer.Stop();if(server!=null){try{if(!server.HasExited)server.Kill();server.Dispose();}catch{}server=null;}status.Text="Local AI is stopped. Your planner still works normally.";start.Enabled=true;stop.Enabled=false;}
 [STAThread]static void Main(){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new LocalAI());}
}
