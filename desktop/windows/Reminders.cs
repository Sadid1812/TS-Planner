using System;
using System.IO;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

// A separate, short-lived process reads the latest snapshot without starting WebView2.
static class Reminders {
 static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength=10000000 };
 static string Folder { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"TS Planner","Reminders"); } }
 static string Snapshot { get { return Path.Combine(Folder,"schedule.dat"); } }
 static string TaskName { get { return "TS Planner reminders " + WindowsIdentity.GetCurrent().User.Value; } }
 static string registration;
 static Dictionary<string,object> Map(object value) { return value as Dictionary<string,object> ?? new Dictionary<string,object>(); }
 static object Get(Dictionary<string,object> value,string key) { object result;return value.TryGetValue(key,out result)?result:null; }
 static string Str(Dictionary<string,object> value,string key) { return Convert.ToString(Get(value,key),CultureInfo.InvariantCulture); }
 static bool Flag(Dictionary<string,object> value,string key) { return Object.Equals(Get(value,key),true); }
 static IEnumerable Items(object value) { return value as IEnumerable ?? new object[0]; }
 static void Write(string file,string text) {
  Directory.CreateDirectory(Folder);
  var bytes=ProtectedData.Protect(Encoding.UTF8.GetBytes(text),null,DataProtectionScope.CurrentUser);
  var temp=file+".tmp";File.WriteAllBytes(temp,bytes);
  if(File.Exists(file))File.Replace(temp,file,null);else File.Move(temp,file);
 }
 static string Read(string file) { return Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(file),null,DataProtectionScope.CurrentUser)); }
 public static void Configure(string text) {
  if(text.Length>10000000)throw new Exception("Reminder schedule is too large.");
  var state=Json.Deserialize<Dictionary<string,object>>(text);
  bool enabled=Flag(Map(Get(state,"settings")),"reminders");
  // Write the disabled snapshot first: even a failed task deletion cannot deliver old reminders.
  Write(Snapshot,text);
  string executable=Application.ExecutablePath;
  if(registration==(enabled?executable:"disabled"))return;
  dynamic service=Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service"));service.Connect();
  dynamic root=service.GetFolder("\\");
  if(!enabled) {
   try { root.GetTask(TaskName); } catch(System.Runtime.InteropServices.COMException e) { if(e.ErrorCode==unchecked((int)0x80070002)){registration="disabled";return;}throw; }
   root.DeleteTask(TaskName,0);registration="disabled";return;
  }
  dynamic task=service.NewTask(0);
  task.RegistrationInfo.Description="Delivers TS Planner reminders while you are signed in, including after the planner is quit.";
  task.Principal.UserId=WindowsIdentity.GetCurrent().User.Value;task.Principal.LogonType=3;task.Principal.RunLevel=0;
  task.Settings.Enabled=true;task.Settings.StartWhenAvailable=true;
  task.Settings.DisallowStartIfOnBatteries=false;task.Settings.StopIfGoingOnBatteries=false;
  task.Settings.RunOnlyIfNetworkAvailable=false;task.Settings.WakeToRun=false;
  task.Settings.ExecutionTimeLimit="PT1M";task.Settings.MultipleInstances=2;
  dynamic trigger=task.Triggers.Create(1);
  trigger.StartBoundary=DateTime.Now.AddSeconds(5).ToString("yyyy-MM-dd'T'HH:mm:ss",CultureInfo.InvariantCulture);
  trigger.Repetition.Interval="PT1M";trigger.Enabled=true;
  dynamic action=task.Actions.Create(0);action.Path=executable;action.Arguments="--deliver-due";
  action.WorkingDirectory=Path.GetDirectoryName(executable);
  root.RegisterTaskDefinition(TaskName,task,6,WindowsIdentity.GetCurrent().User.Value,null,3,null);
  registration=executable;
 }
 static bool Occurs(Dictionary<string,object> task,DateTime day) {
  DateTime start,until;
  if(Flag(task,"deleted")||!DateTime.TryParseExact(Str(task,"date"),"yyyy-MM-dd",CultureInfo.InvariantCulture,DateTimeStyles.None,out start)||day<start)return false;
  if(DateTime.TryParseExact(Str(task,"until"),"yyyy-MM-dd",CultureInfo.InvariantCulture,DateTimeStyles.None,out until)&&day>until)return false;
  var exception=Map(Get(Map(Get(task,"exceptions")),day.ToString("yyyy-MM-dd")));
  if(Flag(exception,"historical"))return true;
  switch(Str(task,"repeat")) {
   case "custom":
    var rule=Map(Get(task,"rule"));int interval;
    if(!Int32.TryParse(Str(rule,"interval"),out interval)||interval<1||interval>365)return false;
    int elapsed=(day-start).Days;
    switch(Str(rule,"unit")) {
     case "day":return elapsed%interval==0;
     case "month":return day.Day==start.Day&&((day.Year-start.Year)*12+day.Month-start.Month)%interval==0;
     case "week":
      if(((elapsed+((int)start.DayOfWeek+6)%7)/7)%interval!=0)return false;
      foreach(object selected in Items(Get(rule,"days")))if(Convert.ToInt32(selected)==(int)day.DayOfWeek)return true;
      return false;
     default:return false;
    }
   case "daily":return true;
   case "weekly":return start.DayOfWeek==day.DayOfWeek;
   case "weekdays":return day.DayOfWeek!=DayOfWeek.Saturday&&day.DayOfWeek!=DayOfWeek.Sunday;
   case "weekends":return day.DayOfWeek==DayOfWeek.Saturday||day.DayOfWeek==DayOfWeek.Sunday;
   default:return start==day;
  }
 }
 static Dictionary<string,object> Occurrence(Dictionary<string,object> task,DateTime day) {
  var result=new Dictionary<string,object>(task);
  if(Str(task,"repeat")!=""&&Str(task,"repeat")!="none")result["status"]="open";
  foreach(var pair in Map(Get(Map(Get(task,"exceptions")),day.ToString("yyyy-MM-dd"))))result[pair.Key]=pair.Value;
  return result;
 }
 static bool IsDue(DateTime now,DateTime due) { return now>=due&&now<due.AddMinutes(5); }
 public static Dictionary<string,string> Due(string text,DateTime now) {
  var state=Json.Deserialize<Dictionary<string,object>>(text);var settings=Map(Get(state,"settings"));
  var result=new Dictionary<string,string>();if(!Flag(settings,"reminders"))return result;
  var account=Str(state,"account");int planned=0;
  foreach(object value in Items(Get(state,"tasks"))) {
   var task=Map(value);
   for(int offset=-1;offset<=1;offset++) {
    DateTime day=now.Date.AddDays(offset);if(!Occurs(task,day))continue;
    var item=Occurrence(task,day);if(Flag(item,"hidden")||Str(item,"status")!="open")continue;
    if(offset==0)planned++;
    int lead;DateTime start;
    if(!Int32.TryParse(Str(item,"reminder"),out lead)||lead==0||lead < -1||lead>1440||!DateTime.TryParseExact(Str(item,"start"),"HH:mm",CultureInfo.InvariantCulture,DateTimeStyles.None,out start))continue;
    DateTime due=day.Add(start.TimeOfDay).AddMinutes(lead==-1?0:-lead);
    if(IsDue(now,due))result[account+":"+Str(task,"id")+":"+day.ToString("yyyy-MM-dd")+":"+due.ToString("s")]=Str(item,"title");
   }
  }
  DateTime digest;
  if(Flag(settings,"digest")&&DateTime.TryParseExact(Str(settings,"digestTime"),"HH:mm",CultureInfo.InvariantCulture,DateTimeStyles.None,out digest)&&IsDue(now,now.Date.Add(digest.TimeOfDay)))result[account+":digest:"+now.ToString("yyyy-MM-dd")]=planned+" tasks planned for today.";
  return result;
 }
 public static void Deliver() {
  using(var mutex=new Mutex(false,"Local\\TSPlannerReminders")) {
   bool held=false;
   try {
    try { held=mutex.WaitOne(0); } catch(AbandonedMutexException) { held=true; }
    if(!held||!File.Exists(Snapshot))return;
    var now=DateTime.Now;var due=Due(Read(Snapshot),now);var ledgerPath=Path.Combine(Folder,"delivered.dat");
    var ledger=File.Exists(ledgerPath)?Json.Deserialize<Dictionary<string,string>>(Read(ledgerPath)):new Dictionary<string,string>();
    foreach(var key in new List<string>(ledger.Keys)){DateTime timestamp;if(!DateTime.TryParse(ledger[key],out timestamp)||timestamp<DateTime.UtcNow.AddDays(-3))ledger.Remove(key);}
    var messages=new List<string>();foreach(var pair in due)if(!ledger.ContainsKey(pair.Key)){messages.Add(pair.Value);ledger[pair.Key]=DateTime.UtcNow.ToString("o");}
    if(messages.Count==0)return;
    Write(ledgerPath,Json.Serialize(ledger));
    using(var tray=new NotifyIcon())using(var timer=new System.Windows.Forms.Timer())using(var context=new ApplicationContext()) {
     string icon=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"planner.ico");
     tray.Icon=File.Exists(icon)?new System.Drawing.Icon(icon):System.Drawing.SystemIcons.Information;
     tray.Text="TS Planner";tray.Visible=true;
     string body=String.Join("\n",messages.ToArray());if(body.Length>240)body=body.Substring(0,237)+"…";
     tray.ShowBalloonTip(10000,messages.Count>1?"TS Planner · "+messages.Count+" reminders":"TS Planner",body,ToolTipIcon.Info);
     timer.Interval=12000;timer.Tick+=delegate{context.ExitThread();};timer.Start();Application.Run(context);
    }
   } catch(Exception e) { Directory.CreateDirectory(Folder);File.AppendAllText(Path.Combine(Folder,"errors.log"),DateTime.UtcNow.ToString("s")+" "+e.GetType().Name+Environment.NewLine); }
   finally { if(held)mutex.ReleaseMutex(); }
  }
 }
}
