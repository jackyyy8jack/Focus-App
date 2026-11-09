const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const test = require('node:test');
const { createBackgroundMedia } = require('./background-media');

function temporaryFiles(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'focusapp-media-'));
  t.after(() => {
    const resolved = path.resolve(directory);
    if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe test cleanup path');
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const image = path.join(directory, 'scene.jpg');
  const video = path.join(directory, 'scene.mp4');
  fs.writeFileSync(image, 'image-bytes');
  fs.writeFileSync(video, 'abcdefghij');
  return { directory, image, video };
}

function request(library, id, range, method = 'GET') {
  return new Promise(resolve => {
    const response = new PassThrough();
    const chunks = [];
    response.writeHead = (status, headers) => { response.status = status; response.headers = headers; };
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({ status: response.status, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    library.serve({ method, headers: range ? { range } : {} }, response, id);
  });
}

test('selected background files persist without exposing their paths to the page', async t => {
  const files = temporaryFiles(t);
  const library = createBackgroundMedia(path.join(files.directory, 'settings'));
  await library.replaceImages([files.image]);
  await library.replaceVideo(files.video);
  fs.unlinkSync(files.image);
  fs.unlinkSync(files.video);
  const saved = createBackgroundMedia(path.join(files.directory, 'settings')).list();
  assert.equal(saved.images[0].name, 'scene.jpg');
  assert.equal(saved.video.name, 'scene.mp4');
  assert.equal(JSON.stringify(saved).includes(files.directory), false);
  assert.equal((await request(createBackgroundMedia(path.join(files.directory, 'settings')), saved.images[0].id)).body, 'image-bytes');
  assert.equal((await request(createBackgroundMedia(path.join(files.directory, 'settings')), saved.video.id)).body, 'abcdefghij');
  await assert.rejects(library.replaceImages([path.join(files.directory, 'unknown.txt')]));
  assert.equal((await request(library, '00000000-0000-0000-0000-000000000000')).status, 404);
});

test('local video supports byte ranges for seeking', async t => {
  const files = temporaryFiles(t);
  const library = createBackgroundMedia(path.join(files.directory, 'settings'));
  const id = (await library.replaceVideo(files.video)).video.id;
  const part = await request(library, id, 'bytes=2-5');
  assert.equal(part.status, 206);
  assert.equal(part.headers['Content-Range'], 'bytes 2-5/10');
  assert.equal(part.body, 'cdef');
  assert.equal((await request(library, id, 'bytes=50-60')).status, 416);
  const head = await request(library, id, undefined, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
});
