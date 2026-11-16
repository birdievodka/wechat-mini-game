import {Unzlib} from './vendor/fflate';

const InflateStream = Unzlib as unknown as new (options: object, emit: (chunk: Uint8Array) => void) => {push(chunk: Uint8Array, final: boolean): void};

type DecodedArt = {width:number; height:number; pixels:Uint8Array};

/** Decode bounded chunks so the loading screen can render between batches. */
function* decodeSteps(bytes: Uint8Array): Generator<void, DecodedArt> {
  if (bytes.length < 16 || String.fromCharCode(...Array.from(bytes.subarray(0, 4))) !== 'TYI1') throw Error('角色数据格式错误');
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = header.getUint16(4, true), height = header.getUint16(6, true), colors = header.getUint16(8, true);
  if (!width || !height || width > 2048 || height > 2048 || !colors || colors > 256 || header.getUint16(10, true)) throw Error('角色数据尺寸错误');
  const count = width * height, offset = 16 + colors * 3;
  if (bytes.length <= offset) throw Error('角色数据不完整');
  const planes = new Uint8Array(count * 2);
  let written = 0;
  const inflater = new InflateStream({}, (chunk: Uint8Array) => {
    if (written + chunk.length > planes.length) throw Error('角色像素长度错误');
    planes.set(chunk, written);
    written += chunk.length;
  });
  for (let i = offset; i < bytes.length; i += 8192) {
    const end = Math.min(i + 8192, bytes.length);
    inflater.push(bytes.subarray(i, end), end === bytes.length);
    yield;
  }
  if (written !== planes.length) throw Error('角色像素长度错误');
  const pixels = new Uint8Array(count * 4);
  let checksum = 2166136261;
  const imul = Math.imul;
  for (let start = 0; start < count; start += 16384) {
    const end = Math.min(start + 16384, count);
    for (let n = start; n < end; n++) {
      const color = planes[n];
      if (color >= colors) throw Error('角色调色板错误');
      const p = 16 + color * 3, i = n * 4;
      pixels[i] = bytes[p]; pixels[i + 1] = bytes[p + 1]; pixels[i + 2] = bytes[p + 2]; pixels[i + 3] = planes[count + n];
      for (let c = 0; c < 4; c++) checksum = imul(checksum ^ pixels[i + c], 16777619);
    }
    yield;
  }
  if ((checksum >>> 0) !== header.getUint32(12, true)) throw Error('角色像素校验失败');
  return {width, height, pixels};
}

export function decodeIndexedArt(bytes: Uint8Array): DecodedArt {
  const steps = decodeSteps(bytes);
  for (;;) { const step = steps.next(); if (step.done) return step.value; }
}

export async function decodeLoadingArt(bytes: Uint8Array, alive: () => boolean): Promise<DecodedArt | undefined> {
  const steps = decodeSteps(bytes);
  let started = Date.now();
  while (alive()) {
    const step = steps.next();
    if (step.done) return step.value;
    if (Date.now() - started >= 4 && typeof setTimeout === 'function') {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      started = Date.now();
    }
  }
  return undefined;
}
