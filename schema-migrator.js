// schema-migrator.js - Tool to convert existing schemas to universal card system
const fs = require('fs');
const path = require('path');

// Mapping from old renderers to new card types
const RENDERER_TO_CARD_TYPE = {
  'renderer-thesis': 'normal',
  'renderer-points-list': 'normal', 
  'renderer-definitions-list': 'normal',
  'renderer-conclusion-list': 'normal',
  'renderer-qa': 'flippable',
  'renderer-hierarchical': 'flippable',
  'renderer-list-detail': 'flippable'
};

function migrateSchema(schemaPath) {
  console.log(`\n--- Migrating schema: ${path.basename(schemaPath)} ---`);
  
  try {
    // Read existing schema
    const schemaData = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    console.log(`Project: ${schemaData.projectName}`);
    
    // Build card configuration from existing sectionRenderers
    const cardConfiguration = [];
    
    if (schemaData.sectionRenderers && schemaData.sectionLabels) {
      Object.entries(schemaData.sectionRenderers).forEach(([section, renderer]) => {
        const cardType = RENDERER_TO_CARD_TYPE[renderer];
        if (cardType) {
          cardConfiguration.push({
            type: cardType,
            section: section,
            label: schemaData.sectionLabels[section] || section
          });
          console.log(`  ${section}: ${renderer} → ${cardType}`);
        } else {
          console.log(`  WARNING: Unknown renderer ${renderer} for section ${section}`);
        }
      });
    }
    
    // Create migrated schema
    const migratedSchema = {
      ...schemaData,
      cardConfiguration,
      // Update all sectionRenderers to use universal renderer
      sectionRenderers: Object.fromEntries(
        Object.keys(schemaData.sectionRenderers || {}).map(section => [section, 'renderer-universal'])
      )
    };
    
    // Write backup and migrated version
    const backupPath = schemaPath.replace('.json', '-backup.json');
    const migratedPath = schemaPath.replace('.json', '-migrated.json');
    
    fs.writeFileSync(backupPath, JSON.stringify(schemaData, null, 2));
    fs.writeFileSync(migratedPath, JSON.stringify(migratedSchema, null, 2));
    
    console.log(`✓ Backup saved: ${path.basename(backupPath)}`);
    console.log(`✓ Migrated saved: ${path.basename(migratedPath)}`);
    console.log(`Card configuration: ${cardConfiguration.length} sections`);
    
    return migratedSchema;
    
  } catch (error) {
    console.error(`Error migrating ${schemaPath}:`, error.message);
    return null;
  }
}

function migrateAllSchemas() {
  const stagingDir = 'staging';
  const schemaFiles = fs.readdirSync(stagingDir)
    .filter(file => file.startsWith('schema-') && file.endsWith('.json') && 
                   !file.includes('backup') && !file.includes('migrated') && 
                   !file.includes('test'))  // Skip our test schema
    .map(file => path.join(stagingDir, file));
  
  console.log('=== Universal Card System Migration ===');
  console.log(`Found ${schemaFiles.length} schema files to migrate`);
  
  const results = schemaFiles.map(migrateSchema).filter(Boolean);
  
  console.log(`\n=== Migration Summary ===`);
  console.log(`Successfully migrated: ${results.length}/${schemaFiles.length} schemas`);
  console.log(`\nTo test a migration:`);
  console.log(`1. Copy staging/schema-PROJECT-migrated.json over staging/schema-PROJECT.json`);
  console.log(`2. Run build: $env:APP_CONFIG="PROJECT"; npm run build`);
  console.log(`3. Test functionality in viewer`);
  console.log(`4. If issues, restore from staging/schema-PROJECT-backup.json`);
  
  console.log(`\nGenerated files:`);
  results.forEach((schema, index) => {
    const originalFile = schemaFiles[index];
    const projectName = path.basename(originalFile).replace('schema-', '').replace('.json', '');
    console.log(`- ${projectName}: ${schema.cardConfiguration.length} cards configured`);
  });
}

// Run migration if called directly
if (require.main === module) {
  migrateAllSchemas();
}

module.exports = { migrateSchema, migrateAllSchemas };