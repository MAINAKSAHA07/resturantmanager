/**
 * Script to add address fields to customer collection
 * Run with: node pocketbase/scripts/add-customer-address-fields.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '8104760831';

async function addAddressFields() {
  const pb = new PocketBase(PB_URL);
  
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated as admin');

    // Get customer collection
    const customerCollection = await pb.collections.getOne('customer');
    console.log('📦 Found customer collection');

    // Check existing fields
    const existingFields = customerCollection.schema.map(f => f.name);
    console.log('Existing fields:', existingFields.join(', '));

    const fieldsToAdd = [
      { name: 'address', type: 'text', required: false },
      { name: 'city', type: 'text', required: false },
      { name: 'state', type: 'text', required: false },
      { name: 'pincode', type: 'text', required: false },
    ];

    // Add all missing fields at once
    const fieldsToAddNow = fieldsToAdd.filter(f => !existingFields.includes(f.name));
    
    if (fieldsToAddNow.length > 0) {
      console.log(`\n➕ Adding ${fieldsToAddNow.length} field(s): ${fieldsToAddNow.map(f => f.name).join(', ')}`);
      
      const updatedSchema = [
        ...customerCollection.schema,
        ...fieldsToAddNow.map(field => ({
          name: field.name,
          type: field.type,
          required: field.required,
        })),
      ];
      
      await pb.collections.update(customerCollection.id, {
        schema: updatedSchema,
      });
      
      console.log(`✅ Added ${fieldsToAddNow.length} field(s) successfully`);
    } else {
      console.log('\n✅ All address fields already exist');
    }
    
    // Refresh to show final state
    const final = await pb.collections.getOne('customer');
    console.log('\n📋 Final customer collection fields:');
    final.schema.forEach(f => {
      console.log(`  - ${f.name} (${f.type}${f.required ? ', required' : ''})`);
    });

    console.log('\n✅ Customer collection updated successfully!');
    console.log('Final fields:', customerCollection.schema.map(f => f.name).join(', '));
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

addAddressFields();

