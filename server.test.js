const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = readFileSync(join(__dirname, 'main.js'), 'utf8');

function createServerHarness() {
  let handler;
  const reads = [];
  const fakeHttp = {
    createServer(callback) {
      handler = callback;
      return { listen(port, host, callback) { callback(); }, address() { return { port: 12345 }; } };
    },
  };
  const fakeFs = {
    readFile(file, callback) {
      reads.push(file);
      callback(null, Buffer.from('asset'));
    },
  };
  const fakeElectron = {
    app: { on() {}, quit() {} },
    BrowserWindow: class {},
    ipcMain: { on() {} },
  };
  vm.runInNewContext(source + '\nstartServer();', {
    __dirname, Buffer,
    require(name) {
      if (name === 'http') return fakeHttp;
      if (name === 'fs') return fakeFs;
      if (name === 'electron') return fakeElectron;
      return require(name);
    },
  });
  return {
    reads,
    request(url, method = 'GET') {
      const result = { status: null, body: null };
      handler({ url, method }, {
        writeHead(status) { result.status = status; },
        end(body) { result.body = body; },
      });
      return result;
    },
  };
}

test('the local server serves app assets but never project files', () => {
  const app = createServerHarness();
  assert.equal(app.request('/').status, 200);
  assert.equal(app.request('/sounds/bell.ogg?x=1').status, 200);
  assert.equal(app.request('/fonts/NotoSansTC-VF.ttf').status, 200);
  assert.equal(app.request('/.git/config').status, 404);
  assert.equal(app.request('/package.json').status, 404);
  assert.equal(app.request('/%2e%2e%2fmain.js').status, 404);
  assert.equal(app.request('/%zz').status, 400);
  assert.equal(app.request('/', 'POST').status, 405);
  assert.equal(app.reads.length, 3);
});
