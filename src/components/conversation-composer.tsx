'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, cn } from '../ui'
import {
  Paperclip,
  X,
  SendHorizontal,
  Lock,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Link2,
  Type,
  Check,
  Eye,
  EyeOff
} from 'lucide-react'
import { sanitizeUrl, MessageRichText } from './message-rich-text'

interface ConversationComposerProps {
  inputText: string
  setInputText: (text: string) => void
  onSendMessage: () => void
  onSelectFile: (file: File) => void
  pendingFile: File | null
  onRemoveFile: () => void
  isSending: boolean
  isUploading: boolean
  conversationName: string
  isClosed?: boolean
  readOnly?: boolean
  readOnlyMessage?: string
}

export function ConversationComposer({
  inputText,
  setInputText,
  onSendMessage,
  onSelectFile,
  pendingFile,
  onRemoveFile,
  isSending,
  isUploading,
  conversationName,
  isClosed = false,
  readOnly = false,
  readOnlyMessage
}: ConversationComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showToolbar, setShowToolbar] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')
  const [linkText, setLinkText] = useState('')

  const pendingPreviewUrl = useMemo(
    () =>
      pendingFile && pendingFile.type.startsWith('image/')
        ? URL.createObjectURL(pendingFile)
        : undefined,
    [pendingFile]
  )

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
  }, [pendingPreviewUrl])

  // Ajuste automático de la altura del textarea según el contenido
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 28), 120)
    textarea.style.height = `${newHeight}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [inputText, adjustHeight])

  // Desactivar vista previa si se limpia el texto
  useEffect(() => {
    if (!inputText.trim()) {
      setShowPreview(false)
    }
  }, [inputText])

  // Mantener siempre el foco en el textarea tras completar el envío
  const wasSendingRef = useRef(false)
  useEffect(() => {
    if (wasSendingRef.current && !isSending && !isUploading) {
      textareaRef.current?.focus()
    }
    wasSendingRef.current = isSending || isUploading
  }, [isSending, isUploading])

  if (isClosed || readOnly) {
    return (
      <div className='shrink-0 px-3 pb-3 pt-1 text-center sm:px-4 sm:pb-4'>
        <div className='flex items-center justify-center gap-2 rounded-xl border border-neutral-200/80 bg-white/85 dark:border-neutral-800/80 dark:bg-neutral-900/85 backdrop-blur-md px-4 py-2 text-xs font-medium text-neutral-500 shadow-xs dark:text-neutral-400'>
          <Lock className='size-3.5 text-neutral-400 dark:text-neutral-500 shrink-0' />
          <span>
            {readOnlyMessage ||
              (isClosed
                ? 'Esta conversación ha sido finalizada y no admite nuevos mensajes.'
                : 'No se permite enviar mensajes en esta conversación.')}
          </span>
        </div>
      </div>
    )
  }

  /**
   * Envuelve la selección del textarea con prefijo y sufijo Markdown.
   * Si no hay texto seleccionado, inserta un placeholder y posiciona el cursor.
   */
  const applyWrapFormat = (prefix: string, suffix: string, placeholder = 'texto') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const current = inputText

    if (start !== end) {
      const selected = current.substring(start, end)
      const replacement = `${prefix}${selected}${suffix}`
      const nextText = current.substring(0, start) + replacement + current.substring(end)
      setInputText(nextText)

      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start + prefix.length, end + prefix.length)
      })
    } else {
      const replacement = `${prefix}${placeholder}${suffix}`
      const nextText = current.substring(0, start) + replacement + current.substring(end)
      setInputText(nextText)

      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length)
      })
    }
  }

  /**
   * Antepone a cada línea de la selección un prefijo (ej. "- " o "1. ")
   */
  const applyLinePrefixFormat = (prefix: string, isOrdered = false) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const current = inputText

    // Encontrar inicio de la primera línea y fin de la última línea seleccionada
    const lineStart = current.lastIndexOf('\n', start - 1) + 1
    const nextNewline = current.indexOf('\n', end)
    const lineEnd = nextNewline === -1 ? current.length : nextNewline

    const selectedLines = current.substring(lineStart, lineEnd).split('\n')
    const formattedLines = selectedLines.map((line, idx) => {
      const linePrefix = isOrdered ? `${idx + 1}. ` : prefix
      // Si la línea ya tiene el prefijo, quitarlo (toggle)
      if (line.startsWith(linePrefix)) {
        return line.slice(linePrefix.length)
      }
      return `${linePrefix}${line}`
    })

    const replacement = formattedLines.join('\n')
    const nextText = current.substring(0, lineStart) + replacement + current.substring(lineEnd)
    setInputText(nextText)

    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + replacement.length)
    })
  }

  /**
   * Aplica formato de código: si la selección contiene saltos de línea,
   * crea un bloque multilínea ```; de lo contrario, código inline `...`.
   */
  const handleFormatCode = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const current = inputText
    const selected = current.substring(start, end)

    if (selected.includes('\n')) {
      const replacement = `\`\`\`\n${selected}\n\`\`\``
      const nextText = current.substring(0, start) + replacement + current.substring(end)
      setInputText(nextText)

      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start + 4, start + 4 + selected.length)
      })
    } else {
      applyWrapFormat('`', '`', 'código')
    }
  }

  /**
   * Abre la barra interactiva para insertar enlaces Markdown [texto](url)
   */
  const handleOpenLinkBar = () => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart ?? 0
      const end = textarea.selectionEnd ?? 0
      const selected = inputText.substring(start, end).trim()
      if (selected) {
        setLinkText(selected)
      }
    }
    setLinkUrl('https://')
    setShowToolbar(true)
    setShowLinkInput((prev) => !prev)
  }

  /**
   * Inserta el enlace seguro [texto](url) en la posición del cursor
   */
  const handleInsertLink = () => {
    const textarea = textareaRef.current
    const safeHref = sanitizeUrl(linkUrl)
    if (!safeHref) return

    const label = (linkText || safeHref).trim()
    const markdownLink = `[${label}](${safeHref})`

    if (textarea) {
      const start = textarea.selectionStart ?? 0
      const end = textarea.selectionEnd ?? 0
      const current = inputText
      const nextText = current.substring(0, start) + markdownLink + current.substring(end)
      setInputText(nextText)

      requestAnimationFrame(() => {
        textarea.focus()
        const newCursorPos = start + markdownLink.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      })
    } else {
      setInputText(inputText ? `${inputText} ${markdownLink}` : markdownLink)
    }

    setShowLinkInput(false)
    setLinkUrl('https://')
    setLinkText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.ctrlKey || e.metaKey

    if (isMod && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      applyWrapFormat('**', '**', 'negrita')
      return
    }

    if (isMod && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      applyWrapFormat('*', '*', 'cursiva')
      return
    }

    if (isMod && e.key.toLowerCase() === 'u') {
      e.preventDefault()
      applyWrapFormat('<u>', '</u>', 'subrayado')
      return
    }

    if (isMod && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      handleOpenLinkBar()
      return
    }

    if (isMod && e.key.toLowerCase() === 'e') {
      e.preventDefault()
      handleFormatCode()
      return
    }

    if (isMod && e.shiftKey && e.key.toLowerCase() === 'x') {
      e.preventDefault()
      applyWrapFormat('~~', '~~', 'tachado')
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputText.trim() || pendingFile) {
        setShowLinkInput(false)
        setShowPreview(false)
        onSendMessage()
        requestAnimationFrame(() => {
          textareaRef.current?.focus()
        })
      }
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onSelectFile(file)
    event.target.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isSending || isUploading) return
    const items = e.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            onSelectFile(file)
            return
          }
        }
      }
    }
  }

  const isEmpty = !inputText.trim()

  const getToolbarButtonClass = (isActive = false) =>
    cn(
      'flex size-6.5 items-center justify-center rounded-lg transition-all cursor-pointer',
      isActive
        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-500/30 shadow-2xs dark:bg-blue-950/90 dark:text-blue-300 dark:ring-blue-400/40'
        : 'hover:bg-neutral-100 dark:hover:bg-neutral-700/70 hover:text-neutral-900 dark:hover:text-white'
    )

  return (
    <div className='shrink-0 px-3 pb-3 pt-1 sm:px-4 sm:pb-4'>
      <div className='relative'>
        {pendingFile && (
          <div className='mb-2 flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white/95 backdrop-blur-md p-2 shadow-xs dark:border-neutral-700/80 dark:bg-neutral-800/95'>
            {pendingFile.type.startsWith('image/') ? (
              <img
                src={pendingPreviewUrl || ''}
                alt='Archivo seleccionado'
                className='size-12 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700'
              />
            ) : (
              <div className='flex size-12 items-center justify-center rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'>
                <Paperclip className='size-5' />
              </div>
            )}
            <span className='min-w-0 flex-1 truncate text-xs text-neutral-600 dark:text-neutral-300 font-medium'>
              {pendingFile.name || 'Archivo listo para enviar'}
            </span>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={onRemoveFile}
              className='size-7 shrink-0 p-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              aria-label='Quitar archivo'
            >
              <X className='size-3.5' />
            </Button>
          </div>
        )}

        <div className='flex flex-col rounded-2xl border border-neutral-200/80 bg-white/95 backdrop-blur-md shadow-sm transition-all focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:shadow-md dark:border-neutral-700/80 dark:bg-neutral-800/95'>
          {/* Barra de Herramientas de Formato Markdown */}
          {showToolbar && (
            <div className='flex flex-col border-b border-neutral-200/70 dark:border-neutral-700/70'>
              <div className='flex items-center justify-between gap-1 px-2.5 py-1 text-neutral-600 dark:text-neutral-300'>
                <div className='flex items-center gap-0.5 overflow-x-auto scrollbar-none'>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyWrapFormat('**', '**', 'negrita')}
                    disabled={isSending || isUploading}
                    title='Negrita (Ctrl+B)'
                    aria-label='Negrita'
                    className={getToolbarButtonClass()}
                  >
                    <Bold className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyWrapFormat('*', '*', 'cursiva')}
                    disabled={isSending || isUploading}
                    title='Cursiva (Ctrl+I)'
                    aria-label='Cursiva'
                    className={getToolbarButtonClass()}
                  >
                    <Italic className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyWrapFormat('<u>', '</u>', 'subrayado')}
                    disabled={isSending || isUploading}
                    title='Subrayado (Ctrl+U)'
                    aria-label='Subrayado'
                    className={getToolbarButtonClass()}
                  >
                    <Underline className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyWrapFormat('~~', '~~', 'tachado')}
                    disabled={isSending || isUploading}
                    title='Tachado (Ctrl+Shift+X)'
                    aria-label='Tachado'
                    className={getToolbarButtonClass()}
                  >
                    <Strikethrough className='size-3.5' />
                  </button>

                  <span className='mx-0.5 h-3.5 w-px bg-neutral-200 dark:bg-neutral-700' />

                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyLinePrefixFormat('- ')}
                    disabled={isSending || isUploading}
                    title='Lista de viñetas'
                    aria-label='Lista de viñetas'
                    className={getToolbarButtonClass()}
                  >
                    <List className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyLinePrefixFormat('', true)}
                    disabled={isSending || isUploading}
                    title='Lista numerada'
                    aria-label='Lista numerada'
                    className={getToolbarButtonClass()}
                  >
                    <ListOrdered className='size-3.5' />
                  </button>

                  <span className='mx-0.5 h-3.5 w-px bg-neutral-200 dark:bg-neutral-700' />

                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleFormatCode}
                    disabled={isSending || isUploading}
                    title='Insertar código (Ctrl+E)'
                    aria-label='Código'
                    className={getToolbarButtonClass()}
                  >
                    <Code className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleOpenLinkBar}
                    disabled={isSending || isUploading}
                    aria-pressed={showLinkInput}
                    title='Insertar enlace Markdown (Ctrl+K)'
                    aria-label='Insertar enlace'
                    className={getToolbarButtonClass(showLinkInput)}
                  >
                    <Link2 className='size-3.5' />
                  </button>

                  <span className='mx-0.5 h-3.5 w-px bg-neutral-200 dark:bg-neutral-700' />

                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPreview((prev) => !prev)}
                    disabled={isEmpty || isSending || isUploading}
                    aria-pressed={showPreview}
                    title={showPreview ? 'Ocultar vista previa' : 'Vista previa de Markdown'}
                    aria-label='Vista previa'
                    className={getToolbarButtonClass(showPreview)}
                  >
                    {showPreview ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
                  </button>
                </div>
              </div>

              {/* Barra flotante para insertar enlace Markdown */}
              {showLinkInput && (
                <div className='flex flex-wrap items-center gap-1.5 border-t border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/80 dark:bg-neutral-900/50 px-2.5 py-1.5'>
                  <input
                    type='text'
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder='Texto del enlace'
                    className='h-6.5 w-28 sm:w-36 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs text-neutral-800 dark:text-neutral-100 outline-none focus:border-blue-500'
                  />
                  <input
                    type='url'
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleInsertLink()
                      }
                    }}
                    placeholder='https://...'
                    className='h-6.5 min-w-0 flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs text-neutral-800 dark:text-neutral-100 outline-none focus:border-blue-500'
                  />
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleInsertLink}
                    className='inline-flex h-6.5 items-center gap-1 rounded-lg bg-blue-600 px-2 text-[11px] font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer'
                  >
                    <Check className='size-3' />
                    <span>Insertar</span>
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowLinkInput(false)}
                    className='inline-flex size-6.5 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer'
                    aria-label='Cancelar enlace'
                  >
                    <X className='size-3.5' />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Vista Previa en Vivo de Markdown (si está activada) */}
          {showPreview && !isEmpty && (
            <div className='border-b border-neutral-200/70 dark:border-neutral-700/70 bg-neutral-50/70 dark:bg-neutral-900/40 px-3 py-2'>
              <div className='mb-1 flex items-center justify-between text-[10px] font-medium text-neutral-400 uppercase tracking-wider'>
                <span>Vista previa Markdown</span>
                <button
                  type='button'
                  onClick={() => setShowPreview(false)}
                  className='hover:text-neutral-600 dark:hover:text-neutral-200'
                >
                  Cerrar
                </button>
              </div>
              <div className='max-h-28 overflow-y-auto text-xs'>
                <MessageRichText content={inputText} />
              </div>
            </div>
          )}

          {/* Fila Principal de Escritura en Markdown */}
          <div className='flex items-center gap-1 px-2.5 py-1.5'>
            <label
              className='flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
              title='Adjuntar archivo'
            >
              <Paperclip className='size-4' />
              <input
                type='file'
                className='sr-only'
                onChange={handleFileChange}
                disabled={isSending || isUploading}
              />
            </label>

            <button
              type='button'
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowToolbar((prev) => !prev)}
              disabled={isSending || isUploading}
              title='Formato de texto enriquecido (Markdown)'
              aria-label='Formato de texto enriquecido'
              className={cn(
                'relative flex size-8 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer',
                showToolbar
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
              )}
            >
              <Type className='size-4' />
            </button>

            <div className='relative min-w-0 flex-1'>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`Responder a ${conversationName}...`}
                disabled={isUploading}
                rows={1}
                aria-label={`Responder a ${conversationName}`}
                className='max-h-30 min-h-7 w-full resize-none overflow-y-auto rounded-xl bg-transparent px-2 py-1 text-xs leading-5 text-neutral-800 outline-none placeholder:text-neutral-400 sm:text-sm dark:text-neutral-100 break-words'
              />
            </div>

            <Button
              size='icon'
              variant='primary'
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowLinkInput(false)
                setShowPreview(false)
                onSendMessage()
                requestAnimationFrame(() => {
                  textareaRef.current?.focus()
                })
              }}
              disabled={(isEmpty && !pendingFile) || isSending || isUploading}
              className='size-8 shrink-0 rounded-full p-0 cursor-pointer'
              aria-label='Enviar mensaje'
              title='Enviar mensaje'
            >
              <SendHorizontal className='size-4' />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
