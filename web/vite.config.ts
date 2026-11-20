import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

// A screenshot of the register is only useful if it can be traced back to a
// build. Without this stamp there is no way to tell "the RPC fell over in the
// user's network" from "this bundle still ships the pre-deploy address list".
function buildStamp(): string {
  let commit = 'unknown';
  try {
    commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    /* git unavailable in some CI sandboxes */
  }
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${commit} · ${stamp}Z`;
}

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp()),
  },
  server: {
    port: 3001,
    host: true
  },
  preview: {
    port: 3001,
    host: true
  }
});