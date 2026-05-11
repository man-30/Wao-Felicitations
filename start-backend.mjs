#!/usr/bin/env node

import { spawn } from 'child_process';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.backend
config({ path: `${__dirname}/.env.backend` });

// Start the backend server
const backend = spawn('npx', ['tsx', 'backend-express-complete.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env }
});

backend.on('error', (err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});

backend.on('exit', (code) => {
  console.log(`Backend exited with code ${code}`);
  process.exit(code);
});
