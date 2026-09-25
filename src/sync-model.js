// Device revision and synchronization bookkeeping are not planner content.
function ordered(value){
 if(Array.isArray(value))return value.map(ordered);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])]));
 return value;
}
export function fingerprint(state){const {revision,updatedAt,sync,...content}=state;return JSON.stringify(ordered(content));}
export function syncDecision(local,remote,baseline){
 if(!remote)return baseline?'conflict':'push';
 if(fingerprint(local)===fingerprint(remote.document))return 'equal';
 if(!baseline)return 'conflict';
 const localChanged=fingerprint(local)!==baseline.fingerprint;
 const remoteChanged=remote.revision!==baseline.revision;
 if(localChanged&&remoteChanged)return 'conflict';
 if(remoteChanged)return 'pull';
 return 'push';
}
export function verifiedGmail(user){return Boolean(user?.email_confirmed_at&&/^[^@\s]+@gmail\.com$/i.test(user.email||'')&&user.app_metadata?.providers?.includes('google'));}
