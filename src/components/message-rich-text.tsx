'use client'

import React, { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { cn } from '../ui'

export interface MessageRichTextProps {
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

function decodeHtmlEntities(input: string): string {
  if (!input) return ''
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
}

interface HtmlElementNode {
  type: 'element'
  tag: string
  attrs: Record<string, string>
  children: HtmlAstNode[]
}

interface HtmlTextNode {
  type: 'text'
  value: string
}

type HtmlAstNode = HtmlElementNode | HtmlTextNode

const VOID_TAGS = new Set(['br', 'hr', 'img'])
const ALLOWED_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'del',
  'p',
  'div',
  'span',
  'br',
  'hr',
  'ul',
  'ol',
  'li',
  'pre',
  'code',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'a'
])

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  if (!attrString.trim()) return attrs

  const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null
  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1].toLowerCase()
    const val = match[2] ?? match[3] ?? match[4] ?? ''
    attrs[name] = decodeHtmlEntities(val)
  }
  return attrs
}

/**
 * Parsea una cadena con etiquetas HTML hacia un árbol seguro de nodos (AST)
 * sin utilizar dangerouslySetInnerHTML ni ejecutar scripts.
 */
function parseHtmlToAst(html: string): HtmlAstNode[] {
  if (!html) return []

  const normalized = html.replace(/\r\n/g, '\n')

  // Proteger el contenido interno de <pre>...</pre> y <code>...</code> para que cualquier < o > interno se preserve como texto
  const codeBlocks: { lang: string; content: string }[] = []
  const withCodePlaceholders = normalized
    .replace(
      /<pre[^>]*>\s*<code(?:\s+class=["'][^"']*language-([a-zA-Z0-9_-]+)[^"']*["'])?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
      (_m, lang, inner) => {
        const idx = codeBlocks.push({
          lang: lang || '',
          content: decodeHtmlEntities(inner.replace(/<br\s*\/?>/gi, '\n'))
        }) - 1
        return `<code data-code-idx="${idx}"></code>`
      }
    )
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner) => {
      const cleaned = inner.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?code[^>]*>/gi, '')
      const idx = codeBlocks.push({
        lang: '',
        content: decodeHtmlEntities(cleaned)
      }) - 1
      return `<code data-code-idx="${idx}"></code>`
    })
    .replace(/<code(?:\s+([^>]*))?>([\s\S]*?)<\/code>/gi, (fullMatch, attrStr, inner) => {
      if (attrStr && attrStr.includes('data-code-idx')) {
        return fullMatch
      }
      const langMatch = attrStr?.match(/language-([a-zA-Z0-9_-]+)/i)
      const cleaned = inner.replace(/<br\s*\/?>/gi, '\n')
      const idx = codeBlocks.push({
        lang: langMatch ? langMatch[1] : '',
        content: decodeHtmlEntities(cleaned)
      }) - 1
      return `<code data-code-idx="${idx}"></code>`
    })

  const root: HtmlElementNode = { type: 'element', tag: 'root', attrs: {}, children: [] }
  const stack: HtmlElementNode[] = [root]

  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(withCodePlaceholders)) !== null) {
    const fullTag = match[0]
    const rawTagName = match[1].toLowerCase()
    const attrString = match[2] || ''
    const isClosing = fullTag.startsWith('</')
    const isSelfClosing = fullTag.endsWith('/>') || VOID_TAGS.has(rawTagName)

    if (match.index > lastIndex) {
      const rawText = withCodePlaceholders.slice(lastIndex, match.index)
      const textValue = decodeHtmlEntities(rawText)
      if (textValue) {
        stack[stack.length - 1].children.push({ type: 'text', value: textValue })
      }
    }

    if (!ALLOWED_TAGS.has(rawTagName)) {
      lastIndex = tagRegex.lastIndex
      continue
    }

    if (isClosing) {
      // Buscar la etiqueta abierta correspondiente en la pila
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tag === rawTagName) {
          stack.length = i
          break
        }
      }
    } else {
      const attrs = parseAttributes(attrString)

      if (rawTagName === 'code' && attrs['data-code-idx'] !== undefined) {
        const block = codeBlocks[Number(attrs['data-code-idx'])]
        const codeNode: HtmlElementNode = {
          type: 'element',
          tag: 'code',
          attrs: block?.lang ? { language: block.lang } : {},
          children: [{ type: 'text', value: block?.content ?? '' }]
        }
        stack[stack.length - 1].children.push(codeNode)
        // Consumir el </code> inmediato si existe
        const rest = withCodePlaceholders.slice(tagRegex.lastIndex)
        const closeMatch = rest.match(/^\s*<\/code>/i)
        if (closeMatch) {
          tagRegex.lastIndex += closeMatch[0].length
        }
        lastIndex = tagRegex.lastIndex
        continue
      }

      const elementNode: HtmlElementNode = {
        type: 'element',
        tag: rawTagName,
        attrs,
        children: []
      }
      stack[stack.length - 1].children.push(elementNode)

      if (!isSelfClosing) {
        stack.push(elementNode)
      }
    }

    lastIndex = tagRegex.lastIndex
  }

  if (lastIndex < withCodePlaceholders.length) {
    const rawText = withCodePlaceholders.slice(lastIndex)
    const textValue = decodeHtmlEntities(rawText)
    if (textValue) {
      stack[stack.length - 1].children.push({ type: 'text', value: textValue })
    }
  }

  return root.children
}

function extractNodeText(node: HtmlAstNode): string {
  if (node.type === 'text') return node.value
  if (node.tag === 'br') return '\n'
  return node.children.map(extractNodeText).join('')
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
      <pre className='overflow-x-auto p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre'>
        <code>{code}</code>
      </pre>
    </div>
  )
}

/**
 * Autodetecta URLs seguras dentro de nodos de texto plano.
 */
function renderPlainTextWithLinks(
  text: string,
  isOwnMessage: boolean,
  keyPrefix: string
): React.ReactNode[] {
  if (!text) return []

  const urlRegex = /((?:https?:\/\/|mailto:)[^\s<]+[^<.,:;"')\]\s])/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let idx = 0

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const rawUrl = match[1]
    const safeHref = sanitizeUrl(rawUrl)
    if (safeHref) {
      nodes.push(
        <a
          key={`${keyPrefix}-url-${idx++}`}
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

    lastIndex = urlRegex.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function renderAstNodes(
  nodes: HtmlAstNode[],
  isOwnMessage: boolean,
  keyPrefix = 'node'
): React.ReactNode[] {
  return nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`

    if (node.type === 'text') {
      return (
        <React.Fragment key={key}>
          {renderPlainTextWithLinks(node.value, isOwnMessage, key)}
        </React.Fragment>
      )
    }

    const { tag, attrs, children } = node

    switch (tag) {
      case 'br':
        return <br key={key} />

      case 'hr':
        return (
          <hr
            key={key}
            className={cn(
              'my-2 border-t',
              isOwnMessage
                ? 'border-blue-400/40'
                : 'border-neutral-200 dark:border-neutral-700'
            )}
          />
        )

      case 'b':
      case 'strong':
        return (
          <strong key={key} className='font-bold'>
            {renderAstNodes(children, isOwnMessage, key)}
          </strong>
        )

      case 'i':
      case 'em':
        return (
          <em key={key} className='italic'>
            {renderAstNodes(children, isOwnMessage, key)}
          </em>
        )

      case 'u':
        return (
          <u key={key} className='underline underline-offset-2'>
            {renderAstNodes(children, isOwnMessage, key)}
          </u>
        )

      case 's':
      case 'strike':
      case 'del':
        return (
          <del key={key} className='line-through opacity-85'>
            {renderAstNodes(children, isOwnMessage, key)}
          </del>
        )

      case 'code':
      case 'pre': {
        const rawCode = extractNodeText(node).replace(/^\n+|\n+$/g, '')
        if (!rawCode.trim()) return null
        return (
          <CodeBlock
            key={key}
            language={attrs.language}
            code={rawCode}
            isOwnMessage={isOwnMessage}
          />
        )
      }

      case 'a': {
        const safeHref = sanitizeUrl(attrs.href || '')
        const content = renderAstNodes(children, isOwnMessage, key)
        if (!safeHref) {
          return <React.Fragment key={key}>{content}</React.Fragment>
        }
        return (
          <a
            key={key}
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
            <span>{content}</span>
            <ExternalLink className='size-3 shrink-0 inline' />
          </a>
        )
      }

      case 'ul':
        return (
          <ul key={key} className='my-1.5 list-disc pl-5 space-y-1'>
            {renderAstNodes(children, isOwnMessage, key)}
          </ul>
        )

      case 'ol':
        return (
          <ol key={key} className='my-1.5 list-decimal pl-5 space-y-1 marker:font-semibold'>
            {renderAstNodes(children, isOwnMessage, key)}
          </ol>
        )

      case 'li':
        return (
          <li key={key} className='leading-relaxed'>
            {renderAstNodes(children, isOwnMessage, key)}
          </li>
        )

      case 'blockquote':
        return (
          <blockquote
            key={key}
            className={cn(
              'my-1.5 border-l-2 pl-3 italic',
              isOwnMessage
                ? 'border-blue-200 text-blue-50'
                : 'border-violet-400 dark:border-violet-500 text-neutral-600 dark:text-neutral-300'
            )}
          >
            {renderAstNodes(children, isOwnMessage, key)}
          </blockquote>
        )

      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const sizeClass =
          tag === 'h1'
            ? 'text-sm sm:text-base font-bold mt-2 mb-1'
            : tag === 'h2'
            ? 'text-xs sm:text-sm font-bold mt-1.5 mb-1'
            : 'text-xs font-bold mt-1 mb-0.5'
        return (
          <div key={key} className={sizeClass}>
            {renderAstNodes(children, isOwnMessage, key)}
          </div>
        )
      }

      case 'table':
        return (
          <div
            key={key}
            className={cn(
              'my-2 overflow-x-auto rounded-xl border',
              isOwnMessage
                ? 'border-blue-400/40 bg-blue-700/40'
                : 'border-neutral-200 dark:border-neutral-700/80 bg-white/80 dark:bg-neutral-900/60'
            )}
          >
            <table className='w-full border-collapse text-left text-xs'>
              {renderAstNodes(children, isOwnMessage, key)}
            </table>
          </div>
        )

      case 'thead':
        return (
          <thead
            key={key}
            className={cn(
              'border-b font-semibold',
              isOwnMessage
                ? 'border-blue-400/40 bg-blue-800/50 text-white'
                : 'border-neutral-200 dark:border-neutral-700/80 bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-100'
            )}
          >
            {renderAstNodes(children, isOwnMessage, key)}
          </thead>
        )

      case 'tbody':
        return (
          <tbody key={key} className='divide-y divide-neutral-200/60 dark:divide-neutral-800/60'>
            {renderAstNodes(children, isOwnMessage, key)}
          </tbody>
        )

      case 'tr':
        return (
          <tr
            key={key}
            className={cn(
              'border-b last:border-b-0',
              isOwnMessage
                ? 'border-blue-400/30 hover:bg-blue-700/30'
                : 'border-neutral-200/60 dark:border-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40'
            )}
          >
            {renderAstNodes(children, isOwnMessage, key)}
          </tr>
        )

      case 'th':
        return (
          <th key={key} className='px-2.5 py-1.5 font-semibold whitespace-nowrap'>
            {renderAstNodes(children, isOwnMessage, key)}
          </th>
        )

      case 'td':
        return (
          <td key={key} className='px-2.5 py-1.5 align-top'>
            {renderAstNodes(children, isOwnMessage, key)}
          </td>
        )

      case 'p':
      case 'div':
        return (
          <div key={key} className='whitespace-pre-wrap break-words leading-relaxed'>
            {renderAstNodes(children, isOwnMessage, key)}
          </div>
        )

      case 'span':
      default:
        return (
          <span key={key}>
            {renderAstNodes(children, isOwnMessage, key)}
          </span>
        )
    }
  })
}

export function MessageRichText({
  content,
  isOwnMessage = false,
  className
}: MessageRichTextProps) {
  const ast = parseHtmlToAst(content)

  return (
    <div className={cn('space-y-1 whitespace-pre-wrap break-words leading-relaxed', className)}>
      {renderAstNodes(ast, isOwnMessage)}
    </div>
  )
}

export default MessageRichText

