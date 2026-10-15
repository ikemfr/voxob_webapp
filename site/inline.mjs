// Copies the files in site/ into index.html between their /*<site:name>*/ … /*</site:name>*/ markers,
// so the app stays a single self-contained page. usage: node site/inline.mjs   (from the repo root)
import fs from 'node:fs';
let html = fs.readFileSync('index.html', 'utf8'), n = 0;
html = html.replace(/\/\*<site:([\w.-]+)>\*\/\n[\s\S]*?\/\*<\/site:\1>\*\//g, (m, name) => {
  const body = fs.readFileSync(`site/${name}`, 'utf8').replace(/\n+$/, '');
  if (body.includes(`/*</site:${name}>*/`)) throw new Error(`${name} contains its own end marker`);
  n++; return `/*<site:${name}>*/\n${body}\n/*</site:${name}>*/`;
});
fs.writeFileSync('index.html', html);
console.log(`inlined ${n} files`);
