import React from 'react'

// ── Inline parser ──────────────────────────────────────────────────────────────
// Handles **bold**, *italic*, and `code` spans.

function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-muted rounded px-1 py-0.5 text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

// ── Token types ────────────────────────────────────────────────────────────────

type Token =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; text: string }
  | { type: 'hr' }

// ── Tokenizer ──────────────────────────────────────────────────────────────────

function tokenize(markdown: string): Token[] {
  const lines = markdown.split('\n')
  const tokens: Token[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headings
    if (line.startsWith('#### ')) {
      tokens.push({ type: 'h4', text: line.slice(5) })
      i++
    } else if (line.startsWith('### ')) {
      tokens.push({ type: 'h3', text: line.slice(4) })
      i++
    } else if (line.startsWith('## ') || line.startsWith('# ')) {
      tokens.push({ type: 'h2', text: line.replace(/^#{1,2} /, '') })
      i++
    }

    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      tokens.push({ type: 'hr' })
      i++
    }

    // Unordered list – collect consecutive bullet lines
    else if (/^[-*•] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*•] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•] /, ''))
        i++
      }
      tokens.push({ type: 'ul', items })
    }

    // Ordered list – collect consecutive numbered lines
    else if (/^\d+[.)]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s/, ''))
        i++
      }
      tokens.push({ type: 'ol', items })
    }

    // Blank line – skip (paragraph breaks are implicit between tokens)
    else if (line.trim() === '') {
      i++
    }

    // Paragraph – collect consecutive body lines
    else {
      let text = line.trim()
      i++
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^#{1,4} /.test(lines[i]) &&
        !/^[-*•] /.test(lines[i]) &&
        !/^\d+[.)]\s/.test(lines[i]) &&
        !/^---+$/.test(lines[i].trim())
      ) {
        text += ' ' + lines[i].trim()
        i++
      }
      tokens.push({ type: 'p', text })
    }
  }

  return tokens
}

// ── Component ──────────────────────────────────────────────────────────────────

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const tokens = tokenize(content)

  return (
    <div className={className}>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'h2':
            return (
              <h2
                key={i}
                className="text-base font-serif font-semibold text-foreground mt-5 mb-2 first:mt-0"
              >
                {token.text}
              </h2>
            )
          case 'h3':
            return (
              <h3
                key={i}
                className="text-sm font-semibold text-foreground mt-4 mb-1.5 first:mt-0"
              >
                {token.text}
              </h3>
            )
          case 'h4':
            return (
              <h4
                key={i}
                className="text-sm font-medium text-foreground mt-3 mb-1 first:mt-0"
              >
                {token.text}
              </h4>
            )
          case 'ul':
            return (
              <ul key={i} className="my-2 space-y-1 pl-4">
                {token.items.map((item, j) => (
                  <li key={j} className="text-sm leading-relaxed list-disc list-outside">
                    {parseInline(item)}
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="my-2 space-y-1 pl-4">
                {token.items.map((item, j) => (
                  <li key={j} className="text-sm leading-relaxed list-decimal list-outside">
                    {parseInline(item)}
                  </li>
                ))}
              </ol>
            )
          case 'p':
            return (
              <p key={i} className="text-sm leading-relaxed my-2 first:mt-0 last:mb-0">
                {parseInline(token.text)}
              </p>
            )
          case 'hr':
            return <hr key={i} className="border-border/50 my-4" />
          default:
            return null
        }
      })}
    </div>
  )
}
