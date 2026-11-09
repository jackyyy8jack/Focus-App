const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const IMAGE_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const VIDEO_TYPES = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg' };

function createBackgroundMedia(dataDirectory) {
  const settingsFile = path.join(dataDirectory, 'background-media.json');
  const assetDirectory = path.join(dataDirectory, 'background-assets');
  let library = { images: [], video: null };
  let mutation = Promise.resolve();
  try {
    const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    const valid = entry => entry && /^[0-9a-f-]{36}$/i.test(entry.id) && typeof entry.path === 'string';
    library.images = Array.isArray(saved.images) ? saved.images.filter(valid).slice(0, 100) : [];
    library.video = valid(saved.video) ? saved.video : null;
  } catch (_) { /* First launch or invalid saved data. */ }

  async function makeEntry(filePath, types) {
    const resolved = path.resolve(filePath);
    const extension = path.extname(resolved).toLowerCase();
    const mime = types[extension];
    if (!mime || !(await fs.promises.stat(resolved)).isFile()) throw new Error('Unsupported background file');
    const id = randomUUID();
    const destination = path.join(assetDirectory, id + extension);
    await fs.promises.mkdir(assetDirectory, { recursive: true });
    try { await fs.promises.copyFile(resolved, destination); }
    catch (error) {
      await fs.promises.unlink(destination).catch(() => {});
      throw error;
    }
    return { id, path: destination, name: path.basename(resolved), mime };
  }

  function isManaged(entry) {
    return entry && path.dirname(path.resolve(entry.path)) === path.resolve(assetDirectory) &&
      path.basename(entry.path).startsWith(entry.id + '.');
  }

  async function removeManaged(entries) {
    await Promise.all(entries.filter(isManaged).map(entry => fs.promises.unlink(entry.path).catch(() => {})));
  }

  function enqueue(action) {
    const next = mutation.then(action, action);
    mutation = next.catch(() => {});
    return next;
  }

  function save() {
    fs.mkdirSync(dataDirectory, { recursive: true });
    const temporary = settingsFile + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(library), 'utf8');
    fs.renameSync(temporary, settingsFile);
  }

  function publicEntry(entry) {
    return entry && { id: entry.id, name: entry.name, url: `/background-media/${entry.id}` };
  }

  function list() {
    return { images: library.images.map(publicEntry), video: publicEntry(library.video) };
  }

  function replaceImages(filePaths) {
    if (!Array.isArray(filePaths) || filePaths.length < 1 || filePaths.length > 100) {
      return Promise.reject(new Error('Select 1–100 photos'));
    }
    return enqueue(async () => {
      const images = [];
      try {
        for (const filePath of filePaths) images.push(await makeEntry(filePath, IMAGE_TYPES));
        const previous = library.images;
        library.images = images;
        try { save(); }
        catch (error) { library.images = previous; throw error; }
        await removeManaged(previous);
        return list();
      } catch (error) {
        await removeManaged(images);
        throw error;
      }
    });
  }

  function replaceVideo(filePath) {
    return enqueue(async () => {
      const video = await makeEntry(filePath, VIDEO_TYPES);
      try {
        const previous = library.video;
        library.video = video;
        try { save(); }
        catch (error) { library.video = previous; throw error; }
        await removeManaged([previous]);
        return list();
      } catch (error) {
        await removeManaged([video]);
        throw error;
      }
    });
  }

  function serve(req, res, id) {
    const entry = [...library.images, library.video].find(item => item && item.id === id);
    if (!entry) { res.writeHead(404); res.end('Not found'); return; }
    fs.stat(entry.path, (error, stat) => {
      if (error || !stat.isFile()) { res.writeHead(404); res.end('File moved or removed'); return; }
      const headers = { 'Content-Type': entry.mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
      const range = req.headers.range;
      let start = 0;
      let end = stat.size - 1;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) {
          res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); res.end(); return;
        }
        if (match[1]) {
          start = Number(match[1]);
          if (match[2]) end = Number(match[2]);
        } else {
          start = Math.max(0, stat.size - Number(match[2]));
        }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
          res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); res.end(); return;
        }
        end = Math.min(end, stat.size - 1);
        headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      }
      headers['Content-Length'] = Math.max(0, end - start + 1);
      res.writeHead(range ? 206 : 200, headers);
      if (req.method === 'HEAD' || stat.size === 0) { res.end(); return; }
      fs.createReadStream(entry.path, { start, end }).on('error', () => res.destroy()).pipe(res);
    });
  }

  return { list, replaceImages, replaceVideo, serve };
}

module.exports = { createBackgroundMedia };
