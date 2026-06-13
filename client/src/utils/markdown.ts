/**
 * Line-by-line Markdown → HTML converter for AI chat messages.
 * Handles headings, bold, lists (with indentation), horizontal rules, inline code.
 */
export function md(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false

  function closeList() {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trimStart()

    // Empty line
    if (trimmed === '') {
      closeList()
      continue
    }

    // Horizontal rule: --- or ***
    if (/^[-*_]{3,}$/.test(trimmed)) {
      closeList()
      out.push('<hr class="md-hr"/>')
      continue
    }

    // Heading: ###### → #
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      closeList()
      const level = Math.min(headingMatch[1].length, 6)
      const content = inline(headingMatch[2])
      out.push(`<h${level} class="md-h md-h${level}">${content}</h${level}>`)
      continue
    }

    // Unordered list: - text or * text (with any leading spaces)
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (ulMatch) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul class="md-ul">'); inUl = true }
      out.push(`<li class="md-li">${inline(ulMatch[1])}</li>`)
      continue
    }

    // Ordered list: 1. text
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol class="md-ol">'); inOl = true }
      out.push(`<li class="md-li">${inline(olMatch[1])}</li>`)
      continue
    }

    // Regular text
    closeList()
    out.push(`<p class="md-p">${inline(trimmed)}</p>`)
  }

  closeList()
  return out.join('')
}

/** Process inline formatting: bold, italic, code */
function inline(s: string): string {
  // Escape HTML first
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Bold **text**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="md-strong">$1</strong>')
  // Italic *text* (not inside **)
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="md-em">$1</em>')
  // Inline code `text`
  s = s.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
  return s
}
