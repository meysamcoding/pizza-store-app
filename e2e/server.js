import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';

const dataDir = mkdtempSync(path.join(tmpdir(), 'forno-e2e-'));
const { app, close } = createApp({ dataDir });
const server = app.listen(4173, '127.0.0.1');
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(() => {
      close();
      rmSync(dataDir, { recursive: true, force: true });
      process.exit(0);
    });
    server.closeAllConnections();
  });
}
