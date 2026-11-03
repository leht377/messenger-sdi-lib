'use client'

import React, { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { cn } from '../ui'

export interface MessageMarkdownProps {
  content: string
  isOwnMessage?: boolean
  isBot?: boolean
  className?: string
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/**
 * Valida que una URL utilice únicamente protocolos seguros (http, https, mailto).
 * Bloquea javascript:, data:, vbscript:, etc.
 */
export function sanitizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    if (SAFE_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return parsed.href
    }
    return null
  } catch {
    return null
  }
}

/**
 * Normaliza etiquetas HTML de texto enriquecido comunes a sintaxis Markdown
 * protegiendo primero los segmentos de código en backticks para no alterarlos.
 */
function normalizeEnrichedContent(input: string): string {
  if (!input) return ''

  let text = input.replace(/\r\n/g, '\n')

  // 1. Convertir primero bloques y etiquetas HTML de código a sintaxis Markdown
  text = text.replace(
    /<pre[^>]*>\s*<code(?:\s+class=["'][^"']*language-([a-zA-Z0-9_-]+)[^"']*["'])?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_match, lang, code) => `\n\`\`\`${lang || ''}\n${code.trim()}\n\`\`\`\n`
  )
  text = text.replace(
    /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_match, code) => `\n\`\`\`\n${code.trim()}\n\`\`\`\n`
  )
  text = text.replace(/<code(?:\s+[^>]*)?>([\s\S]*?)<\/code>/gi, '`$1`')

  // 2. Proteger segmentos entre backticks (```...``` y `...`) antes de normalizar el resto de HTML
  const codePlaceholders: string[] = []
  text = text.replace(/(```[\s\S]*?```|`+[^`]+`+)/g, (match) => {
    const decodedCode = match
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&amp;/gi, '&')
    const idx = codePlaceholders.push(decodedCode) - 1
    return `\u0000CODE_PLACEHOLDER_${idx}\u0000`
  })

  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

  // Saltos de línea y párrafos HTML
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
  text = text.replace(/<p[^>]*>/gi, '')
  text = text.replace(/<\/p>/gi, '\n')

  // Listas HTML ordenadas y desordenadas
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, inner: string) => {
    let index = 1
    const items = inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, itemContent: string) => {
      return `${index++}. ${itemContent.trim()}\n`
    })
    return `\n${items}\n`
  })

  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, inner: string) => {
    const items = inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, itemContent: string) => {
      return `- ${itemContent.trim()}\n`
    })
    return `\n${items}\n`
  })

  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, itemContent: string) => `- ${itemContent.trim()}\n`)

  // Enlaces HTML <a href="...">texto</a>
  text = text.replace(
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, label: string) => `[${label.trim() || href.trim()}](${href.trim()})`
  )

  // Formato inline HTML: negritas, cursivas, tachado
  text = text.replace(/<(strong|b)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/gi, '**$2**')
  text = text.replace(/<(em|i)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/gi, '*$2*')
  text = text.replace(/<(del|s|strike)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/gi, '~~$2~~')

  // Decodificar entidades de comparación después de convertir etiquetas conocidas
  text = text.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')

  // 3. Restaurar los segmentos de código protegidos
  text = text.replace(/\u0000CODE_PLACEHOLDER_(\d+)\u0000/g, (_m, idxStr) => {
    return codePlaceholders[Number(idxStr)] ?? ''
  })

  return text
}

function CodeBlock({
  language,
  code,
  isOwnMessage
}: {
  language?: string
  code: string
  isOwnMessage?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Ignorar si el portapapeles no está disponible
    }
  }

  return (
    <div
      className={cn(
        'my-2 overflow-hidden rounded-xl border text-xs',
        isOwnMessage
          ? 'border-blue-400/40 bg-slate-950/90 text-slate-100'
          : 'border-neutral-200 dark:border-neutral-700/80 bg-slate-900 dark:bg-slate-950 text-slate-100'
      )}
    >
      <div className='flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[10px] text-slate-400'>
        <span className='font-mono uppercase tracking-wider'>
          {language || 'código'}
        </span>
        <button
          type='button'
          onClick={handleCopy}
          className='inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer'
          title='Copiar código'
        >
          {copied ? (
            <>
              <Check className='size-3 text-emerald-400' />
              <span className='text-emerald-400'>Copiado</span>
            </>
          ) : (
            <>
              <Copy className='size-3' />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <pre className='overflow-x-auto p-3 font-mono text-[11.5px] leading-relaxed'>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function restoreInlineCodePlaceholders(
  text: string,
  codeNodes: React.ReactNode[],
  keyPrefix: string
): React.ReactNode[] {
  if (!text) return []
  const parts = text.split(/(\u0001ICODE_\d+\u0001)/g)
  const result: React.ReactNode[] = []

  parts.forEach((part, idx) => {
    if (!part) return
    const match = part.match(/^\u0001ICODE_(\d+)\u0001$/)
    if (match) {
      const nodeIdx = Number(match[1])
      result.push(
        <React.Fragment key={`${keyPrefix}-ic-${idx}-${nodeIdx}`}>
          {codeNodes[nodeIdx]}
        </React.Fragment>
      )
    } else {
      result.push(part)
    }
  })

  return result
}

/**
 * Parsea tokens de formato (enlaces, URLs directas, negrita, cursiva, tachado)
 * sobre texto cuyos spans de código inline ya fueron protegidos con placeholders.
 */
function renderFormattedInline(
  text: string,
  isOwnMessage: boolean,
  codeNodes: React.ReactNode[],
  keyPrefix = 'fmt'
): React.ReactNode[] {
  if (!text) return []

  const tokenRegex =
    /(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([\s\S]+?)\*\*)|(__([\s\S]+?)__)|(~~([\s\S]+?)~~)|(\*(\S(?:[^*\n]*?\S)?)\*)|((?:https?:\/\/|mailto:)[^\s<\u0001]+[^<.,:;"')\]\s\u0001])/g

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let tokenIndex = 0

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        ...restoreInlineCodePlaceholders(
          text.slice(lastIndex, match.index),
          codeNodes,
          `${keyPrefix}-pre-${tokenIndex}`
        )
      )
    }

    const currentKey = `${keyPrefix}-${tokenIndex++}`

    if (match[1]) {
      // Enlace Markdown: [label](url)
      const label = match[2]
      const rawUrl = match[3]
      const safeHref = sanitizeUrl(rawUrl)

      if (safeHref) {
        nodes.push(
          <a
            key={currentKey}
            href={safeHref}
            target='_blank'
            rel='noopener noreferrer'
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold underline underline-offset-2 transition-opacity hover:opacity-85 break-all',
              isOwnMessage
                ? 'text-white decoration-blue-200'
                : 'text-blue-600 dark:text-blue-400 decoration-blue-400/60'
            )}
          >
            <span>{renderFormattedInline(label, isOwnMessage, codeNodes, `${currentKey}-lbl`)}</span>
            <ExternalLink className='size-3 shrink-0 inline' />
          </a>
        )
      } else {
        nodes.push(...restoreInlineCodePlaceholders(label, codeNodes, `${currentKey}-rawlbl`))
      }
    } else if (match[4] || match[6]) {
      // Negrita: **texto** o __texto__
      const inner = match[5] ?? match[7] ?? ''
      nodes.push(
        <strong key={currentKey} className='font-bold'>
          {renderFormattedInline(inner, isOwnMessage, codeNodes, `${currentKey}-b`)}
        </strong>
      )
    } else if (match[8]) {
      // Tachado: ~~texto~~
      const inner = match[9] ?? ''
      nodes.push(
        <del key={currentKey} className='line-through opacity-80'>
          {renderFormattedInline(inner, isOwnMessage, codeNodes, `${currentKey}-del`)}
        </del>
      )
    } else if (match[10]) {
      // Cursiva: *texto*
      const inner = match[11] ?? ''
      nodes.push(
        <em key={currentKey} className='italic'>
          {renderFormattedInline(inner, isOwnMessage, codeNodes, `${currentKey}-em`)}
        </em>
      )
    } else if (match[12]) {
      // Autodetección de URL directa
      const rawUrl = match[12]
      const safeHref = sanitizeUrl(rawUrl)
      if (safeHref) {
        nodes.push(
          <a
            key={currentKey}
            href={safeHref}
            target='_blank'
            rel='noopener noreferrer'
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold underline underline-offset-2 transition-opacity hover:opacity-85 break-all',
              isOwnMessage
                ? 'text-white decoration-blue-200'
                : 'text-blue-600 dark:text-blue-400 decoration-blue-400/60'
            )}
          >
            <span>{rawUrl}</span>
            <ExternalLink className='size-3 shrink-0 inline' />
          </a>
        )
      } else {
        nodes.push(rawUrl)
      }
    }

    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(
      ...restoreInlineCodePlaceholders(
        text.slice(lastIndex),
        codeNodes,
        `${keyPrefix}-tail`
      )
    )
  }

  return nodes
}

/**
 * Extrae primero el código en línea (`código` o ``código``) con máxima prioridad
 * mediante placeholders para que ningún asterisco, guion bajo o enlace rompa el código,
 * permitiendo además código dentro de negritas, cursivas o enlaces.
 */
function renderInline(
  text: string,
  isOwnMessage: boolean,
  keyPrefix = 'in'
): React.ReactNode[] {
  if (!text) return []

  const codeNodes: React.ReactNode[] = []
  const textWithPlaceholders = text.replace(/(`+)([^`]+?)\1/g, (_match, _ticks, codeText: string) => {
    const idx = codeNodes.length
    codeNodes.push(
      <code
        key={`${keyPrefix}-code-${idx}`}
        className={cn(
          'inline-block rounded-md px-1.5 py-0.5 font-mono text-[11.5px] leading-snug align-baseline shadow-2xs',
          isOwnMessage
            ? 'bg-slate-950/90 text-emerald-300 border border-slate-700/80'
            : 'bg-slate-900 text-emerald-300 dark:bg-slate-950 dark:text-emerald-300 border border-slate-700/80'
        )}
      >
        {codeText}
      </code>
    )
    return `\u0001ICODE_${idx}\u0001`
  })

  return renderFormattedInline(textWithPlaceholders, isOwnMessage, codeNodes, keyPrefix)
}

function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false
  const cells = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
  return cells.length > 0 && cells.every((cell) => /^\s*:?-{2,}:?\s*$/.test(cell))
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function parseTableAlignments(separatorLine: string): ('left' | 'center' | 'right')[] {
  return splitTableRow(separatorLine).map((cell) => {
    const trimmed = cell.trim()
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center'
    if (trimmed.endsWith(':')) return 'right'
    return 'left'
  })
}

export function MessageMarkdown({
  content,
  isOwnMessage = false,
  className
}: MessageMarkdownProps) {
  const normalized = normalizeEnrichedContent(content)
  // Soporta bloques con triple backtick (```...```) y con un solo backtick (`...`)
  const segments = normalized.split(/(```[\s\S]*?(?:```|$)|`+[^`]+`+)/g)

  const renderTextBlocks = (blockText: string, segmentKey: string): React.ReactNode[] => {
    const lines = blockText.split('\n')
    const elements: React.ReactNode[] = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]
      const trimmed = line.trim()

      // 1. Línea vacía
      if (!trimmed) {
        i++
        continue
      }

      // 2. Línea divisoria horizontal (--- o ***)
      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        elements.push(
          <hr
            key={`${segmentKey}-hr-${i}`}
            className={cn(
              'my-2 border-t',
              isOwnMessage
                ? 'border-blue-400/40'
                : 'border-neutral-200 dark:border-neutral-700'
            )}
          />
        )
        i++
        continue
      }

      // 3. Encabezados (#, ##, ###, ####)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const headingText = headingMatch[2]
        const sizeClass =
          level === 1
            ? 'text-sm sm:text-base font-bold mt-2 mb-1'
            : level === 2
            ? 'text-xs sm:text-sm font-bold mt-1.5 mb-1'
            : 'text-xs font-bold mt-1 mb-0.5'
        elements.push(
          <div key={`${segmentKey}-h-${i}`} className={sizeClass}>
            {renderInline(headingText, isOwnMessage, `${segmentKey}-h-${i}`)}
          </div>
        )
        i++
        continue
      }

      // 4. Tabla Markdown (GFM)
      if (
        trimmed.includes('|') &&
        i + 1 < lines.length &&
        isTableSeparatorLine(lines[i + 1])
      ) {
        const headers = splitTableRow(lines[i])
        const alignments = parseTableAlignments(lines[i + 1])
        i += 2
        const rows: string[][] = []

        while (i < lines.length && lines[i].trim().includes('|')) {
          rows.push(splitTableRow(lines[i]))
          i++
        }

        elements.push(
          <div
            key={`${segmentKey}-tbl-${i}`}
            className={cn(
              'my-2 overflow-x-auto rounded-xl border',
              isOwnMessage
                ? 'border-blue-400/40 bg-blue-700/40'
                : 'border-neutral-200 dark:border-neutral-700/80 bg-white/80 dark:bg-neutral-900/60'
            )}
          >
            <table className='w-full border-collapse text-left text-xs'>
              <thead>
                <tr
                  className={cn(
                    'border-b font-semibold',
                    isOwnMessage
                      ? 'border-blue-400/40 bg-blue-800/50 text-white'
                      : 'border-neutral-200 dark:border-neutral-700/80 bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-100'
                  )}
                >
                  {headers.map((header, colIdx) => (
                    <th
                      key={colIdx}
                      style={{ textAlign: alignments[colIdx] || 'left' }}
                      className='px-2.5 py-1.5 whitespace-nowrap'
                    >
                      {renderInline(header, isOwnMessage, `${segmentKey}-th-${i}-${colIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-neutral-200/60 dark:divide-neutral-800/60'>
                {rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={cn(
                      isOwnMessage
                        ? 'divide-blue-400/20 hover:bg-blue-700/30'
                        : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40'
                    )}
                  >
                    {headers.map((_, colIdx) => (
                      <td
                        key={colIdx}
                        style={{ textAlign: alignments[colIdx] || 'left' }}
                        className='px-2.5 py-1.5 align-top'
                      >
                        {renderInline(
                          row[colIdx] ?? '',
                          isOwnMessage,
                          `${segmentKey}-td-${i}-${rowIdx}-${colIdx}`
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        continue
      }

      // 5. Lista numerada (1. item o 1) item)
      const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/)
      if (orderedMatch) {
        const startNumber = Number(orderedMatch[1]) || 1
        const items: string[] = []
        while (i < lines.length) {
          const itemMatch = lines[i].trim().match(/^\d+[.)]\s+(.+)$/)
          if (!itemMatch) break
          items.push(itemMatch[1])
          i++
        }

        elements.push(
          <ol
            key={`${segmentKey}-ol-${i}`}
            start={startNumber}
            className='my-1.5 list-decimal pl-5 space-y-1 marker:font-semibold'
          >
            {items.map((item, idx) => (
              <li key={idx} className='leading-relaxed'>
                {renderInline(item, isOwnMessage, `${segmentKey}-oli-${i}-${idx}`)}
              </li>
            ))}
          </ol>
        )
        continue
      }

      // 6. Lista de viñetas (- item, * item, • item)
      const unorderedMatch = trimmed.match(/^[-*•]\s+(.+)$/)
      if (unorderedMatch) {
        const items: string[] = []
        while (i < lines.length) {
          const itemMatch = lines[i].trim().match(/^[-*•]\s+(.+)$/)
          if (!itemMatch) break
          items.push(itemMatch[1])
          i++
        }

        elements.push(
          <ul
            key={`${segmentKey}-ul-${i}`}
            className='my-1.5 list-disc pl-5 space-y-1'
          >
            {items.map((item, idx) => (
              <li key={idx} className='leading-relaxed'>
                {renderInline(item, isOwnMessage, `${segmentKey}-uli-${i}-${idx}`)}
              </li>
            ))}
          </ul>
        )
        continue
      }

      // 7. Cita (> texto)
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = []
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
          i++
        }

        elements.push(
          <blockquote
            key={`${segmentKey}-bq-${i}`}
            className={cn(
              'my-1.5 border-l-2 pl-3 italic',
              isOwnMessage
                ? 'border-blue-200 text-blue-50'
                : 'border-violet-400 dark:border-violet-500 text-neutral-600 dark:text-neutral-300'
            )}
          >
            {quoteLines.map((qLine, qIdx) => (
              <React.Fragment key={qIdx}>
                {qIdx > 0 && <br />}
                {renderInline(qLine, isOwnMessage, `${segmentKey}-bql-${i}-${qIdx}`)}
              </React.Fragment>
            ))}
          </blockquote>
        )
        continue
      }

      // 8. Párrafo regular (agrupa líneas consecutivas simples)
      const paragraphLines: string[] = []
      while (i < lines.length) {
        const current = lines[i]
        const currentTrimmed = current.trim()
        if (
          !currentTrimmed ||
          /^(?:-{3,}|\*{3,}|_{3,})$/.test(currentTrimmed) ||
          /^(#{1,4})\s+/.test(currentTrimmed) ||
          /^\d+[.)]\s+/.test(currentTrimmed) ||
          /^[-*•]\s+/.test(currentTrimmed) ||
          currentTrimmed.startsWith('>') ||
          (currentTrimmed.includes('|') &&
            i + 1 < lines.length &&
            isTableSeparatorLine(lines[i + 1]))
        ) {
          break
        }
        paragraphLines.push(current)
        i++
      }

      elements.push(
        <p key={`${segmentKey}-p-${i}`} className='whitespace-pre-wrap break-words leading-relaxed'>
          {paragraphLines.map((pLine, pIdx) => (
            <React.Fragment key={pIdx}>
              {pIdx > 0 && '\n'}
              {renderInline(pLine, isOwnMessage, `${segmentKey}-pl-${i}-${pIdx}`)}
            </React.Fragment>
          ))}
        </p>
      )
    }

    return elements
  }

  return (
    <div className={cn('space-y-1.5 break-words', className)}>
      {segments.map((segment, segIdx) => {
        if (segment.startsWith('```')) {
          const inner = segment.endsWith('```') ? segment.slice(3, -3) : segment.slice(3)
          const firstNewLine = inner.indexOf('\n')
          let language = ''
          let code = inner.trim()

          if (firstNewLine !== -1) {
            const firstLine = inner.slice(0, firstNewLine).trim()
            if (/^[a-zA-Z0-9_+#.-]{1,20}$/.test(firstLine)) {
              language = firstLine
              code = inner.slice(firstNewLine + 1).replace(/^\n+|\n+$/g, '')
            } else {
              code = inner.replace(/^\n+|\n+$/g, '')
            }
          }

          return (
            <CodeBlock
              key={`code-${segIdx}`}
              language={language}
              code={code}
              isOwnMessage={isOwnMessage}
            />
          )
        }

        if (segment.startsWith('`') && segment.endsWith('`')) {
          const inner = segment.replace(/^`+|`+$/g, '').replace(/^\n+|\n+$/g, '')
          return (
            <CodeBlock
              key={`code-single-${segIdx}`}
              code={inner}
              isOwnMessage={isOwnMessage}
            />
          )
        }

        return (
          <React.Fragment key={`seg-${segIdx}`}>
            {renderTextBlocks(segment, `seg-${segIdx}`)}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default MessageMarkdown

