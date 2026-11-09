const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = readFileSync(join(__dirname, 'script.js'), 'utf8');
const appearanceCode = source.split('const DEFAULT_WIDGET_SETTINGS = ')[1]
  .split('function placeFloatingPanel(')[0];

function createAppearance(saved = {}) {
  const storage = new Map([['focus-widget-settings', JSON.stringify(saved)]]);
  const elements = new Map();
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, {
      style: { setProperty(name, value) { this[name] = value; } },
      value: id === 'setting-component' ? 'tomato' : '', textContent: '',
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: {
      getElementById: getElement,
      querySelectorAll(selector) { return [getElement(selector)]; },
    },
    appStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); },
    },
  });
  vm.runInContext('const DEFAULT_WIDGET_SETTINGS = ' + appearanceCode, context);
  return { storage, getElement, call(expression) { return vm.runInContext(expression, context); } };
}

test('saved legacy colors and shared opacity migrate to the three timer widgets', () => {
  const app = createAppearance({ tomato: '#123456', stopwatch: '#654321', timer: '#abcdef', opacity: 40 });
  app.call('loadWidgetSettings(); syncSettingsInputs()');
  assert.equal(app.getElement('setting-component-color').value, '#123456');
  assert.equal(app.getElement('setting-widget-opacity').value, 40);
  assert.equal(app.getElement('tomato-widget').style.backgroundColor, 'rgba(18, 52, 86, 0.4)');
  assert.equal(app.getElement('clock').style.color, '#ffffff');
  assert.equal(app.getElement('clock').style.backgroundColor, 'rgba(31, 27, 48, 0)');
});

test('each surface retains its own color and opacity after saving and loading', () => {
  const app = createAppearance();
  app.call('loadWidgetSettings()');
  app.call('widgetSettings.toolbar = { color: "#336699", opacity: 55 }; saveWidgetSettings(); loadWidgetSettings(); applyWidgetSettings()');
  assert.equal(app.getElement('.focus-toolbar').style.backgroundColor, 'rgba(51, 102, 153, 0.55)');
  assert.equal(app.getElement('#music-player').style.backgroundColor, 'rgba(31, 27, 48, 0.8)');
  app.getElement('setting-component').value = 'musicBar';
  app.call('syncSettingsInputs()');
  assert.equal(app.getElement('setting-component-color').value, '#1f1b30');
  assert.equal(app.getElement('setting-widget-opacity').value, 80);
});

test('settings, help and context menus can use different surfaces', () => {
  const app = createAppearance({
    settingsPanel: { color: '#112233', opacity: 75 },
    helpPanel: { color: '#445566', opacity: 65 },
    menus: { color: '#778899', opacity: 55 },
  });
  app.call('loadWidgetSettings(); applyWidgetSettings()');
  assert.equal(app.getElement('#settings-panel').style.backgroundColor, 'rgba(17, 34, 51, 0.75)');
  assert.equal(app.getElement('#help-dialog').style.backgroundColor, 'rgba(68, 85, 102, 0.65)');
  assert.equal(app.getElement('.context-menu').style.backgroundColor, 'rgba(119, 136, 153, 0.55)');
});

test('zero opacity keeps text visible while removing panel and header backgrounds', () => {
  const app = createAppearance({ settingsPanel: { color: '#112233', opacity: 0 }, tomato: { color: '#f05d5d', opacity: 0 } });
  app.call('loadWidgetSettings(); applyWidgetSettings()');
  assert.equal(app.getElement('#settings-panel').style.backgroundColor, 'rgba(17, 34, 51, 0)');
  assert.equal(app.getElement('.settings-header').style.backgroundColor, 'rgba(13, 26, 38, 0)');
  assert.equal(app.getElement('#settings-panel').style.backdropFilter, 'none');
  assert.equal(app.getElement('tomato-widget').style.backgroundColor, 'rgba(240, 93, 93, 0)');
  assert.equal(app.getElement('drag-handle').style.backgroundColor, 'rgba(173, 67, 67, 0)');
  assert.equal(app.getElement('setting-widget-opacity').value, '', 'selection stays untouched until synced');
  app.getElement('setting-component').value = 'settingsPanel';
  app.call('syncSettingsInputs()');
  assert.equal(app.getElement('setting-widget-opacity').value, 0);
});

test('settings controls and help scrollbar follow their panel colors', () => {
  const app = createAppearance({
    settingsPanel: { color: '#e8dfd1', opacity: 90 },
    helpPanel: { color: '#244434', opacity: 100 },
  });
  app.call('loadWidgetSettings(); applyWidgetSettings()');
  const settings = app.getElement('settings-panel').style;
  const help = app.getElement('help-dialog').style;
  assert.equal(settings['--settings-text'], '#211c2c');
  assert.notEqual(settings['--settings-control-solid'], '#342b50');
  assert.notEqual(help['--help-scroll-thumb'], '#a994e8');
  assert.equal(help['--help-scroll-track'], '#244434');
  assert.equal(help['--help-text'], '#f8f7fc');
});

test('history and music scrollbars follow their own panel colors', () => {
  const app = createAppearance({
    toolbar: { color: '#346a54', opacity: 75 },
    musicPanel: { color: '#854f35', opacity: 80 },
  });
  app.call('loadWidgetSettings(); applyWidgetSettings()');
  const history = app.getElement('.focus-toolbar').style;
  const music = app.getElement('music-panel').style;
  assert.equal(history['--history-scroll-track'], '#346a54');
  assert.equal(music['--music-scroll-track'], '#854f35');
  assert.notEqual(history['--history-scroll-thumb'], music['--music-scroll-thumb']);
});

test('reset current or all appearances saves the original defaults', () => {
  const app = createAppearance({
    tomato: { color: '#123456', opacity: 80 },
    musicBar: { color: '#654321', opacity: 30 },
  });
  app.call('loadWidgetSettings()');
  app.getElement('setting-component').value = 'tomato';
  app.call('resetSelectedWidgetSettings()');
  let saved = JSON.parse(app.storage.get('focus-widget-settings'));
  assert.deepEqual(saved.tomato, { color: '#f05d5d', opacity: 28 });
  assert.deepEqual(saved.musicBar, { color: '#654321', opacity: 30 });
  app.call('resetAllWidgetSettings()');
  saved = JSON.parse(app.storage.get('focus-widget-settings'));
  assert.deepEqual(saved.musicBar, { color: '#1f1b30', opacity: 80 });
  assert.equal(app.getElement('setting-component-color').value, '#f05d5d');
});
