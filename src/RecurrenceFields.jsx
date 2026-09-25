import { t as tx, locale as uiLocale } from "./i18n.js";
import React from 'react';
export function RecurrenceFields({
  task,
  set,
  disabled
}) {
  if (!task.repeat || task.repeat === 'none') return null;
  const rule = task.rule || {
    unit: 'week',
    interval: 1,
    days: [new Date(task.date + 'T12:00:00').getDay()]
  };
  const change = (key, value) => set('rule', {
    ...rule,
    [key]: value
  });
  return <fieldset disabled={disabled} className="recurrence-fields"><legend>{tx("Repeating schedule")}</legend>{task.repeat === 'custom' && <><div className="form-grid"><label className="field">{tx("Every")}<input type="number" min="1" max="365" required value={rule.interval} onChange={e => change('interval', Number(e.target.value))} /></label><label className="field">{tx("Unit")}<select value={rule.unit} onChange={e => change('unit', e.target.value)}><option value="day">{tx("Days")}</option><option value="week">{tx("Weeks")}</option><option value="month">{tx("Months")}</option></select></label></div>{rule.unit === 'week' && <div className="button-row">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => <label key={label}><input type="checkbox" checked={rule.days?.includes(index) || false} onChange={e => change('days', e.target.checked ? [...(rule.days || []), index] : (rule.days || []).filter(d => d !== index))} />{tx(label)}</label>)}</div>}{rule.unit === 'month' && <p className="setup-note">{tx("Repeats on day ")}{Number(task.date.slice(8))}{tx(" of the month. Months without that day are skipped.")}</p>}</>}<label className="field">{tx("Last day ")}<span>{tx("optional")}</span><input type="date" min={task.date} value={task.until || ''} onChange={e => set('until', e.target.value)} /></label></fieldset>;
}
