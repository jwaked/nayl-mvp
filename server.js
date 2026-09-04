import { loadConfig } from './config.js';
import { createNaylApp } from './backend-app.js';

const config = loadConfig();
const { server } = await createNaylApp(config);

server.listen(config.port, config.host, () => {
  console.log(`NAYL MVP running at ${config.appBaseUrl}`);
  console.log('Consumer, Business, and Admin portals are served from the same application.');
});

function shutdown(signal) {
  console.log(`${signal} received; closing NAYL MVP.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
