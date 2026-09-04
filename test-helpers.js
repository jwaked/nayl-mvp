import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from './config.js';
import { createNaylApp } from './backend-app.js';

export async function startTestApp(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nayl-test-'));
  const config = loadConfig({
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '8787',
    APP_BASE_URL: 'http://127.0.0.1',
    DATA_FILE: path.join(directory, 'nayl.json'),
    DEFAULT_MARKET: 'AE',
    DEFAULT_CITY: 'Dubai',
    DEMO_BUSINESS_ID: 'biz-baytcare',
    ENABLE_PARTNER_DEMO: 'true',
    CONNECTOR_TIMEOUT_MS: '1000',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX: '1000'
  });
  const app = await createNaylApp(config);
  await new Promise((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(0, '127.0.0.1', resolve);
  });
  const address = app.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await new Promise((resolve) => app.server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  });

  return { ...app, baseUrl };
}

export async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  return { response, payload };
}
