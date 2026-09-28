import {createSaveQueue} from './persistence.js';
import {setLanguage as setUILanguage} from './i18n.js';
import { t as tx, locale as uiLocale } from "./i18n.js";
import { withCalendar } from './planning.js';
import { RecurrenceFields } from './RecurrenceFields.jsx';
import { validRule } from './recurrence.js';
import { reminderSnapshot } from './reminders.js';
import { QuickAdd, WeekPlanner, Inbox } from './Planning.jsx';
import { TaskDetails } from './TaskDetails';
import { MoreSettings } from './MoreSettings';
import { verifiedGmail } from './sync-model';
import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight, ArrowUpRight, Bell, Bike, BookOpen, BriefcaseBusiness, Calendar, CalendarDays, ChartNoAxesColumn, Check, CheckCheck, ChevronLeft, ChevronRight, Cloud, Coffee, Copy, Dog, Download, Droplets, Dumbbell, Flame, Gamepad2, GraduationCap, Heart, House, Laptop, Leaf, LogIn, LogOut, Moon, MoreHorizontal, Music, NotebookPen, Palette, Phone, Pill, Plane, Plus, Printer, RefreshCw, Search, Settings as SettingsIcon, ShieldCheck, ShoppingBag, Sprout, Star, Sun, Target, Trash2, Type, Upload, Users, Utensils, Wallet, WifiOff, X, Zap } from 'lucide-react';
const L = {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bike,
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Coffee,
  Copy,
  Dog,
  Download,
  Droplets,
  Dumbbell,
  Flame,
  Gamepad2,
  GraduationCap,
  Heart,
  House,
  Laptop,
  Leaf,
  LogIn,
  LogOut,
  Moon,
  MoreHorizontal,
  Music,
  NotebookPen,
  Palette,
  Phone,
  Pill,
  Plane,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings: SettingsIcon,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Star,
  Sun,
  Target,
  Trash2,
  Type,
  Upload,
  Users,
  Utensils,
  Wallet,
  WifiOff,
  X,
  Zap
};
import { dayKey, parseDay, shiftDay, minutes, uid, THEMES, ICONS, emptyState, tasksFor, stat, patchOccurrence, moveOccurrence, editTask, conflicts, nextSlot, scheduleLayout, overdue, creditedDays, reward, validateImport } from './model';
import * as disk from './storage';
import { cloud, configured, login, rpc } from './cloud';
export function Icon({
  name,
  size = 20,
  ...rest
}) {
  const C = L[name] || L.Check;
  return <C size={size} strokeWidth={1.65} aria-hidden="true" {...rest} />;
}
const nav = [['today', 'House', 'Today'], ['calendar', 'CalendarDays', 'Calendar'], ['family', 'Users', 'Family'], ['progress', 'ChartNoAxesColumn', 'Progress']];
const label = s => s.replace(/([a-z])([A-Z])/g, '$1 $2');
export function exportFile(s, name = 'ts-planner-backup.json') {
  const u = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], {
    type: 'application/json'
  }));
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export function Dialog({
  title,
  onClose,
  children,
  wide = false
}) {
  const ref = useRef();
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return <dialog className={'dialog ' + (wide ? 'wide' : '')} ref={ref} onCancel={onClose}><div className="dialog-heading"><h2>{title}</h2><button className="icon-btn" aria-label={tx("Close dialog")} onClick={onClose}><Icon name="X" /></button></div>{children}</dialog>;
}
export function App() {
  const [calMode, CalMode] = useState('week'),
    [googleCalendar, Events] = useState([]),
    [fileEvents, FileEvents] = useState([]),
    [s, S] = useState(null),
    [route, R] = useState('today'),
    [date, D] = useState(dayKey()),
    [month, M] = useState(dayKey()),
    [query, Q] = useState(''),
    [modal, Modal] = useState(null),
    [editing, E] = useState(null),
    [toast, T] = useState(null),
    [error, Err] = useState(''),
    [saving, Saving] = useState(false),
    [online, Online] = useState(navigator.onLine),
    [session, Session] = useState(null);
  setUILanguage(s?.settings.language || 'en');
  const events = [...googleCalendar, ...fileEvents];
  useEffect(() => {
    Events([]);
    FileEvents([]);
  }, [session?.user?.id]);
  const ref = useRef(null),
    queue = useRef(Promise.resolve()),
    writer = useRef(null),
    lastUndo = useRef(null),
    key = useRef('local'),
    persistError = useRef(null),
    pending = useRef(0),
    channel = useRef(null),
    timer = useRef(),
    sent = useRef(new Set());
  if (!writer.current) writer.current = createSaveQueue(disk.save);
  function say(text, undo = false) {
    T({
      text,
      undo
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => T(null), 6000);
  }
  useEffect(() => {
    let alive = true;
    disk.load().then(x => {
      if (alive) {
        ref.current = x || emptyState();
        S(ref.current);
      }
    }).catch(e => Err(e.message));
    const on = () => Online(navigator.onLine);
    addEventListener('online', on);
    addEventListener('offline', on);
    const accept = x => {
      if (!alive) return;
      if (x && !verifiedGmail(x.user)) {
        Session(null);
        Err('Use a verified Google account ending in @gmail.com.');
        setTimeout(() => cloud.auth.signOut(), 0);
        return;
      }
      Session(x);
    };
    let subscription;
    if (cloud) {
      cloud.auth.getSession().then(({
        data,
        error
      }) => {
        if (error) Err(error.message);else accept(data.session);
      }).catch(e => Err(e.message));
      subscription = cloud.auth.onAuthStateChange((_e, x) => accept(x)).data.subscription;
    }
    const params = new URLSearchParams(location.search);
    if (params.has('error')) {
      Err('Google sign-in did not finish. Please try again.');
      history.replaceState(null, '', location.pathname);
    }
    return () => {
      alive = false;
      subscription?.unsubscribe();
      removeEventListener('online', on);
      removeEventListener('offline', on);
    };
  }, []);
  useEffect(() => {
    const k = session?.user?.id || 'local';
    if (!s || k === key.current) return;
    let canceled = false;
    queue.current.then(async () => {
      if (persistError.current) {
        Err("Unsaved changes need recovery. Export your recovery copy before reloading.");
        return;
      }
      const x = (await disk.load(k)) || emptyState();
      if (canceled) return;
      key.current = k;
      lastUndo.current = null;
      ref.current = x;
      S(x);
      if (session) Modal('account');
    }).catch(e => Err(e.message));
    return () => {
      canceled = true;
    };
  }, [session?.user?.id, s === null]);
  useEffect(() => {
    channel.current = new BroadcastChannel('ts-planner');
    channel.current.onmessage = async e => {
      if (e.data === key.current && !pending.current && !persistError.current) {
        const account = key.current;
        try {
          const x = await disk.load(account);
          if (account === key.current && !pending.current && !persistError.current &&
              x && ref.current && x.revision > ref.current.revision) {
            ref.current = x;
            lastUndo.current = null;
            S(x);
          }
        } catch (error) { Err(error.message); }
      }
    };
    return () => channel.current.close();
  }, []);
  useEffect(() => {
    if (!s) return;
    document.documentElement.lang = s.settings.language || 'en';
    document.documentElement.dataset.theme = s.settings.theme;
    document.documentElement.dataset.font = s.settings.font;
    document.documentElement.dataset.motion = s.settings.reducedMotion ? 'reduce' : 'normal';
    document.title = 'TS Planner · ' + label(route);
    window.tsDesktop?.ready?.();
  }, [s?.settings, route]);
  useEffect(() => {
    const on = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search').focus();
      }
      if (e.key === 'n' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !modal) {
        e.preventDefault();
        openTask();
      }
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [modal, date]);
  useEffect(() => {
    const f = e => {
      if (pending.current || persistError.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    addEventListener('beforeunload', f);
    if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
    return () => removeEventListener('beforeunload', f);
  }, []);
  useEffect(() => {
    if (!window.tsDesktop?.schedule) return;
    const status = e => {
      window.tsReminderStatus = e.detail.ok ? 'ready' : 'failed';
      if (!e.detail.ok) Err('Windows reminder scheduling failed. Open Settings to retry; closed-app delivery is unavailable until setup succeeds.');
    };
    addEventListener('ts-reminder-status', status);
    return () => removeEventListener('ts-reminder-status', status);
  }, []);
  useEffect(() => {
    if (!window.tsDesktop?.schedule) return;
    const account = session?.user?.id || 'local';
    if (account !== key.current) {
      window.tsDesktop.schedule(reminderSnapshot(null, account));
      return;
    }
    if (s && !saving && !persistError.current) window.tsDesktop.schedule(reminderSnapshot(s, account));
  }, [s, saving, session?.user?.id]);
  useEffect(() => {
    const t = setInterval(() => {
      const x = ref.current;
      if (!x?.settings.reminders || window.tsDesktop?.schedule) return;
      const digestKey = 'digest:' + dayKey();
      if (x.settings.digest && !sent.current.has(digestKey) && Date.now() >= new Date(dayKey() + 'T' + (x.settings.digestTime || '08:00')).getTime() && Date.now() - new Date(dayKey() + 'T' + (x.settings.digestTime || '08:00')).getTime() < 60000) {
        sent.current.add(digestKey);
        const text = tasksFor(x, dayKey()).filter(t => t.status === 'open').length + ' tasks planned for today.';
        if (window.tsDesktop) window.tsDesktop.notify(text);else if ('Notification' in window && Notification.permission === 'granted') new Notification('Your daily plan', {
          body: text
        });
      }
      for (const t of [...tasksFor(x, dayKey()), ...tasksFor(x, shiftDay(dayKey(), 1))]) {
        if (!t.start || !t.reminder || t.status !== 'open') continue;
        const at = new Date(t.date + 'T' + t.start).getTime() - (t.reminder === -1 ? 0 : t.reminder) * 60000,
          k = t.key + at;
        if (Date.now() >= at && Date.now() < at + 60000 && !sent.current.has(k)) {
          sent.current.add(k);
          if (window.tsDesktop) window.tsDesktop.notify(t.title);else if ('Notification' in window && Notification.permission === 'granted') new Notification('TS Planner', {
            body: t.title,
            tag: k
          });
        }
      }
    }, 15000);
    return () => clearInterval(t);
  }, []);
  function update(fn, undo = false) {
    const before = ref.current;
    if (undo) lastUndo.current = structuredClone(before);
    const next = fn(structuredClone(before));
    next.revision = before.revision + 1;
    ref.current = next;
    S(next);
    pending.current++;
    Saving(true);
    const k = key.current;
    queue.current = queue.current.then(() => writer.current.enqueue({
      ...next,
      revision: before.revision
    }, k)).then(() => {
      persistError.current = null;
      channel.current?.postMessage(k);
    }).catch(e => {
      persistError.current = e;
      Err(e.message);
    }).finally(() => {
      pending.current--;
      if (!pending.current) Saving(false);
    });
  }
  function undo() {
    if (lastUndo.current) {
      const old = lastUndo.current;
      update(x => ({
        ...old,
        revision: x.revision
      }));
      lastUndo.current = null;
      say('Change undone');
    }
  }
  function openTask(t = null) {
    E(t);
    Modal('task');
  }
  function toggle(t) {
    if (t.date > dayKey()) {
      say('Complete future tasks when their day arrives.');
      return;
    }
    const done = t.status !== 'done';
    update(x => patchOccurrence(x, t.id, t.date, {
      status: done ? 'done' : 'open',
      completedAt: done ? new Date().toISOString() : null
    }), true);
    say(done ? 'One more thing done.' : 'Task reopened', true);
  }
  function status(t, v) {
    update(x => patchOccurrence(x, t.id, t.date, {
      status: v
    }), true);
    say(v === 'skipped' ? 'Occurrence skipped' : 'Task canceled', true);
  }
  function move(t, to) {
    update(x => moveOccurrence(x, t.id, t.date, to), true);
    say(tx('Moved to {date}. Previous history is preserved.', {date: to}), true);
  }
  if (!s || key.current !== (session?.user?.id || 'local')) return <div className="loading"><Icon name="Sprout" size={36} /><h1>TS Planner</h1><p>{error || tx("Opening your day…")}</p>{persistError.current && ref.current && <button className="secondary" onClick={() => exportFile(ref.current)}>{tx("Export recovery copy")}</button>}</div>;
  const today = dayKey(),
    items = tasksFor(s, date),
    st = stat(s, date),
    missed = overdue(s),
    wins = creditedDays(s),
    week = Array.from({
      length: 7
    }, (_, i) => shiftDay(today, i - 6));
  const lanes = scheduleLayout([...items, ...events.filter(e => e.date === date && e.start).map(e => ({
    ...e,
    key: e.id,
    status: 'open'
  }))]);
  const fmt = t => {
    if (!t) return '';
    if (s.settings.clock24) return t;
    const h = Number(t.slice(0, 2));
    return `${h % 12 || 12}:${t.slice(3)} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const range = t => t.start ? `${fmt(t.start)} – ${fmt(t.end)}${t.overnight ? ' +1 day' : ''}` : '';
  const go = d => {
    D(d);
    R('today');
    Q('');
  };
  return <div className="app-shell"><aside className="sidebar"><button className="brand" onClick={() => go(today)}><span>TS</span> Planner</button><nav aria-label={tx("Main navigation")}>{nav.map(([id, icon, name]) => <button key={id} className={'nav-item ' + (route === id ? 'active' : '')} aria-current={route === id ? 'page' : undefined} onClick={() => {
          R(id);
          Q('');
        }}><Icon name={icon} size={24} />{tx(name)}</button>)}</nav><div className="sidebar-bottom"><button className={'nav-item ' + (route === 'settings' ? 'active' : '')} onClick={() => R('settings')}><Icon name="Settings" size={23} />{tx("Settings")}</button><button className="profile-chip" onClick={() => Modal('account')}><span className="avatar">{(s.settings.name || 'You')[0]}</span><span>{s.settings.name || tx("Your space")}<small>{session ? tx("Gmail account") : tx("On this device")}</small></span><Icon name="ArrowUpRight" size={16} /></button><p className="sidebar-motto"><Icon name="Sprout" size={29} /><span>{tx("A calmer day,")}<br />{tx("a brighter tomorrow.")}</span></p></div></aside><main className="main"><header className="topbar"><div className="date-nav"><button className="icon-btn round" aria-label={tx("Previous day")} onClick={() => go(shiftDay(date, -1))}><Icon name="ChevronLeft" /></button><button className="date-label" title={tx("Jump to today")} onClick={() => go(today)}>{parseDay(date).toLocaleDateString(uiLocale(), {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}</button><button className="icon-btn round" aria-label={tx("Next day")} onClick={() => go(shiftDay(date, 1))}><Icon name="ChevronRight" /></button>{date !== today && <button className="tiny-btn" onClick={() => go(today)}>{tx("Today")}</button>}</div><div className="top-actions"><div className="search"><Icon name="Search" /><input id="search" aria-label={tx("Search tasks and notes")} placeholder={tx("Search tasks, notes…")} value={query} onChange={e => Q(e.target.value)} />{query ? <button className="icon-btn" aria-label={tx("Clear search")} onClick={() => Q('')}><Icon name="X" size={16} /></button> : <kbd>Ctrl K</kbd>}</div><button className="icon-btn bell" aria-label={tx('Notifications, {count} unfinished tasks', {count: missed.length})} onClick={() => Modal('inbox')}><Icon name="Bell" size={26} />{missed.length > 0 && <i />}</button></div></header>
 {error && <div className="error-banner" role="alert">{tx(error)}<button onClick={() => exportFile(s)}>{tx("Export recovery copy")}</button></div>}{!online && <div className="offline-banner"><Icon name="WifiOff" size={16} />{tx(" Offline. Your planner still saves on this device.")}</div>}
 {query ? <section className="page"><p className="eyebrow">{tx("YOUR PERSONAL PLANNER")}</p><h1>{tx("Search results")}</h1>{s.tasks.filter(t => !t.deleted && [t.title, t.description, t.taskNotes, ...(t.subtasks || []).map(x => x.title)].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase())).map(t => <button className="result-row" key={t.id} onClick={() => {
          go(t.date);
          openTask(t);
        }}><Icon name={t.icon} /><span><strong>{t.title}</strong><small>{t.date}</small></span><Icon name="ArrowUpRight" /></button>)}{Object.entries(s.notes).filter(([, v]) => v.toLowerCase().includes(query.toLowerCase())).map(([d, v]) => <button className="result-row" key={d} onClick={() => go(d)}><Icon name="NotebookPen" /><span><strong>{tx("Daily note · ")}{d}</strong><small>{v.slice(0, 150)}</small></span></button>)}</section> : <>
 {route === 'today' && <><QuickAdd date={date} state={s} openTask={openTask} /><div className="planner-columns"><section className="task-panel"><div className="hero"><h1>{tx("Make room for what matters.")}</h1><p>{tx("A little progress, every day.")}</p></div><div className="completion"><span>{st.done}{tx(" of ")}{st.total}{tx(" tasks")}</span><progress value={st.done} max={st.total || 1} aria-label={tx("Daily task completion")} /><strong>{st.pct === null ? '—' : st.pct + '%'}</strong></div><div className="section-title"><h2>{date === today ? tx("Today’s") : tx("Daily")}{tx(" priorities")}</h2><span>{items.filter(t => t.priority && t.status === 'open').length}/3</span></div><div className="task-list">{items.filter(t => t.priority && t.status === 'open').map(t => <Row t={t} key={t.key} toggle={toggle} openTask={openTask} range={range} />)}{!items.some(t => t.priority && t.status === 'open') && <button className="empty-priority" onClick={() => openTask({
                  priority: true
                })}><Icon name="Star" /><span>{tx("Choose what matters today")}<small>{tx("Add up to three priorities")}</small></span><Icon name="Plus" /></button>}</div><div className="section-title other-heading"><h2>{tx("Other tasks")}</h2><button className="text-btn" onClick={() => openTask()}><Icon name="Plus" size={16} />{tx("Add")}</button></div><div className="task-list">{items.filter(t => !t.priority || t.status !== 'open').map(t => <Row t={t} key={t.key} toggle={toggle} openTask={openTask} range={range} />)}{!items.some(t => !t.priority || t.status !== 'open') && <p className="empty-small">{tx("Room for a fresh start.")}</p>}</div><div className="task-footer"><span><Icon name="CheckCheck" size={15} />{tx("Small steps still count.")}</span><button className="text-btn" onClick={() => window.print()}><Icon name="Printer" size={16} />{tx("Print")}</button></div></section><section className="schedule-panel"><div className="schedule-heading"><h2>{date === today ? tx("Today") : parseDay(date).toLocaleDateString(uiLocale(), {
                    month: 'short',
                    day: 'numeric'
                  })}</h2><button className="primary" onClick={() => openTask()}><Icon name="Plus" size={22} />{tx("Add task")}</button></div>{events.filter(e => e.date === date && !e.start).map(e => <p className="external-event" key={e.id}>{tx("All day · ")}{e.title}</p>)}<div className="timeline">{events.filter(e => e.date === date && e.start && minutes(e.end) > 480 && minutes(e.start) < 1140).map(e => <div className="external-timeline" key={e.id} style={{
                  top: (Math.max(480, minutes(e.start)) - 480) / 60 * 55 + 14,
                  height: Math.max(24, (Math.min(1140, minutes(e.end)) - Math.max(480, minutes(e.start))) / 60 * 55),
                  left: `calc(59px + (100% - 59px) * ${(lanes[e.id]?.lane || 0) / (lanes[e.id]?.columns || 1)})`,
                  width: `calc((100% - 59px) / ${lanes[e.id]?.columns || 1} - 4px)`
                }}>{e.start} · {e.title}</div>)}{Array.from({
                  length: 11
                }, (_, i) => i + 8).map(h => <div className="hour-row" key={h}><span>{fmt(`${String(h).padStart(2, '0')}:00`)}</span><button aria-label={tx('Add task at {time}', {time: fmt(`${String(h).padStart(2, '0')}:00`)})} onClick={() => openTask({
                    start: `${String(h).padStart(2, '0')}:00`,
                    end: `${String(h + 1).padStart(2, '0')}:00`
                  })} /></div>)}{items.filter(t => t.start && ['open', 'done'].includes(t.status)).map(t => {
                  const m = minutes(t.start),
                    top = (m - 480) / 60 * 55,
                    duration = Math.max(30, minutes(t.end) - m + (t.overnight ? 1440 : 0));
                  if (m < 480 || m >= 1140) return null;
                  return <button key={t.key} className={'time-block ' + (t.color || 'lavender') + (t.status === 'done' ? ' done-block' : '')} style={{
                    top: top + 14,
                    height: Math.min(duration / 60 * 55, 605 - top),
                    left: `calc(59px + (100% - 59px) * ${(lanes[t.key]?.lane || 0) / (lanes[t.key]?.columns || 1)})`,
                    width: `calc((100% - 59px) / ${lanes[t.key]?.columns || 1} - ${(lanes[t.key]?.columns || 1) > 1 ? 4 : 0}px)`,
                    right: "auto"
                  }} onClick={() => openTask(t)}><div><strong>{t.title}</strong><small>{range(t)}</small></div>{duration >= 55 && <span>{t.description}</span>}</button>;
                })}</div>{items.filter(t => t.start && (minutes(t.start) < 480 || minutes(t.start) >= 1140)).map(t => <button className="outside-hours" key={t.key} onClick={() => openTask(t)}>{range(t)} · {t.title}</button>)}{events.filter(e => e.date === date && e.start && (minutes(e.end) <= 480 || minutes(e.start) >= 1140)).map(e => <p className="external-event" key={e.id}>{fmt(e.start)}–{fmt(e.end)} · {e.title}</p>)}{s.settings.showSleep && <div className="sleep-line"><Icon name="Moon" size={15} />{tx("Sleep ")}{fmt(s.settings.sleep)} <span>{tx("Wake ")}{fmt(s.settings.wake)}</span></div>}</section></div><section className="daily-note"><div className="section-title"><h2>{tx("Daily note")}</h2><span>{tx("A little space for your thoughts")}</span></div><div className="note-editor"><textarea aria-label={tx("Daily note")} placeholder={tx("What’s on your mind today?")} value={s.notes[date] || ''} onChange={e => update(x => {
                x.notes[date] = e.target.value;
                return x;
              })} /><div className="note-status"><span>{(s.notes[date] || '').length.toLocaleString()}{tx(" characters")}</span><span><Icon name={saving ? 'RefreshCw' : 'Check'} size={13} />{persistError.current ? tx("Not saved — export a recovery copy") : saving ? tx("Saving…") : tx("Saved on this device")}</span></div></div></section>{s.demo && <div className="demo-note">{tx("Sample tasks to explore your planner.")}<button onClick={() => Modal('fresh')}>{tx("Start a blank planner ")}<Icon name="ArrowRight" size={14} /></button></div>}</>}
 {route === 'calendar' && <div className="calendar-switch button-row"><button className="secondary" aria-pressed={calMode === 'week'} onClick={() => CalMode('week')}>{tx("Week")}</button><button className="secondary" aria-pressed={calMode === 'month'} onClick={() => CalMode('month')}>{tx("Month")}</button></div>}{route === 'calendar' && calMode === 'week' && <WeekPlanner state={s} date={date} update={update} openTask={openTask} go={go} events={events} />}
 {route === 'calendar' && calMode === 'month' && <section className="page"><div className="page-heading"><div><p className="eyebrow">{tx("A LITTLE PERSPECTIVE")}</p><h1>{tx("Your days, at a glance.")}</h1><p className="subtext">{tx("Make space for what’s ahead.")}</p></div><button className="primary" onClick={() => openTask()}><Icon name="Plus" />{tx("Add task")}</button></div><div className="month-heading"><h2>{parseDay(month).toLocaleDateString(uiLocale(), {
                month: 'long',
                year: 'numeric'
              })}</h2><div><button className="icon-btn" aria-label={tx("Previous month")} onClick={() => {
                const d = parseDay(month);
                d.setDate(1);
                d.setMonth(d.getMonth() - 1);
                M(dayKey(d));
              }}><Icon name="ChevronLeft" /></button><button className="tiny-btn" onClick={() => M(today)}>{tx("This month")}</button><button className="icon-btn" aria-label={tx("Next month")} onClick={() => {
                const d = parseDay(month);
                d.setDate(1);
                d.setMonth(d.getMonth() + 1);
                M(dayKey(d));
              }}><Icon name="ChevronRight" /></button></div></div><div className="calendar-week">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => <span key={w}>{w}</span>)}</div><div className="calendar-grid">{(() => {
              const d = parseDay(month);
              d.setDate(1);
              const first = shiftDay(dayKey(d), -((d.getDay() + 6) % 7));
              return Array.from({
                length: 42
              }, (_, i) => {
                const k = shiftDay(first, i),
                  v = stat(s, k);
                return <button className={'calendar-cell ' + (k.slice(0, 7) !== month.slice(0, 7) ? 'muted-month ' : '') + (k === today ? 'is-today' : '')} key={k} onClick={() => go(k)}><span className="day-number">{parseDay(k).getDate()}</span>{v.total > 0 && <><span className={'cal-state ' + (v.pct === 100 ? 'complete' : v.pct ? 'progress' : 'planned')}>{v.done}/{v.total}</span><div className="cal-tasks">{tasksFor(s, k).slice(0, 2).map(t => <span key={t.key}>{t.title}</span>)}</div></>}</button>;
              });
            })()}</div><div className="calendar-legend">{['planned', 'progress', 'complete'].map(v => <span key={v}><i className={v} />{v === 'progress' ? tx("In progress") : label(v)}</span>)}</div></section>}
 {route === 'progress' && <section className="page"><p className="eyebrow">{tx("SHOWING UP ADDS UP")}</p><h1>{tx("Progress, not perfection.")}</h1><p className="subtext">{tx("A missed day doesn’t erase the days you showed up.")}</p><div className="progress-overview"><div><Icon name="Flame" size={32} /><strong>{week.filter(d => wins.has(d)).length}<span> / {s.settings.weeklyGoal}</span></strong><h2>{tx("Days active this week")}</h2><p>{tx("One completed task earns a day. Every day counts once.")}</p><div className="week-dots">{week.map(d => <div key={d}><span className={wins.has(d) ? 'earned' : ''}>{wins.has(d) ? <Icon name="Check" size={18} /> : parseDay(d).getDate()}</span><small>{parseDay(d).toLocaleDateString(uiLocale(), {
                      weekday: 'short'
                    })}</small></div>)}</div></div><div className="reward-panel"><Icon name="Sprout" size={44} /><p className="eyebrow">{tx("YOUR CURRENT TITLE")}</p><h2>{tx(reward(s))}</h2><p>{wins.size}{tx(" lifetime active days.")}<br />{tx("Earned through your own effort.")}</p><span className="pill">{tx("Your pace. Your progress.")}</span></div></div><h2>{tx("The last 30 days")}</h2><div className="progress-table"><div className="table-header"><span>{tx("Date")}</span><span>{tx("Completed")}</span><span>{tx("Daily plan")}</span></div>{Array.from({
              length: 30
            }, (_, i) => shiftDay(today, -i)).map(d => {
              const v = stat(s, d);
              return <button className="table-row" key={d} onClick={() => go(d)}><span>{parseDay(d).toLocaleDateString(uiLocale(), {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}</span><span>{v.done} / {v.total}</span><span><progress max="100" value={v.pct || 0} />{v.pct === null ? tx("No plan") : v.pct + '%'}</span></button>;
            })}</div></section>}
 {route === 'family' && <Family session={session} say={say} account={() => Modal('account')} />}
 {route === 'settings' && <><Settings state={s} update={update} say={say} clear={() => Modal('fresh')} onImport={data => Modal({
            kind: 'import',
            data
          })} /><div className="page"><MoreSettings state={s} update={update} say={say} session={session} events={googleCalendar} setEvents={Events} fileEvents={fileEvents} setFileEvents={FileEvents} /></div></>}
 </>}
 <footer className="mobile-nav">{[...nav, ['settings', 'Settings', 'Settings']].map(([id, icon, name]) => <button key={id} className={route === id ? 'active' : ''} onClick={() => {
          R(id);
          Q('');
        }}><Icon name={icon} /><span>{name}</span></button>)}</footer></main>
 {toast && <div className="toast" role="status"><Icon name="Check" size={18} /><span>{tx(toast.text)}</span>{toast.undo && <button onClick={undo}>{tx("Undo")}</button>}<button aria-label={tx("Dismiss message")} onClick={() => T(null)}><Icon name="X" size={16} /></button></div>}
 {modal === 'task' && <TaskEditor item={editing} date={date} state={withCalendar(s, events)} close={() => Modal(null)} save={(data, scope) => {
      if (editing?.id) update(x => editTask(x, editing.id, editing.date, data, scope), true);else update(x => ({
        ...x,
        tasks: [...x.tasks, {
          id: uid(),
          createdAt: new Date().toISOString(),
          status: 'open',
          order: x.tasks.length,
          exceptions: {},
          ...data
        }]
      }), true);
      say(editing?.id ? 'Task updated' : 'Added to your day', true);
      Modal(null);
    }} remove={() => {
      status(editing, 'cancelled');
      Modal(null);
    }} skip={() => {
      status(editing, 'skipped');
      Modal(null);
    }} />}
 {modal === 'inbox' && <Inbox items={missed} close={() => Modal(null)} update={update} move={move} today={today} />}
 {modal === 'fresh' && <Dialog title={tx("Start with a blank planner?")} onClose={() => Modal(null)}><p className="subtext">{tx("This clears tasks and notes on this device. Your theme stays. Export a backup to keep your current plan.")}</p><div className="button-row"><button className="secondary" onClick={() => exportFile(s)}>{tx("Export first")}</button><button className="primary" onClick={() => {
          update(x => ({
            ...emptyState(),
            settings: x.settings,
            revision: x.revision
          }), true);
          Modal(null);
          say('A fresh page. Make it yours.', true);
        }}>{tx("Clear tasks and notes")}</button></div></Dialog>}
 {modal?.kind === 'import' && <Dialog title={tx("Restore this backup?")} onClose={() => Modal(null)}><p>{tx("This replaces your tasks and notes with ")}{modal.data.tasks.length}{tx(" tasks from your backup.")}</p><button className="primary" onClick={() => {
        update(x => ({
          ...modal.data,
          revision: x.revision
        }), true);
        Modal(null);
        say('Backup restored', true);
      }}>{tx("Restore backup")}</button></Dialog>}
 {modal === 'account' && <Account session={session} state={s} update={update} say={say} close={() => Modal(null)} flush={async () => {
      await queue.current;
      if (persistError.current) throw persistError.current;
    }} getState={() => ref.current} />}
 </div>;
}
function TaskEditor({
  item,
  date,
  state,
  close,
  save,
  remove,
  skip
}) {
  const [d, D] = useState({
      title: '',
      description: '',
      date,
      start: '',
      end: '',
      icon: 'BookOpen',
      color: 'lavender',
      priority: false,
      repeat: 'none',
      reminder: 0,
      overnight: false,
      ...item
    }),
    [scope, Scope] = useState('one'),
    [error, Error] = useState(''),
    [overlap, Overlap] = useState(null),
    [search, Search] = useState('');
  const set = (k, v) => {
    D(x => ({
      ...x,
      [k]: v
    }));
    Overlap(null);
    Error('');
  };
  function submit(e, allow = false) {
    e?.preventDefault();
    if (d.repeat === 'custom' && !validRule(d.rule)) return Error('Choose an interval and at least one weekday for a weekly rule.');
    if (d.until && d.until < d.date) return Error('The last day must be on or after the first day.');
    if (!Number.isInteger(d.reminder) || d.reminder < -1 || d.reminder > 1440) return Error('Reminder minutes must be a whole number from -1 to 1440.');
    if (!d.title.trim()) return Error('Give your task a title.');
    if (Boolean(d.start) !== Boolean(d.end)) return Error('Choose both times, or clear both.');
    if (d.start && minutes(d.end) <= minutes(d.start) && !d.overnight) return Error('Turn on “Ends next day” for an overnight task.');
    if (d.priority && tasksFor(state, d.date).filter(t => t.priority && t.status === 'open' && t.id !== d.id).length >= 3) return Error('You already have three priorities. Unstar one first.');
    const found = conflicts(state, d);
    if (found.length && !allow) return Overlap(found);
    const {
      id,
      key,
      seriesId,
      exceptions,
      ...data
    } = d;
    save({
      ...data,
      title: d.title.trim()
    }, scope);
  }
  return <Dialog title={item?.id ? tx("Edit your task") : tx("Make a little plan")} onClose={close}><form onSubmit={submit}><label className="field">{tx("What would you like to do?")}<input autoFocus required maxLength={180} placeholder={tx("Something that matters to you")} value={d.title} onChange={e => set('title', e.target.value)} /></label>{d.warning && <p className="setup-note">{tx(d.warning)}</p>}<label className="field">{tx("Subtitle ")}<span>{tx("optional")}</span><textarea rows={2} maxLength={2000} placeholder={tx("A note, a next step, a little context…")} value={d.description || ''} onChange={e => set('description', e.target.value)} /></label><TaskDetails task={d} set={set} state={state} /><div className="form-grid"><label className="field">{tx("Day")}<input type="date" required value={d.date} disabled={!!(item?.id && item?.repeat && item.repeat !== 'none')} onChange={e => set('date', e.target.value)} /></label><label className="field">{tx("Repeat")}<select value={d.repeat} onChange={e => {
            set('repeat', e.target.value);
            if (e.target.value === 'custom' && !d.rule) set('rule', {
              unit: 'week',
              interval: 1,
              days: [parseDay(d.date).getDay()]
            });
          }} disabled={!!(item?.id && item?.repeat && item.repeat !== 'none' && scope === 'one')}>{[['none', 'Doesn’t repeat'], ['daily', 'Every day'], ['weekly', 'Every week'], ['weekdays', 'Weekdays'], ['weekends', 'Weekends'], ['custom', 'Custom schedule']].map(([v, t]) => <option value={v} key={v}>{tx(t)}</option>)}</select></label></div><RecurrenceFields task={d} set={set} disabled={!!(item?.id && item.repeat !== 'none' && scope === 'one')} /><div className="form-grid"><label className="field">{tx("Start ")}<span>{tx("optional")}</span><input type="time" value={d.start || ''} onChange={e => set('start', e.target.value)} /></label><label className="field">{tx("End ")}<span>{tx("optional")}</span><input type="time" value={d.end || ''} onChange={e => set('end', e.target.value)} /></label></div>{d.start && <div className="inline-options"><label><input type="checkbox" checked={d.overnight} onChange={e => set('overnight', e.target.checked)} />{tx("Ends next day")}</label><button type="button" className="text-btn" onClick={() => D(x => ({
          ...x,
          start: '',
          end: '',
          overnight: false,
          reminder: 0
        }))}>{tx("Clear times")}</button></div>}<div className="icon-picker"><div className="section-title"><label>{tx("Choose an icon")}</label><input aria-label={tx("Search icons")} placeholder={tx("Find an icon…")} value={search} onChange={e => Search(e.target.value)} /></div><div className="icon-grid">{ICONS.filter(n => tx(label(n)).toLocaleLowerCase(uiLocale()).includes(search.toLocaleLowerCase(uiLocale()))).map(n => <button type="button" key={n} title={tx(label(n))} aria-label={tx('{name} icon', {name: tx(label(n))})} className={d.icon === n ? 'selected' : ''} onClick={() => set('icon', n)}><Icon name={n} /></button>)}</div><div className="color-options">{['lavender', 'rose', 'sage', 'blue', 'peach'].map(c => <button type="button" className={c + ' ' + (d.color === c ? 'selected' : '')} aria-label={tx('{color} task color', {color: tx(c)})} key={c} onClick={() => set('color', c)}>{d.color === c && <Icon name="Check" size={14} />}</button>)}</div></div><div className="setting-row compact"><label className="inline-label"><Icon name="Star" />{tx("Make this a priority")}</label><input type="checkbox" aria-label={tx("Make this a priority")} checked={d.priority} onChange={e => set('priority', e.target.checked)} /></div>{d.start && <label className="field">{tx("Reminder")}<select value={d.reminder || 0} onChange={e => set('reminder', Number(e.target.value))}>{[[0, 'No reminder'], [-1, 'At start time'], [5, '5 minutes before'], [15, '15 minutes before'], [30, '30 minutes before']].map(([n, v]) => <option key={n} value={n}>{tx(v)}</option>)}</select><span>{tx("Custom minutes before (0 disables; -1 means start time)")}<input aria-label={tx("Custom reminder minutes")} type="number" min="-1" max="1440" value={d.reminder || 0} onChange={e => set('reminder', Math.max(-1, Math.min(1440, Number(e.target.value))))} /></span><small>{tx("Enable notifications in Settings. Windows can schedule reminders after quitting. Web reminders require an open tab.")}</small></label>}{item?.id && item?.repeat && item.repeat !== 'none' && <label className="field">{tx("Apply changes to")}<select value={scope} onChange={e => Scope(e.target.value)}><option value="one">{tx("This occurrence")}</option><option value="future">{tx("This and future occurrences")}</option><option value="all">{tx("Entire series · preserve history")}</option></select></label>}{error && <p className="form-error" role="alert">{tx(error)}</p>}{overlap && <div className="conflict-box" role="alert"><strong>{tx("Overlaps with ")}{overlap.map(t => t.title).join(', ')}.</strong><p>{tx("Keep both, or choose a free slot.")}</p><div className="button-row"><button type="button" className="secondary" onClick={() => {
            const slot = nextSlot(state, d);
            if (slot) {
              D(x => ({
                ...x,
                ...slot
              }));
              Overlap(null);
            } else Error('No slot fits today. Choose another date.');
          }}>{tx("Find free slot")}</button><button type="button" className="text-btn" onClick={() => submit(null, true)}>{tx("Keep overlap & save")}</button></div></div>}<div className="dialog-footer">{item?.id ? <div className="button-row"><button type="button" className="icon-btn danger" aria-label={tx("Cancel task")} onClick={remove}><Icon name="Trash2" /></button><button type="button" className="text-btn" onClick={skip}>{tx("Skip occurrence")}</button></div> : <span />}<div className="button-row"><button type="button" className="secondary" onClick={close}>{tx("Cancel")}</button><button type="submit" className="primary">{item?.id ? tx("Save changes") : tx("Add task")}<Icon name="ArrowRight" size={17} /></button></div></div></form></Dialog>;
}
import { Settings, Family, Account } from './pages';
function Row({
  t,
  toggle,
  openTask,
  range
}) {
  return <div className={'task-row ' + (t.status === 'done' ? 'completed ' : '') + (['moved', 'skipped'].includes(t.status) ? 'inactive' : '')}><button className={'checkbox ' + (t.status === 'done' ? 'checked' : '')} aria-label={tx(t.status === 'done' ? 'Reopen {title}' : 'Complete {title}', {title: t.title})} aria-pressed={t.status === 'done'} disabled={['moved', 'skipped'].includes(t.status)} onClick={() => toggle(t)}>{t.status === 'done' && <Icon name="Check" size={16} />}</button>{t.status === 'open' && <button className={'task-icon ' + (t.color || 'lavender')} onClick={() => openTask(t)} aria-label={tx('Edit icon for {title}', {title: t.title})}><Icon name={t.icon} /></button>}<button className="task-copy" onClick={() => openTask(t)}><strong>{t.title} <small className={'level-badge ' + (t.level || 'medium')}>{tx(t.level || "medium")}</small></strong>{t.subtasks?.length > 0 && <small>{t.subtasks.filter(x => x.done).length}/{t.subtasks.length}{tx(" steps")}</small>}<span>{t.status === 'moved' ? tx('Moved to {date}', {date: t.movedTo}) : t.status === 'skipped' ? tx("Skipped this occurrence") : t.description || (t.repeat !== 'none' ? tx('Repeats {rule}', {rule: tx(t.repeat)}) : '')}</span></button><span className="task-time">{range(t)}</span><button className="icon-btn" onClick={() => openTask(t)} aria-label={tx('Edit {title}', {title: t.title})}><Icon name="MoreHorizontal" /></button></div>;
}
