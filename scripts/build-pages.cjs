const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
for (const name of ['index.html', 'style.css', 'game.js', 'hero-motion.js', 'skeleton-motion.js', 'enemy-motion.js']) {
  fs.copyFileSync(path.join(root, name), path.join(out, name));
}
const names = new Set();
for (const file of ['index.html', 'style.css', 'game.js', 'hero-motion.js', 'skeleton-motion.js', 'enemy-motion.js']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/assets\/([\w.-]+\.(?:png|webp|jpg|svg|ogg|mp3|wav))/g)) names.add(match[1]);
}
for (const name of names) fs.copyFileSync(path.join(root, 'assets', name), path.join(out, 'assets', name));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`GitHub Pages build: ${names.size} assets copied to dist`);
