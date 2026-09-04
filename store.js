import fs from 'node:fs/promises';
import path from 'node:path';
import { createSeedData } from './seed.js';

export class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await this.#writeFile(createSeedData());
    }
    this.initialized = true;
  }

  async read() {
    await this.init();
    const raw = await fs.readFile(this.filePath, 'utf8');
    return JSON.parse(raw);
  }

  async snapshot() {
    return structuredClone(await this.read());
  }

  async transact(mutator) {
    const run = async () => {
      const data = await this.read();
      const result = await mutator(data);
      data.updatedAt = new Date().toISOString();
      await this.#writeFile(data);
      return structuredClone(result);
    };

    const pending = this.queue.then(run, run);
    this.queue = pending.catch(() => undefined);
    return pending;
  }

  async reset() {
    await this.#writeFile(createSeedData());
    this.initialized = true;
  }

  async #writeFile(data) {
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const payload = `${JSON.stringify(data, null, 2)}\n`;
    await fs.writeFile(tempPath, payload, 'utf8');
    await fs.rename(tempPath, this.filePath);
  }
}
