import { describe, it, expect } from 'vitest';
import { getTemplate, getAllTemplates, scaffold } from '../scaffold.js';

describe('getTemplate', () => {
  it('returns a known template by id', () => {
    const tpl = getTemplate('node-starter');
    expect(tpl).toBeDefined();
    expect(tpl!.id).toBe('node-starter');
    expect(tpl!.name).toBe('Node.js Starter');
  });

  it('returns undefined for an unknown id', () => {
    expect(getTemplate('cobol-enterprise')).toBeUndefined();
  });

  it.each(['node-starter', 'nextjs-starter', 'python-api', 'static-site'])(
    'returns the %s template',
    (id) => {
      const tpl = getTemplate(id);
      expect(tpl).toBeDefined();
      expect(tpl!.id).toBe(id);
    },
  );
});

describe('getAllTemplates', () => {
  it('returns all 4 built-in templates', () => {
    const templates = getAllTemplates();
    expect(templates).toHaveLength(4);
  });

  it('returns a new array each time (not the internal reference)', () => {
    const a = getAllTemplates();
    const b = getAllTemplates();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('includes every expected template id', () => {
    const ids = getAllTemplates().map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'node-starter', 'nextjs-starter', 'python-api', 'static-site',
      ]),
    );
  });
});

describe('scaffold', () => {
  it('produces files with {{projectName}} replaced', () => {
    const result = scaffold({ templateId: 'node-starter', projectName: 'my-app' });

    expect(result.templateId).toBe('node-starter');
    expect(result.stackId).toBe('node');
    expect(result.files.length).toBeGreaterThan(0);

    const pkg = result.files.find((f) => f.path === 'package.json');
    expect(pkg).toBeDefined();
    expect(pkg!.content).toContain('"my-app"');
    expect(pkg!.content).not.toContain('{{projectName}}');

    const index = result.files.find((f) => f.path === 'src/index.ts');
    expect(index).toBeDefined();
    expect(index!.content).toContain('my-app');
    expect(index!.content).not.toContain('{{projectName}}');
  });

  it('replaces custom variables from options.variables', () => {
    const result = scaffold({
      templateId: 'node-starter',
      projectName: 'test-proj',
      variables: { projectName: 'override-name' },
    });

    // variables spread after projectName, so projectName key in variables wins
    const pkg = result.files.find((f) => f.path === 'package.json');
    expect(pkg).toBeDefined();
    expect(pkg!.content).toContain('"override-name"');
  });

  it('throws for an unknown template id', () => {
    expect(() => scaffold({ templateId: 'nonexistent', projectName: 'x' }))
      .toThrow('Unknown template: "nonexistent"');
  });

  it('returns the correct stackId for each template', () => {
    expect(scaffold({ templateId: 'node-starter', projectName: 'a' }).stackId).toBe('node');
    expect(scaffold({ templateId: 'nextjs-starter', projectName: 'b' }).stackId).toBe('nextjs');
    expect(scaffold({ templateId: 'python-api', projectName: 'c' }).stackId).toBe('python');
    expect(scaffold({ templateId: 'static-site', projectName: 'd' }).stackId).toBe('static-site');
  });

  it('leaves unrecognized placeholders intact', () => {
    const result = scaffold({ templateId: 'static-site', projectName: 'site' });
    const html = result.files.find((f) => f.path === 'index.html');
    expect(html).toBeDefined();
    expect(html!.content).toContain('site');
  });

  it('produces correct file paths for nextjs-starter', () => {
    const result = scaffold({ templateId: 'nextjs-starter', projectName: 'next-app' });
    const paths = result.files.map((f) => f.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'package.json',
        'next.config.js',
        'src/app/layout.tsx',
        'src/app/page.tsx',
      ]),
    );
  });

  it('produces correct file paths for python-api', () => {
    const result = scaffold({ templateId: 'python-api', projectName: 'api' });
    const paths = result.files.map((f) => f.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'requirements.txt',
        'main.py',
        'Dockerfile',
      ]),
    );
  });
});
