export function variableBoard(all) {
  const asked = [...new Set(all.flatMap(frame => frame.tags))]
  return { all, positions: Array.from({ length: 18 }, (_, i) => ({
    page: `fixture-${Math.floor(i / 3)}`, query: asked.join(' '), asked
  })) }
}
