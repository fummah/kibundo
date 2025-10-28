/**
 * API Usage Invoice Service
 * Automatically generates and updates invoices based on student API usage
 */

const db = require("../models");
const Student = db.student;
const Parent = db.parent;
const HomeworkScan = db.homeworkScan;
const Invoice = db.invoice;

// Pricing configuration (matches uploadController.js)
const PRICING = {
  INPUT_PER_MILLION: 0.150,   // $0.150 per 1M input tokens
  OUTPUT_PER_MILLION: 0.600,  // $0.600 per 1M output tokens
  MARKUP_PERCENTAGE: 20,       // 20% markup for service fee
};

/**
 * Calculate total API usage cost for a student
 */
async function calculateStudentApiUsage(studentId, sinceDate = null) {
  try {
    const whereClause = {
      student_id: studentId
    };
    
    if (sinceDate) {
      whereClause.created_at = {
        [db.Sequelize.Op.gte]: sinceDate
      };
    }

    const scans = await HomeworkScan.findAll({
      where: whereClause,
      attributes: ['id', 'api_tokens_used', 'api_cost_usd', 'detected_subject', 'created_at']
    });

    const totalTokens = scans.reduce((sum, scan) => sum + (scan.api_tokens_used || 0), 0);
    const totalCost = scans.reduce((sum, scan) => sum + parseFloat(scan.api_cost_usd || 0), 0);
    const scanCount = scans.length;

    return {
      studentId,
      scanCount,
      totalTokens,
      totalCost,
      costWithMarkup: totalCost * (1 + PRICING.MARKUP_PERCENTAGE / 100),
      scans: scans.map(s => ({
        id: s.id,
        tokens: s.api_tokens_used,
        cost: parseFloat(s.api_cost_usd || 0),
        subject: s.detected_subject,
        date: s.created_at
      }))
    };
  } catch (error) {
    console.error(`❌ Error calculating API usage for student ${studentId}:`, error);
    throw error;
  }
}

/**
 * Get or create current month's API usage invoice for a parent
 */
async function getOrCreateMonthlyInvoice(parentId, billingMonth = null) {
  try {
    const month = billingMonth || new Date();
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    console.log(`📄 Looking for invoice for parent ${parentId}, month ${startOfMonth.toISOString().slice(0, 7)}`);

    // Check if invoice already exists for this month
    let invoice = await Invoice.findOne({
      where: {
        parent_id: parentId,
        created_at: {
          [db.Sequelize.Op.between]: [startOfMonth, endOfMonth]
        },
        status: {
          [db.Sequelize.Op.in]: ['pending', 'draft']
        }
      }
    });

    if (invoice) {
      console.log(`✅ Found existing invoice #${invoice.id}`);
      return invoice;
    }

    // Create new invoice
    console.log(`✨ Creating new invoice for parent ${parentId}`);
    invoice = await Invoice.create({
      parent_id: parentId,
      status: 'draft',
      currency: 'USD',
      total_cents: 0,
      lines: [],
      taxes: {},
      created_at: new Date()
    });

    console.log(`✅ Created invoice #${invoice.id}`);
    return invoice;
  } catch (error) {
    console.error(`❌ Error getting/creating invoice:`, error);
    throw error;
  }
}

/**
 * Update invoice with current API usage data
 */
async function updateInvoiceWithApiUsage(invoice, parentId) {
  try {
    console.log(`💰 Updating invoice #${invoice.id} with API usage`);

    // Get all students for this parent
    const students = await Student.findAll({
      where: { parent_id: parentId },
      include: [{
        model: db.user,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name']
      }]
    });

    if (students.length === 0) {
      console.log(`⚠️ No students found for parent ${parentId}`);
      return invoice;
    }

    console.log(`👥 Found ${students.length} student(s) for parent ${parentId}`);

    // Calculate API usage for each student
    const lines = [];
    let totalAmount = 0;

    for (const student of students) {
      const usage = await calculateStudentApiUsage(student.id);
      
      if (usage.scanCount > 0) {
        const studentName = student.user 
          ? `${student.user.first_name} ${student.user.last_name}`.trim()
          : `Student #${student.id}`;

        const lineItem = {
          student_id: student.id,
          student_name: studentName,
          description: `AI Homework Analysis - ${studentName}`,
          scan_count: usage.scanCount,
          tokens_used: usage.totalTokens,
          base_cost: usage.totalCost,
          markup_percentage: PRICING.MARKUP_PERCENTAGE,
          amount: usage.costWithMarkup,
          details: `${usage.scanCount} homework scans analyzed, ${usage.totalTokens.toLocaleString()} tokens used`
        };

        lines.push(lineItem);
        totalAmount += usage.costWithMarkup;

        console.log(`   💵 ${studentName}: ${usage.scanCount} scans, $${usage.costWithMarkup.toFixed(4)}`);
      }
    }

    if (lines.length === 0) {
      console.log(`⚠️ No API usage found for any students`);
      return invoice;
    }

    // Update invoice
    const totalCents = Math.round(totalAmount * 100);
    await invoice.update({
      lines: lines,
      total_cents: totalCents,
      status: totalCents > 0 ? 'pending' : 'draft'
    });

    console.log(`✅ Invoice #${invoice.id} updated: $${(totalCents / 100).toFixed(2)} (${lines.length} line items)`);

    return invoice;
  } catch (error) {
    console.error(`❌ Error updating invoice with API usage:`, error);
    throw error;
  }
}

/**
 * Generate or update API usage invoice for a parent
 * This is the main function to call
 */
async function generateApiUsageInvoice(parentId) {
  try {
    console.log(`\n📊 Generating API usage invoice for parent ${parentId}`);

    // Get or create invoice for current month
    const invoice = await getOrCreateMonthlyInvoice(parentId);

    // Update with latest API usage data
    const updatedInvoice = await updateInvoiceWithApiUsage(invoice, parentId);

    console.log(`✅ Invoice generation complete for parent ${parentId}\n`);

    return updatedInvoice;
  } catch (error) {
    console.error(`❌ Error generating API usage invoice for parent ${parentId}:`, error);
    throw error;
  }
}

/**
 * Generate invoices for all parents with API usage
 */
async function generateAllApiUsageInvoices() {
  try {
    console.log(`\n🔄 Generating API usage invoices for all parents...`);

    // Get all parents who have students with homework scans
    const parents = await Parent.findAll({
      include: [{
        model: Student,
        as: 'student',
        required: true,
        include: [{
          model: HomeworkScan,
          as: 'homeworkscan',
          required: true,
          where: {
            api_cost_usd: {
              [db.Sequelize.Op.gt]: 0
            }
          }
        }]
      }]
    });

    console.log(`👥 Found ${parents.length} parent(s) with API usage`);

    const results = [];
    for (const parent of parents) {
      try {
        const invoice = await generateApiUsageInvoice(parent.id);
        results.push({
          parentId: parent.id,
          invoiceId: invoice.id,
          status: 'success',
          amount: invoice.total_cents / 100
        });
      } catch (error) {
        console.error(`❌ Failed to generate invoice for parent ${parent.id}:`, error);
        results.push({
          parentId: parent.id,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`✅ Generated ${results.filter(r => r.status === 'success').length} invoice(s)\n`);

    return results;
  } catch (error) {
    console.error(`❌ Error generating all API usage invoices:`, error);
    throw error;
  }
}

module.exports = {
  calculateStudentApiUsage,
  generateApiUsageInvoice,
  generateAllApiUsageInvoices,
  getOrCreateMonthlyInvoice,
  updateInvoiceWithApiUsage,
  PRICING
};

