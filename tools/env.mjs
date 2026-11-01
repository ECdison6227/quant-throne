import { readFile, readdir } from 'node:fs/promises';

// Entry points alone read local credentials; the reusable HTTP client never reads files.
export async function readLocalEnv() {
  const directory=new URL('../secrets/',import.meta.url);
  const names=(await readdir(directory)).filter(name=>name.endsWith('.env.local')).sort();
  const text=(await Promise.all(names.map(name=>readFile(new URL(name,directory),'utf8')))).join('\n');
  return Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
  }));
}
