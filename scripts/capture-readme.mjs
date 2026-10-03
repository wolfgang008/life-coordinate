import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const base = (process.env.DEPLOY_URL || 'https://life.wolfx.top').replace(/\/+$/, '');
const output = new URL('../docs/screenshots/', import.meta.url);
const profile = await mkdtemp(join(tmpdir(), 'life-coordinate-readme-'));
const port = 9333;
const browser = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--disable-extensions',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=1440,960',
  'about:blank'
], {stdio: 'ignore', windowsHide: true});

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function endpoint(path) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      if (response.ok) return response.json();
    } catch {}
    await pause(100);
  }
  throw new Error('Chrome DevTools 未就绪。');
}

let socket;
try {
  const pages = await endpoint('/json/list');
  const page = pages.find(item => item.type === 'page');
  if (!page) throw new Error('没有可用的页面。');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });

  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const {resolve, reject} = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, {resolve, reject});
    socket.send(JSON.stringify({id: messageId, method, params}));
  });

  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', {width: 1440, height: 960, deviceScaleFactor: 1, mobile: false});

  async function ready() {
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const result = await call('Runtime.evaluate', {expression: 'document.readyState', returnByValue: true});
        if (result.result.value === 'complete') return;
      } catch {}
      await pause(100);
    }
    throw new Error('页面加载超时。');
  }
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
  async function capture(name) {
    await evaluate('window.scrollTo(0, 0)');
    await pause(400);
    const {data} = await call('Page.captureScreenshot', {format: 'jpeg', quality: 88, fromSurface: true, captureBeyondViewport: false});
    await writeFile(new URL(name, output), Buffer.from(data, 'base64'));
  }

  await mkdir(output, {recursive: true});
  await call('Page.navigate', {url: `${base}/`});
  await ready();
  await pause(900);
  await capture('home.jpg');

  await evaluate(`(async () => {
    const data = await fetch('/content/senior-example.json').then(response => response.json());
    const recordId = 'readme-example';
    const work = Object.fromEntries(data.plan.routes.map(route => [route.id, {completed: [], notes: {continue: '', stuck: '', again: ''}}]));
    const state = {
      version: 5, interviewLayout: 2, storageRevision: 1,
      answers: data.answers, index: 0, interviewDeep: false,
      profile: data.profile, nextQuestion: null,
      confirmations: Object.fromEntries(data.profile.interestHypotheses.map(item => [item.id, 'accepted'])),
      constraints: Object.fromEntries(data.profile.constraints.map(item => [item.id, true])),
      followupDraft: '', correctionDraft: '',
      records: [{id: recordId, plan: data.plan, profile: data.profile, answers: data.answers, created: '2026-10-03T08:00:00.000Z', example: true, parentId: null, stale: false, work}],
      activeId: recordId, sampleBackup: null, example: true,
      homeStage: 'school', homeConcern: '', screen: 'profile',
      selected: data.plan.primaryRouteId, scenario: ''
    };
    localStorage.setItem('life-coordinate-atlas-v5', JSON.stringify(state));
    location.hash = '#/profile';
    location.reload();
  })()`);
  await ready();
  await pause(900);
  await capture('profile.jpg');

  await evaluate(`location.hash = '#/result'`);
  await pause(700);
  await capture('result.jpg');

  await evaluate(`location.hash = '#/action'`);
  await pause(700);
  await capture('action.jpg');
  console.log('已更新 README 截图。');
} finally {
  socket?.close();
  browser.kill();
  await Promise.race([
    new Promise(resolve => browser.once('exit', resolve)),
    pause(2000)
  ]);
  await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
}
