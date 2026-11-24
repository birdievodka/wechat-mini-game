const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const concept = 'art/concepts/taoyuan-redesign';
const sources = 'art/runtime-redesign';
const ui = 'assets/chronicle-ui';
const transparent = '#00000000';
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const recorded = {};

async function read(file) {
  return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function cell(image, columns, rows, index, margin = 0) {
  const { width, height } = image.info;
  const column = index % columns, row = Math.floor(index / columns);
  const x = Math.floor(column * width / columns) + margin;
  const y = Math.floor(row * height / rows) + margin;
  return {
    left: x, top: y,
    width: Math.floor((column + 1) * width / columns) - x - margin,
    height: Math.floor((row + 1) * height / rows) - y - margin,
  };
}

// Extract concept cutouts. Remove only the temporary studio background connected to the
// crop perimeter. This preserves pale cloth, paper and bright edge planes inside the art.
async function cut(file, bounds, width, height, pad = 4, baseline = false, alphaFloor = 18, singleActor = false) {
  const source = sharp(file);
  if (bounds) source.extract(bounds);
  const { data, info } = await source.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const visited = new Uint8Array(w * h);
  const queue = new Uint32Array(w * h);
  let head = 0, tail = 0;
  const bg = [data[0], data[1], data[2]];
  function visit(n) {
    if (visited[n]) return;
    visited[n] = 1;
    const i = n * 4;
    if (data[i + 3] > 220 && (Math.abs(data[i] - bg[0]) > 26 || Math.abs(data[i + 1] - bg[1]) > 28 || Math.abs(data[i + 2] - bg[2]) > 31)) return;
    queue[tail++] = n;
    data[i + 3] = 0;
  }
  if (data[3] >= 220) {
    for (let x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1); }
    while (head < tail) {
      const n = queue[head++], x = n % w;
      if (x) visit(n - 1);
      if (x + 1 < w) visit(n + 1);
      if (n >= w) visit(n - w);
      if (n + w < w * h) visit(n + w);
    }
  }
  if (singleActor) {
    const components = new Uint32Array(w * h);
    let label = 0, largest = 0, actor = 0;
    for (let pixel = 0; pixel < components.length; pixel++) {
      if (components[pixel] || data[pixel * 4 + 3] < alphaFloor) continue;
      label++;
      head = 0;
      tail = 1;
      queue[0] = pixel;
      components[pixel] = label;
      while (head < tail) {
        const current = queue[head++], x = current % w, y = Math.floor(current / w);
        for (let row = Math.max(0, y - 1); row <= Math.min(h - 1, y + 1); row++) {
          for (let column = Math.max(0, x - 1); column <= Math.min(w - 1, x + 1); column++) {
            const next = row * w + column;
            if (components[next] || data[next * 4 + 3] < alphaFloor) continue;
            components[next] = label;
            queue[tail++] = next;
          }
        }
      }
      if (tail > largest) { largest = tail; actor = label; }
    }
    for (let pixel = 0; pixel < components.length; pixel++) {
      if (components[pixel] !== actor) data[pixel * 4 + 3] = 0;
    }
  }
  let left = w, right = 0, top = h, bottom = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < alphaFloor) { data[i + 3] = 0; continue; }
      left = Math.min(x, left);
      right = Math.max(x, right);
      top = Math.min(y, top);
      bottom = Math.max(y, bottom);
    }
  }
  if (left >= right || top >= bottom) throw new Error('No visible crop in ' + file);
  const cropped = await sharp(data, { raw: info })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(width - pad * 2, height - pad * 2, { fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
  return sharp({
    create: { width, height, channels: 4, background: transparent },
  }).composite([{
    input: cropped.data,
    left: Math.floor((width - cropped.info.width) / 2),
    top: baseline ? height - pad - cropped.info.height : Math.floor((height - cropped.info.height) / 2),
  }]).png().toBuffer();
}

function meta(file) {
  if (fs.existsSync(file + '.meta')) return;
  const template = JSON.parse(fs.readFileSync(ui + '/stage-jade.png.meta', 'utf8'));
  const id = crypto.createHash('sha256').update(file).digest('hex');
  const uuid = [id.slice(0, 8), id.slice(8, 12), '4' + id.slice(13, 16), '8' + id.slice(17, 20), id.slice(20, 32)].join('-');
  const name = path.basename(file, '.png');
  const content = JSON.stringify(template, null, 2).replaceAll(template.uuid, uuid).replaceAll('stage-jade', name);
  fs.writeFileSync(file + '.meta', content + '\n');
}

async function atlas(file, width, height, columns, rows, images, palette = true) {
  const layers = images.map((input, i) => ({ input, left: i % columns * width, top: Math.floor(i / columns) * height }));
  await sharp({ create: { width: width * columns, height: height * rows, channels: 4, background: transparent } })
    .composite(layers).png({ palette, colours: 256, dither: 0 }).toFile(file);
  meta(file);
  recorded[file] = { sha256: sha(file), width: width * columns, height: height * rows };
}

async function board(name, cols, rows, count, width, height, margin, baseline = false, singleActor = false) {
  const file = concept + '/' + name + '.png';
  const data = await read(file);
  const result = [];
  for (let i = 0; i < count; i++) result.push(await cut(file, cell(data, cols, rows, i, margin), width, height, 4, baseline, 18, singleActor));
  return result;
}

async function separateRelief(image) {
  const { data, info: { width, height } } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = Buffer.alloc(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  const blurred = await sharp(alpha, { raw: { width, height, channels: 1 } })
    .blur(1.8).toColourspace('b-w').raw().toBuffer();
  const rim = [];
  for (let y = -3; y <= 3; y++) {
    for (let x = -3; x <= 3; x++) {
      const coverage = Math.min(1, 3.15 - Math.hypot(x, y));
      if (coverage > 0) rim.push({ x, y, coverage });
    }
  }
  const ink = Buffer.alloc(width * height * 4);
  // A transparent gutter keeps filtering within a relief cell in the shared atlas.
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let edge = 0;
      for (const offset of rim) {
        const sx = x + offset.x, sy = y + offset.y;
        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          edge = Math.max(edge, alpha[sy * width + sx] * offset.coverage);
        }
      }
      const shadow = y < 3 ? 0 : blurred[(y - 3) * width + x + 2] * 0.35;
      const index = (y * width + x) * 4;
      ink[index] = 71;
      ink[index + 1] = 53;
      ink[index + 2] = 37;
      ink[index + 3] = Math.round(shadow + edge * 0.86 * (1 - shadow / 255));
    }
  }
  return sharp(ink, { raw: { width, height, channels: 4 } }).composite([{ input: image }]).png().toBuffer();
}

async function main() {
  const camp = 'assets/hero-menu/training-ground.jpg';
  await sharp(sources + '/camp.png').resize(1440, 810, { fit: 'cover' }).jpeg({ quality: 87 }).toFile(camp);
  recorded[camp] = { sha256: sha(camp), width: 1440, height: 810 };
  const dioramaFile = concept + '/stage-dioramas.png';
  const diorama = await read(dioramaFile);
  const relief = [];
  for (let i = 0; i < 6; i++) {
    const image = await cut(dioramaFile, cell(diorama, 3, 2, i, 3), 320, 248, 8, true);
    relief.push(await separateRelief(image));
  }
  await atlas(ui + '/redesign-relief.png', 320, 248, 3, 2, relief);
  const thumbs = [];
  for (let i = 0; i < 6; i++) {
    thumbs.push(await sharp(dioramaFile).extract(cell(diorama, 3, 2, i, 12))
      .resize(320, 128, { fit: 'cover' }).png().toBuffer());
  }
  await atlas(ui + '/redesign-stage-thumbs.png', 320, 128, 3, 2, thumbs);
  const weapons = await board('weapons-origin', 4, 3, 12, 128, 128, 3);
  const gearFile = concept + '/weapons-gear.png';
  const gearColumns = [[29, 357], [383, 711], [737, 1065], [1091, 1420]];
  const gearRows = [[34, 348], [384, 679], [714, 1040]];
  for (const [top, bottom] of gearRows) {
    for (const [left, right] of gearColumns) {
      const twin = weapons.length === 12, pad = twin ? 8 : 0;
      weapons.push(await cut(gearFile, { left: left + pad, top: top + pad, width: right - left - pad * 2, height: bottom - top - pad * 2 }, 128, 128, 4, false, 18, !twin));
    }
  }
  const originalIcons='assets/presentation/icons.png',originalGear=ui+'/weapons.png';
  weapons[20]=await cut(originalIcons,{left:277,top:262,width:201,height:224},128,128);
  weapons[22]=await cut(originalGear,cell(await read(originalGear),5,5,18,1),128,128);
  weapons.push(...await board('weapons-arcana',4,3,9,128,128,3));
  await atlas(ui + '/redesign-arsenal.png', 128, 128, 8, 5, weapons);
  const skillFile = sources + '/skill-icons.png', skillSource = await read(skillFile), skills = [];
  for (let i = 0; i < 12; i++) skills.push(await cut(skillFile, cell(skillSource, 4, 3, i, 7), 112, 112, 5));
  await atlas(ui + '/redesign-skills.png', 112, 112, 4, 3, skills);
  const inputs = [sources + '/camp.png',skillFile,sources + '/prompts.json',dioramaFile,concept + '/sources.json',
    concept + '/weapons-origin.png',gearFile,concept + '/weapons-arcana.png',originalIcons,originalGear];
  const manifest = { sources: Object.fromEntries(inputs.map(file => [file, sha(file)])), outputs: recorded };
  fs.writeFileSync(sources + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
