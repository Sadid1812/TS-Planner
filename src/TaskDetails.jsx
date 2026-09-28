import {requestBreakdown} from './local-ai.js';
import { t as tx, locale as uiLocale } from "./i18n.js";
import React, { useState, useRef, useEffect } from 'react';
import { uid } from './model';
export function TaskDetails({
  task,
  set,
  state
}) {
  const [step, Step] = useState(''),
    [ideas, Ideas] = useState([]),
    [busy, Busy] = useState(false),
    [error, Error] = useState('');
  const controller=useRef();useEffect(()=>()=>controller.current?.abort(),[]);
  async function breakdown() {
    controller.current?.abort();controller.current=new AbortController();
    Busy(true);
    Error('');
    try {
      Ideas(await requestBreakdown(task,state.settings,AbortSignal.any([controller.current.signal,AbortSignal.timeout(90000)])));
    } catch (e) {
      Error(e.name === 'TimeoutError' ? 'The local model took too long. Try a smaller model.' : e.message);
    } finally {
      Busy(false);
    }
  }
  return <section className="task-details"><div className="form-grid"><label className="field">{tx("Priority level")}<select value={task.level || 'medium'} onChange={e => set('level', e.target.value)}><option value="high">{tx("High")}</option><option value="medium">{tx("Medium")}</option><option value="low">{tx("Low")}</option></select></label><label className="field">{tx("Category")}<select value={task.category || ''} onChange={e => {
          const c = state.categories?.find(x => x.id === e.target.value);
          set('category', e.target.value);
          if (c) {
            set('icon', c.icon);
            set('color', c.color);
          }
        }}><option value="">{tx("No category")}</option>{(state.categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><label className="field">{tx("Task notes")}<textarea value={task.taskNotes || ''} maxLength={10000} rows={3} onChange={e => set('taskNotes', e.target.value)} placeholder={tx("Details that belong to this task")} /></label><h3>{tx("Checklist")}</h3>{(task.subtasks || []).map(t => <div className="checklist-line" key={t.id}><input aria-label={tx('Complete step {title}', {title: t.title})} type="checkbox" checked={!!t.done} onChange={e => set('subtasks', task.subtasks.map(x => x.id === t.id ? {
        ...x,
        done: e.target.checked
      } : x))} /><input aria-label={tx("Step title")} value={t.title} maxLength={180} onChange={e => set('subtasks', task.subtasks.map(x => x.id === t.id ? {
        ...x,
        title: e.target.value
      } : x))} /><button type="button" className="text-btn" aria-label={tx('Remove step {title}', {title: t.title})} onClick={() => set('subtasks', task.subtasks.filter(x => x.id !== t.id))}>{tx("Remove")}</button></div>)}<div className="button-row"><input aria-label={tx("New checklist step")} value={step} maxLength={180} onChange={e => Step(e.target.value)} onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (step.trim() && (task.subtasks || []).length < 100) {
            set('subtasks', [...(task.subtasks || []), {
              id: uid(),
              title: step.trim(),
              done: false
            }]);
            Step('');
          }
        }
      }} /><button type="button" className="secondary" disabled={!step.trim() || (task.subtasks || []).length >= 100} onClick={() => {
        set('subtasks', [...(task.subtasks || []), {
          id: uid(),
          title: step.trim(),
          done: false
        }]);
        Step('');
      }}>{tx("Add step")}</button></div><p className="setup-note">{tx("Checklist steps do not add extra tasks to your daily score. Repeating occurrences have independent checklists.")}</p>{state.settings.aiEnabled && <><button type="button" className="secondary" disabled={busy || (state.settings.aiEngine!=='portable'&&!state.settings.aiModel) || !task.title.trim()} onClick={breakdown}>{busy ? tx("Thinking locally…") : tx("Suggest steps with local AI")}</button><p className="setup-note">{tx("Sends only this task’s title and notes to the selected local engine. Review every suggestion before adding it.")}</p>{error && <p role="alert">{tx(error)}</p>}{ideas.map(t => <div className="setting-row" key={t.id}><span>{t.title}</span><button type="button" className="tiny-btn" disabled={(task.subtasks || []).length >= 100} onClick={() => {
          set('subtasks', [...(task.subtasks || []), t]);
          Ideas(ideas.filter(x => x.id !== t.id));
        }}>{tx("Add")}</button><button type="button" className="text-btn" onClick={() => Ideas(ideas.filter(x => x.id !== t.id))}>{tx("Dismiss")}</button></div>)}</>}</section>;
}
