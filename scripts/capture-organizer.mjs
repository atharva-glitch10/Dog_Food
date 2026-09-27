import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const url = 'http://localhost:3000/dashboard/organizer/dogfood-2026';
const outputPath = process.argv[2] || 'organizer_dashboard_console.png';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.resolve('chrome-cdp-profile-organizer');

if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9334',
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
      const res = await fetch('http://127.0.0.1:9334/json/version');
      if (res.ok) {
        const data = await res.json();
        return data.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome remote debugging did not respond on port 9334');
}

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
    await sendSession('Network.enable');

    // Authenticate as organizer
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'organizer@dogfood.local', password: 'Dogfood2026!' }),
    });
    const cookieHeader = loginRes.headers.get('set-cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/token=([^;]+)/);
      if (match) {
        await sendSession('Network.setCookie', {
          name: 'token',
          value: match[1],
          url: 'http://localhost:3000',
          httpOnly: true,
        });
      }
    }

    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 950,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await sendSession('Page.navigate', { url });

    // Wait 3.5s for React render and stats fetch
    await sleep(3500);

    const shot = await sendSession('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });
    const buffer = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(outputPath, buffer);
    console.log(`SCREENSHOT_SUCCESS: ${outputPath} (${buffer.length} bytes)`);

    ws.close();
    chrome.kill();
  } catch (err) {
    console.error('SCREENSHOT_ERROR:', err);
    chrome.kill();
    process.exit(1);
  }
}

run();
