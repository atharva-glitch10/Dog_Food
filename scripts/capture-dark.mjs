import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.resolve('chrome-cdp-dark-dir');

if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9338',
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-sync',
  '--disable-gpu',
  '--window-size=1366,950',
  'about:blank',
]);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getDebuggerUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9338/json/version');
      if (res.ok) {
        const data = await res.json();
        return data.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome remote debugging did not respond on port 9338');
}

async function run() {
  try {
    const wsUrl = await getDebuggerUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((r) => (ws.onopen = r));

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const cur = id++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === cur) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: cur, method, params }));
      });
    }

    const target = await send('Target.createTarget', { url: 'http://localhost:3000/settings' });
    const { sessionId } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });

    function sendSession(method, params = {}) {
      return new Promise((resolve) => {
        const cur = id++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === cur) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: cur, sessionId, method, params }));
      });
    }

    await sendSession('Page.enable');
    await sendSession('Runtime.enable');
    await sendSession('Emulation.setDeviceMetricsOverride', { width: 1366, height: 950, deviceScaleFactor: 1, mobile: false });
    await sleep(2000);

    await sendSession('Runtime.evaluate', {
      expression: `localStorage.setItem('dogfood_theme', 'dark');`,
    });
    await sendSession('Page.reload');
    await sleep(3000);

    const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('settings_dark.png', Buffer.from(shot.data, 'base64'));
    console.log('DARK_SETTINGS_SUCCESS');
    ws.close();
    chrome.kill();
  } catch (err) {
    console.error(err);
    chrome.kill();
  }
}

run();
