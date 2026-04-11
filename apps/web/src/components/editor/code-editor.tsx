'use client';

import dynamic from 'next/dynamic';
import type { OnMount } from '@monaco-editor/react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#18181b]" />,
});

interface CodeEditorProps {
  value?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
  height?: string;
}

export function CodeEditor({
  value = '',
  language = 'typescript',
  onChange,
  readOnly = false,
  height = '100%',
}: CodeEditorProps) {
  const handleMount: OnMount = (editor, monaco) => {
    // Remove default focus outline — handled by container
    editor.updateOptions({ readOnly });

    monaco.editor.defineTheme('udd-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#09090b',
        'editor.lineHighlightBackground': '#18181b',
        'editorLineNumber.foreground': '#3f3f46',
        'editorLineNumber.activeForeground': '#71717a',
        'editor.selectionBackground': '#6366f133',
        'editor.inactiveSelectionBackground': '#6366f122',
      },
    });
    monaco.editor.setTheme('udd-dark');
  };

  return (
    <MonacoEditor
      height={height}
      language={language}
      value={value}
      {...(onChange ? { onChange } : {})}
      onMount={handleMount}
      options={{
        theme: 'udd-dark',
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.6,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        readOnly,
        renderLineHighlight: 'line',
        smoothScrolling: true,
        cursorSmoothCaretAnimation: 'on',
        padding: { top: 12, bottom: 12 },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
          useShadows: false,
        },
      }}
    />
  );
}
