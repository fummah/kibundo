/**
 * Script to update product ID 1 with specific values
 * Run with: node backend1/scripts/update-product-1.js
 */

const db = require("../models");
const Product = db.product;

async function updateProduct1() {
  try {
    console.log("🔄 Updating product ID 1...");
    
    const product = await Product.findByPk(1);
    
    if (!product) {
      console.error("❌ Product with ID 1 not found");
      process.exit(1);
    }
    
    console.log("📦 Current product:", {
      id: product.id,
      name: product.name,
      price: product.price,
      active: product.active,
      metadata: product.metadata,
    });
    
    // Get current metadata or create new
    let metadata = product.metadata || {};
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        metadata = {};
      }
    }
    if (!metadata || typeof metadata !== 'object') {
      metadata = {};
    }
    
    // Update metadata fields
    metadata.billing_interval = 'month';
    metadata.child_count = 2;
    metadata.is_best_value = false;
    metadata.sort_order = metadata.sort_order || 999;
    
    // Update product
    await product.update({
      name: 'Premium',
      description: 'only beter',
      price: 800.00,
      active: true,
      trial_period_days: 10,
      metadata: metadata,
    });
    
    console.log("✅ Product updated successfully!");
    console.log("📋 Updated values:", {
      id: product.id,
      name: 'Premium',
      description: 'only beter',
      price: 800.00,
      active: true,
      trial_period_days: 10,
      metadata: {
        billing_interval: 'month',
        child_count: 2,
        is_best_value: false,
      },
    });
    
    // Verify the update
    const updatedProduct = await Product.findByPk(1);
    console.log("\n🔍 Verification - Product after update:", {
      id: updatedProduct.id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      price: updatedProduct.price,
      active: updatedProduct.active,
      trial_period_days: updatedProduct.trial_period_days,
      metadata: updatedProduct.metadata,
    });
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating product:", error);
    process.exit(1);
  }
}

// Run the script
updateProduct1();

