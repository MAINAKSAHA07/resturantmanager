const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://localhost:8090');

async function addImageFieldToMenuItem() {
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword('mainaksaha0807@gmail.com', '8104760831');

    // Get the menuItem collection
    const collection = await pb.collections.getOne('menuItem');
    
    // Check if image field already exists
    const hasImageField = collection.schema.some(field => field.name === 'image');
    
    if (hasImageField) {
      console.log('✅ Image field already exists in menuItem collection');
      return;
    }

    console.log('Adding image field to menuItem collection...');

    // Add image field to schema
    const updatedSchema = [
      ...collection.schema,
      {
        name: 'image',
        type: 'file',
        required: false,
        options: {
          maxSelect: 1,
          maxSize: 5242880, // 5MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        },
      },
    ];

    // Update the collection
    await pb.collections.update(collection.id, {
      schema: updatedSchema,
    });

    console.log('✅ Successfully added image field to menuItem collection');
  } catch (error) {
    console.error('❌ Error adding image field:', error);
    throw error;
  }
}

addImageFieldToMenuItem()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

