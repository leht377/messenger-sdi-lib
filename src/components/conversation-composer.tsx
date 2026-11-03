'use client'

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Textarea, cn } from '../ui'
import {
  Paperclip,
  X,
  SendHorizontal,
  Lock,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Link2,
  Type,
  Eye,
  Pencil
} from 'lucide-react'
import { MessageMarkdown } from './message-markdown'

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
  const maxTextareaHeight = 120

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

  useEffect(() => {
    if (!inputText.trim() && showPreview) {
      setShowPreview(false)
    }
  }, [inputText, showPreview])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const nextHeight = Math.min(textarea.scrollHeight, maxTextareaHeight)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > maxTextareaHeight ? 'auto' : 'hidden'
  }, [inputText, showPreview])

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

  const applySelectionFormat = (
    prefix: string,
    suffix: string,
    placeholder: string,
    selectRangeAfter?: { startOffset: number; endOffset: number }
  ) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart ?? inputText.length
    const end = textarea.selectionEnd ?? inputText.length
    const selected = inputText.slice(start, end)
    const content = selected || placeholder
    const replacement = `${prefix}${content}${suffix}`
    const nextValue = inputText.slice(0, start) + replacement + inputText.slice(end)

    setInputText(nextValue)
    setShowPreview(false)

    requestAnimationFrame(() => {
      textarea.focus()
      if (selectRangeAfter) {
        textarea.setSelectionRange(
          start + selectRangeAfter.startOffset,
          start + selectRangeAfter.endOffset
        )
      } else {
        const newCursorStart = start + prefix.length
        const newCursorEnd = newCursorStart + content.length
        textarea.setSelectionRange(newCursorStart, newCursorEnd)
      }
    })
  }

  const handleFormatBold = () => applySelectionFormat('**', '**', 'texto en negrita')
  const handleFormatItalic = () => applySelectionFormat('*', '*', 'texto en cursiva')
  const handleFormatStrike = () => applySelectionFormat('~~', '~~', 'texto tachado')

  const handleFormatCode = () => {
    const textarea = textareaRef.current
    const selected = textarea
      ? inputText.slice(textarea.selectionStart, textarea.selectionEnd)
      : ''
    if (selected.includes('\n')) {
      applySelectionFormat('\n```\n', '\n```\n', 'código')
    } else {
      applySelectionFormat('`', '`', 'código')
    }
  }

  const handleFormatLink = () => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? inputText.length
    const end = textarea?.selectionEnd ?? inputText.length
    const selected = inputText.slice(start, end) || 'enlace'
    const urlPlaceholder = 'https://'
    applySelectionFormat('[', `](${urlPlaceholder})`, 'enlace', {
      startOffset: 1 + selected.length + 2,
      endOffset: 1 + selected.length + 2 + urlPlaceholder.length
    })
  }

  const handleFormatList = (ordered: boolean) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart ?? inputText.length
    const end = textarea.selectionEnd ?? inputText.length

    const lineStart = inputText.lastIndexOf('\n', start - 1) + 1
    const lineEndIdx = inputText.indexOf('\n', end)
    const lineEnd = lineEndIdx === -1 ? inputText.length : lineEndIdx

    const selectedBlock = inputText.slice(lineStart, lineEnd)
    const lines = selectedBlock.split('\n')

    const formattedLines = lines.map((line, idx) => {
      const cleaned = line.replace(/^(?:\d+[.)]|[-*•])\s+/, '')
      return ordered ? `${idx + 1}. ${cleaned || 'Elemento'}` : `- ${cleaned || 'Elemento'}`
    })

    const replacement = formattedLines.join('\n')
    const nextValue = inputText.slice(0, lineStart) + replacement + inputText.slice(lineEnd)
    setInputText(nextValue)
    setShowPreview(false)

    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + replacement.length)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.ctrlKey || e.metaKey

    if (isMod && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      handleFormatBold()
      return
    }

    if (isMod && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      handleFormatItalic()
      return
    }

    if (isMod && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      handleFormatLink()
      return
    }

    if (e.key === 'Enter' && e.shiftKey) {
      const textarea = textareaRef.current
      if (!textarea) return

      const cursor = textarea.selectionStart ?? inputText.length
      const lineStart = inputText.lastIndexOf('\n', cursor - 1) + 1
      const currentLine = inputText.slice(lineStart, cursor)

      const orderedMatch = currentLine.match(/^(\d+)([.)])\s+(.*)$/)
      if (orderedMatch) {
        e.preventDefault()
        const num = Number(orderedMatch[1])
        const sep = orderedMatch[2]
        const content = orderedMatch[3]

        if (!content.trim()) {
          // Si el ítem actual está vacío, salir de la lista
          const nextValue = inputText.slice(0, lineStart) + '\n' + inputText.slice(cursor)
          setInputText(nextValue)
          requestAnimationFrame(() => {
            textarea.setSelectionRange(lineStart + 1, lineStart + 1)
          })
        } else {
          const insert = `\n${num + 1}${sep} `
          const nextValue = inputText.slice(0, cursor) + insert + inputText.slice(cursor)
          setInputText(nextValue)
          requestAnimationFrame(() => {
            const nextPos = cursor + insert.length
            textarea.setSelectionRange(nextPos, nextPos)
          })
        }
        return
      }

      const unorderedMatch = currentLine.match(/^([-*•])\s+(.*)$/)
      if (unorderedMatch) {
        e.preventDefault()
        const bullet = unorderedMatch[1]
        const content = unorderedMatch[2]

        if (!content.trim()) {
          const nextValue = inputText.slice(0, lineStart) + '\n' + inputText.slice(cursor)
          setInputText(nextValue)
          requestAnimationFrame(() => {
            textarea.setSelectionRange(lineStart + 1, lineStart + 1)
          })
        } else {
          const insert = `\n${bullet} `
          const nextValue = inputText.slice(0, cursor) + insert + inputText.slice(cursor)
          setInputText(nextValue)
          requestAnimationFrame(() => {
            const nextPos = cursor + insert.length
            textarea.setSelectionRange(nextPos, nextPos)
          })
        }
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setShowPreview(false)
      onSendMessage()
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
    if (!items) return

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

  return (
    <div className='shrink-0 px-3 pb-3 pt-1 sm:px-4 sm:pb-4'>
      {/* Campo de Texto y Botones Flotantes */}
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
          {/* Barra de Herramientas de Formato Enriquecido */}
          {showToolbar && (
            <div className='flex items-center justify-between gap-1 border-b border-neutral-200/70 dark:border-neutral-700/70 px-2.5 py-1 text-neutral-600 dark:text-neutral-300'>
              <div className='flex items-center gap-0.5 overflow-x-auto scrollbar-none'>
                <button
                  type='button'
                  onClick={handleFormatBold}
                  disabled={isSending || isUploading}
                  title='Negrita (Ctrl+B)'
                  aria-label='Negrita'
                  className='flex size-6.5 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/70 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer'
                >
                  <Bold className='size-3.5' />
                </button>
                <button
                  type='button'
                  onClick={handleFormatItalic}
                  disabled={isSending || isUploading}
                  title='Cursiva (Ctrl+I)'
                  aria-label='Cursiva'
                  className='flex size-6.5 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/70 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer'
                >
                  <Italic className='size-3.5' />
                </button>
                <button
                  type='button'
                  onClick={handleFormatStrike}
                  disabled={isSending || isUploading}
                  title='Tachado'
                  aria-label='Tachado'
                  className='flex size-6.5 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/70 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer'
                >
                  <Strikethrough className='size-3.5' />
                </button>

                <span className='mx-0.5 h-3.5 w-px bg-neutral-200 dark:bg-neutral-700' />

                <button
                  type='button'
                  onClick={() => handleFormatList(false)}
                  disabled={isSending || isUploading}
                  title='Lista de viñetas'
                  aria-label='Lista de viñetas'
                  className='flex size-6.5 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/70 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer'
                >
                  <List className='size-3.5' />
                </button>
                <button
                  type='button'
                  onClick={() => handleFormatList(true)}
                  disabled={isSending || isUploading}
                  title='Lista numerada'
                  aria-label='Lista numerada'
                  className='flex size-6.5 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/70 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer'
                >
                  <ListOrdered className='size-3.5' />
                </button>

                <span className='mx-0.5 h-3.5 w-px bg-neutral-200 dark:bg-neutral-700' />

                <button
                  type='button'
                  onClick={handleFormatCode}
                  disabled={isSending || isUploading}
                  title='Código'
                  aria-label='Código'
                  className='flex size-6.5 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/70 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer'
                >
                  <Code className='size-3.5' />
                </button>
                <button
                  type='button'
                  onClick={handleFormatLink}
                  disabled={isSending || isUploading}
                  title='Insertar enlace (Ctrl+K)'
                  aria-label='Insertar enlace'
                  className='flex size-6.5 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/70 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer'
                >
                  <Link2 className='size-3.5' />
                </button>
              </div>

              {inputText.trim() && (
                <button
                  type='button'
                  onClick={() => setShowPreview((prev) => !prev)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10.5px] font-medium transition-colors cursor-pointer shrink-0',
                    showPreview
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                      : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700/70'
                  )}
                  title={showPreview ? 'Volver a editar' : 'Vista previa del formato'}
                >
                  {showPreview ? (
                    <>
                      <Pencil className='size-3' />
                      <span>Editar</span>
                    </>
                  ) : (
                    <>
                      <Eye className='size-3' />
                      <span>Vista previa</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Fila Principal de Escritura */}
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
              onClick={() => setShowToolbar((prev) => !prev)}
              disabled={isSending || isUploading}
              title='Formato de texto enriquecido'
              aria-label='Formato de texto enriquecido'
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer',
                showToolbar
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
              )}
            >
              <Type className='size-4' />
            </button>

            {showPreview ? (
              <div
                onClick={() => setShowPreview(false)}
                title='Haz clic para volver a editar'
                className='max-h-30 min-h-7 flex-1 overflow-y-auto rounded-xl px-2 py-1 text-xs sm:text-sm text-neutral-800 dark:text-neutral-100 cursor-text'
              >
                <MessageMarkdown content={inputText} />
              </div>
            ) : (
              <Textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`Responder a ${conversationName}...`}
                rows={1}
                className='!min-h-0 !border-transparent max-h-30 flex-1 resize-none overflow-y-hidden rounded-xl bg-transparent px-2 py-1 text-xs leading-5 shadow-none !outline-none focus:!border-transparent focus:!outline-none focus-visible:!border-transparent focus-visible:!ring-0 focus-visible:!outline-none sm:text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400'
              />
            )}

            <Button
              size='icon'
              variant='primary'
              onClick={() => {
                setShowPreview(false)
                onSendMessage()
              }}
              disabled={(!inputText.trim() && !pendingFile) || isSending || isUploading}
              className='size-8 shrink-0 rounded-full p-0'
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

