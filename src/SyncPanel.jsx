import { t as tx, locale as uiLocale } from "./i18n.js";
import React, { useState } from 'react';
import { Icon, exportFile } from './App';
import { cloud, rpc } from './cloud';
import { validateImport } from './model';
import { fingerprint, syncDecision } from './sync-model';
import * as disk from './storage';
export function SyncPanel({
  session,
  state,
  update,
  say,
  close,
  flush,
  getState
}) {
  const [busy, Busy] = useState(false),
    [conflict, Conflict] = useState(null),
    [error, Error] = useState('');
  const userId = session.user.id;
  async function active() {
    const {
      data,
      error
    } = await cloud.auth.getSession();
    if (error) throw error;
    if (data.session?.user.id !== userId) throw new globalThis.Error('Your account changed. Reopen the account menu.');
  }
  async function run(choice) {
    Busy(true);
    Error('');
    try {
      await flush();
      await active();
      const local = getState(),
        base = local.sync?.userId === userId ? local.sync : null;
      const {
        data: remote,
        error
      } = await cloud.from('planner_documents').select('document,revision').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      if (remote) validateImport(remote.document);
      if (choice && (remote?.revision || 0) !== conflict?.revision) {
        Conflict(remote || {
          revision: 0
        });
        throw new globalThis.Error('The cloud copy changed again. Review the current copies before choosing.');
      }
      const decision = choice || syncDecision(local, remote, base);
      if (decision === 'conflict') {
        Conflict(remote || {
          revision: 0
        });
        return;
      }
      const snapshot = fingerprint(local);
      let revision = remote?.revision || 0;
      if (decision === 'push') {
        if (choice && remote) exportFile(remote.document, 'ts-planner-cloud-before-replace.json');
        const {
          sync,
          ...document
        } = local;
        revision = await rpc('save_planner', {
          p_document: document,
          p_expected: revision,
          p_account: userId
        });
      }
      await active();
      if (decision === 'pull') {
        if (!remote) throw new globalThis.Error('There is no cloud copy to load.');
        if (fingerprint(getState()) !== snapshot) throw new globalThis.Error('Your planner changed during sync. Sync again to keep those edits.');
        exportFile(local, 'ts-planner-device-before-sync.json');
        const document = validateImport(remote.document);
        update(s => ({
          ...document,
          revision: s.revision,
          sync: {
            userId,
            revision,
            fingerprint: fingerprint(document),
            at: new Date().toISOString()
          }
        }));
      } else {
        // Preserve edits made while the upload was in flight; they stay dirty.
        update(s => ({
          ...s,
          sync: {
            userId,
            revision,
            fingerprint: snapshot,
            at: new Date().toISOString()
          }
        }));
      }
      await flush();
      Conflict(null);
      say('Sync complete');
    } catch (e) {
      Error(e.message);
    } finally {
      Busy(false);
    }
  }
  return <div><p>{tx("Signed in with your Gmail account.")}</p><p className="setup-note">{state.sync?.at ? 'Last synced ' + new Date(state.sync.at).toLocaleString() : tx("This account has not synced on this device yet.")}</p>
 {error && <p className="form-error" role="alert">{tx(error)}</p>}
 {conflict ? <><h3>{tx("Choose the plan to keep.")}</h3><p>{tx("Both copies are preserved until you choose. Replacing a copy downloads a backup first.")}</p><div className="button-row"><button className="primary" disabled={busy || !conflict.document} onClick={() => run('pull')}>{tx("Use cloud plan")}</button><button className="secondary" disabled={busy} onClick={() => run('push')}>{tx("Use this device’s plan")}</button><button className="text-btn" disabled={busy} onClick={() => Conflict(null)}>{tx("Decide later")}</button></div></> : <button className="primary" disabled={busy} onClick={() => run()}><Icon name="RefreshCw" />{busy ? tx("Syncing…") : tx("Sync planner")}</button>}
 <p className="setup-note">{tx("Sync when you finish planning and before switching devices. Offline edits stay on this device until your next successful sync.")}</p>
 <div className="button-row"><button className="secondary" disabled={busy} onClick={async () => {
        Busy(true);
        try {
          await flush();
          await active();
          const local = await disk.load('local');
          if (!local) throw new globalThis.Error('No separate local planner was found.');
          exportFile(getState(), 'ts-planner-account-before-import.json');
          const imported = validateImport(local);
          update(s => ({
            ...imported,
            revision: s.revision,
            sync: s.sync
          }));
          await flush();
          Conflict(null);
          say('Local planner copied into this account. Sync to upload it.');
        } catch (e) {
          Error(e.message);
        } finally {
          Busy(false);
        }
      }}>{tx("Copy my local planner")}</button><button className="secondary" disabled={busy} onClick={async () => {
        try {
          await flush();
          const {
            error
          } = await cloud.auth.signOut();
          if (error) throw error;
          close();
          say('Signed out');
        } catch (e) {
          Error(e.message);
        }
      }}><Icon name="LogOut" />{tx("Sign out")}</button></div>
 <p className="setup-note">{tx("Copying your local planner replaces this account’s device copy after downloading a backup. Your separate local planner remains. On a shared computer, export what you need and clear local data before leaving.")}</p></div>;
}
