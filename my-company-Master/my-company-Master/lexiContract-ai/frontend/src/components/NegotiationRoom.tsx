'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ContractVersion } from '@/types';
import TipTapEditor from './TipTapEditor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuth } from '@/context/AuthContext';
import GenerateClauseView from './editor/GenerateClauseView';
import { generateClause } from '@/lib/api';

interface NegotiationRoomProps {
  initialVersion: ContractVersion;
}

// Helper function to assign a consistent color to a user
const userColors = ['#f783ac', '#6b7280', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
function getUserColor(userId: string) {
  // Simple hash function to get a color index
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return userColors[Math.abs(hash) % userColors.length];
}

export default function NegotiationRoom({ initialVersion }: NegotiationRoomProps) {
  const [version, setVersion] = useState<ContractVersion>(initialVersion);
  const { user, token } = useAuth();
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);

  const { ydoc, provider } = useMemo(() => {
    const doc = new Y.Doc();
    const roomName = `lexicontract-doc-${initialVersion.id}`;
    const wsProvider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_Y_WEBSOCKET_URL || 'ws://localhost:1234',
      roomName,
      doc
    );

    // Load initial content into the Y.Doc only if the shared document is empty
    wsProvider.on('sync', (isSynced: boolean) => {
      if (isSynced && doc.getText('prosemirror').length === 0) {
        const yText = doc.getText('prosemirror');
        yText.insert(0, initialVersion.full_text || '');
      }
    });

    return { ydoc: doc, provider: wsProvider };
  }, [initialVersion.id, initialVersion.full_text]);

  useEffect(() => {
    if (user && provider) {
      provider.awareness.setLocalStateField('user', {
        name: user.email,
        color: getUserColor(user.id),
      });
    }

    return () => {
      provider?.disconnect();
      ydoc?.destroy();
    };
  }, [ydoc, provider, user]);

  const handleGenerateClause = useCallback(async (prompt: string) => {
    if (!token || !editorInstance) return;
    try {
      const generatedText = await generateClause(prompt, token);
      // Insert the generated text into the editor
      editorInstance.chain().focus().insertContent(generatedText).run();
      setIsGeneratorOpen(false);
    } catch (error) {
      console.error("Failed to generate clause:", error);
      // Re-throw to be caught by the view component
      throw error;
    }
  }, [token, editorInstance]);

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Contract Editor (Version {version.version_number})</h2>
        <div className="border rounded-md">
          {provider && <TipTapEditor document={ydoc} provider={provider} onGenerateClause={() => setIsGeneratorOpen(true)} onEditorUpdate={setEditorInstance} />}
        </div>
      </div>
      {isGeneratorOpen && (
        <GenerateClauseView onClose={() => setIsGeneratorOpen(false)} onGenerate={handleGenerateClause} />
      )}
    </>
  );
}