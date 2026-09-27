import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const url = 'http://localhost:3000/dashboard/organizer/dogfood-2026';
const outputPath = process.argv[2] || 'settings_slideover.png';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.resolve('chrome-cdp-profile-settings');

if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9336',
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
      const res = await fetch('http://127.0.0.1:9336/json/version');
      if (res.ok) {
        const data = await res.json();
        return data.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome remote debugging did not respond on port 9336');
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
    await sendSession('Runtime.enable');
    await sendSession('Network.enable');

    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 950,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. First navigate to login page
    await sendSession('Page.navigate', { url: 'http://localhost:3000/login' });
    await sleep(2000);

    // 2. Perform in-page login
    const loginResult = await sendSession('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          try {
            const emailInput = document.querySelector('input[type="email"]');
            const passwordInput = document.querySelector('input[type="password"]');
            const submitBtn = document.querySelector('button[type="submit"]');
            
            if (emailInput && passwordInput && submitBtn) {
              emailInput.value = 'organizer@dogfood.local';
              emailInput.dispatchEvent(new Event('input', { bubbles: true }));
              passwordInput.value = 'Dogfood2026!';
              passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
              submitBtn.click();
              return 'SUBMITTED_FORM';
            }
            return 'INPUTS_NOT_FOUND';
          } catch (e) {
            return e.toString();
          }
        })()
      `,
    });
    console.log('Login form result:', loginResult);

    // Wait 3.5s for authentication and redirect
    await sleep(3500);

    // 3. Open settings slideover panel
    const clickResult = await sendSession('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('SETTINGS') || b.title?.includes('Preferences'));
          if (btn) {
            btn.click();
            return 'CLICKED_SETTINGS';
          }
          return 'SETTINGS_BTN_NOT_FOUND';
        })()
      `,
    });
    console.log('Click settings result:', clickResult);

    // Wait 800ms for slideover animation
    await sleep(800);

    const shot = await sendSession('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
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
