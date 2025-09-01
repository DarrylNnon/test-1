'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import '@/styles/editor-styles.css';
import SlashCommand from './editor/SlashCommand';

interface TipTapEditorProps {
  document: Y.Doc;
  provider: any; // y-websocket provider
  onGenerateClause: () => void;
  onEditorUpdate: (editor: any) => void;
}

const TipTapEditor = ({ document, provider, onGenerateClause, onEditorUpdate }: TipTapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The Collaboration extension comes with its own history handling
        history: false,
      }),
      SlashCommand.configure({
        command: ({ editor, range, props }) => {
          if (props.item.title === 'Generate Clause') {
            editor.chain().focus().deleteRange(range).run();
            onGenerateClause();
          }
        },
      }),
      Collaboration.configure({
        document,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: { name: 'Anonymous', color: '#9ca3af' }, // Default user, will be updated by provider
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none p-4',
      },
    },
  });

  useEffect(() => {
    if (editor) onEditorUpdate(editor);
  }, [editor, onEditorUpdate]);

  return <EditorContent editor={editor} />;
};

export default TipTapEditor;
