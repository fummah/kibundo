/**
 * Script to update all products to have billing_interval in metadata
 * Run with: node backend1/scripts/update-products-billing-interval.js
 */

const db = require("../models");
const Product = db.product;

async function updateProductsBillingInterval() {
  try {
    console.log("🔄 Starting product metadata update...");
    
    const products = await Product.findAll();
    console.log(`📦 Found ${products.length} products to check`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      let metadata = product.metadata || {};
      
      // Parse metadata if it's a string
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.warn(`⚠️ Failed to parse metadata for product ${product.id}, using empty object`);
          metadata = {};
        }
      }
      
      // Ensure metadata is an object
      if (!metadata || typeof metadata !== 'object') {
        metadata = {};
      }
      
      // Check if billing_interval exists
      if (!metadata.billing_interval) {
        // Try to infer from product name
        const nameLower = (product.name || '').toLowerCase();
        let inferredInterval = 'month'; // default
        
        if (nameLower.includes('month') || nameLower.includes('/month')) {
          inferredInterval = 'month';
        } else if (nameLower.includes('year') || nameLower.includes('/year')) {
          inferredInterval = 'year';
        } else if (nameLower.includes('week') || nameLower.includes('/week')) {
          inferredInterval = 'week';
        }
        
        metadata.billing_interval = inferredInterval;
        
        // Also set defaults for other metadata fields if missing
        if (!metadata.child_count) {
          metadata.child_count = 1;
        }
        if (metadata.sort_order === undefined) {
          metadata.sort_order = 999;
        }
        if (metadata.is_best_value === undefined) {
          metadata.is_best_value = false;
        }
        
        // Update product
        await product.update({ metadata });
        updated++;
        console.log(`✅ Updated product ${product.id} (${product.name}): billing_interval = ${inferredInterval}`);
      } else {
        skipped++;
        console.log(`⏭️  Skipped product ${product.id} (${product.name}): already has billing_interval = ${metadata.billing_interval}`);
      }
    }
    
    console.log(`\n✨ Update complete!`);
    console.log(`   Updated: ${updated} products`);
    console.log(`   Skipped: ${skipped} products`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating products:", error);
    process.exit(1);
  }
}

// Run the script
updateProductsBillingInterval();

