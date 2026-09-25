import {customOccurs,validRule} from './recurrence.js';
export const uid = () => crypto.randomUUID();
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const parseDay = (s) => new Date(`${s}T12:00:00`);
export const shiftDay = (s,n) => { const d=parseDay(s); d.setDate(d.getDate()+n); return dayKey(d); };
export const minutes = (s) => s ? Number(s.slice(0,2))*60+Number(s.slice(3)) : null;
export const clock = (m) => `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
export const TITLES = [[365,'A Year of Showing Up'],[90,'Steady Planner'],[30,'Building Momentum'],[7,'Finding Rhythm'],[1,'First Step'],[0,'A fresh start']];
export const THEMES = [
 {id:'ember',name:'Evening',description:'Charcoal, amber & editorial type',bg:'#111619',accent:'#f7b453',text:'#f3f2ef',font:'Editorial'},
 {id:'coffee',name:'Coffee',description:'Espresso, parchment & warm serifs',bg:'#f3eadc',accent:'#795039',text:'#382a23',font:'Literary'},
 {id:'botanical',name:'Botanical',description:'Soft cream, sage & forest green',bg:'#f8f8f0',accent:'#30694e',text:'#20392f',font:'Editorial'},
 {id:'retro',name:'Retro',description:'Paper, burnt orange & bold character',bg:'#f5e8cc',accent:'#a64025',text:'#332d27',font:'Character'},
 {id:'ocean',name:'Ocean',description:'Deep blue, sea glass & calm clarity',bg:'#102631',accent:'#6bd6ce',text:'#e9f5f5',font:'Modern'},
 {id:'sky',name:'Sky',description:'Airy blue, cloud white & clean type',bg:'#f0f6fc',accent:'#3265bc',text:'#23344b',font:'Modern'},
 {id:'neon',name:'Neon Punk',description:'Midnight, electric lime & sharp type',bg:'#15111e',accent:'#d5fa57',text:'#f4eefb',font:'Technical'},
];
export const ICONS=['BookOpen','Heart','BriefcaseBusiness','Dumbbell','Coffee','Moon','Sun','Utensils','House','GraduationCap','Music','Bike','Leaf','Plane','ShoppingBag','Laptop','Palette','Sprout','Pill','Dog','Gamepad2','Phone','Wallet','NotebookPen','Target','Star','Check','Droplets','Cloud','Zap'];
export function emptyState(){return {schema:1,revision:0,tasks:[],categories:[],notes:{},noteHistory:{},settings:{name:'',language:'en',theme:'ember',font:'theme',clock24:true,weeklyGoal:5,wake:'07:00',sleep:'23:00',showSleep:false,reminders:false,reducedMotion:false,workStart:'09:00',workEnd:'18:00',duration:30,breakMinutes:5,autoSchedule:false,digest:false,digestTime:'08:00',aiEnabled:false,aiEngine:'ollama',aiModel:''},dismissed:[],restDays:[],updatedAt:null};}
export function sampleState(){ const s=emptyState(),today=dayKey(); s.tasks=[
 {title:'Study biology',description:'Chapter 4 notes',icon:'BookOpen',color:'lavender',start:'09:00',end:'10:00',priority:true},
 {title:'Call family',description:'Check in and catch up',icon:'Heart',color:'rose',start:'12:00',end:'12:30',priority:true},
 {title:'Project work',description:'Work on proposal draft',icon:'BriefcaseBusiness',color:'sage',start:'14:00',end:'15:30',priority:true},
 {title:'Read for English',description:'Finish chapter 6',icon:'BookOpen',color:'blue',status:'done'},
 {title:'Plan weekend',description:'Look at activities and prep',icon:'Sun',color:'peach',status:'done'},
 ].map((t,i)=>({id:uid(),date:today,createdAt:new Date().toISOString(),status:'open',repeat:'none',exceptions:{},reminder:0,order:i,...t,...(t.status==='done'?{completedAt:new Date().toISOString()}: {})}));s.demo=true;return s; }
export function occurs(task,date){
 if(task.deleted || date<task.date || (task.until && date>task.until))return false;
 if(task.exceptions?.[date]?.historical)return true;
 if(!task.repeat || task.repeat==='none')return task.date===date;
 const wd=parseDay(date).getDay();
 if(task.repeat==='custom')return customOccurs(task.date,date,task.rule);
 if(task.repeat==='daily')return true;
 if(task.repeat==='weekdays')return wd>0&&wd<6;
 if(task.repeat==='weekends')return wd===0||wd===6;
 if(task.repeat==='weekly')return wd===parseDay(task.date).getDay();
 return false;
}
export function occurrence(task,date){const repeated=task.repeat&&task.repeat!=='none';const ex=task.exceptions?.[date]||{};return {...task,...(repeated?{status:'open',completedAt:null,subtasks:(task.subtasks||[]).map(t=>({...t,done:false}))}:{}),...ex,date,seriesId:task.id,key:`${task.id}:${date}`};}
export function tasksFor(s,date){return s.tasks.filter(t=>occurs(t,date)).map(t=>occurrence(t,date)).filter(t=>!t.hidden&&t.status!=='cancelled').sort((a,b)=>(a.order||0)-(b.order||0));}
export function stat(s,date){const ts=tasksFor(s,date); const done=ts.filter(t=>t.status==='done').length;return {total:ts.length,done,pct:ts.length?Math.round(done/ts.length*100):null};}
export function patchOccurrence(s,id,date,patch){return {...s,tasks:s.tasks.map(t=> t.id!==id?t:t.repeat&&t.repeat!=='none'?{...t,exceptions:{...t.exceptions,[date]:{...t.exceptions?.[date],...patch}}}:{...t,...patch})};}
export function moveOccurrence(s,id,date,target){if(date===target)return s;const base=s.tasks.find(t=>t.id===id);if(!base)return s;const item=occurrence(base,date);let next=patchOccurrence(s,id,date,{status:'moved',movedTo:target});const copy={...item,id:uid(),date:target,status:'open',completedAt:null,repeat:'none',exceptions:{},priority:false,movedFrom:date,order:s.tasks.length};delete copy.seriesId;delete copy.key;delete copy.until;next.tasks=[...next.tasks,copy];return next;}
export function editTask(s,id,date,patch,scope='one'){
 const base=s.tasks.find(t=>t.id===id);if(!base)return s;
 if(base.repeat==='none'||!base.repeat)return {...s,tasks:s.tasks.map(t=>t.id===id?{...t,...patch}:t)};
 if(scope==='one')return patchOccurrence(s,id,date,patch);
 // Split series for future changes; preserve all previous outcomes and exceptions.
 if(scope==='future'){const t={...base,...patch,id:uid(),date,exceptions:Object.fromEntries(Object.entries(base.exceptions||{}).filter(([d])=>d>=date)),until:patch.until===undefined?base.until:patch.until};return {...s,tasks:[...s.tasks.map(t=>t.id===id?{...t,until:shiftDay(date,-1)}:t),t]};}
 const past={}; for(let d=base.date;d<dayKey();d=shiftDay(d,1)){if(occurs(base,d))past[d]={...occurrence(base,d),historical:true,id:undefined,key:undefined,seriesId:undefined,exceptions:undefined};if(Object.keys(past).length>10000)break;}
 return {...s,tasks:s.tasks.map(t=>t.id===id?{...t,...patch,date:base.date,exceptions:{...t.exceptions,...past}}:t)};
}
export function interval(t){if(!t.start||!t.end)return null;const start=new Date(`${t.date}T${t.start}`).getTime();const end=new Date(`${t.overnight?shiftDay(t.date,1):t.date}T${t.end}`).getTime();return end>start?[start,end]:null;}
export function conflicts(s,item){const a=interval(item);if(!a)return [];return [shiftDay(item.date,-1),item.date,shiftDay(item.date,1)].flatMap(d=>tasksFor(s,d)).filter(t=>(t.id!==item.id||t.date!==(item.excludeDate||item.date))&&['open','done'].includes(t.status)).filter(t=>{const b=interval(t);return b&&a[0]<b[1]&&b[0]<a[1]});}
export function nextSlot(s,item){const len=minutes(item.end)-minutes(item.start)+(item.overnight?1440:0);if(len<=0||len>1440)return null;for(let start=minutes(item.start);start+len<=1440;start+=15){const test={...item,start:clock(start),end:clock(start+len),overnight:start+len===1440};if(!conflicts(s,test).length)return {start:test.start,end:test.end,overnight:test.overnight};}return null;}
export function scheduleLayout(items){
 const result={},groups=[];let group=[],until=-1;
 for(const t of items.filter(t=>t.start&&['open','done'].includes(t.status)).sort((a,b)=>minutes(a.start)-minutes(b.start))){
  const start=minutes(t.start),end=minutes(t.end)+(t.overnight?1440:0);
  if(start>=until&&group.length){groups.push(group);group=[];until=-1;}
  group.push({t,start,end});until=Math.max(until,end);
 }
 if(group.length)groups.push(group);
 for(const g of groups){const ends=[];for(const x of g){let lane=ends.findIndex(end=>end<=x.start);if(lane<0)lane=ends.length;ends[lane]=x.end;result[x.t.key]={lane,columns:0};}for(const x of g)result[x.t.key].columns=ends.length;}
 return result;
}
export function overdue(s){const today=dayKey(),start=shiftDay(today,-30),out=[];for(let d=start;d<today;d=shiftDay(d,1)){for(const t of tasksFor(s,d))if(t.status==='open'&&!s.dismissed.includes(t.key))out.push(t);}for(const t of s.tasks)if(t.repeat==='none'&&t.date<start&&t.status==='open'&&!t.deleted&&!s.dismissed.includes(t.id+':'+t.date))out.push(occurrence(t,t.date));return out;}
export function creditedDays(s){const dates=new Set();for(const t of s.tasks){if((!t.repeat||t.repeat==='none')&&t.status==='done'&&t.completedAt)dates.add(dayKey(new Date(t.completedAt)));for(const ex of Object.values(t.exceptions||{}))if(ex.status==='done'&&ex.completedAt)dates.add(dayKey(new Date(ex.completedAt)));}return dates;}
export function reward(s){const n=creditedDays(s).size;return TITLES.find(([threshold])=>n>=threshold)[1];}
export function validateImport(raw){
 const fail=()=>{throw new Error('This backup contains invalid planner data.');};
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&dayKey(parseDay(v))===v;
 const time=v=>v===''||v===undefined||v===null||typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
 if(!object(raw)||raw.schema!==1||!Array.isArray(raw.tasks)||raw.tasks.length>20000||!object(raw.settings)||!object(raw.notes))fail();
 const ids=new Set();
 const check=t=>{if(!object(t))fail();if(t.level&&!['high','medium','low'].includes(t.level)||t.taskNotes!=null&&(typeof t.taskNotes!=='string'||t.taskNotes.length>10000)||t.subtasks!=null&&(!Array.isArray(t.subtasks)||t.subtasks.length>100||t.subtasks.some(x=>!object(x)||typeof x.id!=='string'||typeof x.title!=='string'||x.title.length>180||typeof x.done!=='boolean')))fail();if(!object(t)||typeof t.title!=='string'||t.title.length>180||t.description!=null&&typeof t.description!=='string'||!time(t.start)||!time(t.end)||t.status&&!['open','done','skipped','moved','cancelled'].includes(t.status)||t.repeat&&!['none','daily','weekly','weekdays','weekends','custom'].includes(t.repeat)||t.repeat==='custom'&&!validRule(t.rule)||t.reminder!=null&&(!Number.isInteger(t.reminder)||t.reminder < -1||t.reminder>1440))fail();};
 const clean=emptyState();
 if(raw.categories!=null){if(!Array.isArray(raw.categories)||raw.categories.length>50)fail();const categoryIds=new Set();clean.categories=raw.categories.map(c=>{if(!object(c)||typeof c.id!=='string'||categoryIds.has(c.id)||typeof c.name!=='string'||c.name.length>40||!ICONS.includes(c.icon)||!['lavender','rose','sage','blue','peach'].includes(c.color))fail();categoryIds.add(c.id);return {...c};});}

 clean.tasks=raw.tasks.map(t=>{check(t);if(typeof t.id!=='string'||ids.has(t.id)||!date(t.date)||t.until&&!date(t.until)||t.exceptions!=null&&!object(t.exceptions))fail();ids.add(t.id);for(const [d,ex] of Object.entries(t.exceptions||{})){if(!date(d))fail();check({...t,...ex,exceptions:undefined});}return structuredClone(t);});
 for(const [d,note] of Object.entries(raw.notes)){if(!date(d)||typeof note!=='string'||note.length>1000000)fail();clean.notes[d]=note;}
 const x=raw.settings;
 if(x.aiEngine!=null&&!['ollama','portable'].includes(x.aiEngine))fail();
 if(x.language!=null&&!['en','es'].includes(x.language))fail();
 for(const k of ['digest','aiEnabled','autoSchedule'])if(x[k]!=null&&typeof x[k]!=='boolean')fail();
 for(const k of ['workStart','workEnd','digestTime'])if(!time(x[k]))fail();
 if(x.duration!=null&&![15,30,45,60,90,120].includes(x.duration)||x.breakMinutes!=null&&![0,5,10,15,30].includes(x.breakMinutes)||x.aiModel!=null&&(typeof x.aiModel!=='string'||x.aiModel.length>100))fail();
 if(x.theme&&!THEMES.some(t=>t.id===x.theme)||x.font&&!['theme','editorial','literary','modern','technical'].includes(x.font))fail();
 for(const k of ['clock24','showSleep','reminders','reducedMotion'])if(x[k]!=null&&typeof x[k]!=='boolean')fail();
 if(x.name!=null&&(typeof x.name!=='string'||x.name.length>60)||x.weeklyGoal!=null&&(!Number.isInteger(x.weeklyGoal)||x.weeklyGoal<1||x.weeklyGoal>7)||!time(x.wake)||!time(x.sleep))fail();
 for(const k of Object.keys(clean.settings))if(x[k]!=null)clean.settings[k]=x[k];
 clean.dismissed=Array.isArray(raw.dismissed)?raw.dismissed.filter(v=>typeof v==='string'):[];
 clean.restDays=Array.isArray(raw.restDays)?raw.restDays.filter(date):[];
 return clean;
}


