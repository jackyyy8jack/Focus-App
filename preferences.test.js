const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const mainSource = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
const rendererSource = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
const storageCode = rendererSource.split("const appStorage = ")[1].split('/* =================== 提示音效 start')[0];

async function createMain(dataDirectory) {
  let ready;
  const listeners = new Map();
  const handlers = new Map();
  const webContents = {};
  const fakeElectron = {
    app: {
      on(name, callback) { if (name === 'ready') ready = callback; },
      getPath() { return dataDirectory; },
      quit() {},
    },
    BrowserWindow: class { constructor() { this.webContents = webContents; } loadURL() {} close() {} },
    ipcMain: {
      on(name, callback) { listeners.set(name, callback); },
      handle(name, callback) { handlers.set(name, callback); },
    },
    dialog: { showOpenDialog() {} },
  };
  vm.runInNewContext(mainSource, {
    __dirname,
    process,
    require(name) {
      if (name === 'electron') return fakeElectron;
      if (name === 'http') return { createServer() {
        return { listen(port, host, callback) { callback(); }, address() { return { port: 12345 }; } };
      } };
      return require(name);
    },
  });
  await ready();
  return {
    get(key) { const event = {}; listeners.get('settings-get')(event, key); return event.returnValue; },
    set(key, value) { const event = {}; listeners.get('settings-set')(event, key, value); return event.returnValue; },
    handlers,
  };
}

test('preferences survive a new Electron session and legacy page values migrate', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'focusapp-prefs-'));
  t.after(() => {
    const resolved = path.resolve(directory);
    if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe test cleanup path');
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const first = await createMain(directory);
  const legacy = new Map([['focus-current-task', '閱讀一章']]);
  const appWindow = {
    electronAPI: { settingsGet: key => first.get(key), settingsSet: (key, value) => first.set(key, value) },
    localStorage: { getItem: key => legacy.get(key) || null },
  };
  const context = vm.createContext({ window: appWindow, localStorage: appWindow.localStorage });
  vm.runInContext('const appStorage = ' + storageCode, context);
  assert.equal(vm.runInContext("appStorage.getItem('focus-current-task')", context), '閱讀一章');
  assert.equal(first.get('focus-current-task'), '閱讀一章');
  vm.runInContext("appStorage.setItem('focus-background-mode', 'slideshow')", context);
  const second = await createMain(directory);
  assert.equal(second.get('focus-current-task'), '閱讀一章');
  assert.equal(second.get('focus-background-mode'), 'slideshow');
});
