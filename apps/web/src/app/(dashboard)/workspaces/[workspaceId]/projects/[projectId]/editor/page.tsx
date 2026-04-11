'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  MonitorPlay,
  TerminalSquare,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/contexts/auth-context';
import { useProject, useProjectSessions } from '@/hooks/use-projects';
import { CodeEditor } from '@/components/editor/code-editor';
import { TerminalPane } from '@/components/editor/terminal-pane';
import { PreviewFrame } from '@/components/editor/preview-frame';
import { SessionStatusBadge } from '@/components/sessions/session-status-badge';
import { SessionActions } from '@/components/sessions/session-actions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ------------------------------------------------------------------ */
/*  Static file tree entries (UI stub — no real FS integration)        */
/* ------------------------------------------------------------------ */

interface TreeEntry {
  name: string;
  type: 'file' | 'folder';
  children?: TreeEntry[];
  language?: string;
}

const FILE_TREE: TreeEntry[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      { name: 'index.ts', type: 'file', language: 'typescript' },
      { name: 'app.tsx', type: 'file', language: 'typescriptreact' },
      { name: 'styles.css', type: 'file', language: 'css' },
      {
        name: 'components',
        type: 'folder',
        children: [
          { name: 'Header.tsx', type: 'file', language: 'typescriptreact' },
          { name: 'Footer.tsx', type: 'file', language: 'typescriptreact' },
        ],
      },
      {
        name: 'utils',
        type: 'folder',
        children: [
          { name: 'helpers.ts', type: 'file', language: 'typescript' },
        ],
      },
    ],
  },
  { name: 'package.json', type: 'file', language: 'json' },
  { name: 'tsconfig.json', type: 'file', language: 'json' },
  { name: '.gitignore', type: 'file', language: 'plaintext' },
  { name: 'README.md', type: 'file', language: 'markdown' },
];

const SAMPLE_CODE = `import express from 'express';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Hello from UDD!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

/* ------------------------------------------------------------------ */
/*  FileTreeItem                                                       */
/* ------------------------------------------------------------------ */

function FileTreeItem({
  entry,
  depth = 0,
  selectedFile,
  onSelect,
}: {
  entry: TreeEntry;
  depth?: number;
  selectedFile: string;
  onSelect: (name: string, language?: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(depth === 0);
  const isFolder = entry.type === 'folder';
  const isSelected = !isFolder && selectedFile === entry.name;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isFolder) {
            setIsOpen((o) => !o);
          } else {
            onSelect(entry.name, entry.language);
          }
        }}
        className={cn(
          'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors',
          isSelected
            ? 'bg-[#6366f1]/10 text-[#c7d2fe]'
            : 'text-[#a1a1aa] hover:bg-white/[0.04] hover:text-[#fafafa]',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          isOpen ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#6366f1]" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-[#52525b]" />
          )
        ) : (
          <File className="h-3.5 w-3.5 shrink-0 text-[#52525b]" />
        )}
        <span className="truncate">{entry.name}</span>
      </button>

      {isFolder && isOpen && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.name}
              entry={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Editor page                                                        */
/* ------------------------------------------------------------------ */

export default function EditorPage() {
  const params = useParams<{ workspaceId: string; projectId: string }>();
  const { workspaceId, projectId } = params;

  const { user } = useAuth();
  const token = user?.token ?? null;

  const { project } = useProject(token, projectId);
  const { sessions, mutate } = useProjectSessions(token, projectId);

  // Active session = first running or idle session
  const activeSession = sessions.find(
    (s) => s.state === 'running' || s.state === 'idle',
  );

  const [selectedFile, setSelectedFile] = React.useState('index.ts');
  const [editorValue, setEditorValue] = React.useState(SAMPLE_CODE);
  const [editorLanguage, setEditorLanguage] = React.useState('typescript');

  function handleFileSelect(name: string, language?: string) {
    setSelectedFile(name);
    if (language) setEditorLanguage(language);
    // In a real app this would fetch file content from the session
  }

  const backHref = `/workspaces/${workspaceId}/projects/${projectId}`;

  return (
    <div className="flex h-full flex-col bg-[#09090b]">
      {/* ── Top bar ── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/[0.07] px-4">
        <Link
          href={backHref}
          className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <ChevronRight className="h-3 w-3 text-[#3f3f46]" />

        <span className="text-sm font-medium text-[#fafafa] truncate">
          {project?.name ?? projectId}
        </span>

        {activeSession && (
          <>
            <ChevronRight className="h-3 w-3 text-[#3f3f46]" />
            <SessionStatusBadge state={activeSession.state} size="sm" />
          </>
        )}

        <div className="ml-auto text-[10px] text-[#52525b] font-mono">
          {selectedFile}
        </div>
      </header>

      {/* ── No-session banner ── */}
      {!activeSession && (
        <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="text-xs text-amber-300">
            No active session — start a session to enable the terminal and
            preview
          </span>
          <div className="ml-auto">
            <SessionActions
              projectId={projectId}
              onRefresh={() => void mutate()}
            />
          </div>
        </div>
      )}

      {/* ── Main editor area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: File tree */}
        <aside className="flex w-[200px] shrink-0 flex-col border-r border-white/[0.07]">
          <div className="flex h-9 items-center px-3 text-[10px] font-semibold uppercase tracking-widest text-[#52525b]">
            Files
          </div>
          <ScrollArea className="flex-1">
            <div className="pb-4">
              {FILE_TREE.map((entry) => (
                <FileTreeItem
                  key={entry.name}
                  entry={entry}
                  selectedFile={selectedFile}
                  onSelect={handleFileSelect}
                />
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Center: Code editor */}
        <div className="flex-1 min-w-0">
          <CodeEditor
            value={editorValue}
            language={editorLanguage}
            onChange={(v) => setEditorValue(v ?? '')}
            readOnly={!activeSession}
          />
        </div>

        {/* Right: Terminal / Preview panel */}
        <aside className="flex w-[360px] shrink-0 flex-col border-l border-white/[0.07]">
          <Tabs defaultValue="terminal" className="flex h-full flex-col">
            <TabsList className="shrink-0 border-b border-white/[0.07]">
              <TabsTrigger value="terminal" className="gap-1.5">
                <TerminalSquare className="h-3.5 w-3.5" />
                Terminal
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5">
                <MonitorPlay className="h-3.5 w-3.5" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="terminal" className="mt-0 flex-1 overflow-hidden">
              <TerminalPane
                isConnected={!!activeSession}
                lines={
                  activeSession
                    ? [
                        '$ npm start',
                        '',
                        '> udd-project@1.0.0 start',
                        '> tsx src/index.ts',
                        '',
                        'Server running on port 3000',
                      ]
                    : []
                }
                height="100%"
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-0 flex-1 overflow-hidden">
              <PreviewFrame
                url={
                  activeSession && activeSession.workerHost && activeSession.hostPort
                    ? `https://${activeSession.workerHost}:${activeSession.hostPort}`
                    : undefined
                }
              />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
