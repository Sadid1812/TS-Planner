import { t as tx, locale as uiLocale } from "./i18n.js";
import React, { useState, useEffect, useRef } from 'react';
import { dayKey, shiftDay } from './model';
import { exportCalendar } from './ical-export';
export function CalendarFiles({
  state,
  events,
  setEvents
}) {
  const [from, From] = useState(dayKey()),
    [until, Until] = useState(shiftDay(dayKey(), 90)),
    [notes, Notes] = useState(false),
    [busy, Busy] = useState(false),
    [error, ErrorMessage] = useState(''),
    [preview, Preview] = useState(null);
  const worker = useRef(),
    timer = useRef();
  useEffect(() => () => {
    worker.current?.terminate();
    worker.current = null;
    clearTimeout(timer.current);
  }, []);
  function read(file) {
    ErrorMessage('');
    Preview(null);
    if (file.size > 2000000) {
      ErrorMessage('Choose a calendar smaller than 2 MB.');
      return;
    }
    Busy(true);
    worker.current?.terminate();
    clearTimeout(timer.current);
    const current = new Worker(new URL('./ical-worker.js', import.meta.url), {
      type: 'module'
    });
    worker.current = current;
    const finish = () => {
      current.terminate();
      if (worker.current !== current) return;
      worker.current = null;
      clearTimeout(timer.current);
      Busy(false);
    };
    current.onmessage = e => {
      finish();
      if (e.data.error) ErrorMessage(e.data.error);else Preview(e.data.events);
    };
    current.onerror = () => {
      finish();
      ErrorMessage('This calendar could not be read.');
    };
    timer.current = setTimeout(() => {
      finish();
      ErrorMessage('Calendar processing took too long. Export a shorter date range.');
    }, 10000);
    file.text().then(text => {
      if (worker.current === current) current.postMessage({
        text,
        from: shiftDay(dayKey(), -30),
        until: shiftDay(dayKey(), 90)
      });
    }).catch(() => {
      if (worker.current !== current) return;
      finish();
      ErrorMessage('The file could not be opened.');
    });
  }
  return <section className="settings-section"><h2>{tx("Apple / Outlook calendar files")}</h2><p>{tx("Import an .ics export from Apple Calendar, Outlook, or another calendar. This is a local file snapshot, not live sync. It stays in this session and never counts toward your progress or goes to Family.")}</p><label className="secondary file-button">{busy ? tx("Reading calendar…") : tx("Choose .ics file")}<input disabled={busy} type="file" accept=".ics,text/calendar" onChange={e => {
        const file = e.target.files?.[0];
        if (file) read(file);
        e.target.value = '';
      }} /></label>{preview && <div><p>{preview.length}{tx(" day entries found between ")}{shiftDay(dayKey(), -30)}{tx(" and ")}{shiftDay(dayKey(), 90)}.</p><ul>{preview.slice(0, 5).map(e => <li key={e.id}>{e.date} · {e.start || tx("All day")} · {e.title}</li>)}</ul><button className="secondary" onClick={() => {
        setEvents(preview);
        Preview(null);
      }}>{tx("Show imported calendar")}</button><button className="text-btn" onClick={() => Preview(null)}>{tx("Cancel import")}</button></div>}{events.length > 0 && <p>{events.length}{tx(" imported entries visible. ")}<button className="text-btn" onClick={() => setEvents([])}>{tx("Remove imported display")}</button></p>}<h3>{tx("Export your planner")}</h3><p>{tx("Download dated task occurrences for calendar import. Recurring tasks become separate events in this range. Completed tasks are included; skipped and cancelled tasks are excluded. Later changes require another export.")}</p><div className="form-grid"><label className="field">{tx("Export from")}<input type="date" value={from} onChange={e => From(e.target.value)} /></label><label className="field">{tx("Export through")}<input type="date" value={until} min={from} onChange={e => Until(e.target.value)} /></label></div><label className="age-confirm"><input type="checkbox" checked={notes} onChange={e => Notes(e.target.checked)} />{tx("Include subtitles and private task notes in this file")}</label><button className="secondary" onClick={() => {
      try {
        const text = exportCalendar(state, from, until, notes),
          url = URL.createObjectURL(new Blob([text], {
            type: 'text/calendar;charset=utf-8'
          }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ts-planner.ics';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        ErrorMessage('');
      } catch (e) {
        ErrorMessage(e.message);
      }
    }}>{tx("Download calendar file")}</button>{error && <p role="alert">{tx(error)}</p>}</section>;
}
