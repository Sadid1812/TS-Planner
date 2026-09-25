import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setLanguage,t,locale} from '../src/i18n.js';
import {emptyState,validateImport} from '../src/model.js';
import {quickParse} from '../src/planning.js';
test('language preference survives backup and unknown strings keep their content',()=>{
 const s=emptyState();s.settings.language='es';assert.equal(validateImport(s).settings.language,'es');
 setLanguage('es');assert.equal(t('Settings'),'Ajustes');assert.equal(locale(),'es-ES');assert.equal(t(' My private task '),' My private task ');assert.equal(t(' tasks'),' tareas');
 setLanguage('en');assert.equal(t('Settings'),'Settings');s.settings.language='invalid';assert.throws(()=>validateImport(s));
});
test('Spanish quick entry parses day and recurring phrases',()=>{
 const task=quickParse('Llamar a mamá mañana 17:00','2026-09-11');assert.equal(task.date,'2026-09-12');assert.equal(task.title,'Llamar a mamá');assert.equal(task.start,'17:00');
 assert.equal(quickParse('Estudiar cada día laborable 07:00').repeat,'weekdays');
 assert.equal(quickParse('Leer cada día 18:00').repeat,'daily');
});
