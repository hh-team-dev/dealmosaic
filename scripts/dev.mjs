#!/usr/bin/env node
/** Runs the API and the web app together with one command: `npm run dev`. */
import { spawn } from 'node:child_process';

const procs = [
  { name: 'api', cmd: 'npx', args: ['tsx', 'watch', 'apps/api/src/server.ts'], env: { PORT: '8787', NODE_ENV: 'development' } },
  { name: 'web', cmd: 'npx', args: ['vite', '--host', '0.0.0.0', '--port', '5173', '--strictPort'], cwd: 'apps/web' },
];

const children = procs.map(({ name, cmd, args, cwd, env }) => {
  const child = spawn(cmd, args, { stdio: 'inherit', cwd: cwd ?? '.', env: { ...process.env, ...(env ?? {}) }, shell: false });
  child.on('exit', (code) => console.log(`[${name}] exited with ${code}`));
  return child;
});

const shutdown = () => {
  for (const c of children) c.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
