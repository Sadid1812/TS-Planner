export async function checkCloudReadiness(url, key, request = fetch) {
  const headers = {apikey: key};
  const settingsResponse = await request(url + '/auth/v1/settings', {headers, signal: AbortSignal.timeout(15000)});
  if (!settingsResponse.ok) throw new Error('Supabase rejected the public connection settings.');
  const settings = await settingsResponse.json();
  const problems = [];
  if (!settings.external?.google) problems.push('Enable the Google sign-in provider.');
  if (settings.external?.email) problems.push('Disable the email/password provider; this planner uses Google sign-in only.');
  if (settings.disable_signup) problems.push('Allow new user sign-ups for the public launch.');
  const tables = ['planner_documents', 'planner_summaries', 'planner_families', 'planner_members', 'planner_invites', 'planner_age_confirmations'];
  await Promise.all(tables.map(async table => {
    // Zero-row queries check existence and anonymous denial without retrieving private records.
    const response = await request(url + '/rest/v1/' + table + '?select=*&limit=0', {headers, signal: AbortSignal.timeout(15000)});
    const body = await response.json();
    if (body.code === 'PGRST205') problems.push('Apply the database schema: missing ' + table + '.');
    else if (![401, 403].includes(response.status) || body.code !== '42501') problems.push('Verify anonymous access is denied for ' + table + '.');
  }));
  if (problems.length) throw new Error('Cloud deployment is not ready:\n' + problems.sort().join('\n'));
  return 'Google sign-in is enabled and planner tables deny anonymous access. Live signed-in tests are still required.';
}
