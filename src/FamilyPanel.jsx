import { t as tx, locale as uiLocale } from "./i18n.js";
import React, { useEffect, useState } from 'react';
import { Dialog, Icon } from './App';
import { rpc, configured } from './cloud';
import { dayKey } from './model';
export function FamilyPanel({
  session,
  say,
  account
}) {
  const [family, Family] = useState(null),
    [loading, Loading] = useState(!!session),
    [busy, Busy] = useState(false),
    [error, Error] = useState(''),
    [invite, Invite] = useState(''),
    [leave, Leave] = useState(false);
  async function refresh() {
    Loading(true);
    Error('');
    try {
      Family(await rpc('get_family'));
    } catch (e) {
      Error(e.message);
    } finally {
      Loading(false);
    }
  }
  useEffect(() => {
    if (session) refresh();
  }, [session?.user?.id]);
  async function action(name, args) {
    Busy(true);
    Error('');
    try {
      const result = await rpc(name, args);
      if (name === 'create_family_invite') Invite(result);else {
        Invite('');
        await refresh();
      }
      return true;
    } catch (e) {
      Error(e.message);
      return false;
    } finally {
      Busy(false);
    }
  }
  return <section className="page family-page"><p className="eyebrow">{tx("A LITTLE ENCOURAGEMENT")}</p><h1>{tx("Better, together.")}</h1><p className="subtext">{tx("Daily progress and earned titles. Your tasks and notes stay private.")}</p>{!session ? <div className="family-empty"><Icon name="Users" size={48} /><h2>{tx("Your circle starts here.")}</h2><p>{tx("Sign in to create or join an invite-only family.")}</p><button className="primary" onClick={account}>{tx("Sign in to connect")}</button>{!configured && <p className="setup-note">{tx("Cloud setup is required for real family accounts.")}</p>}</div> : <>{error && <div className="form-error" role="alert">{tx(error)}<button className="text-btn" disabled={busy || loading} onClick={refresh}>{tx("Retry")}</button></div>}{loading ? <p>{tx("Loading your family…")}</p> : family?.id ? <><div className="section-title"><h2>{family.name}</h2><button className="secondary" disabled={busy} onClick={refresh}>{tx("Refresh")}</button></div><div className="family-members">{family.members.map((m, i) => <div className="member" key={m.user_id}><span className="avatar large">{m.user_id === session.user.id ? tx("Y") : i + 1}</span><h3>{m.user_id === session.user.id ? tx("You") : tx('Member {number}', {number: i + 1})}</h3><strong>{m.shared && m.day === dayKey() && m.percentage != null ? m.percentage + '%' : '—'}</strong><p>{m.shared ? tx(m.title || 'A fresh start') : tx("Sharing paused")}</p><small>{m.shared && m.day !== dayKey() ? tx("No progress shared for today") : m.shared ? tx("Today’s shared progress") : tx("Private until they choose to share")}</small></div>)}</div><label className="age-confirm"><input type="checkbox" checked={!!family.sharing} disabled={busy} onChange={e => action('set_family_sharing', {
            p_enabled: e.target.checked
          })} />{tx("Share my daily percentage and reward title")}</label><p className="setup-note">{tx("Sync your planner from the account menu to update your progress. Everyone’s plan is different; this is encouragement, not a ranking.")}</p><div className="button-row">{family.is_owner && <button className="secondary" disabled={busy} onClick={() => action('create_family_invite')}>{tx("Create invitation")}</button>}<button className="text-btn danger" disabled={busy} onClick={() => Leave(true)}>{tx("Leave family")}</button></div>{invite && <div className="invite-code"><code>{invite}</code><button className="secondary" onClick={() => navigator.clipboard.writeText(invite).then(() => say('Invitation copied')).catch(() => Error('Copy failed. Select and copy the code manually.'))}>{tx("Copy code")}</button><p>{tx("One use. Expires in seven days. Share only with someone you want in your family.")}</p></div>}</> : !error && <div className="family-empty"><form onSubmit={e => {
          e.preventDefault();
          action('create_family', {
            p_name: new FormData(e.currentTarget).get('name')
          });
        }}><label className="field">{tx("Family name")}<input name="name" required maxLength={60} /></label><button className="primary" disabled={busy}>{tx("Create family")}</button></form><form onSubmit={e => {
          e.preventDefault();
          action('join_family', {
            p_token: new FormData(e.currentTarget).get('token')
          });
        }}><label className="field">{tx("Invitation code")}<input name="token" required maxLength={200} /></label><button className="secondary" disabled={busy}>{tx("Join family")}</button></form><p>{tx("Sharing starts off. You decide when to enable it.")}</p></div>}</>}{leave && <Dialog title={tx("Leave this family?")} onClose={() => Leave(false)}><p>{family?.is_owner ? tx("As the owner, leaving dissolves this family and its invitations. Everyone keeps their private planner.") : tx("Your private planner stays. Your membership and shared progress are removed from this family.")}</p><button className="primary" disabled={busy} onClick={async () => {
        if (await action('leave_family')) Leave(false);
      }}>{tx("Leave family")}</button></Dialog>}</section>;
}
