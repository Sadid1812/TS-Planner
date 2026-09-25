export function validRule(rule) {
 return !!rule&&['day','week','month'].includes(rule.unit)&&Number.isInteger(rule.interval)&&rule.interval>=1&&rule.interval<=365&&(rule.unit!=='week'||Array.isArray(rule.days)&&rule.days.length>0&&rule.days.length<=7&&new Set(rule.days).size===rule.days.length&&rule.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6));
}
export function customOccurs(start,date,rule) {
 if(!validRule(rule)||date<start)return false;
 const [sy,sm,sd]=start.split('-').map(Number),[y,m,d]=date.split('-').map(Number);
 const a=Date.UTC(sy,sm-1,sd),b=Date.UTC(y,m-1,d),elapsed=Math.round((b-a)/86400000);
 if(rule.unit==='day')return elapsed%rule.interval===0;
 if(rule.unit==='month')return d===sd&&((y-sy)*12+m-sm)%rule.interval===0;
 const startWeekday=(new Date(a).getUTCDay()+6)%7;
 return Math.floor((elapsed+startWeekday)/7)%rule.interval===0&&rule.days.includes(new Date(b).getUTCDay());
}
