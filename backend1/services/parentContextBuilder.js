// services/contextBuilder.js
const db = require('../models');
const { Op } = require('sequelize');
const Role = db.role;
const Student = db.student;
const Class = db.class;
const User = db.user;
const StudentSubjects = db.student_subjects;
const Subject = db.subject;
const Subscription = db.subscription;
const Product = db.product;
const Invoice = db.invoice;
const Parent = db.parent;
const HomeworkScan = db.homeworkscan;

async function buildContext(req) {
  try {
    // Try multiple possible field names for user ID in JWT token
    const userId = req.user?.id || req.user?.user_id || req.user?.userId || req.body?.user?.id;
    console.log(`🔍 ParentContextBuilder: Starting buildContext`);
    console.log(`  - userId=${userId}`);
    console.log(`  - req.user=`, req.user ? JSON.stringify(req.user, null, 2) : 'null/undefined');
    console.log(`  - req.body?.user=`, req.body?.user ? JSON.stringify(req.body.user, null, 2) : 'null/undefined');
    
    if (!userId) {
      console.log(`❌ ParentContextBuilder: No userId found, returning empty context`);
      return {
        user: null,
        parent: [],
        children: [],
        subscription: [],
        subscriptions: [],
        invoices: [],
        recent_billing_events_count: 0,
        last_active: new Date().toISOString(),
        preferences: { language: 'en', timezone: 'Africa/Johannesburg' },
        error: 'No userId provided'
      };
    }

    // Fetch user and related entities
    console.log(`🔍 ParentContextBuilder: Fetching user with id=${userId}`);
    const user = await db.user.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: { exclude: [] },
          required: false // Make optional to avoid query failures
        },
        {
          model: Parent,
          as: 'parent',
          required: false, // Make optional - user might not have parent record yet
          include: [
            {
              model: Student,
              as: 'student',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: { exclude: ['password'] }
                },
                {
                  model: Class,
                  as: 'class',
                  attributes: ['id', 'class_name']
                },
                  {
          model: HomeworkScan,
          as: 'homeworkscan',
          attributes: ['id', 'raw_text', 'file_url', 'created_at']
        },
                {
                  model: StudentSubjects,
                  as: 'subject',
                  attributes: ['id'],
                  include: [
                    {
                      model: Subject,
                      as: 'subject',
                      attributes: ['id', 'subject_name']
                    }
                  ]
                }
                
              ]
            },
             {
          model: Subscription,
          as: 'subscriptions',
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        },
        {
          model: Invoice,
          as: 'invoices'
        }
          ]
        }
       
      ]
    });

    console.log(`🔍 ParentContextBuilder: User query completed, user found=${!!user}`);
    
    // Flatten and normalize context
    let plainUser = user ? user.get({ plain: true }) : null;
    
    // 🔥 FALLBACK: If user not found in initial query, try direct lookup
    if (!plainUser && userId) {
      console.log(`⚠️ ParentContextBuilder: User not found in initial query, trying direct lookup...`);
      try {
        const directUser = await db.user.findByPk(userId, {
          attributes: { exclude: ['password'] }
        });
        if (directUser) {
          plainUser = directUser.get({ plain: true });
          console.log(`  ✅ Found user directly: id=${plainUser.id}, email=${plainUser.email}`);
        } else {
          console.log(`  ❌ User not found in database for id=${userId}`);
          // Still create a minimal user object so context isn't completely empty
          plainUser = { 
            id: userId, 
            email: req.user?.email || 'unknown',
            first_name: req.user?.first_name || '',
            last_name: req.user?.last_name || '',
            role_id: req.user?.role_id || 2
          };
        }
      } catch (err) {
        console.error(`  ❌ Error fetching user directly:`, err.message);
        // Create minimal user object from req.user
        plainUser = { 
          id: userId, 
          email: req.user?.email || 'unknown',
          first_name: req.user?.first_name || '',
          last_name: req.user?.last_name || '',
          role_id: req.user?.role_id || 2
        };
      }
    }
    
    // If still no user, return error context
    if (!plainUser) {
      console.log(`❌ ParentContextBuilder: Could not retrieve user for userId=${userId}`);
      return {
        user: { id: userId, email: req.user?.email || 'unknown' },
        parent: [],
        children: [],
        subscription: [],
        subscriptions: [],
        invoices: [],
        recent_billing_events_count: 0,
        last_active: new Date().toISOString(),
        preferences: { language: 'en', timezone: 'Africa/Johannesburg' },
        error: 'User not found'
      };
    }
    
    console.log(`🔍 ParentContextBuilder: plainUser extracted`);
    console.log(`  - plainUser.id=${plainUser?.id}`);
    console.log(`  - plainUser.email=${plainUser?.email || 'N/A'}`);
    console.log(`  - plainUser.parent type=${Array.isArray(plainUser?.parent) ? 'array' : typeof plainUser?.parent}`);
    console.log(`  - plainUser.parent value=`, plainUser?.parent);
    console.log(`  - plainUser.parent length=${Array.isArray(plainUser?.parent) ? plainUser.parent.length : 'N/A'}`);
    
    let parents = Array.isArray(plainUser.parent) ? plainUser.parent : (plainUser.parent ? [plainUser.parent] : []);
    console.log(`🔍 ParentContextBuilder: parents array length=${parents.length}`);
    
    // 🔥 FALLBACK: If no parent record found, try to find it directly or create a virtual one
    if (parents.length === 0) {
      console.log(`⚠️ ParentContextBuilder: WARNING - User ${userId} has no parent records in query result!`);
      console.log(`  Attempting to find parent record directly...`);
      
      try {
        const directParent = await Parent.findOne({
          where: { user_id: userId }
        });
        
        if (directParent) {
          console.log(`  ✅ Found parent record directly: id=${directParent.id}`);
          // Fetch students for this parent
          const directStudents = await Student.findAll({
            where: { parent_id: directParent.id },
            include: [
              {
                model: User,
                as: 'user',
                attributes: { exclude: ['password'] }
              },
              {
                model: Class,
                as: 'class',
                attributes: ['id', 'class_name']
              }
            ]
          });
          
          console.log(`  ✅ Found ${directStudents.length} students for parent id=${directParent.id}`);
          
          // Create a virtual parent object with students
          parents = [{
            id: directParent.id,
            user_id: directParent.user_id,
            student: directStudents.map(s => s.get({ plain: true })),
            subscriptions: [],
            invoices: []
          }];
        } else {
          console.log(`  ❌ No parent record found in database for user_id=${userId}`);
        }
      } catch (err) {
        console.error(`  ❌ Error fetching parent directly:`, err.message);
      }
    }
    
    // Flatten children (students) from all parents
    // First, check if students exist in DB when parent has none in query result
    for (let i = 0; i < parents.length; i++) {
      const p = parents[i];
      const students = p.student || [];
      console.log(`  - Parent id=${p.id} has ${students.length} students`);
      if (students.length === 0 && p.id) {
        // 🔥 FIX: Actually fetch students with all includes if they exist
        console.log(`  ⚠️ Parent id=${p.id} has no students in query result. Fetching from database directly...`);
        try {
          const directStudents = await Student.findAll({
            where: { parent_id: p.id },
            include: [
              {
                model: User,
                as: 'user',
                attributes: { exclude: ['password'] }
              },
              {
                model: Class,
                as: 'class',
                attributes: ['id', 'class_name']
              },
              {
                model: HomeworkScan,
                as: 'homeworkscan',
                attributes: ['id', 'raw_text', 'file_url', 'created_at']
              },
              {
                model: StudentSubjects,
                as: 'subject',
                attributes: ['id'],
                include: [
                  {
                    model: Subject,
                    as: 'subject',
                    attributes: ['id', 'subject_name']
                  }
                ]
              }
            ]
          });
          console.log(`  ✅ Direct query found ${directStudents.length} students with parent_id=${p.id}`);
          if (directStudents.length > 0) {
            console.log(`  ⚠️ ISSUE FOUND: Students exist in DB but weren't included in the query!`);
            console.log(`    Fetching them now with all includes...`);
            // Update the parent object with the fetched students
            parents[i].student = directStudents.map(s => s.get({ plain: true }));
            directStudents.forEach(s => {
              const plain = s.get({ plain: true });
              console.log(`    - Student id=${plain.id}, user_id=${plain.user_id}, name=${plain.user?.first_name || 'N/A'} ${plain.user?.last_name || ''}`);
            });
          }
        } catch (err) {
          console.log(`  ❌ Error fetching students directly:`, err.message);
        }
      }
    }
    
    // Now flatten children normally
    let children = parents.flatMap(p => {
      const students = p.student || [];
      return students;
    });
    
    // 🔥 AGGRESSIVE FALLBACK: Always check for students if we have a parent but no children
    if (children.length === 0 && parents.length > 0 && parents[0].id) {
      console.log(`⚠️ ParentContextBuilder: Parent found (id=${parents[0].id}) but no children. Running aggressive fallback...`);
      try {
        const aggressiveStudents = await Student.findAll({
          where: { parent_id: parents[0].id },
          include: [
            {
              model: User,
              as: 'user',
              attributes: { exclude: ['password'] }
            },
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'class_name']
            },
            {
              model: HomeworkScan,
              as: 'homeworkscan',
              attributes: ['id', 'raw_text', 'file_url', 'created_at']
            },
            {
              model: StudentSubjects,
              as: 'subject',
              attributes: ['id'],
              include: [
                {
                  model: Subject,
                  as: 'subject',
                  attributes: ['id', 'subject_name']
                }
              ]
            }
          ]
        });
        
        if (aggressiveStudents.length > 0) {
          console.log(`  ✅ Aggressive fallback found ${aggressiveStudents.length} students!`);
          children = aggressiveStudents.map(s => s.get({ plain: true }));
          parents[0].student = children;
          aggressiveStudents.forEach(s => {
            const plain = s.get({ plain: true });
            console.log(`    - Student id=${plain.id}, user_id=${plain.user_id}, name=${plain.user?.first_name || 'N/A'} ${plain.user?.last_name || ''}`);
          });
        }
      } catch (err) {
        console.error(`  ❌ Error in aggressive fallback:`, err.message);
      }
    }
    
    // 🔥 FINAL FALLBACK: If still no children found, try querying by user_id
    if (children.length === 0 && userId) {
      console.log(`⚠️ ParentContextBuilder: No children found after all queries, trying final fallback...`);
      try {
        // First, find the parent record by user_id
        const fallbackParent = await Parent.findOne({
          where: { user_id: userId }
        });
        
        if (fallbackParent) {
          console.log(`  ✅ Found parent record in fallback: id=${fallbackParent.id}`);
          // Query students directly
          const fallbackStudents = await Student.findAll({
            where: { parent_id: fallbackParent.id },
            include: [
              {
                model: User,
                as: 'user',
                attributes: { exclude: ['password'] }
              },
              {
                model: Class,
                as: 'class',
                attributes: ['id', 'class_name']
              }
            ]
          });
          
          if (fallbackStudents.length > 0) {
            console.log(`  ✅ Found ${fallbackStudents.length} students in fallback query!`);
            children = fallbackStudents.map(s => s.get({ plain: true }));
            
            // Also update parents array if it was empty
            if (parents.length === 0) {
              parents = [{
                id: fallbackParent.id,
                user_id: fallbackParent.user_id,
                student: children,
                subscriptions: [],
                invoices: []
              }];
            } else {
              // Add students to existing parent
              parents[0].student = children;
            }
          }
        }
      } catch (err) {
        console.error(`  ❌ Error in final fallback query:`, err.message);
      }
    }
// Flatten subscriptions from all parents
let subscriptions = parents.flatMap(p => p.subscriptions || []);
// Flatten invoices from all parents
let invoices = parents.flatMap(p => p.invoices || []);

// 🔥 FALLBACK: If no subscriptions/invoices found, try fetching directly
if (subscriptions.length === 0 && parents.length > 0) {
  try {
    const parentIds = parents.map(p => p.id).filter(Boolean);
    if (parentIds.length > 0) {
      const directSubscriptions = await Subscription.findAll({
        where: { parent_id: { [Op.in]: parentIds } },
        include: [{ model: Product, as: 'product' }]
      });
      subscriptions = directSubscriptions.map(s => s.get({ plain: true }));
      console.log(`  ✅ Found ${subscriptions.length} subscriptions directly`);
    }
  } catch (err) {
    console.error(`  ❌ Error fetching subscriptions directly:`, err.message);
  }
}

if (invoices.length === 0 && parents.length > 0) {
  try {
    const parentIds = parents.map(p => p.id).filter(Boolean);
    if (parentIds.length > 0) {
      const directInvoices = await Invoice.findAll({
        where: { parent_id: { [Op.in]: parentIds } }
      });
      invoices = directInvoices.map(i => i.get({ plain: true }));
      console.log(`  ✅ Found ${invoices.length} invoices directly`);
    }
  } catch (err) {
    console.error(`  ❌ Error fetching invoices directly:`, err.message);
  }
}

// 🔥 DEBUG: Log what we found
console.log(`🔍 ParentContextBuilder: userId=${userId}, parents found=${parents.length}`);
parents.forEach((p, idx) => {
  console.log(`  Parent[${idx}]: id=${p.id}, students=${p.student?.length || 0}`);
  if (p.student && p.student.length > 0) {
    p.student.forEach((s, sIdx) => {
      console.log(`    Student[${sIdx}]: id=${s.id}, user_id=${s.user_id}, name=${s.user?.first_name || 'N/A'} ${s.user?.last_name || ''}`);
    });
  }
});
console.log(`🔍 ParentContextBuilder: Total children=${children.length}`);

// 🔥 FINAL FINAL CHECK: Re-flatten children from parents one more time (in case they were added after initial flatten)
if (children.length === 0 && parents.length > 0) {
  console.log(`⚠️ ParentContextBuilder: Children still empty, re-flattening from parents...`);
  children = parents.flatMap(p => {
    const students = p.student || [];
    console.log(`  Re-checking parent id=${p.id}: ${students.length} students`);
    return students;
  });
  console.log(`  After re-flatten: ${children.length} children`);
}

const context = {
  user: plainUser,
  parent: parents,
  children: children,
  subscription: subscriptions, // Keep singular for backward compatibility with summarizeContextParent
  subscriptions: subscriptions, // Also include plural
  invoices: invoices,
  recent_billing_events_count: 0,
  last_active: new Date().toISOString(),
  preferences: { language: 'en', timezone: 'Africa/Johannesburg' }
};

    return context;
  } catch (error) {
    console.error('Error building context:', error);
    return {
      user: null,
      parent: {},
      children: [],
      subscription: [],
      invoices: [],
      recent_billing_events_count: 0,
      last_active: new Date().toISOString(),
      preferences: { language: 'en', timezone: 'Africa/Johannesburg' },
      error: 'Failed to build context'
    };
  }
}

module.exports = { buildContext };
