/** Keep HTML-authored page introductions in VitePress's anchored-section index.
 * This output is search-only; visible HTML, headings and page copy stay intact.
 */
export function authoredSearchContent(html, title) {
  const h1 = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.exec(html)?.[0]
  if (!h1 || /class="[^"]*header-anchor/.test(h1) || !title) return html
  const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return `<h1>${escape(title)} <a class="header-anchor" href="#VPContent">\u200b</a></h1>\n${html}`
}
