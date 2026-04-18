import { builtinTemplates } from './templates.js';
import type { TemplateDefinition, ScaffoldOptions, ScaffoldResult } from './types.js';

const templateById = new Map<string, TemplateDefinition>(
  builtinTemplates.map((t) => [t.id, t]),
);

/** Return a template definition by id, or undefined if not found. */
export function getTemplate(id: string): TemplateDefinition | undefined {
  return templateById.get(id);
}

/** Return all registered template definitions. */
export function getAllTemplates(): TemplateDefinition[] {
  return [...builtinTemplates];
}

/**
 * Scaffold a project from a template.
 *
 * Looks up the template by `options.templateId`, replaces `{{projectName}}`
 * and any additional `{{variable}}` placeholders in every file's content,
 * and returns the processed files along with metadata.
 *
 * @throws {Error} if the templateId is not found
 */
export function scaffold(options: ScaffoldOptions): ScaffoldResult {
  const template = templateById.get(options.templateId);
  if (!template) {
    throw new Error(`Unknown template: "${options.templateId}"`);
  }

  const vars: Record<string, string> = {
    projectName: options.projectName,
    ...options.variables,
  };

  const files = template.files.map((file) => ({
    path: file.path,
    content: replacePlaceholders(file.content, vars),
  }));

  return {
    files,
    stackId: template.stackId,
    templateId: template.id,
  };
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Replace all `{{key}}` placeholders in `text` with values from `vars`.
 * Unrecognized placeholders are left as-is.
 */
function replacePlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : match;
  });
}
