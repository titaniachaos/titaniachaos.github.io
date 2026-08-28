// Pixel dimensions from a file header, without a dependency.
//
// Two callers need the same answer and must not be able to disagree about it:
// scripts/check-images.mjs, which fails the build when a declared size is a
// lie, and docs/.vitepress/media.data.ts, which declares nothing and reads
// every gallery frame's size off the file at build time. A second copy of
// these parsers would be a second chance to be wrong.
//
// Pass the first 64 KB; every header handled here lives well inside that.

export function pngSize(b) {
  return b.length >= 24 && b.readUInt32BE(0) === 0x89504e47
    ? { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
    : null
}

export function jpegSize(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null
  let i = 2
  while (i < b.length - 9) {
    if (b[i] !== 0xff) {
      i++
      continue
    }
    const marker = b[i + 1]
    // SOF0..SOF15 carry the frame size; DHT, JPG and DAC share the range.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) }
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2
      continue
    }
    i += 2 + b.readUInt16BE(i + 2)
  }
  return null
}

export function webpSize(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null
  const chunk = b.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') {
    const at = 24
    const w = b[at] | (b[at + 1] << 8) | (b[at + 2] << 16)
    const h = b[at + 3] | (b[at + 4] << 8) | (b[at + 5] << 16)
    return { width: w + 1, height: h + 1 }
  }
  return null
}

export function gifSize(b) {
  return b.length >= 10 && b.toString('ascii', 0, 3) === 'GIF'
    ? { width: b.readUInt16LE(6), height: b.readUInt16LE(8) }
    : null
}

/** `{ width, height }`, or null if the buffer is not one of the four. */
export function dimensions(buffer) {
  return pngSize(buffer) ?? jpegSize(buffer) ?? webpSize(buffer) ?? gifSize(buffer)
}
