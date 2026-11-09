const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const source = readFileSync(require('node:path').join(__dirname, 'script.js'), 'utf8');
const soundCode = source.split('/* =================== 提示音效 start =================== */')[1]
  .split('/* =================== 提示音效 end =================== */')[0];
const musicCode = source.split('const Music = (() => {')[1]
  .split('/* ----- 音樂面板開關 ----- */')[0];
const tracksCode = source.split('const MUSIC_TRACKS = ')[1]
  .split('const Music = (() => {')[0];

function createApp(initialStorage = {}) {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map();
  const intervals = new Map();
  const elements = new Map();
  const storage = new Map(Object.entries(initialStorage));
  const audios = [];
  const player = {
    volume: 0, muted: true, duration: 0, currentTime: 0,
    setVolume(value) { player.volume = value; },
    mute() { player.muted = true; },
    unMute() { player.muted = false; },
    getDuration() { return player.duration; },
    getCurrentTime() { return player.currentTime; },
    playVideo() {}, pauseVideo() {}, loadVideoById() {},
  };
  class Audio {
    constructor() { this.listeners = new Map(); audios.push(this); }
    addEventListener(type, callback) { this.listeners.set(type, callback); }
    removeEventListener(type, callback) {
      if (this.listeners.get(type) === callback) this.listeners.delete(type);
    }
    play() { return Promise.resolve(); }
    pause() {}
    emit(type) { this.listeners.get(type)?.(); }
  }
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', disabled: false,
      classList: { toggle() {}, remove() {} },
      children: [], addEventListener(type, callback) { this[`on${type}`] = callback; }, appendChild(child) { this.children.push(child); }, setAttribute() {}, focus() {},
      set innerHTML(value) { this.children = []; },
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    Audio, console, URL,
    appStorage: { getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, value); } },
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { at: now + delay, callback }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback, delay) { const id = ++nextTimer; intervals.set(id, { callback, delay }); return id; },
    clearInterval(id) { intervals.delete(id); },
    document: {
      getElementById: element, addEventListener() {},
      createElement() { return { className: '', textContent: '', children: [], appendChild(child) { this.children.push(child); }, setAttribute() {}, classList: { add() {} } }; },
      head: { appendChild() {} },
    },
    window: { location: { origin: 'http://localhost' }, addEventListener() {} },
    YT: { PlayerState: { PLAYING: 1, ENDED: 0 }, Player: class {
      constructor(id, options) { Object.assign(this, player); options.events.onReady({ target: this }); }
    } },
  });
  vm.runInContext(`${soundCode}\nconst MUSIC_TRACKS = ${tracksCode}const Music = (() => {${musicCode}`, context);
  const [startupId, startup] = [...timers][0];
  timers.delete(startupId);
  now = startup.at;
  startup.callback();
  context.window.onYouTubeIframeAPIReady();
  return {
    player, audios, element, storage,
    pollMusic() { [...intervals.values()].find(interval => interval.delay === 500)?.callback(); },
    call(code) { return vm.runInContext(code, context); },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at;
        timers.delete(due[0]);
        due[1].callback();
      }
      now = end;
    },
  };
}

test('both reminders lower music and restore it only after the last ring ends', () => {
  const app = createApp();
  assert.equal(app.player.volume, 50);
  app.call('playSound("bell")');
  assert.equal(app.player.volume, 10);
  app.advance(1000);
  app.call('playSound("alarm")');
  app.audios[0].emit('ended');
  assert.equal(app.player.volume, 10);
  app.advance(5000);
  assert.equal(app.player.volume, 50);
});

test('YouTube URL management adds, saves and removes a custom track', () => {
  const app = createApp();
  app.element('mp-manage-toggle').onclick();
  app.element('mp-add-url').value = 'https://youtu.be/5Q2Pc-e-8Qc';
  app.element('mp-manage-form').onsubmit({ preventDefault() {} });
  assert.match(app.element('mp-manage-message').textContent, /已在清單中/);
  app.element('mp-add-url').value = 'https://www.youtube.com/watch?v=abcdefghijk&t=10';
  app.element('mp-add-title').value = '我的音樂';
  app.element('mp-manage-form').onsubmit({ preventDefault() {} });
  const saved = JSON.parse(app.storage.get('focus-music-tracks'));
  assert.equal(saved.at(-1).id, 'abcdefghijk');
  assert.equal(saved.at(-1).title, '我的音樂');
  const list = app.element('mp-tracklist');
  const customRow = list.children.at(-1);
  customRow.children.at(-1).onclick({ stopPropagation() {} });
  assert.equal(JSON.parse(app.storage.get('focus-music-tracks')).some(track => track.id === 'abcdefghijk'), false);
});

test('the five 輝夜姬 videos are available to users with an older saved playlist', () => {
  const app = createApp({
    'focus-music-tracks': JSON.stringify([{ title: '舊曲目', id: 'abcdefghijk', category: 'custom' }]),
  });
  const tracks = JSON.parse(app.storage.get('focus-music-tracks'));
  assert.equal(tracks.length, 6);
  assert.equal(tracks.filter(track => track.category === 'user:輝夜姬').length, 5);
  assert.equal(app.storage.get('focus-music-library-version'), '2');
});

test('a named category is reused and disappears when its last track is removed', () => {
  const app = createApp();
  app.element('mp-manage-toggle').onclick();
  app.element('mp-category-toggle').onclick();
  app.element('mp-add-category').value = '夜間閱讀';
  for (const id of ['abcdefghijk', 'zyxwvutsrqp']) {
    app.element('mp-add-url').value = `https://youtu.be/${id}`;
    app.element('mp-manage-form').onsubmit({ preventDefault() {} });
  }
  let tracks = JSON.parse(app.storage.get('focus-music-tracks'));
  assert.equal(tracks.filter(track => track.category === 'user:夜間閱讀').length, 2);
  assert.equal(app.element('mp-categories').children.filter(button => button.textContent === '夜間閱讀').length, 1);
  for (const id of ['abcdefghijk', 'zyxwvutsrqp']) {
    const row = app.element('mp-tracklist').children.find(item => item.children[1]?.textContent === `自訂音樂 · ${id}`);
    row.children.at(-1).onclick({ stopPropagation() {} });
  }
  tracks = JSON.parse(app.storage.get('focus-music-tracks'));
  assert.equal(tracks.some(track => track.category === 'user:夜間閱讀'), false);
  assert.equal(app.element('mp-categories').children.some(button => button.textContent === '夜間閱讀'), false);
});

test('a growing YouTube duration is shown as a live broadcast', () => {
  const app = createApp();
  app.player.duration = 18_000_000;
  app.player.currentTime = 17_999_990;
  app.pollMusic();
  assert.equal(app.element('mp-duration').textContent, '🔴 直播');
  app.player.duration += 1;
  app.pollMusic();
  app.player.duration += 1;
  app.pollMusic();
  assert.equal(app.element('mp-duration').textContent, '🔴 直播');
  assert.equal(app.element('mp-current').textContent, '');
  assert.equal(app.element('mp-progress').disabled, true);
  app.call('Music.next()');
  assert.equal(app.element('mp-duration').textContent, '--:--');
  app.player.duration = 240;
  app.player.currentTime = 30;
  app.pollMusic();
  app.pollMusic();
  assert.equal(app.element('mp-duration').textContent, '4:00');
  assert.equal(app.element('mp-progress').disabled, false);
});

test('a stationary long recording keeps its normal duration', () => {
  const app = createApp();
  app.player.duration = 13 * 60 * 60;
  app.player.currentTime = 60;
  app.pollMusic();
  app.pollMusic();
  assert.equal(app.element('mp-duration').textContent, '13:00:00');
  assert.equal(app.element('mp-progress').disabled, false);
});

test('volume changes and track switches during a ring preserve the chosen volume', () => {
  const app = createApp();
  app.call('playSound("bell")');
  app.element('mp-volume').oninput({ target: { value: '80' } });
  assert.equal(app.player.volume, 16);
  app.call('Music.next()');
  assert.equal(app.player.volume, 16);
  app.audios[0].emit('ended');
  assert.equal(app.player.volume, 80);
});

test('stopping and disabling a reminder restore music', () => {
  const app = createApp();
  app.call('playSound("alarm")');
  app.call('stopSound()');
  assert.equal(app.player.volume, 50);
  app.call('playSound("alarm")');
  app.call('setSoundEnabled("timer", false)');
  assert.equal(app.player.volume, 50);
  app.call('playSound("alarm")');
  assert.equal(app.player.volume, 50);
});
