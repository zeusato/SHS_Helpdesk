'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import styles from './RichTextEditor.module.css'

export default function RichTextEditor({ content, onChange, placeholder }: { content: string, onChange: (html: string) => void, placeholder?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className={styles.editorContainer}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`btn btn-sm ${editor.isActive('bold') ? 'btn-secondary' : 'btn-ghost'}`}><b>B</b></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`btn btn-sm ${editor.isActive('italic') ? 'btn-secondary' : 'btn-ghost'}`}><i>I</i></button>
        <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 4px' }} />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`btn btn-sm ${editor.isActive('heading') ? 'btn-secondary' : 'btn-ghost'}`}>H3</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`btn btn-sm ${editor.isActive('bulletList') ? 'btn-secondary' : 'btn-ghost'}`}>• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`btn btn-sm ${editor.isActive('orderedList') ? 'btn-secondary' : 'btn-ghost'}`}>1. List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`btn btn-sm ${editor.isActive('blockquote') ? 'btn-secondary' : 'btn-ghost'}`}>" Quote</button>
        <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 4px' }} />
        <button type="button" onClick={() => {
          const url = window.prompt('URL')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }} className={`btn btn-sm ${editor.isActive('link') ? 'btn-secondary' : 'btn-ghost'}`}>🔗 Link</button>
      </div>

      {/* Editor Content */}
      <div className={styles.editorContent} onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
