import fs from 'fs';
import path from 'path';

function search(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name.includes('backup')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      search(full);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      const text = fs.readFileSync(full, 'utf8');
      const lines = text.split('\n');
      lines.forEach((l, i) => {
        if (l.includes('assistantId') || (l.includes('isTA') && l.includes('timetable'))) {
          console.log(full + ':' + (i + 1) + ': ' + l.trim());
        }
      });
    }
  }
}

search('src');

