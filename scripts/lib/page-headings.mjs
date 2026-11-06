/** Count primary headings anywhere on the page, not only within its main. */
export function primaryHeadingCount(html) {
  const markup = html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  return (markup.match(/<h1(?:\s|>)/gi) ?? []).length
}
