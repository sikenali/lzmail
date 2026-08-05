'use client'
import { useEditor, EditorContent, type Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { forwardRef, useImperativeHandle } from 'react'
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Image as ImageIcon, Table as TableIcon, Code, List, ListOrdered, Quote, Heading1, Heading2 } from '@/lib/icons'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  height?: string
}

export interface RichTextEditorHandle {
  getHTML: () => string
  getText: () => string
  setContent: (content: string) => void
}

const RichTextEditorInner = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ value, onChange, placeholder = '开始撰写邮件正文...', className = '', height = '360px' }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit,
        Underline,
        Placeholder.configure({ placeholder }),
        Image,
        Link.configure({ openOnClick: false }),
        Table,
        TableRow,
        TableCell,
        TableHeader,
      ],
      content: value,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class: 'ProseMirror prose-edit focus:outline-none',
        },
      },
    })

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      setContent: (content: string) => editor?.commands.setContent(content),
    }), [editor])

    if (!editor) return null

    const setLink = () => {
      const url = window.prompt('输入链接地址')
      if (url) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      }
    }

    const insertImage = () => {
      const url = window.prompt('输入图片地址')
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    }

    const insertTable = () => {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }

    const toggleCode = () => {
      editor.chain().focus().toggleCode().run()
    }

    return (
      <div className={`rounded-[8px] border overflow-hidden ${className}`} style={{ borderColor: 'rgba(229,217,196,1)', backgroundColor: 'var(--background)', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-3 py-2 border-b" style={{ borderColor: 'rgba(229,217,196,1)' }}>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="加粗"
          >
            <Bold className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="斜体"
          >
            <Italic className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="下划线"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarBtn>
          <div className="w-[1px] h-5 mx-1.5" style={{ backgroundColor: 'rgba(229,217,196,1)' }} />
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="标题1">
            <Heading1 className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="标题2">
            <Heading2 className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="引用">
            <Quote className="w-4 h-4" />
          </ToolbarBtn>
          <div className="w-[1px] h-5 mx-1.5" style={{ backgroundColor: 'rgba(229,217,196,1)' }} />
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="无序列表">
            <List className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="有序列表">
            <ListOrdered className="w-4 h-4" />
          </ToolbarBtn>
          <div className="w-[1px] h-5 mx-1.5" style={{ backgroundColor: 'rgba(229,217,196,1)' }} />
          <ToolbarBtn onClick={insertImage} title="插入图片">
            <ImageIcon className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={setLink} title="插入链接">
            <LinkIcon className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={insertTable} title="插入表格">
            <TableIcon className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={toggleCode} isActive={editor.isActive('code')} title="代码">
            <Code className="w-4 h-4" />
          </ToolbarBtn>
          <div className="flex-1" />
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--muted)] disabled:opacity-30"
            title="撤销"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--foreground-secondary)' }}>
              <path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.6 2.8L3 13" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--muted)] disabled:opacity-30"
            title="重做"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--foreground-secondary)' }}>
              <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016.6 2.8L21 13" />
            </svg>
          </button>
        </div>
        {/* Editor */}
        <div className="flex-1 overflow-auto p-4" style={{ minHeight: 0 }}>
          <EditorContent editor={editor} className="min-h-[300px] text-[15px]" style={{ color: 'var(--foreground)' }} />
        </div>
      </div>
    )
  }
)

RichTextEditorInner.displayName = 'RichTextEditor'
export const RichTextEditor = RichTextEditorInner as unknown as typeof RichTextEditorInner & { displayName?: string }

function ToolbarBtn({
  children,
  onClick,
  isActive,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  isActive?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]'}`}
      style={{ color: isActive ? 'var(--primary)' : 'var(--foreground-secondary)' }}
    >
      {children}
    </button>
  )
}
