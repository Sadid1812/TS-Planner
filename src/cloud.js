import {stat,dayKey,reward} from './model';
import {createClient} from '@supabase/supabase-js';
export const configured=Boolean(import.meta.env.VITE_SUPABASE_URL&&import.meta.env.VITE_SUPABASE_ANON_KEY);
export const cloud=configured?createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}}):null;
export async function login(calendar=false){
 if(!cloud)throw Error('Cloud accounts need configuration for this installation.');
 if(!navigator.onLine)throw Error('Connect to the internet to sign in. Your local planner is still available.');
 const nonce=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
 const redirectTo=window.tsDesktop?location.origin+'/auth/callback/'+nonce:new URL('./',location.href).href;
 const {data,error}=await cloud.auth.signInWithOAuth({provider:'google',options:{...(calendar?{scopes:'https://www.googleapis.com/auth/calendar.readonly'}:{}),redirectTo,skipBrowserRedirect:Boolean(window.tsDesktop),queryParams:{prompt:'select_account'}}});
 if(error)throw error;
 if(window.tsDesktop){if(!window.tsDesktop.login)throw Error('Install the updated Windows build to sign in.');window.tsDesktop.login(nonce,data.url);}
}
export async function rpc(name,args={}){
 if(!cloud)throw Error('Cloud accounts are unavailable in this build.');
 if(name==='save_planner'){const s=args.p_document;args={...args,p_summary:{name:'Member',percentage:stat(s,dayKey()).pct,title:reward(s),day:dayKey()}};}
 const {data,error}=await cloud.rpc(name,args);if(error)throw error;return data;
}
