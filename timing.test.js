const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = readFileSync(join(__dirname, 'script.js'), 'utf8');
const tomatoCode = source.split('let workDuration = 25 * 60;')[1]
  .split('// ------番茄鐘功能end------')[0];
const countdownCode = source.split('let countdownTotal = 5 * 60;')[1]
  .split('// 輸入框即時套用')[0];

function createClock(code, declaration) {
  let now = new Date(2026, 9, 26, 9).getTime();
  let nextId = 0;
  const intervals = new Map();
  const elements = new Map();
  const storage = new Map();
  const rings = [];
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '',
      children: [],
      classList: { add() {}, remove() {} },
      addEventListener() {},
      replaceChildren() { this.children = []; },
      appendChild(child) { this.children.push(child); },
    });
    return elements.get(id);
  };
  const FakeDate = class extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  const context = vm.createContext({
    Date: FakeDate, document: { getElementById: element, createElement() { return { textContent: '' }; } },
    appStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); },
    },
    setInterval(callback) { const id = ++nextId; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); },
    playSound(name) { rings.push(name); },
  });
  vm.runInContext(declaration + code, context);
  return {
    element, storage, rings,
    call(expression) { return vm.runInContext(expression, context); },
    advance(ms) {
      now += ms;
      for (const callback of [...intervals.values()]) callback();
    },
  };
}

test('a delayed Pomodoro tick switches phase once at the real deadline', () => {
  const clock = createClock(tomatoCode, 'let workDuration = 25 * 60;');
  clock.call('startTimer()');
  clock.advance(25 * 60 * 1000 + 4000);
  assert.equal(clock.element('tomato-phase').textContent, '休息中 💤');
  assert.equal(clock.element('timer-display').textContent, '00:05:00');
  assert.deepEqual(clock.rings, ['bell']);
  assert.equal(JSON.parse(clock.storage.get('focus-sessions')).length, 1);
  clock.advance(5 * 60 * 1000);
  assert.equal(clock.element('tomato-phase').textContent, '工作中 🍅');
  assert.equal(JSON.parse(clock.storage.get('focus-sessions')).length, 1);
});

test('a completed work period is recorded under the task selected when it began', () => {
  const clock = createClock(tomatoCode, 'let workDuration = 25 * 60;');
  clock.element('focus-task').value = '準備報告';
  clock.call('startTimer()');
  clock.element('focus-task').value = '讀書';
  clock.advance(25 * 60 * 1000);
  const sessions = JSON.parse(clock.storage.get('focus-sessions'));
  assert.equal(sessions[0].task, '準備報告');
  assert.equal(sessions[0].minutes, 25);
  assert.match(clock.element('focus-today-count').textContent, /1 次・25 分鐘/);
  assert.match(clock.element('focus-history-list').children[0].textContent, /準備報告/);
});

test('pausing and resuming the countdown uses elapsed time', () => {
  const clock = createClock(countdownCode, 'let countdownTotal = 5 * 60;');
  clock.call('startCountdown()');
  clock.advance(90 * 1000);
  assert.equal(clock.element('countdown-display').textContent, '00:03:30');
  clock.call('pauseCountdown()');
  clock.advance(60 * 1000);
  assert.equal(clock.element('countdown-display').textContent, '00:03:30');
  clock.call('startCountdown()');
  clock.advance(210 * 1000);
  assert.deepEqual(clock.rings, ['alarm']);
  clock.advance(1000);
  assert.deepEqual(clock.rings, ['alarm']);
});

test('invalid Pomodoro durations are clamped to safe values', () => {
  const clock = createClock(tomatoCode, 'let workDuration = 25 * 60;');
  clock.element('work-input').value = '-4';
  clock.element('rest-input').value = '9999';
  clock.call('applySettings()');
  assert.equal(clock.element('work-input').value, 1);
  assert.equal(clock.element('rest-input').value, 60);
  assert.equal(clock.element('timer-display').textContent, '00:01:00');
});
