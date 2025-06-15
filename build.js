const fs = require('fs');
const path = require('path');

// --- Configuration ---
const STAGING_DIR = 'staging';
const PUBLIC_DIR = 'public';
const DEST_SCHEMA = path.join(PUBLIC_DIR, 'data', 'schema.json');
const DEST_CONTENT1 = path.join(PUBLIC_DIR, 'data', 'contents', 'content1.json');
const DEST_CONTENT2 = path.join(PUBLIC_DIR, 'data', 'contents', 'content2.json');

// --- Main Logic ---
function main() {
    // 1. Read the environment variable
    const project = process.env.APP_CONFIG;
    console.log(`--- Starting build for project: ${project} ---`);

    // 2. Validate the input
    if (!project || !['thinkers', 'byg'].includes(project)) {
        console.error('ERROR: APP_CONFIG environment variable not set or invalid.');
        console.error('Set it to "thinkers" or "byg".');
        process.exit(1); // Exit with an error code
    }

    try {
        // 3. Define source paths based on the project
        const sourceSchema = path.join(STAGING_DIR, `schema-${project}.json`);
        const sourceContent1 = path.join(STAGING_DIR, `content1-${project}.json`);
        const sourceContent2 = path.join(STAGING_DIR, `content2-${project}.json`);

        // 4. Ensure destination directories exist
        fs.mkdirSync(path.join(PUBLIC_DIR, 'data', 'contents'), { recursive: true });

        // 5. Copy the files
        console.log(`Copying ${sourceSchema} -> ${DEST_SCHEMA}`);
        fs.copyFileSync(sourceSchema, DEST_SCHEMA);

        console.log(`Copying ${sourceContent1} -> ${DEST_CONTENT1}`);
        fs.copyFileSync(sourceContent1, DEST_CONTENT1);
        
        console.log(`Copying ${sourceContent2} -> ${DEST_CONTENT2}`);
        fs.copyFileSync(sourceContent2, DEST_CONTENT2);

        console.log('\n--- Build successful! ---');
        console.log(`Project '${project}' is now active in the 'public' directory.`);

    } catch (error) {
        console.error('\n--- BUILD FAILED ---');
        console.error(error);
        process.exit(1);
    }
}

// Run the main function
main();