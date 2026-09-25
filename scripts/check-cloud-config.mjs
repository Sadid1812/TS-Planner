import fs from 'node:fs';
// Validate without ever echoing a key. Public Vite values are shipped to browsers.
const values={...process.env};
for(const file of ['.env','.env.local','.env.production','.env.production.local'])if(fs.existsSync(file)){
 for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){
  const match=line.match(/^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$/);
  if(match&&process.env[match[1]]===undefined)values[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');
 }
}
const url=values.VITE_SUPABASE_URL,key=values.VITE_SUPABASE_ANON_KEY;
if(!url&&!key){if(process.env.TS_REQUIRE_CLOUD==='1')throw new Error('Public launch requires configured Gmail/cloud access. Add both public Supabase repository variables.');console.log('Building local-only: cloud configuration is absent.');process.exit(0);}
if(!url||!key)throw new Error('Cloud configuration needs both the project URL and public key.');
const parsed=new URL(url);
if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')throw new Error('Use the HTTPS Supabase project URL with no credentials or path.');
if(!key.startsWith('sb_publishable_')){
 let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));}catch{}
 if(claims?.role!=='anon')throw new Error('Only a public publishable or anon key may be bundled. Never use a secret or service-role key.');
}
console.log('Public cloud configuration validated.');
