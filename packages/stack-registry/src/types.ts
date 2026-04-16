export interface StackDefinition {
  /** Unique identifier, e.g. 'node', 'python', 'go' */
  id: string;
  /** Human-readable name, e.g. 'Node.js', 'Python', 'Go' */
  name: string;
  /** Runtime executable, e.g. 'node', 'python3', 'go' */
  runtime: string;
  /** Recognized file extensions, e.g. ['.ts', '.js', '.mjs'] */
  extensions: string[];
  /** Files that signal this stack, e.g. ['package.json', 'index.ts'] */
  entryPatterns: string[];
  /** Default build command */
  buildCommand?: string;
  /** Default start command */
  startCommand?: string;
  /** Default test command */
  testCommand?: string;
  /** Default container image */
  dockerImage?: string;
  /** Stack category */
  category:
    | 'backend'
    | 'frontend'
    | 'fullstack'
    | 'automation'
    | 'mobile'
    | 'static';
}
