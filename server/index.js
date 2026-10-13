import { createApp } from './app.js';

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const { app, close } = createApp();
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Pizza store server listening on http://0.0.0.0:${port}`);
});

let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(() => {
      close();
      process.exit(0);
    });
    setTimeout(() => {
      server.closeAllConnections();
    }, 5000).unref();
  });
}
