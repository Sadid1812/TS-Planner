import test from 'node:test';
import assert from 'node:assert/strict';
import es from '../src/locales/es.json' with {type:'json'};
import {t,setLanguage} from '../src/i18n.js';

test('translated actions preserve user text without reinterpreting placeholders',()=>{
 setLanguage('es');
 assert.equal(t('Complete {title}',{title:'Study {count} $& <b>math</b>'}), 'Completar Study {count} $& <b>math</b>');
 assert.equal(t(' of '),' de ');
 assert.equal(t('Unknown service error'),'Unknown service error');
 setLanguage('en');
 assert.equal(t('Complete {title}',{title:'Biology'}),'Complete Biology');
 assert.equal(t('Complete {title}'),'Complete {title}');
});

test('translations retain all interpolation fields',()=>{
 const fields=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
 for(const [key,value] of Object.entries(es))assert.deepEqual(fields(value),fields(key),key);
});
