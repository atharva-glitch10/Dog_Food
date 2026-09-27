import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.resolve('chrome-cdp-all-screens');

if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9335',
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDebuggerUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9335/json/version');
      if (res.ok) {
        const data = await res.json();
        return data.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome remote debugging did not respond on port 9335');
}

const screens = [
  { name: 'landing.png', url: 'http://localhost:3000/' },
  { name: 'login.png', url: 'http://localhost:3000/login' },
  { name: 'judge_evaluate.png', url: 'http://localhost:3000/evaluate/demo/demo-project' },
  { name: 'results.png', url: 'http://localhost:3000/results/dogfood-2026' },
  { name: 'organizer_dashboard.png', url: 'http://localhost:3000/dashboard/organizer/dogfood-2026' },
  { name: 'settings.png', url: 'http://localhost:3000/settings' },
];

async function run() {
  try {
    const wsUrl = await getDebuggerUrl();
    const ws = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    function send(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve, reject) => {
        const handler = (evt) => {
          const res = JSON.parse(evt.data);
          if (res.id === id) {
            ws.removeEventListener('message', handler);
            if (res.error) reject(res.error);
            else resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const target = await send('Target.createTarget', { url: 'about:blank' });
    const targetId = target.targetId;
    const attached = await send('Target.attachToTarget', { targetId, flatten: true });
    const sessionId = attached.sessionId;

    function sendSession(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve, reject) => {
        const handler = (evt) => {
          const res = JSON.parse(evt.data);
          if (res.id === id) {
            ws.removeEventListener('message', handler);
            if (res.error) reject(res.error);
            else resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, sessionId, method, params }));
      });
    }

    await sendSession('Page.enable');
    await sendSession('Runtime.enable');

    ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || a.description || '').join(' ');
        console.log('[BROWSER CONSOLE]', text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
      }
    });

    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 950,
      deviceScaleFactor: 1,
      mobile: false,
    });

    for (const screen of screens) {
      console.log(`Navigating to ${screen.url}...`);
      await sendSession('Page.navigate', { url: screen.url });
      // Allow React to mount, fetch data/mock fallbacks and render CSS
      await sleep(3000);

      const shot = await sendSession('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });

      const buffer = Buffer.from(shot.data, 'base64');
      fs.writeFileSync(screen.name, buffer);
      console.log(`Saved screenshot: ${screen.name} (${buffer.length} bytes)`);
    }

    ws.close();
    chrome.kill();
    console.log('ALL_SCREENSHOTS_CAPTURED');
  } catch (err) {
    console.error('CAPTURE_ERROR:', err);
    chrome.kill();
    process.exit(1);
  }
}

run();
