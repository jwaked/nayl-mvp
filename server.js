import { loadConfig } from './backend-config.js';
import { createNaylApp } from './backend-app.js';

const config = loadConfig();
const { server, store } = await createNaylApp(config);

server.listen(config.port, config.host, () => {
  console.log(`NAYL running at ${config.appBaseUrl}`);
  console.log(`Consumer: ${config.appBaseUrl}/`);
  console.log(`Business: ${config.appBaseUrl}/business`);
  console.log(`Admin: ${config.appBaseUrl}/admin`);
  console.log(`Storage: ${store.mode}`);
  if (config.sessionSecretWasGenerated) {
    console.warn(`SESSION_SECRET was generated using ${config.sessionSecretSource}. Render Blueprint deployments generate and retain this value automatically.`);
  }
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await store.close().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
