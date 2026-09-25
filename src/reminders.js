// Keep private notes, profile data, and checklists out of the native reminder file.
export function reminderSnapshot(state,account='local') {
 const fields=['id','date','until','title','start','reminder','repeat','status','hidden','deleted','historical','rule'];
 const pick=value=>Object.fromEntries(fields.filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
 return {account,settings:{reminders:!!state?.settings.reminders,digest:!!state?.settings.digest,digestTime:state?.settings.digestTime||'08:00'},tasks:(state?.tasks||[]).map(t=>({...pick(t),exceptions:Object.fromEntries(Object.entries(t.exceptions||{}).map(([d,ex])=>[d,pick(ex)]))}))};
}
