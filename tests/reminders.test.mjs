import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reminderSnapshot} from '../src/reminders.js';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('native reminder snapshot excludes notes, profile and cloud credentials',()=>{
 const snapshot=reminderSnapshot({settings:{reminders:true,name:'Private'},tasks:[{id:'one',title:'Walk',taskNotes:'secret',subtasks:[{title:'private'}],exceptions:{'2026-09-11':{status:'done',taskNotes:'also secret'}}}]},'account');
 assert.equal(JSON.stringify(snapshot).includes('secret'),false);
 assert.equal(JSON.stringify(snapshot).includes('Private'),false);
 assert.equal(snapshot.tasks[0].exceptions['2026-09-11'].status,'done');
 assert.equal(reminderSnapshot(null).settings.reminders,false);
});

test('Windows reminder engine handles recurrence, suppression and timing', {skip:process.platform!=='win32'},()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'ts-reminder-test-'));
 const compiler=path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
 const exe=path.join(folder,'tests.exe');
 const harness=path.join(folder,'tests.cs');
 fs.writeFileSync(harness,`
using System;
class Test {
 static string State(string task,string settings="") { return "{\\"settings\\":{\\"reminders\\":true"+settings+"},\\"tasks\\":["+task+"]}"; }
 static string Task(string extra="") {return "{\\"id\\":\\"1\\",\\"date\\":\\"2026-09-07\\",\\"title\\":\\"Walk\\",\\"status\\":\\"open\\",\\"repeat\\":\\"weekdays\\",\\"start\\":\\"09:00\\",\\"reminder\\":-1"+extra+"}";}
 static void Check(bool value) {if(!value)throw new Exception("Reminder regression");}
 static void Main() {
  var now=new DateTime(2026,9,11,9,0,0);
  Check(Reminders.Due(State(Task()),now).Count==1);
  Check(Reminders.Due(State(Task()),now.AddSeconds(-1)).Count==0);
  Check(Reminders.Due(State(Task()),now.AddMinutes(4)).Count==1);
  Check(Reminders.Due(State(Task()),now.AddMinutes(5)).Count==0);
  Check(Reminders.Due(State(Task()),now.AddDays(1)).Count==0);
  Check(Reminders.Due(State(Task(",\\"until\\":\\"2026-09-10\\"")),now).Count==0);
  Check(Reminders.Due(State(Task(",\\"exceptions\\":{\\"2026-09-11\\":{\\"status\\":\\"done\\"}}")),now).Count==0);
  Check(Reminders.Due(State(Task(",\\"exceptions\\":{\\"2026-09-11\\":{\\"hidden\\":true}}")),now).Count==0);
  var midnight=Task().Replace("09:00","00:10").Replace("weekdays","daily").Replace(":-1",":15");
  Check(Reminders.Due(State(midnight),new DateTime(2026,9,10,23,55,0)).Count==1);
  Check(Reminders.Due(State(Task(),",\\"digest\\":true,\\"digestTime\\":\\"09:00\\""),now).Count==2);
  Check(Reminders.Due(State(Task()).Replace(":true",":false"),now).Count==0);
  Console.WriteLine("11 native reminder assertions passed");
 }
}`);
 const build=spawnSync(compiler,['/nologo','/out:'+exe,'/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:System.Web.Extensions.dll','/reference:System.Security.dll','/reference:Microsoft.CSharp.dll',path.resolve('desktop/windows/Reminders.cs'),harness],{encoding:'utf8',windowsHide:true});
 assert.equal(build.status,0,build.stdout+build.stderr);
 const run=spawnSync(exe,[],{encoding:'utf8',windowsHide:true});
 assert.equal(run.status,0,run.stdout+run.stderr);
});
