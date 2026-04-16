import { describe, it, expect } from 'vitest';
import { getStack, getAllStacks, detectStack } from '../registry.js';

describe('getStack', () => {
  it('returns a known stack by id', () => {
    const node = getStack('node');
    expect(node).toBeDefined();
    expect(node!.id).toBe('node');
    expect(node!.name).toBe('Node.js');
  });

  it('returns undefined for an unknown id', () => {
    expect(getStack('cobol')).toBeUndefined();
  });

  it.each(['node', 'python', 'go', 'ruby', 'rust', 'java', 'dotnet', 'static-site', 'nextjs', 'react'])(
    'returns the %s stack',
    (id) => {
      const stack = getStack(id);
      expect(stack).toBeDefined();
      expect(stack!.id).toBe(id);
    },
  );
});

describe('getAllStacks', () => {
  it('returns all 10 built-in stacks', () => {
    const stacks = getAllStacks();
    expect(stacks).toHaveLength(10);
  });

  it('returns a new array each time (not the internal reference)', () => {
    const a = getAllStacks();
    const b = getAllStacks();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('includes every expected stack id', () => {
    const ids = getAllStacks().map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'node', 'python', 'go', 'ruby', 'rust',
        'java', 'dotnet', 'static-site', 'nextjs', 'react',
      ]),
    );
  });
});

describe('detectStack', () => {
  it('returns undefined for an empty file list', () => {
    expect(detectStack([])).toBeUndefined();
  });

  it('returns undefined for unrecognized files', () => {
    expect(detectStack(['README.md', 'LICENSE', '.gitignore'])).toBeUndefined();
  });

  it('detects Node.js from package.json', () => {
    const stack = detectStack(['package.json', 'src/index.ts']);
    expect(stack).toBeDefined();
    // package.json alone matches node (nextjs needs next.config.*)
    expect(stack!.id).toBe('node');
  });

  it('detects Next.js when next.config.js is present', () => {
    const stack = detectStack(['package.json', 'next.config.js', 'pages/index.tsx']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('nextjs');
  });

  it('detects Next.js with next.config.mjs', () => {
    const stack = detectStack(['next.config.mjs', 'app/layout.tsx']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('nextjs');
  });

  it('detects React from vite.config.ts', () => {
    const stack = detectStack(['vite.config.ts', 'src/main.tsx']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('react');
  });

  it('detects Python from requirements.txt', () => {
    const stack = detectStack(['requirements.txt', 'main.py', 'utils.py']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('python');
  });

  it('detects Python from pyproject.toml', () => {
    const stack = detectStack(['pyproject.toml', 'src/app.py']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('python');
  });

  it('detects Go from go.mod', () => {
    const stack = detectStack(['go.mod', 'go.sum', 'main.go']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('go');
  });

  it('detects Ruby from Gemfile', () => {
    const stack = detectStack(['Gemfile', 'app.rb']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('ruby');
  });

  it('detects Rust from Cargo.toml', () => {
    const stack = detectStack(['Cargo.toml', 'src/main.rs']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('rust');
  });

  it('detects Java from pom.xml', () => {
    const stack = detectStack(['pom.xml', 'src/main/java/App.java']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('java');
  });

  it('detects .NET from *.csproj', () => {
    const stack = detectStack(['MyApp.csproj', 'Program.cs']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('dotnet');
  });

  it('detects static site from index.html', () => {
    const stack = detectStack(['index.html', 'style.css', 'logo.svg']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('static-site');
  });

  it('falls back to extension-based detection when no entry patterns match', () => {
    const stack = detectStack(['handler.py', 'utils.py', 'models.py']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('python');
  });

  it('prefers nextjs over node when next.config.ts is present', () => {
    const stack = detectStack(['package.json', 'next.config.ts', 'tsconfig.json']);
    expect(stack).toBeDefined();
    expect(stack!.id).toBe('nextjs');
  });
});
