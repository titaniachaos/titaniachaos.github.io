import { createContentLoader } from 'vitepress'

// Read the existing Markdown sources; no separate article registry.
export default createContentLoader(['blog/*.md', 'bg/blog/*.md', 'de/blog/*.md'], {
  transform(pages) {
    return pages.filter(({ frontmatter }) => frontmatter.blogArticle === true)
      .map(({ url, frontmatter }) => ({
        url, title: frontmatter.title, date: frontmatter.date,
        description: frontmatter.description
      }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }
})
