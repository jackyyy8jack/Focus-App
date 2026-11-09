const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = readFileSync(join(__dirname, 'script.js'), 'utf8');
const backgroundCode = source.split('const Background = (() => {')[1];

async function createBackground(mode, library) {
  const storage = new Map([['focus-background-mode', mode]]);
  const elements = new Map();
  const intervals = new Map();
  const visibility = [];
  let nextId = 0;
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      const events = new Map();
      const attrs = new Map();
      elements.set(id, {
        style: {}, value: '', textContent: '', checked: true, disabled: false,
        parentElement: { hidden: false },
        get offsetWidth() { return Number.parseInt(this.style.width, 10) || 320; },
        get offsetHeight() { return Number.parseInt(this.style.height, 10) || 212; },
        classList: {
          add(name) { classes.add(name); },
          remove(name) { classes.delete(name); },
          contains(name) { return classes.has(name); },
          toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
        },
        events,
        addEventListener(name, callback) { events.set(name, callback); },
        setAttribute(name, value) { attrs.set(name, value); },
        getAttribute(name) { return attrs.get(name) || null; },
        getBoundingClientRect() {
          return { left: Number.parseInt(this.style.left, 10) || 860,
            top: Number.parseInt(this.style.top, 10) || 20,
            width: this.offsetWidth, height: this.offsetHeight };
        },
        setPointerCapture() {},
        pause() {}, load() {}, play() { return Promise.resolve(); },
      });
    }
    return elements.get(id);
  }
  const context = vm.createContext({
    document: { getElementById: element },
    appStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) },
    Music: { setBackgroundVisible(on) { visibility.push(on); } },
    window: {
      innerWidth: 1200, innerHeight: 800,
      addEventListener() {},
      electronAPI: { getBackgroundLibrary: () => Promise.resolve(library), chooseBackground: async () => library },
    },
    setInterval(callback) { const id = ++nextId; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {},
  });
  vm.runInContext('const Background = (() => {' + backgroundCode, context);
  await new Promise(resolve => setImmediate(resolve));
  return { element, storage, intervals, visibility };
}

test('a custom photo defaults to a movable original-video window that can be hidden and reopened', async () => {
  const app = await createBackground('photo', { images: [{ id: '1', name: 'view.jpg', url: '/background-media/1' }], video: null });
  assert.equal(app.element('custom-background').classList.contains('active'), true);
  assert.equal(app.element('youtube-shell').classList.contains('pip'), true);
  assert.equal(app.element('youtube-shell').classList.contains('hidden'), false);
  const shell = app.element('youtube-shell');
  shell.events.get('pointerdown')({ button: 0, target: { closest() { return null; } }, clientX: 900, clientY: 40, pointerId: 1 });
  shell.events.get('pointermove')({ clientX: 750, clientY: 140 });
  shell.events.get('pointerup')();
  assert.equal(app.element('youtube-shell').style.left, '710px');
  assert.equal(JSON.parse(app.storage.get('focus-pip-position')).top, 120);
  const resize = app.element('pip-resize');
  resize.events.get('pointerdown')({ button: 0, stopPropagation() {}, clientX: 1030, clientY: 300, pointerId: 2 });
  resize.events.get('pointermove')({ clientX: 1130, clientY: 360 });
  resize.events.get('pointerup')();
  assert.equal(shell.style.width, '420px');
  assert.equal(shell.style.height, '272px');
  assert.equal(JSON.parse(app.storage.get('focus-pip-size')).width, 420);
  app.element('pip-close').events.get('click')();
  assert.equal(app.element('youtube-shell').classList.contains('hidden'), true);
  assert.equal(app.storage.get('focus-show-original-video'), 'off');
  app.element('background-show-original').checked = true;
  app.element('background-show-original').events.get('change')();
  assert.equal(app.element('youtube-shell').classList.contains('hidden'), false);
  assert.deepEqual(app.visibility, []);
  app.element('background-mode').value = 'youtube';
  app.element('background-mode').events.get('change')();
  assert.equal(app.element('youtube-shell').classList.contains('pip'), false);
  assert.equal(shell.style.width, '');
});

test('photo slideshow advances and custom video replaces it', async () => {
  const app = await createBackground('slideshow', {
    images: [
      { id: '1', name: 'one.jpg', url: '/background-media/1' },
      { id: '2', name: 'two.jpg', url: '/background-media/2' },
    ],
    video: { id: '3', name: 'scene.mp4', url: '/background-media/3' },
  });
  assert.equal(app.element('background-photo').src, '/background-media/1');
  assert.equal(app.intervals.size, 1);
  [...app.intervals.values()][0]();
  assert.equal(app.element('background-photo').src, '/background-media/2');
  app.element('background-mode').value = 'video';
  app.element('background-mode').events.get('change')();
  assert.equal(app.element('background-video').src, '/background-media/3');
  assert.equal(app.element('background-video').style.display, 'block');
  assert.equal(app.intervals.size, 0);
});
