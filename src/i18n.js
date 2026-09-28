import es from './locales/es.json' with {type:'json'};
let language='en';
export function setLanguage(value){language=value==='es'?'es':'en';}
export function locale(){return language==='es'?'es-ES':'en-US';}
export function t(value, params={}){
 if(typeof value!=='string')return value;
 const key=value.trim();
 const translated=language==='es'&&Object.hasOwn(es,key)?value.replace(key,()=>es[key]):value;
 return translated.replace(/\{(\w+)\}/g,(match,name)=>Object.hasOwn(params,name)?String(params[name]):match);
}
export const languages=[['en','English'],['es','Español']];
