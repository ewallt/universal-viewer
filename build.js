const fs = require('fs');
const path = require('path');

// --- Configuration ---
const STAGING_DIR = 'staging';
const PUBLIC_DIR = 'public';
const BASE_SCHEMA = path.join(STAGING_DIR, 'base-schema.json');
const THEMES_SOURCE = path.join(PUBLIC_DIR, 'data', 'themes.json');
const DEST_SCHEMA = path.join(PUBLIC_DIR, 'data', 'schema.json');
const DEST_THEMES = path.join(PUBLIC_DIR, 'data', 'themes.json');
const DEST_CONTENTS_DIR = path.join(PUBLIC_DIR, 'data', 'contents');

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

// --- Clear and copy content files ---
function copyContentFiles(project) {
   // Clear existing content files
   const existingFiles = fs.readdirSync(DEST_CONTENTS_DIR);
   existingFiles.forEach(file => {
       fs.unlinkSync(path.join(DEST_CONTENTS_DIR, file));
   });
   console.log(`Cleared ${existingFiles.length} existing content files`);
   
   const contentFiles = [];
   
   // Find all content files for this project
   const stagingFiles = fs.readdirSync(STAGING_DIR);
   const projectContentFiles = stagingFiles.filter(file => 
       file.startsWith(`content`) && file.endsWith(`-${project}.json`)
   );
   
   console.log(`Found ${projectContentFiles.length} content files for project: ${project}`);
   
   projectContentFiles.forEach(sourceFile => {
       // Extract content number from filename (e.g., content1-byg.json -> content1.json)
       const contentMatch = sourceFile.match(/^(content\d+)-.*\.json$/);
       if (contentMatch) {
           const destFileName = `${contentMatch[1]}.json`;
           const sourcePath = path.join(STAGING_DIR, sourceFile);
           const destPath = path.join(DEST_CONTENTS_DIR, destFileName);
           
           console.log(`Copying ${sourcePath} -> ${destPath}`);
           fs.copyFileSync(sourcePath, destPath);
           contentFiles.push(destFileName);
       }
   });
   
   return contentFiles;
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
       // 3. Define source paths based on the project
       const projectSchema = path.join(STAGING_DIR, `schema-${project}.json`);
       
       // 4. Load and merge schemas
       console.log(`Loading base schema from ${BASE_SCHEMA}`);
       const baseSchemaData = JSON.parse(fs.readFileSync(BASE_SCHEMA, 'utf8'));
       
       console.log(`Loading project schema from ${projectSchema}`);
       const projectSchemaData = JSON.parse(fs.readFileSync(projectSchema, 'utf8'));
       
       console.log('Merging schemas...');
       const mergedSchema = mergeSchemas(baseSchemaData, projectSchemaData);
       
       // 5. Handle themes.json with project-specific default
       console.log(`Loading themes from ${THEMES_SOURCE}`);
       const themesData = JSON.parse(fs.readFileSync(THEMES_SOURCE, 'utf8'));
       
       // Update themes.json with project's default theme
       if (projectSchemaData.defaultTheme) {
           console.log(`Setting default theme to: ${projectSchemaData.defaultTheme}`);
           themesData.meta.defaultTheme = projectSchemaData.defaultTheme;
       }
       
       // 6. Write schema and themes
       console.log(`Writing merged schema to ${DEST_SCHEMA}`);
       fs.writeFileSync(DEST_SCHEMA, JSON.stringify(mergedSchema, null, 2));
       
       console.log(`Writing themes with project default to ${DEST_THEMES}`);
       fs.writeFileSync(DEST_THEMES, JSON.stringify(themesData, null, 2));
       
       // 7. Clear and copy all content files dynamically
       const copiedFiles = copyContentFiles(project);
       
       console.log('\n--- Build successful! ---');
       console.log(`Project '${project}' is now active in the 'public' directory.`);
       console.log('Generated files:');
       console.log(`- Project: ${mergedSchema.projectName}`);
       console.log(`- Default theme: ${themesData.meta.defaultTheme}`);
       console.log(`- Sections: ${mergedSchema.defaultSections.join(', ')}`);
       console.log(`- Content files: ${copiedFiles.join(', ')}`);
       
   } catch (error) {
       console.error('\n--- BUILD FAILED ---');
       console.error(error);
       process.exit(1);
   }
}

// Run the main function
main();