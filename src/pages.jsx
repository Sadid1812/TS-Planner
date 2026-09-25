import { t as tx, locale as uiLocale } from "./i18n.js";
import { FamilyPanel } from './FamilyPanel';
import { SyncPanel } from './SyncPanel';
import React, { useState, useEffect } from 'react';
import { Icon, Dialog, exportFile } from './App';
import { THEMES, validateImport, emptyState } from './model';
import { cloud, configured, login, rpc } from './cloud';
export function Settings({
  state: s,
  update,
  say,
  clear,
  onImport
}) {
  const [nativeStatus, NativeStatus] = useState(window.tsReminderStatus || 'pending');
  useEffect(() => {
    const f = e => NativeStatus(e.detail.ok ? 'ready' : 'failed');
    addEventListener('ts-reminder-status', f);
    return () => removeEventListener('ts-reminder-status', f);
  }, []);
  const set = (k, v) => update(x => ({
    ...x,
    settings: {
      ...x.settings,
      [k]: v
    }
  }));
  return <section className="page settings-page"><p className="eyebrow">{tx("MAKE YOURSELF AT HOME")}</p><h1>{tx("A space that feels like you.")}</h1><p className="subtext">{tx("Different moods. The same familiar planner.")}</p><div className="settings-section"><div className="section-title"><h2><Icon name="Palette" />{tx("Appearance")}</h2><span>{tx("Choose your atmosphere")}</span></div><div className="theme-grid">{THEMES.map(t => <button className={'theme-card ' + (s.settings.theme === t.id ? 'selected' : '')} key={t.id} aria-pressed={s.settings.theme === t.id} onClick={() => set('theme', t.id)}><div className="theme-preview" style={{
            background: t.bg,
            color: t.text,
            '--preview-accent': t.accent
          }}><div><span style={{
                color: t.accent
              }}>TS</span> Planner {s.settings.theme === t.id && <Icon name="Check" size={17} />}</div><strong style={{
              fontFamily: t.font === 'Technical' || t.font === 'Character' ? "'Space Grotesk Variable'" : t.font === 'Modern' ? "'DM Sans Variable'" : t.font === 'Literary' ? "'Lora Variable'" : "'Fraunces Variable'"
            }}>{tx("Your kind of day.")}</strong><span className="preview-strokes"><i /><i /><i /></span></div><div className="theme-caption"><strong>{tx(t.name)}</strong><small>{tx(t.description)}</small></div></button>)}</div></div><div className="settings-section"><h2><Icon name="Type" />{tx("Typography")}</h2><p className="subtext">{tx("Expressive headings. Quiet, readable task text.")}</p><div className="font-choices">{[['theme', 'Theme pairing', 'Matched to your theme'], ['editorial', 'Editorial', 'Fraunces + DM Sans'], ['literary', 'Literary', 'Lora + DM Sans'], ['modern', 'Modern', 'DM Sans throughout'], ['technical', 'Technical', 'Space Grotesk + DM Sans']].map(([id, name, desc]) => <button className={'font-card ' + (s.settings.font === id ? 'selected' : '')} key={id} onClick={() => set('font', id)} aria-pressed={s.settings.font === id}><span style={{
            fontFamily: id === 'editorial' ? "'Fraunces Variable'" : id === 'literary' ? "'Lora Variable'" : id === 'technical' ? "'Space Grotesk Variable'" : "'DM Sans Variable'"
          }}>Aa</span><strong>{tx(name)}</strong><small>{tx(desc)}</small></button>)}</div><p className="setup-note">{tx("Typefaces are bundled locally and work offline. No font requests are sent to Google.")}</p></div><div className="settings-section"><h2>{tx("Your preferences")}</h2><div className="setting-row"><div><h3>{tx("Display name")}</h3><p>{tx("Make this little space yours.")}</p></div><input aria-label={tx("Display name")} placeholder={tx("Your name")} maxLength={60} value={s.settings.name} onChange={e => set('name', e.target.value)} /></div><div className="setting-row"><div><h3>{tx("Time format")}</h3><p>{tx("Device time zone: ")}{Intl.DateTimeFormat().resolvedOptions().timeZone}</p></div><select aria-label={tx("Time format")} value={s.settings.clock24 ? '24' : '12'} onChange={e => set('clock24', e.target.value === '24')}><option value="24">{tx("24-hour · 19:00")}</option><option value="12">{tx("12-hour · 7:00 PM")}</option></select></div><div className="setting-row"><div><h3>{tx("Weekly consistency goal")}</h3><p>{tx("Days with a completed task, out of the last seven.")}</p></div><select aria-label={tx("Weekly consistency goal")} value={s.settings.weeklyGoal} onChange={e => set('weeklyGoal', Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}{n === 1 ? tx(" day") : tx(" days")}</option>)}</select></div><div className="setting-row"><div><h3>{tx("Sleep and wake times")}</h3><p>{tx("Optional reference. These do not affect your score.")}</p></div><input type="checkbox" aria-label={tx("Show sleep schedule")} checked={s.settings.showSleep} onChange={e => set('showSleep', e.target.checked)} /></div>{s.settings.showSleep && <div className="time-preferences"><label>{tx("Sleep")}<input type="time" value={s.settings.sleep} onChange={e => set('sleep', e.target.value)} /></label><label>{tx("Wake")}<input type="time" value={s.settings.wake} onChange={e => set('wake', e.target.value)} /></label></div>}<div className="setting-row"><div><h3>{tx("Reduce motion")}</h3><p>{tx("Keep transitions quiet.")}</p></div><input type="checkbox" aria-label={tx("Reduce motion")} checked={s.settings.reducedMotion} onChange={e => set('reducedMotion', e.target.checked)} /></div><div className="setting-row"><div><h3>{tx("Device reminders")}</h3><p>{window.tsDesktop?.schedule ? tx("Windows checks your saved schedule every minute, including after you quit. Stay signed in to Windows and keep this app folder in place. Sleeping devices and Windows notification settings can delay or silence reminders.") : tx("Web reminders require an open tab and an awake device. Background tabs may delay delivery.")}{window.tsDesktop?.schedule && s.settings.reminders && <strong role="status">{nativeStatus === 'ready' ? tx(" Windows schedule registered.") : nativeStatus === 'failed' ? tx(" Windows setup failed. Disable and enable to retry.") : tx(" Registering Windows schedule…")}</strong>}</p></div><button className="secondary" onClick={async () => {
          if (s.settings.reminders) {
            set('reminders', false);
            say('Reminders turned off');
            return;
          }
          if (!('Notification' in window) && !window.tsDesktop) {
            say('Notifications are unavailable in this browser.');
            return;
          }
          const p = window.tsDesktop ? 'granted' : await Notification.requestPermission();
          set('reminders', p === 'granted');
          say(p === 'granted' ? window.tsDesktop?.schedule ? 'Registering Windows reminders…' : 'Reminders enabled' : 'Permission was not granted');
        }}>{s.settings.reminders ? tx("Disable") : tx("Enable")}</button></div>{s.settings.reminders && <button className="text-btn" onClick={() => {
        if (window.tsDesktop) window.tsDesktop.notify('Test notification from TS Planner.');else new Notification('TS Planner', {
          body: 'Your reminders are ready.'
        });
      }}>{tx("Send test notification ")}<Icon name="Bell" size={16} /></button>}<div className="setting-row"><div><h3>{tx("Language")}</h3><p>{tx("English and Spanish. More languages will follow.")}</p></div><select aria-label={tx("Interface language")} value={s.settings.language || 'en'} onChange={e => set('language', e.target.value)}><option value="en">{tx("English")}</option><option value="es">{tx("Español")}</option></select></div></div><div className="settings-section"><h2>{tx("Your data belongs to you.")}</h2><p className="subtext">{tx("Keep a backup before clearing browser data or switching devices.")}</p><div className="button-row"><button className="secondary" onClick={() => exportFile(s)}><Icon name="Download" />{tx("Export backup")}</button><label className="secondary file-button"><Icon name="Upload" />{tx("Import backup")}<input type="file" accept="application/json,.json" onChange={async e => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              if (f.size > 10000000) throw Error('Choose a backup smaller than 10 MB.');
              onImport(validateImport(JSON.parse(await f.text())));
            } catch (err) {
              say(err.message);
            }
            e.target.value = '';
          }} /></label><button className="text-btn danger" onClick={clear}><Icon name="Trash2" size={17} />{tx("Clear planner")}</button></div></div><p className="version">{tx("TS Planner · 0.4.0 · Built for a calmer day.")}</p></section>;
}
function AccountContent({
  session,
  state,
  update,
  say,
  close,
  flush,
  getState
}) {
  const [ageConfirmed, AgeConfirmed] = useState(false),
    [busy, Busy] = useState(false);
  if (session) return <SyncPanel {...{
    session,
    state,
    update,
    say,
    close,
    flush,
    getState
  }} />;
  return <Dialog title={tx("Your personal space")} onClose={close}><Icon name="ShieldCheck" size={40} className="account-icon" /><h3>{tx("Keep your days connected.")}</h3><p className="subtext">{tx("Sign in with Gmail to sync across devices and join a private family.")}</p><label className="age-confirm"><input type="checkbox" checked={ageConfirmed} onChange={e => AgeConfirmed(e.target.checked)} />{tx(" I am at least 13 years old.")}</label><button className="primary full" disabled={!configured || !ageConfirmed || busy} onClick={async () => {
      Busy(true);
      try {
        await flush();
        await login();
      } catch (e) {
        say(e.message);
      } finally {
        Busy(false);
      }
    }}><Icon name="LogIn" />{tx("Continue with Google")}</button>{!configured && <p className="setup-note">{tx("Cloud accounts are unavailable in this build. Your planner is saved on this device.")}</p>}<button className="text-btn full" onClick={close}>{tx("Continue on this device")}</button></Dialog>;
}
function AgeGate({
  session,
  children,
  say
}) {
  const [status, Status] = useState('loading'),
    [confirmed, Confirm] = useState(false),
    [busy, Busy] = useState(false);
  useEffect(() => {
    let active = true;
    rpc('age_eligibility').then(ok => {
      if (active) Status(ok ? 'eligible' : 'required');
    }).catch(e => {
      if (active) {
        Status('error');
        say(e.message);
      }
    });
    return () => {
      active = false;
    };
  }, [session.user.id]);
  if (status === 'eligible') return children;
  return <section className="family-empty"><h2>{tx("A space for ages 13 and up.")}</h2>{status === 'loading' ? <p>{tx("Checking your account…")}</p> : status === 'error' ? <p>{tx("We couldn’t verify account eligibility. Close and reopen this screen to retry. Cloud planning and Family remain locked.")}</p> : <><p>{tx("Confirm your age before using cloud planning or Family. We save this confirmation with your account, without collecting your birth date.")}</p><label className="age-confirm"><input type="checkbox" checked={confirmed} onChange={e => Confirm(e.target.checked)} />{tx("I am at least 13 years old.")}</label><button className="primary" disabled={!confirmed || busy} onClick={async () => {
        Busy(true);
        try {
          await rpc('confirm_age', {
            p_confirmed: confirmed
          });
          Status('eligible');
        } catch (e) {
          say(e.message);
        } finally {
          Busy(false);
        }
      }}>{busy ? tx("Saving…") : tx("Confirm and continue")}</button></>}<button className="text-btn" onClick={() => cloud.auth.signOut().then(({
      error
    }) => {
      if (error) say(error.message);
    })}>{tx("Sign out")}</button></section>;
}
export function Family(props) {
  return props.session ? <AgeGate key={props.session.user.id} session={props.session} say={props.say}><FamilyPanel {...props} /></AgeGate> : <FamilyPanel {...props} />;
}
export function Account(props) {
  return props.session ? <Dialog title={tx("Your account")} onClose={props.close}><AgeGate key={props.session.user.id} session={props.session} say={props.say}><AccountContent {...props} embedded /></AgeGate></Dialog> : <AccountContent {...props} />;
}
function AccountBody({
  children
}) {
  return <div>{children}</div>;
}
