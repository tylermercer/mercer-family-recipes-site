import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve(process.cwd(), 'dist/client/wrangler.json');

if (fs.existsSync(configPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (Array.isArray(data.kv_namespaces)) {
      data.kv_namespaces = data.kv_namespaces.map((kv) =>
        kv.binding === 'SESSION' && !kv.id ? { ...kv, id: 'SESSION_KV' } : kv,
      );
    }

    if (data.previews && Array.isArray(data.previews.kv_namespaces)) {
      data.previews.kv_namespaces = data.previews.kv_namespaces.map((kv) =>
        kv.binding === 'SESSION' && !kv.id ? { ...kv, id: 'SESSION_KV' } : kv,
      );
    }

    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to patch dist/client/wrangler.json:', err);
  }
}
