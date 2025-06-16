const fs = require('fs');
const path = require('path');

// --- Configuration ---
const STAGING_DIR = 'staging';
const PUBLIC_DIR = 'public';
const BASE_SCHEMA = path.join(STAGING_DIR, 'base-schema.json');
const DEST_SCHEMA = path.join(PUBLIC_DIR, 'data', 'schema.json');
const DEST_CONTENT1 = path.join(PUBLIC_DIR, 'data', 'contents', 'content1.json');
const DEST_CONTENT2 = path.join(PUBLIC_DIR, 'data', 'contents', 'content2.json');

// --- Helper Function ---
function mergeSchemas(baseSchema, projectSchema) {
    const merged = JSON.parse(JSON.stringify(baseSchema)); // Deep clone base
    
    // Merge top-level properties
    Object.keys(projectSchema).forEach(key => {
        if (typeof projectSchema[key] === 'object' && !Array.isArray(projectSchema[key])) {
            // Deep merge objects (like sectionLabels, sectionRenderers)
            merged[key] = { ...merged[key], ...projectSchema[key] };
        } else {
            // Direct override for primitives and arrays
            merged[key] = projectSchema[key];
        }
    });
    
    return merged;
}

// --- Main Logic ---
function main() {
    // 1. Read the environment variable
    const project = process.env.APP_CONFIG;
    console.log(`--- Starting build for project: ${project} ---`);
    
    // 2. Validate the input
    if (!project || !['thinkers', 'byg'].includes(project)) {
        console.error('ERROR: APP_CONFIG environment variable not set or invalid.');
        console.error('Set it to "thinkers" or "byg".');
        process.exit(1);
    }
    
    try {
        // 3. Define source paths based on the project (using YOUR naming convention)
        const projectSchema = path.join(STAGING_DIR, `schema-${project}.json`);
        const sourceContent1 = path.join(STAGING_DIR, `content1-${project}.json`);
        const sourceContent2 = path.join(STAGING_DIR, `content2-${project}.json`);
        
        // 4. Load and merge schemas
        console.log(`Loading base schema from ${BASE_SCHEMA}`);
        const baseSchemaData = JSON.parse(fs.readFileSync(BASE_SCHEMA, 'utf8'));
        
        console.log(`Loading project schema from ${projectSchema}`);
        const projectSchemaData = JSON.parse(fs.readFileSync(projectSchema, 'utf8'));
        
        console.log('Merging schemas...');
        const mergedSchema = mergeSchemas(baseSchemaData, projectSchemaData);
        
        // 5. Ensure destination directories exist
        fs.mkdirSync(path.join(PUBLIC_DIR, 'data', 'contents'), { recursive: true });
        
        // 6. Write merged schema
        console.log(`Writing merged schema to ${DEST_SCHEMA}`);
        fs.writeFileSync(DEST_SCHEMA, JSON.stringify(mergedSchema, null, 2));
        
        // 7. Copy content files
        console.log(`Copying ${sourceContent1} -> ${DEST_CONTENT1}`);
        fs.copyFileSync(sourceContent1, DEST_CONTENT1);
        
        console.log(`Copying ${sourceContent2} -> ${DEST_CONTENT2}`);
        fs.copyFileSync(sourceContent2, DEST_CONTENT2);
        
        console.log('\n--- Build successful! ---');
        console.log(`Project '${project}' is now active in the 'public' directory.`);
        console.log('Generated schema includes:');
        console.log(`- Project: ${mergedSchema.projectName}`);
        console.log(`- Sections: ${mergedSchema.defaultSections.join(', ')}`);
        
    } catch (error) {
        console.error('\n--- BUILD FAILED ---');
        console.error(error);
        process.exit(1);
    }
}

// Run the main function
main();