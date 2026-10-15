import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve(process.cwd(), 'dist/client/wrangler.json');

if (fs.existsSync(configPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (Array.isArray(data.kv_namespaces)) {
      data.kv_namespaces = data.kv_namespaces.filter((kv) => kv.binding !== 'SESSION');
      if (data.kv_namespaces.length === 0) {
        delete data.kv_namespaces;
      }
    }

    if (data.previews && Array.isArray(data.previews.kv_namespaces)) {
      data.previews.kv_namespaces = data.previews.kv_namespaces.filter((kv) => kv.binding !== 'SESSION');
      if (data.previews.kv_namespaces.length === 0) {
        delete data.previews.kv_namespaces;
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to patch dist/client/wrangler.json:', err);
  }
}
