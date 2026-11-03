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
  Check
} from 'lucide-react'
import { sanitizeUrl } from './message-rich-text'

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

function isEditorHtmlEmpty(html: string): boolean {
  if (!html) return true
  const textOnly = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<\/?(?:div|p|span|b|strong|i|em|u|s|strike|del|ul|ol|li|code|pre|a)[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u200B/g, '')
    .trim()
  return textOnly.length === 0
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function findParentTag(node: Node | null, tagNames: string[], stopElement: HTMLElement | null): HTMLElement | null {
  let current: Node | null = node
  const upperSet = new Set(tagNames.map((t) => t.toUpperCase()))

  while (current && current !== stopElement) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as HTMLElement
      if (upperSet.has(el.tagName)) {
        return el
      }
    }
    current = current.parentNode
  }

  return null
}

interface ActiveFormatsState {
  bold: boolean
  italic: boolean
  underline: boolean
  strikeThrough: boolean
  unorderedList: boolean
  orderedList: boolean
  code: boolean
}

const INITIAL_ACTIVE_FORMATS: ActiveFormatsState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  unorderedList: false,
  orderedList: false,
  code: false
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
  const editorRef = useRef<HTMLDivElement>(null)
  const savedSelectionRef = useRef<Range | null>(null)
  const [showToolbar, setShowToolbar] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')
  const [linkText, setLinkText] = useState('')
  const [activeFormats, setActiveFormats] = useState<ActiveFormatsState>(INITIAL_ACTIVE_FORMATS)

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

  const updateActiveFormats = useCallback(() => {
    const editor = editorRef.current
    if (!editor || typeof document === 'undefined') return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const anchorNode = selection.anchorNode
    if (!anchorNode || (!editor.contains(anchorNode) && anchorNode !== editor)) {
      return
    }

    const safeQueryState = (cmd: string): boolean => {
      try {
        return Boolean(document.queryCommandState(cmd))
      } catch {
        return false
      }
    }

    const bold =
      safeQueryState('bold') || Boolean(findParentTag(anchorNode, ['B', 'STRONG'], editor))
    const italic =
      safeQueryState('italic') || Boolean(findParentTag(anchorNode, ['I', 'EM'], editor))
    const underline =
      safeQueryState('underline') || Boolean(findParentTag(anchorNode, ['U'], editor))
    const strikeThrough =
      safeQueryState('strikeThrough') ||
      Boolean(findParentTag(anchorNode, ['S', 'STRIKE', 'DEL'], editor))
    const unorderedList =
      safeQueryState('insertUnorderedList') || Boolean(findParentTag(anchorNode, ['UL'], editor))
    const orderedList =
      safeQueryState('insertOrderedList') || Boolean(findParentTag(anchorNode, ['OL'], editor))
    const code = Boolean(findParentTag(anchorNode, ['CODE', 'PRE'], editor))

    setActiveFormats((prev) => {
      if (
        prev.bold === bold &&
        prev.italic === italic &&
        prev.underline === underline &&
        prev.strikeThrough === strikeThrough &&
        prev.unorderedList === unorderedList &&
        prev.orderedList === orderedList &&
        prev.code === code
      ) {
        return prev
      }
      return {
        bold,
        italic,
        underline,
        strikeThrough,
        unorderedList,
        orderedList,
        code
      }
    })
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const handleSelectionChange = () => {
      updateActiveFormats()
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [updateActiveFormats])

  // Sincronizar cuando inputText se limpia desde afuera (ej. al enviar el mensaje)
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (!inputText && editor.innerHTML !== '') {
      editor.innerHTML = ''
      setActiveFormats(INITIAL_ACTIVE_FORMATS)
    }
  }, [inputText])

  const syncEditorContent = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const rawHtml = editor.innerHTML
    if (isEditorHtmlEmpty(rawHtml)) {
      setInputText('')
    } else {
      setInputText(rawHtml.replace(/\u200B/g, ''))
    }
    updateActiveFormats()
  }, [setInputText, updateActiveFormats])

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

  const execRichCommand = (command: string, value?: string) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    document.execCommand(command, false, value)
    syncEditorContent()
  }

  const handleFormatCode = () => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const existingCode = findParentTag(range.commonAncestorContainer, ['CODE', 'PRE'], editor)

    if (existingCode) {
      // Si ya estamos dentro de un bloque <code>, mover el cursor fuera del código
      const afterSpace = document.createTextNode('\u00A0')
      existingCode.parentNode?.insertBefore(afterSpace, existingCode.nextSibling)
      const nextRange = document.createRange()
      nextRange.setStartAfter(afterSpace)
      nextRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(nextRange)
      syncEditorContent()
      return
    }

    const selectedText = range.toString()
    const codeElement = document.createElement('code')
    codeElement.textContent = selectedText || 'código'

    const trailingSpace = document.createTextNode('\u00A0')

    range.deleteContents()
    range.insertNode(trailingSpace)
    range.insertNode(codeElement)

    const newRange = document.createRange()
    if (selectedText) {
      newRange.setStartAfter(trailingSpace)
      newRange.collapse(true)
    } else {
      newRange.selectNodeContents(codeElement)
    }
    selection.removeAllRanges()
    selection.addRange(newRange)

    syncEditorContent()
  }

  const handleOpenLinkBar = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (editor && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (editor.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange()
        setLinkText(range.toString())
      }
    }
    setLinkUrl('https://')
    setShowToolbar(true)
    setShowLinkInput((prev) => !prev)
  }

  const handleInsertLink = () => {
    const editor = editorRef.current
    if (!editor) return

    const safeHref = sanitizeUrl(linkUrl)
    if (!safeHref) return

    editor.focus()
    const selection = window.getSelection()
    if (selection && savedSelectionRef.current) {
      selection.removeAllRanges()
      selection.addRange(savedSelectionRef.current)
    }

    const label = (linkText || safeHref).trim()
    const anchorHtml = `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>&nbsp;`
    document.execCommand('insertHTML', false, anchorHtml)

    setShowLinkInput(false)
    setLinkUrl('https://')
    setLinkText('')
    savedSelectionRef.current = null
    syncEditorContent()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMod = e.ctrlKey || e.metaKey

    if (isMod && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      execRichCommand('bold')
      return
    }

    if (isMod && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      execRichCommand('italic')
      return
    }

    if (isMod && e.key.toLowerCase() === 'u') {
      e.preventDefault()
      execRichCommand('underline')
      return
    }

    if (isMod && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      handleOpenLinkBar()
      return
    }

    if (e.key === 'Enter' && e.shiftKey) {
      const editor = editorRef.current
      const selection = window.getSelection()
      if (editor && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const insideCode = findParentTag(range.commonAncestorContainer, ['CODE', 'PRE'], editor)
        if (insideCode) {
          e.preventDefault()
          const br = document.createElement('br')
          range.deleteContents()
          range.insertNode(br)
          const nextRange = document.createRange()
          nextRange.setStartAfter(br)
          nextRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(nextRange)
          syncEditorContent()
          return
        }
      }
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isEditorHtmlEmpty(inputText) || pendingFile) {
        setShowLinkInput(false)
        onSendMessage()
        if (editorRef.current) {
          editorRef.current.innerHTML = ''
          setActiveFormats(INITIAL_ACTIVE_FORMATS)
        }
      }
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onSelectFile(file)
    event.target.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
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

    // Pegar como texto limpio manteniendo saltos de línea para no arrastrar estilos externos corruptos
    e.preventDefault()
    const plain = e.clipboardData.getData('text/plain')
    if (!plain) return

    const editor = editorRef.current
    const selection = window.getSelection()
    const insideCode =
      editor && selection && selection.rangeCount > 0
        ? findParentTag(selection.getRangeAt(0).commonAncestorContainer, ['CODE', 'PRE'], editor)
        : null

    if (insideCode) {
      const htmlLines = escapeHtml(plain).replace(/\r?\n/g, '<br>')
      document.execCommand('insertHTML', false, htmlLines)
    } else {
      document.execCommand('insertText', false, plain)
    }
    syncEditorContent()
  }

  const isEmpty = isEditorHtmlEmpty(inputText)
  const hasAnyActiveFormat = Object.values(activeFormats).some(Boolean)

  const getToolbarButtonClass = (isActive: boolean) =>
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
          {/* Barra de Herramientas de Texto Enriquecido (HTML WYSIWYG) */}
          {showToolbar && (
            <div className='flex flex-col border-b border-neutral-200/70 dark:border-neutral-700/70'>
              <div className='flex items-center justify-between gap-1 px-2.5 py-1 text-neutral-600 dark:text-neutral-300'>
                <div className='flex items-center gap-0.5 overflow-x-auto scrollbar-none'>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execRichCommand('bold')}
                    disabled={isSending || isUploading}
                    aria-pressed={activeFormats.bold}
                    title='Negrita (Ctrl+B)'
                    aria-label='Negrita'
                    className={getToolbarButtonClass(activeFormats.bold)}
                  >
                    <Bold className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execRichCommand('italic')}
                    disabled={isSending || isUploading}
                    aria-pressed={activeFormats.italic}
                    title='Cursiva (Ctrl+I)'
                    aria-label='Cursiva'
                    className={getToolbarButtonClass(activeFormats.italic)}
                  >
                    <Italic className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execRichCommand('underline')}
                    disabled={isSending || isUploading}
                    aria-pressed={activeFormats.underline}
                    title='Subrayado (Ctrl+U)'
                    aria-label='Subrayado'
                    className={getToolbarButtonClass(activeFormats.underline)}
                  >
                    <Underline className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execRichCommand('strikeThrough')}
                    disabled={isSending || isUploading}
                    aria-pressed={activeFormats.strikeThrough}
                    title='Tachado'
                    aria-label='Tachado'
                    className={getToolbarButtonClass(activeFormats.strikeThrough)}
                  >
                    <Strikethrough className='size-3.5' />
                  </button>

                  <span className='mx-0.5 h-3.5 w-px bg-neutral-200 dark:bg-neutral-700' />

                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execRichCommand('insertUnorderedList')}
                    disabled={isSending || isUploading}
                    aria-pressed={activeFormats.unorderedList}
                    title='Lista de viñetas'
                    aria-label='Lista de viñetas'
                    className={getToolbarButtonClass(activeFormats.unorderedList)}
                  >
                    <List className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execRichCommand('insertOrderedList')}
                    disabled={isSending || isUploading}
                    aria-pressed={activeFormats.orderedList}
                    title='Lista numerada'
                    aria-label='Lista numerada'
                    className={getToolbarButtonClass(activeFormats.orderedList)}
                  >
                    <ListOrdered className='size-3.5' />
                  </button>

                  <span className='mx-0.5 h-3.5 w-px bg-neutral-200 dark:bg-neutral-700' />

                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleFormatCode}
                    disabled={isSending || isUploading}
                    aria-pressed={activeFormats.code}
                    title={activeFormats.code ? 'Salir del bloque de código' : 'Insertar bloque de código'}
                    aria-label='Código'
                    className={getToolbarButtonClass(activeFormats.code)}
                  >
                    <Code className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleOpenLinkBar}
                    disabled={isSending || isUploading}
                    aria-pressed={showLinkInput}
                    title='Insertar enlace (Ctrl+K)'
                    aria-label='Insertar enlace'
                    className={getToolbarButtonClass(showLinkInput)}
                  >
                    <Link2 className='size-3.5' />
                  </button>
                </div>
              </div>

              {/* Barra flotante para insertar enlace HTML */}
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

          {/* Fila Principal de Escritura Enriquecida (WYSIWYG) */}
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
              title='Formato de texto enriquecido'
              aria-label='Formato de texto enriquecido'
              className={cn(
                'relative flex size-8 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer',
                showToolbar || hasAnyActiveFormat
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
              )}
            >
              <Type className='size-4' />
              {hasAnyActiveFormat && (
                <span className='absolute right-1 top-1 size-1.5 rounded-full bg-blue-600 dark:bg-blue-400' />
              )}
            </button>

            <div className='relative min-w-0 flex-1'>
              {isEmpty && (
                <span className='pointer-events-none absolute left-2 top-1 select-none truncate text-xs leading-5 text-neutral-400 sm:text-sm'>
                  {`Responder a ${conversationName}...`}
                </span>
              )}
              <div
                ref={editorRef}
                contentEditable={!isSending && !isUploading}
                suppressContentEditableWarning
                role='textbox'
                aria-multiline='true'
                aria-label={`Responder a ${conversationName}`}
                onInput={syncEditorContent}
                onKeyDown={handleKeyDown}
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
                onFocus={updateActiveFormats}
                onPaste={handlePaste}
                className='max-h-30 min-h-7 w-full overflow-y-auto rounded-xl bg-transparent px-2 py-1 text-xs leading-5 text-neutral-800 outline-none sm:text-sm dark:text-neutral-100 break-words [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:inline-block [&_code]:rounded-md [&_code]:bg-slate-900 [&_code]:px-2 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11.5px] [&_code]:text-emerald-300 [&_pre]:my-1 [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:text-emerald-300 [&_a]:font-medium [&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400'
              />
            </div>

            <Button
              size='icon'
              variant='primary'
              onClick={() => {
                setShowLinkInput(false)
                onSendMessage()
                if (editorRef.current) {
                  editorRef.current.innerHTML = ''
                  setActiveFormats(INITIAL_ACTIVE_FORMATS)
                }
              }}
              disabled={(isEmpty && !pendingFile) || isSending || isUploading}
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
