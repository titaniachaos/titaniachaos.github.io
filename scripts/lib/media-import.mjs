import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { dirname } from 'node:path'

// Ignore brackets inside the catalogue's strings and comments. The array may
// contain nested tags/objects; its boundary must not depend on what follows it.
function collection(source, name) {
  const masked = source.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    text => text.replace(/[^\n]/g, ' '))
  const declaration = new RegExp(`\\bconst ${name}(?:\\s*:[^=\\n]+)?\\s*=\\s*([\\[{])`).exec(masked)
  if (!declaration) throw new Error(`import: no ${name} collection`)
  const start = declaration.index + declaration[0].length - 1
  const stack = []
  for (let i = start; i < masked.length; i++) {
    const c = masked[i]
    if (c === '[' || c === '{') stack.push(c)
    else if (c === ']' || c === '}') {
      if (stack.pop() !== (c === ']' ? '[' : '{')) break
      if (!stack.length) return { start, end: i }
    }
  }
  throw new Error(`import: unclosed ${name} collection`)
}

export async function writeMediaRecords({ makePath, dataPath, mapName, id, entry, record, sourceCopy }) {
  const [make, data] = await Promise.all([readFile(makePath, 'utf8'), readFile(dataPath, 'utf8')])
  const map = collection(make, mapName)
  const frames = collection(data, 'FRAMES')
  if (make[map.start] !== '{' || data[frames.start] !== '[') {
    throw new Error('import: expected a source map object and a FRAMES array')
  }
  if (make.includes(`'${id}':`) || data.includes(`id: '${id}'`)) {
    throw new Error(`import: frame '${id}' already exists`)
  }
  if (make[map.start + 1] !== '\n') throw new Error(`import: ${mapName} must open across lines`)
  const contents = data.slice(frames.start + 1, frames.end).trimEnd()
  const separator = contents.trim() && !contents.endsWith(',') ? ',' : ''
  const nextData = data.slice(0, frames.start + 1) + contents + separator + '\n' + record + '\n' + data.slice(frames.end)
  const nextMake = make.slice(0, map.start + 2) + entry + make.slice(map.start + 2)

  // Every structural/duplicate validation completes before any file is written,
  // including an optional downloaded original. Derivation remains the caller's job.
  if (sourceCopy) {
    await mkdir(dirname(sourceCopy.to), { recursive: true })
    await copyFile(sourceCopy.from, sourceCopy.to)
  }
  await writeFile(makePath, nextMake)
  await writeFile(dataPath, nextData)
}
