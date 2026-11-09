// Run with Electron to verify the real preload and renderer load together.
process.env.FOCUS_APP_SMOKE = '1';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { app, session } = require('electron');
const smokeData = fs.mkdtempSync(path.join(os.tmpdir(), 'focusapp-smoke-'));
app.setPath('userData', smokeData);
const photoId = randomUUID();
const photoPath = path.join(smokeData, 'smoke.png');
fs.writeFileSync(photoPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WgMxH8AAAAASUVORK5CYII=', 'base64'));
fs.writeFileSync(path.join(smokeData, 'background-media.json'), JSON.stringify({
  images: [{ id: photoId, path: photoPath, name: 'smoke.png', mime: 'image/png' }], video: null,
}));

function finish(code) {
  app.exit(code);
}

app.on('ready', () => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://*/*'] }, (details, callback) => {
    callback({ cancel: true });
  });
});

app.on('browser-window-created', (event, win) => {
  win.webContents.once('did-finish-load', async () => {
    try {
      const result = await win.webContents.executeJavaScript(`(async () => {
        await document.fonts.ready;
        const mode = document.getElementById('background-mode');
        const settings = document.getElementById('settings-panel');
        await new Promise(resolve => setTimeout(resolve, 100));
        openSettingsPanel();
        await new Promise(resolve => setTimeout(resolve, 50));
        const component = document.getElementById('setting-component');
        component.value = 'settingsPanel';
        component.dispatchEvent(new Event('change'));
        const opacity = document.getElementById('setting-widget-opacity');
        opacity.value = '0';
        opacity.dispatchEvent(new Event('input'));
        const zeroOpacity = opacity.min === '0' && settings.style.backgroundColor.endsWith(', 0)') && settings.style.backdropFilter === 'none';
        const color = document.getElementById('setting-component-color');
        color.value = '#e8dfd1';
        color.dispatchEvent(new Event('input'));
        const themedSelect = getComputedStyle(document.getElementById('background-mode')).backgroundColor === 'rgb(209, 201, 188)';
        component.value = 'helpPanel';
        component.dispatchEvent(new Event('change'));
        color.value = '#244434';
        color.dispatchEvent(new Event('input'));
        const help = document.getElementById('help-dialog');
        const themedScrollbar = help.style.getPropertyValue('--help-scroll-track') === '#244434' &&
          help.style.getPropertyValue('--help-scroll-thumb') !== '#a994e8';
        document.getElementById('setting-reset-selected').click();
        const selectedReset = JSON.parse(window.electronAPI.settingsGet('focus-widget-settings')).helpPanel.color === '#242037';
        document.getElementById('setting-reset-all').click();
        const allReset = JSON.parse(window.electronAPI.settingsGet('focus-widget-settings')).settingsPanel.color === '#1f1b30';
        const header = settings.querySelector('.settings-header');
        header.setPointerCapture = () => {};
        const rect = settings.getBoundingClientRect();
        const x = rect.left + 20;
        const y = rect.top + 20;
        header.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y }));
        header.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1, clientX: x + 45, clientY: y + 35 }));
        header.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 1, clientX: x + 45, clientY: y + 35 }));
        mode.value = 'photo';
        mode.dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, 100));
        const pip = document.getElementById('youtube-shell');
        const resize = document.getElementById('pip-resize');
        resize.setPointerCapture = () => {};
        const pipRect = pip.getBoundingClientRect();
        resize.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 2, clientX: pipRect.right, clientY: pipRect.bottom }));
        resize.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 2, clientX: pipRect.right + 30, clientY: pipRect.bottom + 20 }));
        resize.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 2, clientX: pipRect.right + 30, clientY: pipRect.bottom + 20 }));
        const helpScrollbar = getComputedStyle(document.querySelector('.help-content'));
        const fontResource = performance.getEntriesByType('resource').find(entry => entry.name.includes('NotoSansTC-VF.ttf'));
        return {
          preload: typeof window.electronAPI?.getBackgroundLibrary === 'function',
          selectedMode: mode.value,
          pipVisible: pip.classList.contains('pip') && !pip.classList.contains('hidden'),
          compactPip: !document.getElementById('pip-handle') && getComputedStyle(document.getElementById('pip-close')).display !== 'none',
          resizedPip: JSON.parse(window.electronAPI.settingsGet('focus-pip-size')).width > 320,
          styledHelpScrollbar: helpScrollbar.scrollbarWidth === 'thin' && helpScrollbar.scrollbarColor !== 'auto',
          themedSelect, themedScrollbar, selectedReset, allReset,
          backgroundStatus: document.getElementById('background-status').textContent,
          settingsPresent: !!settings,
          zeroOpacity,
          draggedPositionSaved: !!window.electronAPI.settingsGet('focus-settings-position'),
          fontLoaded: document.fonts.check('400 14px "Focus Noto Sans TC"'),
          fontLoadMs: Math.round(fontResource?.duration || 0),
        };
      })()`);
      if (!result.preload || !result.settingsPresent || !result.pipVisible || !result.compactPip || !result.resizedPip || !result.styledHelpScrollbar || !result.themedSelect || !result.themedScrollbar || !result.selectedReset || !result.allReset || !result.fontLoaded || !result.zeroOpacity || !result.draggedPositionSaved) {
        throw new Error(`Smoke check failed: ${JSON.stringify(result)}`);
      }
      console.log(`Smoke check passed: ${JSON.stringify(result)}`);
      finish(0);
    } catch (error) {
      console.error(error);
      finish(1);
    }
  });
});

require('./main');
setTimeout(() => { console.error('Smoke check timed out'); finish(1); }, 15000);
