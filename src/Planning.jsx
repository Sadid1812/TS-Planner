import { t as tx, locale as uiLocale } from "./i18n.js";
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Icon } from './App';
import { dayKey, parseDay, shiftDay, tasksFor, minutes, clock, scheduleLayout, conflicts, patchOccurrence } from './model';
import { quickParse, reschedule, suggestions, withCalendar } from './planning';
export function QuickAdd({
  date,
  state,
  openTask
}) {
  const [text, Text] = useState('');
  return <form className="quick-add" onSubmit={e => {
    e.preventDefault();
    const parsed = quickParse(text, date, state.settings.duration || 30);
    openTask(parsed);
    Text('');
  }}><input aria-label={tx("Quick add task")} value={text} onChange={e => Text(e.target.value)} placeholder={tx("Call mom tomorrow 5pm")} required maxLength={240} /><button className="secondary">{tx("Review task ")}<Icon name="ArrowRight" size={16} /></button></form>;
}
export function WeekPlanner({
  state,
  date,
  update,
  openTask,
  go,
  events = []
}) {
  const scroll = useRef();
  useEffect(() => {
    if (scroll.current) {
      scroll.current.scrollTop = Math.max(0, minutes(state.settings.workStart || '09:00') * .7 + 110);
      if (scroll.current.clientWidth < 700) scroll.current.scrollLeft = (parseDay(date).getDay() + 6) % 7 * 160;
    }
  }, []);
  const [anchor, Anchor] = useState(date),
    [moving, Moving] = useState(null),
    [target, Target] = useState({
      date,
      start: '09:00'
    }),
    [warning, Warning] = useState(''),
    [proposals, Proposals] = useState(null);
  const monday = shiftDay(anchor, -((parseDay(anchor).getDay() + 6) % 7)),
    days = Array.from({
      length: 7
    }, (_, i) => shiftDay(monday, i));
  const offered = useRef(new Set());
  useEffect(() => {
    if (!state.settings.autoSchedule) {
      offered.current.clear();
      return;
    }
    const items = tasksFor(state, anchor).filter(t => !t.start && t.status === 'open');
    const fresh = items.some(t => !offered.current.has(t.key));
    for (const t of items) offered.current.add(t.key);
    if (fresh && !moving && !proposals) {
      const next = suggestions(state, anchor, events);
      if (next.length) Proposals(next);
    }
  }, [state, anchor, events, moving, proposals]);
  function propose(item, d, start) {
    if (item.status !== 'open') return;
    Moving(item);
    Target({
      date: d,
      start
    });
    Warning('');
  }
  function apply(allow = false) {
    if (moving.priority && moving.date !== target.date && moving.date >= dayKey() && tasksFor(state, target.date).filter(t => t.priority && t.status === 'open').length >= 3) {
      Warning('That day already has three priorities. Unstar a task first.');
      return;
    }
    const duration = moving.start ? minutes(moving.end) - minutes(moving.start) + (moving.overnight ? 1440 : 0) : state.settings.duration || 30;
    const candidate = {
      ...moving,
      ...target,
      end: clock(minutes(target.start) + duration),
      overnight: minutes(target.start) + duration >= 1440
    };
    const hits = conflicts(withCalendar(state, events), {
      ...candidate,
      excludeDate: moving.date
    });
    if (hits.length && !allow) {
      Warning('Overlaps with ' + hits.map(t => t.title).join(', '));
      return;
    }
    update(s => reschedule(s, moving, target.date, target.start), true);
    Moving(null);
  }
  return <section className="week-planner"><div className="month-heading"><h2>{parseDay(monday).toLocaleDateString(uiLocale(), {
          month: 'short',
          day: 'numeric'
        })} – {parseDay(days[6]).toLocaleDateString(uiLocale(), {
          month: 'short',
          day: 'numeric'
        })}</h2><div className="button-row"><button className="icon-btn" aria-label={tx("Previous week")} onClick={() => Anchor(shiftDay(anchor, -7))}><Icon name="ChevronLeft" /></button><button className="tiny-btn" onClick={() => Anchor(dayKey())}>{tx("This week")}</button><button className="icon-btn" aria-label={tx("Next week")} onClick={() => Anchor(shiftDay(anchor, 7))}><Icon name="ChevronRight" /></button></div></div><div className="button-row"><button className="secondary" onClick={() => Proposals(suggestions(state, anchor, events))}>{tx("Suggest time slots for ")}{anchor}</button><span className="setup-note">{tx("Drag a task to a time slot, or use its Move button.")}</span></div><div className="week-scroll" ref={scroll}><div className="week-columns">{days.map(d => {
          const items = tasksFor(state, d),
            external = events.filter(e => e.date === d && e.start),
            lanes = scheduleLayout([...items, ...external.map(e => ({
              ...e,
              key: e.id,
              status: 'open'
            }))]);
          return <section className="week-day" key={d}><button className={'week-date ' + (d === dayKey() ? 'selected' : '')} onClick={() => {
              Anchor(d);
              go(d);
            }}>{parseDay(d).toLocaleDateString(uiLocale(), {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}</button>{events.filter(e => e.date === d && !e.start).map(e => <p className="external-event" key={e.id}>{e.start || tx("All day")} · {e.title}</p>)}<div className="week-unscheduled">{items.filter(t => !t.start && t.status === 'open').map(t => <div key={t.key} draggable onDragStart={e => e.dataTransfer.setData('text/plain', JSON.stringify({
                id: t.id,
                date: t.date
              }))}><button onClick={() => openTask(t)}>{t.title}</button><button aria-label={tx('Move {title}', {title: t.title})} onClick={() => propose(t, d, '09:00')}>{tx("Move")}</button></div>)}</div><div className="week-hours">{external.map(e => <div className="week-block external-week" key={e.id} style={{
                top: minutes(e.start) * .7,
                height: Math.max(28, (minutes(e.end) - minutes(e.start)) * .7),
                left: (lanes[e.id]?.lane || 0) * 100 / (lanes[e.id]?.columns || 1) + '%',
                width: 100 / (lanes[e.id]?.columns || 1) + '%'
              }}>{e.start} · {e.title}<small>{e.source || tx("Calendar")}</small></div>)}{Array.from({
                length: 48
              }, (_, i) => i * 30).map(m => <button className="week-slot" key={m} aria-label={'Schedule ' + d + ' ' + clock(m)} onClick={() => openTask({
                date: d,
                start: clock(m),
                end: clock(m + 30),
                overnight: m + 30 === 1440
              })} onDragOver={e => e.preventDefault()} onDrop={e => {
                e.preventDefault();
                try {
                  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                  const t = tasksFor(state, data.date).find(t => t.id === data.id);
                  if (t) propose(t, d, clock(m));
                } catch {}
              }}>{m % 60 === 0 ? clock(m) : ''}</button>)}{items.filter(t => t.start && ['open', 'done'].includes(t.status)).map(t => <div className={'week-block ' + (t.color || 'lavender')} key={t.key} draggable={t.status === 'open'} onDragStart={e => e.dataTransfer.setData('text/plain', JSON.stringify({
                id: t.id,
                date: t.date
              }))} style={{
                top: minutes(t.start) * .7,
                height: Math.max(28, Math.min(1440 - minutes(t.start), minutes(t.end) - minutes(t.start) + (t.overnight ? 1440 : 0)) * .7),
                left: (lanes[t.key]?.lane || 0) * 100 / (lanes[t.key]?.columns || 1) + '%',
                width: 100 / (lanes[t.key]?.columns || 1) + '%'
              }}><button onClick={() => openTask(t)}>{t.start} {t.title}{t.overnight ? tx(" → next day") : ''}</button><button disabled={t.status !== 'open'} aria-label={tx('Move {title}', {title: t.title})} title={t.status !== 'open' ? tx("Reopen this task before moving it") : undefined} onClick={() => propose(t, d, t.start)}>{tx("Move")}</button></div>)}</div></section>;
        })}</div></div>
 {moving && <Dialog title={tx('Move {title}', {title: moving.title})} onClose={() => Moving(null)}><p>{moving.repeat !== 'none' ? tx("Only this occurrence will move; the repeating rule stays the same.") : tx("Choose its new day and time.")}</p><label className="field">{tx("Date")}<input type="date" value={target.date} onChange={e => {
          Target({
            ...target,
            date: e.target.value
          });
          Warning('');
        }} /></label><label className="field">{tx("Start")}<input type="time" value={target.start} onChange={e => {
          Target({
            ...target,
            start: e.target.value
          });
          Warning('');
        }} /></label>{warning && <p role="alert">{warning.startsWith('Overlaps with ') ? tx('Overlaps with {titles}', {titles: warning.slice('Overlaps with '.length)}) : tx(warning)}</p>}<button className="primary" disabled={!target.date || !target.start} onClick={() => apply(warning.startsWith('Overlaps with'))}>{warning.startsWith('Overlaps with') ? tx("Keep overlap and move") : tx("Move occurrence")}</button></Dialog>}
 {proposals && <Dialog title={tx("Suggested time slots")} onClose={() => Proposals(null)}><p>{tx("These use your work hours, task duration, and breaks. Nothing moves until you accept it. These are rule-based suggestions.")}</p>{!proposals.length && <p>{tx("No unscheduled tasks fit the available time. Adjust your work hours in Settings.")}</p>}{proposals.map(t => <div className="setting-row" key={t.key}><span>{t.title}<small> {t.start}–{t.end}</small></span><button className="secondary" onClick={() => {
          const current = tasksFor(state, t.date).find(x => x.id === t.id);
          if (current?.start || conflicts(withCalendar(state, events), t).length) {
            Proposals(proposals.filter(x => x.key !== t.key));
            return;
          }
          update(s => patchOccurrence(s, t.id, t.date, {
            start: t.start,
            end: t.end,
            overnight: false
          }), true);
          Proposals(proposals.filter(x => x.key !== t.key));
        }}>{tx("Accept")}</button><button className="text-btn" onClick={() => Proposals(proposals.filter(x => x.key !== t.key))}>{tx("Dismiss")}</button></div>)}</Dialog>}
 </section>;
}
export function Inbox({
  items,
  close,
  update,
  move,
  today
}) {
  const [dates, Dates] = useState({});
  const groups = Object.groupBy ? Object.groupBy(items, t => t.date) : items.reduce((x, t) => ({
    ...x,
    [t.date]: [...(x[t.date] || []), t]
  }), {});
  return <Dialog title={tx('Unfinished work · {count}', {count: items.length})} onClose={close} wide><p>{tx("Decide what comes next. Dismissing an item keeps its original history.")}</p>{!items.length && <p>{tx("You’re all caught up.")}</p>}{Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([d, ts]) => <section key={d}><div className="section-title"><h3>{d} · {ts.length}{tx(" tasks")}</h3><button className="text-btn" onClick={() => update(s => ({
          ...s,
          dismissed: [...new Set([...s.dismissed, ...ts.map(t => t.key)])]
        }), true)}>{tx("Dismiss this day")}</button></div>{ts.map(t => <div className="inbox-item" key={t.key}><Icon name={t.icon} /><div><strong>{t.title}</strong><div className="button-row"><button className="tiny-btn" onClick={() => move(t, today)}>{tx("Move to today")}</button><input type="date" aria-label={tx('Reschedule {title}', {title: t.title})} value={dates[t.key] || today} onChange={e => Dates({
              ...dates,
              [t.key]: e.target.value
            })} /><button className="tiny-btn" onClick={() => move(t, dates[t.key] || today)}>{tx("Reschedule")}</button><button className="text-btn" onClick={() => update(s => ({
              ...s,
              dismissed: [...s.dismissed, t.key]
            }), true)}>{tx("Dismiss")}</button></div></div></div>)}</section>)}<p className="setup-note">{tx("Recurring reminders cover the last 30 days. Earlier outcomes remain in Calendar.")}</p></Dialog>;
}
