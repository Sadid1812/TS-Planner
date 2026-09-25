import es from './locales/es.json' with {type:'json'};
let language='en';
export function setLanguage(value){language=value==='es'?'es':'en';}
export function locale(){return language==='es'?'es-ES':'en-US';}
export function t(value){if(typeof value!=='string'||language==='en')return value;const key=value.trim();return es[key]?value.replace(key,es[key]):value;}
export const languages=[['en','English'],['es','Español']];
