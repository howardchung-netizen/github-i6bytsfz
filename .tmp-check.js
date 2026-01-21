const fs = require('fs');
const s = fs.readFileSync('app/components/DeveloperView.tsx','utf8');
const start = s.indexOf('return (');
const end = s.lastIndexOf(');');
const sub = s.slice(start, end);
let depth = 0;
let inStr = null;
let esc = false;
for (let i = 0; i < sub.length; i++) {
  const ch = sub[i];
  if (inStr) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === inStr) { inStr = null; }
    continue;
  }
  if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
  if (ch === '{') depth++;
  if (ch === '}') depth--;
  if (depth < 0) { console.log('negative at', i); break; }
}
console.log('brace depth', depth);
