import { t as tx, locale as uiLocale } from "./i18n.js";
import React, { useState, useEffect, useRef } from 'react';
import { login } from './cloud';
import { dayKey, shiftDay } from './model';
import { googleEvents } from './calendar-model';
export function CalendarConnection({
  session,
  events,
  setEvents,
  say
}) {
  const [calendars, Calendars] = useState([]),
    [selected, Selected] = useState(['primary']),
    [busy, Busy] = useState(false),
    [error, SetError] = useState('');
  const generation = useRef(0),
    controller = useRef(null);
  useEffect(() => () => {
    generation.current++;
    controller.current?.abort();
  }, [session?.user?.id]);
  const token = session?.provider_token;
  async function request(path, params = {}) {
    const url = new URL('https://www.googleapis.com/calendar/v3/' + path);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = await fetch(url, {
      headers: {
        Authorization: 'Bearer ' + token
      },
      signal: AbortSignal.any([controller.current.signal, AbortSignal.timeout(15000)])
    });
    if (!r.ok) throw Error('Calendar access expired or was not granted. Reconnect Google Calendar.');
    return r.json();
  }
  async function refresh() {
    const run = ++generation.current;
    controller.current?.abort();
    controller.current = new AbortController();
    Busy(true);
    SetError('');
    try {
      if (!token) throw Error('Reconnect Google Calendar to grant read access.');
      let list = {
          items: []
        },
        nextList;
      do {
        const page = await request('users/me/calendarList', nextList ? {
          pageToken: nextList
        } : {});
        list.items.push(...(page.items || []));
        nextList = page.nextPageToken;
        if (list.items.length > 500) throw Error('Too many calendars.');
      } while (nextList);
      const ids = [...new Set(selected.map(id => id === 'primary' ? list.items.find(c => c.primary)?.id || id : id))];
      let result = [];
      for (const id of ids) {
        let page;
        do {
          const data = await request('calendars/' + encodeURIComponent(id) + '/events', {
            timeMin: new Date(shiftDay(dayKey(), -30) + 'T00:00:00').toISOString(),
            timeMax: new Date(shiftDay(dayKey(), 90) + 'T00:00:00').toISOString(),
            singleEvents: 'true',
            maxResults: '2500',
            fields: 'items(id,summary,status,start,end),nextPageToken',
            ...(page ? {
              pageToken: page
            } : {})
          });
          result.push(...(data.items || []).flatMap(e => googleEvents(e, id)));
          page = data.nextPageToken;
          if (result.length > 10000) throw Error('Select fewer calendars to load this date range.');
        } while (page);
      }
      if (run !== generation.current) return;
      Calendars(list.items);
      Selected(ids);
      setEvents(result);
      say('Calendar refreshed. Events stay read-only.');
    } catch (e) {
      if (run === generation.current && e.name !== 'AbortError') SetError(e.message);
    } finally {
      if (run === generation.current) Busy(false);
    }
  }
  return <section className="settings-section"><h2>{tx("Calendar connection")}</h2><p>{tx("Read Google Calendar events from 30 days ago through the next 90 days. Events appear alongside plans without counting toward completion.")}</p>{!session ? <p>{tx("Sign in to TS Planner before connecting Google Calendar.")}</p> : <div className="button-row"><button className="secondary" onClick={() => login(true).catch(e => SetError(e.message))}>{tx("Connect Google Calendar")}</button><button className="secondary" disabled={busy || !token} onClick={refresh}>{busy ? tx("Loading…") : tx("Refresh events")}</button><button className="text-btn" onClick={() => {
        generation.current++;
        controller.current?.abort();
        Busy(false);
        SetError('');
        setEvents([]);
        Calendars([]);
        Selected(['primary']);
        say('Calendar display disconnected. Remove TS Planner access in your Google account to revoke the Google grant.');
      }}>{tx("Disconnect display")}</button></div>}{calendars.map(c => <label key={c.id} className="age-confirm"><input type="checkbox" disabled={busy} checked={selected.includes(c.id)} onChange={e => Selected(e.target.checked ? [...selected.filter(x => x !== 'primary'), c.id] : selected.filter(x => x !== c.id))} />{c.summary}</label>)}{calendars.length > 0 && <p className="setup-note">{tx("Refresh after changing visible calendars.")}</p>}{error && <p role="alert">{tx(error)}</p>}<p className="setup-note">{events.length}{tx(" events loaded for this session. Event details are not saved into your planner or shared with Family. Reconnect when Google access expires. Two-way updates are not enabled.")}</p></section>;
}
