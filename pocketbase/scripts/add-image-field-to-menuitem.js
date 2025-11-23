/**
 * Script to check if image field exists in menuItem collection
 * and add it if it doesn't exist
 * 
 * Run with: node pocketbase/scripts/add-image-field-to-menuitem.js
 */

require('dotenv').config();
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function checkAndAddImageField() {
  const pb = new PocketBase(PB_URL);
  
  try {
    console.log('🔐 Authenticating as admin...');
    console.log('📡 Connecting to:', PB_URL);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    console.log('📋 Checking menuItem collection schema...');
    
    // Get collection info
    const collection = await pb.collections.getOne('menuItem');
    
    console.log('📊 Current fields in menuItem collection:');
    collection.schema.forEach(field => {
      console.log(`   - ${field.name} (${field.type})`);
    });
    
    // Check if image field exists
    const hasImage = collection.schema.some(field => field.name === 'image');
    
    console.log(`\n🔍 Field check:`);
    console.log(`   - image: ${hasImage ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (!hasImage) {
      console.log('\n⚠️  image field does not exist in the collection!');
      console.log('🔧 Adding image field...');
      
      try {
        // Prepare the new schema with the image field
        // Copy existing schema fields as-is (PocketBase SDK handles the format)
        const existingSchema = collection.schema.map(field => {
          // Return the field as-is, PocketBase will handle it
          return {
            ...field,
            // Ensure options is properly structured
            options: field.options || undefined,
          };
        });
        
        // Add the new image field
        existingSchema.push({
          name: 'image',
          type: 'file',
          required: false,
          options: {
            maxSelect: 1,
            maxSize: 5242880, // 5MB
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          },
        });
        
        console.log('📝 Updating collection schema with image field...');
        console.log(`   Adding field: image (file, maxSize: 5MB)`);
        
        // Update the collection with the new schema
        // Preserve all other collection properties
        await pb.collections.update(collection.id, {
          name: collection.name,
          type: collection.type,
          schema: existingSchema,
          listRule: collection.listRule || '',
          viewRule: collection.viewRule || '',
          createRule: collection.createRule || '',
          updateRule: collection.updateRule || '',
          deleteRule: collection.deleteRule || '',
        });
        
        console.log('✅ Successfully added image field to menuItem collection!');
        console.log('\n📋 Updated schema:');
        const updatedCollection = await pb.collections.getOne('menuItem');
        updatedCollection.schema.forEach(field => {
          console.log(`   - ${field.name} (${field.type})`);
        });
      } catch (addError) {
        console.error('❌ Failed to add image field:', addError.message);
        if (addError.response?.data) {
          console.error('Details:', JSON.stringify(addError.response.data, null, 2));
        }
        console.log('\n📝 To add it manually:');
        console.log('   1. Go to PocketBase Admin UI');
        console.log('   2. Navigate to Collections → menuItem → Fields');
        console.log('   3. Click "Add new field"');
        console.log('   4. Set:');
        console.log('      - Name: image');
        console.log('      - Type: File');
        console.log('      - Required: No');
        console.log('      - Max select: 1');
        console.log('      - Max size: 5242880 (5MB)');
        console.log('      - MIME types: image/jpeg, image/png, image/webp, image/gif');
        console.log('   5. Save the field');
        throw addError;
      }
    } else {
      console.log('\n✅ image field already exists!');
      
      // Verify the field configuration
      const imageField = collection.schema.find(field => field.name === 'image');
      if (imageField) {
        console.log('\n📋 Image field configuration:');
        console.log(`   - Type: ${imageField.type}`);
        console.log(`   - Required: ${imageField.required || false}`);
        if (imageField.options) {
          console.log(`   - Max select: ${imageField.options.maxSelect || 'N/A'}`);
          console.log(`   - Max size: ${imageField.options.maxSize || 'N/A'} bytes`);
          console.log(`   - MIME types: ${imageField.options.mimeTypes ? imageField.options.mimeTypes.join(', ') : 'N/A'}`);
        }
      }
    }
    
    // Check a sample item to see if any have images
    console.log('\n📦 Checking sample items for images...');
    try {
      const sampleItems = await pb.collection('menuItem').getList(1, 5);
      if (sampleItems.items.length > 0) {
        console.log(`   Found ${sampleItems.items.length} sample items:`);
        sampleItems.items.forEach(item => {
          console.log(`   - ${item.name}: ${item.image ? `Has image (${item.image})` : 'No image'}`);
        });
      } else {
        console.log('   No items found in collection');
      }
    } catch (error) {
      console.log('   Could not fetch sample items');
    }
    
    console.log('\n✅ Script completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.status === 404) {
      console.error('   Collection "menuItem" not found. Make sure the collection exists.');
    }
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

checkAndAddImageField();

