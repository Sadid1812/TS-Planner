import {availableModels} from './local-ai.js';
import { t as tx, locale as uiLocale } from "./i18n.js";
import { CalendarFiles } from './CalendarFiles';
import React, { useState } from 'react';
import { ICONS, uid } from './model';
import { planningDefaults } from './planning';
import { CalendarConnection } from './external-calendar';
export function MoreSettings({
  state,
  update,
  say,
  session,
  events,
  setEvents,
  fileEvents,
  setFileEvents
}) {
  const prefs = {
      ...planningDefaults,
      ...state.settings
    },
    [name, Name] = useState(''),
    [error, Error] = useState('');
  const set = (k, v) => update(s => ({
    ...s,
    settings: {
      ...s.settings,
      [k]: v
    }
  }));
  function category(id, patch) {
    update(s => ({
      ...s,
      categories: (s.categories || []).map(c => c.id === id ? {
        ...c,
        ...patch
      } : c)
    }));
  }
  return <><section className="settings-section"><h2>{tx("Scheduling")}</h2><div className="form-grid"><label className="field">{tx("Work starts")}<input type="time" value={prefs.workStart} onChange={e => set('workStart', e.target.value)} /></label><label className="field">{tx("Work ends")}<input type="time" value={prefs.workEnd} onChange={e => set('workEnd', e.target.value)} /></label><label className="field">{tx("Default task duration")}<select value={prefs.duration} onChange={e => set('duration', +e.target.value)}>{[15, 30, 45, 60, 90, 120].map(n => <option key={n} value={n}>{n}{tx(" minutes")}</option>)}</select></label><label className="field">{tx("Break between tasks")}<select value={prefs.breakMinutes} onChange={e => set('breakMinutes', +e.target.value)}>{[0, 5, 10, 15, 30].map(n => <option key={n} value={n}>{n}{tx(" minutes")}</option>)}</select></label></div><label className="age-confirm"><input type="checkbox" checked={!!prefs.autoSchedule} onChange={e => set('autoSchedule', e.target.checked)} />{tx("Offer time slots automatically in Week view")}</label><p className="setup-note">{tx("Week view suggests available slots within these hours. You accept each suggestion; existing plans are never silently rearranged.")}</p>{prefs.workStart >= prefs.workEnd && <p role="alert">{tx("Choose an end later than the start for scheduling suggestions.")}</p>}</section><section className="settings-section"><h2>{tx("Daily digest")}</h2><label className="age-confirm"><input type="checkbox" checked={prefs.digest} onChange={e => set('digest', e.target.checked)} />{tx("Show a daily summary notification")}</label><label className="field">{tx("Digest time")}<input type="time" value={prefs.digestTime} onChange={e => set('digestTime', e.target.value)} /></label><p className="setup-note">{window.tsDesktop?.schedule ? tx("Requires Windows reminders to be enabled. Delivery is checked each minute while you are signed in and the device is awake, including after quitting.") : tx("Requires reminders to be enabled, an open tab, and an awake device. Background delivery can be delayed.")}</p></section><section className="settings-section"><h2>{tx("Categories")}</h2>{(state.categories || []).map(c => <div className="category-editor" key={c.id}><input aria-label={tx("Category name")} maxLength={40} value={c.name} onChange={e => category(c.id, {
          name: e.target.value
        })} /><select aria-label={'Icon for ' + c.name} value={c.icon} onChange={e => category(c.id, {
          icon: e.target.value
        })}>{ICONS.map(i => <option key={i}>{i}</option>)}</select><select aria-label={'Color for ' + c.name} value={c.color} onChange={e => category(c.id, {
          color: e.target.value
        })}>{['lavender', 'rose', 'sage', 'blue', 'peach'].map(i => <option key={i}>{i}</option>)}</select><button className="text-btn" onClick={() => update(s => ({
          ...s,
          categories: s.categories.filter(x => x.id !== c.id),
          tasks: s.tasks.map(t => ({
            ...t,
            category: t.category === c.id ? '' : t.category,
            exceptions: Object.fromEntries(Object.entries(t.exceptions || {}).map(([d, x]) => [d, {
              ...x,
              category: x.category === c.id ? '' : x.category
            }]))
          }))
        }), true)}>{tx("Delete")}</button></div>)}<form className="button-row" onSubmit={e => {
        e.preventDefault();
        update(s => ({
          ...s,
          categories: [...(s.categories || []), {
            id: uid(),
            name: name.trim(),
            icon: 'BookOpen',
            color: 'lavender'
          }]
        }));
        Name('');
      }}><input aria-label={tx("New category name")} value={name} maxLength={40} onChange={e => Name(e.target.value)} /><button className="secondary" disabled={!name.trim() || (state.categories || []).length >= 50}>{tx("Add category")}</button></form></section><section className="settings-section"><h2>{tx("Local AI")}</h2><p>{tx("Optional task breakdown on your own computer. Choose the portable engine or an existing Ollama installation. No paid API is connected. The model uses your computer’s memory and processing power.")}</p><label className="age-confirm"><input type="checkbox" checked={prefs.aiEnabled} onChange={e => set('aiEnabled', e.target.checked)} />{tx("Enable local AI suggestions")}</label>{prefs.aiEnabled && <><label className="field">{tx("Local engine")}<select value={prefs.aiEngine||'ollama'} onChange={e=>set('aiEngine',e.target.value)}><option value="portable">{tx("TS Planner portable AI")}</option><option value="ollama">Ollama</option></select></label>{prefs.aiEngine==='portable'&&<p className="setup-note">{tx("Start the optional Local AI kit on this Windows computer before requesting suggestions. Its model stays on your device.")}</p>}{prefs.aiEngine!=='portable'&&<label className="field">{tx("Installed Ollama model")}<input value={prefs.aiModel} placeholder={tx("Your installed model name")} maxLength={100} onChange={e => set('aiModel', e.target.value)} /></label>}<button className="secondary" onClick={async () => {
          try {
            Error('');
            const models=await availableModels(prefs.aiEngine);say(tx('Available models: ')+models.join(', '));
          } catch {
            Error('Local AI is unavailable. Start the selected engine and allow this planner’s exact origin. Hosted browsers may block local access.');
          }
        }}>{tx("Check local connection")}</button>{error && <p role="alert">{error}</p>}<p className="setup-note">{tx("Only explicit requests send task text to a local endpoint. Enabling this option does not download a model or send your whole planner.")}</p></>}</section><CalendarConnection {...{
      session,
      events,
      setEvents,
      say
    }} /><CalendarFiles state={state} events={fileEvents} setEvents={setFileEvents} /></>;
}
