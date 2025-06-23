const fs   = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ */
/* 0.  ENV FLAGS                                                      */
/* ------------------------------------------------------------------ */
const DEBUG = /^(true|1)$/i.test(process.env.DEBUG_BUILD || '');

function log(...args)      { console.log(...args); }
function dbg(...args)      { if (DEBUG) console.log('[debug]', ...args); }
function yell(label, obj)  { if (DEBUG) console.log(`\n===== ${label} =====\n`,
                                                    JSON.stringify(obj, null, 2), '\n'); }

/* ------------------------------------------------------------------ */
/* 1.  STATIC CONFIG PATHS                                            */
/* ------------------------------------------------------------------ */
const STAGING_DIR       = 'staging';
const PUBLIC_DIR        = 'public';
const PROJECTS_CONFIG   = path.join(STAGING_DIR, 'projects.json');
const BASE_SCHEMA       = path.join(STAGING_DIR, 'base-schema.json');
const THEMES_SOURCE     = path.join(STAGING_DIR, 'themes.json');
const DEST_SCHEMA       = path.join(PUBLIC_DIR, 'data', 'schema.json');
const DEST_THEMES       = path.join(PUBLIC_DIR, 'data', 'themes.json');
const DEST_CONTENTS_DIR = path.join(PUBLIC_DIR, 'data', 'contents');

/* ------------------------------------------------------------------ */
/* 2.  UTILS                                                          */
/* ------------------------------------------------------------------ */
function deepMerge(target, ...sources) {
  for (const src of sources) {
    if (!src) continue;
    for (const k in src) {
      if (!Object.hasOwn(src, k)) continue;
      const sv = src[k], tv = target[k];
      target[k] = (sv && typeof sv === 'object' && !Array.isArray(sv))
        ? deepMerge(tv && typeof tv === 'object' ? tv : {}, sv)
        : sv;
    }
  }
  return target;
}

function loadJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  dbg('loaded', file);
  return data;
}

/* ------------------------------------------------------------------ */
/* 3.  LEGACY SCHEMA BUILDER                                          */
/* ------------------------------------------------------------------ */
function buildLegacySchema(base, type, inst) {
  log('Constructing schema via LEGACY recipe…');
  const m = {
    thesis:     'renderer-thesis',
    arguments:  'renderer-points-list',
    concepts:   'renderer-definitions-list',
    conclusion: 'renderer-conclusion-list',
    references: 'renderer-list-detail',
    examples:   'renderer-list-detail',
    qa:         'renderer-qa'
  };

  if (!type.cardConfiguration) throw new Error(
    'legacy: typeSchema is missing cardConfiguration.');

  const schema = {
    pageStructure: base.pageStructure,
    cssClassMap:   base.cssClassMap,
    projectName:   inst.projectName,
    defaultTheme:  inst.defaultTheme,
    themes:        inst.themes,
    entryLabel:    type.entryLabel,
    defaultSections: type.defaultSections,
    rendererConfig: type.rendererConfig || {}
  };

  /* Section labels ------------------------------------------ */
  schema.sectionLabels = {};
  type.cardConfiguration.forEach(c => schema.sectionLabels[c.section] = c.label);

  /* Section renderers --------------------------------------- */
  if (!type.defaultSections) throw new Error(
    'legacy: typeSchema is missing defaultSections.');
  schema.sectionRenderers = {};
  type.defaultSections.forEach(sec => {
    if (!m[sec]) throw new Error(`legacy: no renderer map for “${sec}”`);
    schema.sectionRenderers[sec] = m[sec];
  });

  dbg('legacy schema built', schema);
  return schema;
}

/* ------------------------------------------------------------------ */
/* 4.  THEME FILTER                                                   */
/* ------------------------------------------------------------------ */
function tweakThemes(all, inst) {
  const ids = inst.themes || [];
  const def = inst.defaultTheme || 'cosmic';

  const result = JSON.parse(JSON.stringify(all));
  result.themes = Object.fromEntries(ids.map(id => [id, all.themes[id]]).filter(([,v]) => v));
  result.meta.themeList = result.meta.themeList.filter(t => ids.includes(t.id));
  result.meta.themeCount = result.meta.themeList.length;
  result.meta.defaultTheme = def;

  dbg('themes after filtering', result.meta);
  return result;
}

/* ------------------------------------------------------------------ */
/* 5.  CONTENT COPYING                                                */
/* ------------------------------------------------------------------ */
function copyContent({ count, instanceId }) {
  fs.rmSync(DEST_CONTENTS_DIR, { recursive: true, force: true });
  fs.mkdirSync(DEST_CONTENTS_DIR, { recursive: true });

  const moved = [];
  for (let i = 1; i <= count; i++) {
    const src = path.join(STAGING_DIR, `content${i}-${instanceId}.json`);
    const dst = path.join(DEST_CONTENTS_DIR, `content${i}.json`);
    if (!fs.existsSync(src)) throw new Error(`Missing content file: ${src}`);
    fs.copyFileSync(src, dst);
    moved.push(`content${i}.json`);
  }
  dbg('content files copied', moved);
  return moved;
}

/* ------------------------------------------------------------------ */
/* 6.  MAIN BUILD ---------------------------------------------------- */
/* ------------------------------------------------------------------ */
(function main () {
  const key = process.env.APP_CONFIG;
  if (!key) { console.error('ERROR: APP_CONFIG not set'); process.exit(1); }

  log(`\n=== BUILD START for ${key} ===`);
  if (DEBUG) log('(DEBUG_BUILD mode ON)');

  try {
    /* Load configs ----------------------------- */
    const projects      = loadJson(PROJECTS_CONFIG);
    const project       = projects[key];
    if (!project) throw new Error(`No entry for “${key}” in projects.json`);
    log(`Project type → ${project.projectType}`);

    const baseSchema    = loadJson(BASE_SCHEMA);
    const typeSchema    = loadJson(path.join(STAGING_DIR, `schema-type-${project.projectType}.json`));
    const instanceSchema= loadJson(path.join(STAGING_DIR, project.schemaInstanceFile));

    yell('instanceSchema', instanceSchema);   // big dump only if DEBUG

    /* Build final schema ----------------------- */
    const finalSchema = project.buildMode === 'legacy'
      ? buildLegacySchema(baseSchema, typeSchema, instanceSchema)
      : deepMerge({}, baseSchema, typeSchema, instanceSchema);

    /* Themes ----------------------------------- */
    const themes = tweakThemes(loadJson(THEMES_SOURCE), instanceSchema);



    /* Write outputs ---------------------------- */
    fs.writeFileSync(DEST_SCHEMA, JSON.stringify(finalSchema, null, 2));
    fs.writeFileSync(DEST_THEMES, JSON.stringify(themes,      null, 2));
    copyContent(project.content);
    project.projectType === 'theorists' && require('./scripts/flatten-influentialThinkers');


    log('\n--- BUILD SUCCESSFUL ---');
    log(`Active project → ${finalSchema.projectName}\n`);
  } catch (err) {
    console.error('\n--- BUILD FAILED ---');
    console.error(err.message);
    if (DEBUG) console.error(err.stack);
    process.exit(1);
  }
})();
