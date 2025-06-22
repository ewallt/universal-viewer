const fs = require('fs');
const path = require('path');

// --- Configuration ---
const STAGING_DIR = 'staging';
const PUBLIC_DIR = 'public';
const PROJECTS_CONFIG = path.join(STAGING_DIR, 'projects.json');
const BASE_SCHEMA = path.join(STAGING_DIR, 'base-schema.json');
const THEMES_SOURCE = path.join(STAGING_DIR, 'themes.json');
const DEST_SCHEMA = path.join(PUBLIC_DIR, 'data', 'schema.json');
const DEST_THEMES = path.join(PUBLIC_DIR, 'data', 'themes.json');
const DEST_CONTENTS_DIR = path.join(PUBLIC_DIR, 'data', 'contents');

// --- Helper Functions ---

function deepMerge(target, ...sources) {
    for (const source of sources) {
        if (!source) continue;
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                const sourceVal = source[key];
                const targetVal = target[key];
                if (sourceVal instanceof Object && !Array.isArray(sourceVal)) {
                    target[key] = targetVal instanceof Object ? targetVal : {};
                    deepMerge(target[key], sourceVal);
                } else {
                    target[key] = sourceVal;
                }
            }
        }
    }
    return target;
}

function loadJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Required file not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildLegacySchema(baseSchema, typeSchema, instanceSchema) {
    console.log('Constructing schema using "legacy" build recipe...');
    const legacySchema = {};
    const legacyRenderersMap = {
        thesis: "renderer-thesis",
        arguments: "renderer-points-list",
        concepts: "renderer-definitions-list",
        conclusion: "renderer-conclusion-list",
        references: "renderer-list-detail",
        examples: "renderer-list-detail",
        qa: "renderer-qa"
    };
    legacySchema.pageStructure = baseSchema.pageStructure;
    legacySchema.cssClassMap = baseSchema.cssClassMap;
    legacySchema.projectName = instanceSchema.projectName;
    legacySchema.defaultTheme = instanceSchema.defaultTheme;
    legacySchema.themes = instanceSchema.themes;
    legacySchema.entryLabel = typeSchema.entryLabel;
    legacySchema.defaultSections = typeSchema.defaultSections;
    if (typeSchema.rendererConfig) {
        legacySchema.rendererConfig = typeSchema.rendererConfig;
    }
    if (!typeSchema.cardConfiguration) throw new Error("Missing ingredient: 'cardConfiguration' in type schema to build 'sectionLabels'.");
    legacySchema.sectionLabels = {};
    typeSchema.cardConfiguration.forEach(card => {
        legacySchema.sectionLabels[card.section] = card.label;
    });
    if (!typeSchema.defaultSections) throw new Error("Missing ingredient: 'defaultSections' in type schema to build 'sectionRenderers'.");
    legacySchema.sectionRenderers = {};
    typeSchema.defaultSections.forEach(section => {
        const renderer = legacyRenderersMap[section];
        if (!renderer) throw new Error(`Missing knowledge: No legacy renderer for section '${section}' in build script map.`);
        legacySchema.sectionRenderers[section] = renderer;
    });
    return legacySchema;
}

function filterAndConfigureThemes(allThemesData, instanceSchema) {
    const projectThemeIds = instanceSchema.themes || [];
    const defaultTheme = instanceSchema.defaultTheme || 'cosmic';
    const filteredData = JSON.parse(JSON.stringify(allThemesData));
    const availableThemes = {};
    projectThemeIds.forEach(id => {
        if (filteredData.themes[id]) { availableThemes[id] = filteredData.themes[id]; }
    });
    filteredData.themes = availableThemes;
    filteredData.meta.themeList = filteredData.meta.themeList.filter(theme => projectThemeIds.includes(theme.id));
    filteredData.meta.themeCount = filteredData.meta.themeList.length;
    filteredData.meta.defaultTheme = defaultTheme;
    return filteredData;
}

function copyContentFiles(contentConfig) {
    fs.rmSync(DEST_CONTENTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(DEST_CONTENTS_DIR, { recursive: true });
    const copiedFiles = [];
    for (let i = 1; i <= contentConfig.count; i++) {
        const sourceFileName = `content${i}-${contentConfig.instanceId}.json`;
        const destFileName = `content${i}.json`;
        const sourcePath = path.join(STAGING_DIR, sourceFileName);
        const destPath = path.join(DEST_CONTENTS_DIR, destFileName);
        if (!fs.existsSync(sourcePath)) { throw new Error(`Expected content file not found: ${sourcePath}`); }
        fs.copyFileSync(sourcePath, destPath);
        copiedFiles.push(destFileName);
    }
    return copiedFiles;
}

// --- Main Logic ---
function main() {
    const buildKey = process.env.APP_CONFIG;
    if (!buildKey) {
        console.error('ERROR: APP_CONFIG environment variable not set.');
        process.exit(1);
    }
    console.log(`--- Starting build for project key: ${buildKey} ---`);

    try {
        const projects = loadJsonFile(PROJECTS_CONFIG);
        const projectConfig = projects[buildKey];
        if (!projectConfig) { throw new Error(`Build key "${buildKey}" not found in ${PROJECTS_CONFIG}`); }
        console.log(`Found configuration for project type: ${projectConfig.projectType}`);

        const baseSchema = loadJsonFile(BASE_SCHEMA);
        const typeSchemaPath = path.join(STAGING_DIR, `schema-type-${projectConfig.projectType}.json`);
        const typeSchema = loadJsonFile(typeSchemaPath);
        const instanceSchemaPath = path.join(STAGING_DIR, projectConfig.schemaInstanceFile);
        const instanceSchema = loadJsonFile(instanceSchemaPath);
        
        let finalSchema;

        // --- VERIFICATION STEP ---
        console.log(`Verifying buildMode from projects.json... Found: "${projectConfig.buildMode}"`);

        if (projectConfig.buildMode === 'legacy') {
            finalSchema = buildLegacySchema(baseSchema, typeSchema, instanceSchema);
        } else {
            console.log('Merging schemas using "modern" build recipe...');
            finalSchema = deepMerge({}, baseSchema, typeSchema, instanceSchema);
        }

        const allThemesData = loadJsonFile(THEMES_SOURCE);
        const filteredThemesData = filterAndConfigureThemes(allThemesData, instanceSchema);

        console.log(`Writing final schema to ${DEST_SCHEMA}`);
        fs.writeFileSync(DEST_SCHEMA, JSON.stringify(finalSchema, null, 2));
        
        console.log(`Writing final themes to ${DEST_THEMES}`);
        fs.writeFileSync(DEST_THEMES, JSON.stringify(filteredThemesData, null, 2));
        
        const copiedFiles = copyContentFiles(projectConfig.content);
        
        console.log('\n--- Build successful! ---');
        console.log(`Project '${finalSchema.projectName}' is now active in the 'public' directory.`);
        
    } catch (error) {
        console.error('\n--- BUILD FAILED ---');
        console.error(error.message);
        process.exit(1);
    }
}

main();