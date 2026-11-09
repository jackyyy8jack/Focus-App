const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = readFileSync(join(__dirname, 'script.js'), 'utf8');
const layoutCode = source.split('const timerWidgetEl = document.getElementById("timer-widget");')[1]
  .split('timerIcon.addEventListener("mousedown"')[0];

function createLayout() {
  const classes = new Set(['show']);
  const callbacks = new Map();
  const pending = [];
  const widget = {
    style: { left: '200px', top: '200px', display: 'block', removeProperty(key) { delete this[key]; } },
    classList: {
      contains(name) { return classes.has(name); },
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
    },
    getBoundingClientRect() {
      return { left: 200, top: 200, right: classes.has('minimized') ? 360 : 650,
        bottom: classes.has('minimized') ? 300 : 550,
        width: classes.has('minimized') ? 160 : 450,
        height: classes.has('minimized') ? 100 : 350 };
    },
    matches() { return false; },
    addEventListener(name, callback) { callbacks.set(`widget:${name}`, callback); },
  };
  const icon = {
    style: { display: 'none' }, offsetWidth: 38, offsetHeight: 38,
    matches() { return false; },
    addEventListener(name, callback) { callbacks.set(`icon:${name}`, callback); },
  };
  const handle = { style: {}, addEventListener(name, callback) { callbacks.set(`handle:${name}`, callback); } };
  const context = vm.createContext({
    document: { getElementById(id) {
      return id === 'timer-widget' ? widget : id === 'timer-icon' ? icon : handle;
    } },
    window: { innerWidth: 1200, innerHeight: 800 },
    requestAnimationFrame(callback) { callback(); },
    setTimeout(callback) { pending.push(callback); },
  });
  vm.runInContext('const timerWidgetEl = document.getElementById("timer-widget");' + layoutCode, context);
  return { widget, icon, callbacks, pending, call(code) { vm.runInContext(code, context); } };
}

test('minimize and restore preserve the full timer dimensions', () => {
  const layout = createLayout();
  layout.call('minimizeTimer()');
  assert.equal(layout.widget.classList.contains('minimized'), true);
  assert.equal(layout.widget.style.display, 'none');
  layout.call('restoreTimerFromIcon()');
  assert.equal(layout.widget.classList.contains('minimized'), false);
  assert.equal(layout.widget.style.width, '450px');
  assert.equal(layout.widget.style.height, '350px');
  assert.equal(layout.widget.style.display, 'block');
});

test('a delayed hover callback cannot hide an already restored timer', () => {
  const layout = createLayout();
  layout.call('minimizeTimer()');
  layout.callbacks.get('icon:mouseenter')();
  layout.callbacks.get('icon:mouseleave')();
  layout.call('restoreTimerFromIcon()');
  layout.pending.forEach(callback => callback());
  assert.equal(layout.widget.style.display, 'block');
});
