import type { TemplateDefinition } from './types.js';

/**
 * Bundled starter templates.
 *
 * Each template references a stackId from @udd/stack-registry and provides
 * minimal but functional starter files.  Placeholders use the {{variable}}
 * syntax and are replaced at scaffold time.
 */
export const builtinTemplates: readonly TemplateDefinition[] = [
  // ── Node.js / TypeScript starter ───────────────────────────
  {
    id: 'node-starter',
    name: 'Node.js Starter',
    description: 'Basic Node.js project with TypeScript',
    stackId: 'node',
    files: [
      {
        path: 'package.json',
        content: `{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
`,
      },
      {
        path: 'tsconfig.json',
        content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
`,
      },
      {
        path: 'src/index.ts',
        content: `console.log('Hello from {{projectName}}!');
`,
      },
    ],
  },

  // ── Next.js starter ────────────────────────────────────────
  {
    id: 'nextjs-starter',
    name: 'Next.js Starter',
    description: 'Next.js App Router project with TypeScript',
    stackId: 'nextjs',
    files: [
      {
        path: 'package.json',
        content: `{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.4.0"
  }
}
`,
      },
      {
        path: 'next.config.js',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
`,
      },
      {
        path: 'src/app/layout.tsx',
        content: `export const metadata = {
  title: '{{projectName}}',
  description: 'Created with @udd/scaffold',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      },
      {
        path: 'src/app/page.tsx',
        content: `export default function Home() {
  return (
    <main>
      <h1>{{projectName}}</h1>
      <p>Get started by editing <code>src/app/page.tsx</code></p>
    </main>
  );
}
`,
      },
    ],
  },

  // ── Python FastAPI starter ─────────────────────────────────
  {
    id: 'python-api',
    name: 'Python FastAPI',
    description: 'Python FastAPI project with Docker support',
    stackId: 'python',
    files: [
      {
        path: 'requirements.txt',
        content: `fastapi>=0.111.0
uvicorn[standard]>=0.29.0
`,
      },
      {
        path: 'main.py',
        content: `from fastapi import FastAPI

app = FastAPI(title="{{projectName}}")


@app.get("/")
async def root():
    return {"message": "Hello from {{projectName}}"}


@app.get("/health")
async def health():
    return {"status": "ok"}
`,
      },
      {
        path: 'Dockerfile',
        content: `FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
      },
    ],
  },

  // ── Static site starter ────────────────────────────────────
  {
    id: 'static-site',
    name: 'Static Site',
    description: 'Simple HTML/CSS/JS static website',
    stackId: 'static-site',
    files: [
      {
        path: 'index.html',
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{projectName}}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header>
      <h1>{{projectName}}</h1>
    </header>
    <main>
      <p>Welcome to {{projectName}}.</p>
    </main>
    <script src="main.js"></script>
  </body>
</html>
`,
      },
      {
        path: 'styles.css',
        content: `*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  margin-bottom: 2rem;
}
`,
      },
      {
        path: 'main.js',
        content: `document.addEventListener('DOMContentLoaded', () => {
  console.log('{{projectName}} loaded');
});
`,
      },
    ],
  },
];
