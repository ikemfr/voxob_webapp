// Web fonts for the Shorts, from Fontsource on npm (all SIL OFL 1.1). Fetched once into shorts/.fonts (not committed).
// css(name, { file, family }) → @font-face rules pointing at the local files, ready for page.addStyleTag.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = path.join(process.cwd(), 'shorts', '.fonts');
export const FONTS = { 'dela-gothic-one': '5.3.0', 'shippori-mincho-b1': '5.3.0', 'dotgothic16': '5.3.1', 'noto-color-emoji': '5.3.2' };

function ensure(name) {
  const dir = path.join(DIR, name);
  if (!fs.existsSync(path.join(dir, 'package', 'files'))) {
    fs.mkdirSync(dir, { recursive: true });
    const tgz = execFileSync('npm', ['pack', '-q', `@fontsource/${name}@${FONTS[name]}`, '--pack-destination', dir], { encoding: 'utf8' }).trim().split('\n').pop();
    execFileSync('tar', ['xzf', path.join(dir, tgz), '-C', dir]); fs.rmSync(path.join(dir, tgz));
  }
  return path.join(dir, 'package');
}
export function css(name, { file = 'index.css', family } = {}) {
  const pkg = ensure(name);
  let s = fs.readFileSync(path.join(pkg, file), 'utf8').replace(/url\(\.\/files\//g, `url(file://${pkg}/files/`);
  if (family) s = s.replace(/font-family:\s*'[^']*'/g, `font-family: '${family}'`);
  return s;
}
