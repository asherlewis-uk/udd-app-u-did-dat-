export interface TemplateDefinition {
  /** Unique identifier, e.g. 'nextjs-starter', 'python-api' */
  id: string;
  /** Human-readable name, e.g. 'Next.js Starter', 'Python FastAPI' */
  name: string;
  /** Short description of what the template provides */
  description: string;
  /** References a stack id from @udd/stack-registry */
  stackId: string;
  /** Files to create when scaffolding */
  files: TemplateFile[];
}

export interface TemplateFile {
  /** Relative path, e.g. 'src/index.ts' */
  path: string;
  /** File content (may contain {{variable}} placeholders) */
  content: string;
}

export interface ScaffoldOptions {
  /** Template id to scaffold from */
  templateId: string;
  /** Project name — replaces {{projectName}} in templates */
  projectName: string;
  /** Additional variables to replace, e.g. { author: 'John', description: '...' } */
  variables?: Record<string, string>;
}

export interface ScaffoldResult {
  /** Processed files with all placeholders replaced */
  files: { path: string; content: string }[];
  /** Stack id from the template */
  stackId: string;
  /** Template id that was used */
  templateId: string;
}
