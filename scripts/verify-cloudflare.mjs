import {readFile, readdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Read-only production verification: no sessions, model calls or user records.
const base = (process.env.DEPLOY_URL || 'https://life.wolfx.top').replace(/\/+$/, '');
const report = {url: base, checkedAt: new Date().toISOString(), mode: 'read-only', checks: []};
const root = new URL('../public/', import.meta.url);
function withoutCloudflareInjection(value) {
  const marker = '/cdn-cgi/challenge-platform/scripts/jsd/main.js';
  const markerAt = value.indexOf(marker);
  if (markerAt < 0) return value;
  const start = value.lastIndexOf('<script>', markerAt);
  const end = value.indexOf('</script>', markerAt);
  if (start < 0 || end < 0) return value;
  const block = value.slice(start, end + 9);
  return block.includes('window.__CF$cv$params=') ? value.slice(0, start) + value.slice(end + 9) : value;
}
async function request(path) {
  const response = await fetch(base + path, {redirect: 'error', signal: AbortSignal.timeout(30000)});
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('Set-Cookie'), null, path + ' must not create a session');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff', path);
  assert.ok(response.headers.get('Content-Security-Policy')?.includes("frame-ancestors 'none'"), path);
  return response;
}
async function files(dir, prefix = '') {
  const result = [];
  for (const item of await readdir(dir, {withFileTypes: true})) {
    const path = prefix + item.name;
    if (item.isDirectory()) result.push(...await files(new URL(item.name + '/', dir), path + '/'));
    else result.push(path);
  }
  return result;
}
try {
  const response = await request('/api/config');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const config = await response.json();
  assert.equal(config.version, 5);
  assert.equal(config.ready, true);
  assert.equal(config.database, true);
  assert.equal(config.providers.length, 3);
  report.config = config;
  report.checks.push({name: 'AI configuration and D1 binding', passed: true});
  const home = await request('/');
  assert.equal(withoutCloudflareInjection(await home.text()), await readFile(new URL('index.html', root), 'utf8'));
  assert.equal(home.headers.get('Cache-Control'), 'no-store');
  report.checks.push({name: 'Homepage matches current build', passed: true});
  const paths = await files(root);
  const checked = [];
  for (let i = 0; i < paths.length; i += 4) {
    await Promise.all(paths.slice(i, i + 4).map(async path => {
      const asset = await request('/' + path);
      const local = await readFile(new URL(path, root), 'utf8');
      const remote = await asset.text();
      assert.equal(path.endsWith('.html') ? withoutCloudflareInjection(remote) : remote, local, path);
      const hash = createHash('sha256').update(local).digest('hex');
      const etag = asset.headers.get('ETag')?.replace(/^W\//, '');
      if (etag) assert.equal(etag, '"' + hash.slice(0, 24) + '"', path);
      checked.push({path, sha256: hash, etagChecked: Boolean(etag), passed: true});
    }));
  }
  report.assets = checked.sort((a, b) => a.path.localeCompare(b.path));
  report.checks.push({name: 'All recursive static assets match', count: checked.length, passed: true});
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = error.message;
  process.exitCode = 1;
} finally {
  await writeFile(new URL('../qa/cloudflare-deploy-20261003.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.passed ? {passed: true, url: base, config: report.config, assetCount: report.assets.length} : {passed: false, error: report.error}, null, 2));
}
