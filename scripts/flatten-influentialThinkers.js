/* scripts/flatten-influentialThinkers.js
   Flattens staging/content?-influentialThinkers.json → public/data/contents/content?.json
*/
const fs   = require('fs');
const path = require('path');

const STAGING_DIR = path.join(__dirname, '..', 'staging');
const OUTPUT_DIR  = path.join(__dirname, '..', 'public', 'data', 'contents');
const SCHEMA_PATH = path.join(__dirname, '..', 'staging', 'schema-type-theorists.json');

const ensureDir = d => !fs.existsSync(d) && fs.mkdirSync(d, { recursive: true });
const loadJSON  = p => JSON.parse(fs.readFileSync(p, 'utf-8'));
const saveJSON  = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2));

ensureDir(OUTPUT_DIR);

const schema   = loadJSON(SCHEMA_PATH);
const sections = schema.cardConfiguration.map(c => c.section);
const srcFiles = fs.readdirSync(STAGING_DIR).filter(f => /-influentialThinkers\.json$/i.test(f));

srcFiles.forEach(file => {
  const src = path.join(STAGING_DIR, file);
  const num = file.match(/^content(\d+)-/i)?.[1] || 'X';
  const dst = path.join(OUTPUT_DIR, `content${num}.json`);

  const e   = loadJSON(src);
  const out = { ...e };

  sections.forEach(sec => {
    const d = e[sec];
    if (!d || Array.isArray(d)) return;

    const items = [];

    if (sec === 'thesis') {
      if (d.central_thesis) items.push({ type: 'central_thesis', text: d.central_thesis });
      if (d.key_statement)  items.push({ type: 'key_statement',   text: d.key_statement });
      if (d.foundational_principles?.points) {
        items.push({ type: 'foundational_principles', points: d.foundational_principles.points });
      }
    }

    if (['arguments', 'examples'].includes(sec) && d.points) {
      d.points.forEach(p =>
        items.push({ type: 'explanation', title: p.title, explanation: p.explanation })
      );
    }

    if (sec === 'concepts' && d.points) {
      d.points.forEach(p =>
        items.push({ type: 'definition', title: p.title, definition: p.definition })
      );
    }

    if (sec === 'conclusion' && d.points?.length) {
      const p = d.points[0];
      items.push({ type: 'conclusion_box', title: p.title, content: p.content });
    }

    if (sec === 'qa' && d.points) {
      d.points.forEach((p, i) =>
        items.push({ id: p.id || `q${i + 1}`, question: p.question, answer: p.answer })
      );
    }

    out[sec] = items;
  });

  saveJSON(dst, out);
  console.log(`✔  Flattened ${file} → public/data/contents/content${num}.json`);
});

console.log('\nAll Influential Thinkers files flattened.\n');
