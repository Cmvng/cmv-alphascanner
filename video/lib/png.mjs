// A minimal PNG decoder for Chromium screenshots (8-bit RGB or RGBA, not interlaced) -> rgb24 Buffer.
import zlib from 'zlib'
export function png2rgb(buf) {
  let o = 8, w = 0, h = 0, ct = 0; const idat = []
  while (o < buf.length) { const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8)
    if (type === 'IHDR') { w = buf.readUInt32BE(o + 8); h = buf.readUInt32BE(o + 12); ct = buf[o + 17]; if (buf[o + 16] !== 8 || buf[o + 20] !== 0) throw new Error('png: 8-bit non-interlaced only') }
    else if (type === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len)); else if (type === 'IEND') break
    o += 12 + len }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!bpp) throw new Error('png: colour type ' + ct)
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, cur = new Uint8Array(stride), prv = new Uint8Array(stride), rgb = Buffer.alloc(w * h * 3)
  for (let y = 0, i = 0; y < h; y++) {
    const f = raw[i++]
    for (let x = 0; x < stride; x++, i++) {
      const a = x >= bpp ? cur[x - bpp] : 0, up = prv[x], c = x >= bpp ? prv[x - bpp] : 0, v = raw[i]
      let r
      if (f === 0) r = v; else if (f === 1) r = v + a; else if (f === 2) r = v + up; else if (f === 3) r = v + ((a + up) >> 1)
      else { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c) }
      cur[x] = r & 255
    }
    for (let x = 0, j = y * w * 3; x < w; x++, j += 3) { rgb[j] = cur[x * bpp]; rgb[j + 1] = cur[x * bpp + 1]; rgb[j + 2] = cur[x * bpp + 2] }
    prv.set(cur)
  }
  return rgb
}
