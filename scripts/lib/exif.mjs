// The handful of EXIF tags worth reading off an original, and nothing else.
//
// Importing a photograph should not mean typing in what the file already
// knows: when it was taken, and on what. This reads that much and stops.
//
// It also answers one question the file will not volunteer -- whether it is
// geotagged. A phone photograph of a children's party carries the coordinates
// of the party, and the person deciding whether to publish it should be told
// so rather than having to know to ask. Nothing here is ever written back out;
// media/export-media.mjs writes a chosen set of fields and starts from empty.
//
// A minimal TIFF reader: enough for the IFD0 and Exif IFD entries named below,
// deliberately not a general EXIF library. Anything it cannot make sense of
// comes back undefined, which is the right answer for metadata.

const TAGS = {
  0x010f: 'make',
  0x0110: 'model',
  0x0112: 'orientation',
  0x0132: 'dateTime',
  0x8769: 'exifIFD', // pointer
  0x8825: 'gpsIFD', // pointer — presence is all we want
  0x9003: 'dateTimeOriginal',
  0xa002: 'pixelWidth',
  0xa003: 'pixelHeight'
}

/** Bytes per TIFF component type, indexed by type id. */
const WIDTH = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

function readIFD(buf, offset, little, into, seen) {
  if (offset < 0 || offset + 2 > buf.length || seen.has(offset)) return
  seen.add(offset)
  const u16 = (at) => (little ? buf.readUInt16LE(at) : buf.readUInt16BE(at))
  const u32 = (at) => (little ? buf.readUInt32LE(at) : buf.readUInt32BE(at))

  const count = u16(offset)
  for (let i = 0; i < count; i++) {
    const entry = offset + 2 + i * 12
    if (entry + 12 > buf.length) return
    const tag = u16(entry)
    const name = TAGS[tag]
    if (!name) continue

    const type = u16(entry + 2)
    const length = u32(entry + 4)
    const size = (WIDTH[type] ?? 1) * length
    const at = size <= 4 ? entry + 8 : u32(entry + 8)
    if (at < 0 || at + size > buf.length) continue

    if (name === 'gpsIFD') { into.geotagged = true; continue }
    if (name === 'exifIFD') { readIFD(buf, u32(entry + 8), little, into, seen); continue }

    if (type === 2) into[name] = buf.toString('ascii', at, at + size).replace(/\0.*$/, '').trim()
    else if (type === 3) into[name] = u16(at)
    else if (type === 4) into[name] = u32(at)
  }
}

/**
 * `{ make, model, dateTimeOriginal, orientation, geotagged }` from an EXIF
 * block — sharp's `metadata().exif`. Every field is optional.
 *
 * EXIF dates are `YYYY:MM:DD HH:MM:SS` with no zone, so they are returned as
 * written rather than parsed: the hour is real, the offset is unknowable, and
 * inventing one would be worse than saying nothing.
 */
export function readExif(buffer) {
  if (!buffer || buffer.length < 8) return {}
  // sharp hands back the block with or without the "Exif\0\0" preamble.
  const start = buffer.toString('ascii', 0, 4) === 'Exif' ? 6 : 0
  const buf = buffer.subarray(start)
  const order = buf.toString('ascii', 0, 2)
  if (order !== 'II' && order !== 'MM') return {}
  const little = order === 'II'
  const first = little ? buf.readUInt32LE(4) : buf.readUInt32BE(4)

  const out = {}
  try {
    readIFD(buf, first, little, out, new Set())
  } catch {
    return out
  }
  return out
}

/** `2024-01-14` from an EXIF `2024:01:14 18:03:11`, or undefined. */
export function exifDate(value) {
  const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(value ?? '')
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined
}
