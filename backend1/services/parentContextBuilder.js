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
          attributes: ['id', 'raw_text', 'file_url', 'created_at', 'completed_at', 'completion_photo_url', 'detected_subject']
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
    console.log(`  - plainUser.first_name=${plainUser?.first_name || 'N/A'}`);
    console.log(`  - plainUser.last_name=${plainUser?.last_name || 'N/A'}`);
    console.log(`  - plainUser.name=${plainUser?.name || 'N/A'}`);
    console.log(`  - plainUser keys=`, plainUser ? Object.keys(plainUser) : 'null');
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

// 🔥 ULTIMATE FALLBACK: If still no children, try one more direct query with all parent IDs
if (children.length === 0 && parents.length > 0) {
  console.log(`⚠️ ParentContextBuilder: Children still empty after all fallbacks, trying ultimate fallback...`);
  try {
    const parentIds = parents.map(p => p.id).filter(Boolean);
    if (parentIds.length > 0) {
      console.log(`  Querying students for parent_ids:`, parentIds);
      const ultimateStudents = await Student.findAll({
        where: { parent_id: { [Op.in]: parentIds } },
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
            attributes: ['id', 'raw_text', 'file_url', 'created_at', 'completed_at', 'completion_photo_url', 'detected_subject']
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
      
      if (ultimateStudents.length > 0) {
        console.log(`  ✅ Ultimate fallback found ${ultimateStudents.length} students!`);
        children = ultimateStudents.map(s => s.get({ plain: true }));
        // Also update parents array
        parents.forEach(p => {
          if (!p.student || p.student.length === 0) {
            p.student = children.filter(c => c.parent_id === p.id);
          }
        });
        console.log(`  ✅ Updated children array with ${children.length} total children`);
      } else {
        console.log(`  ⚠️ Ultimate fallback found 0 students for parent_ids:`, parentIds);
      }
    }
  } catch (err) {
    console.error(`  ❌ Error in ultimate fallback:`, err.message);
  }
}

// 🔥 FINAL VERIFICATION: Log final state and ensure children are properly included
console.log(`🔍 ParentContextBuilder: FINAL STATE - children.length=${children.length}`);
if (children.length > 0) {
  children.forEach((c, idx) => {
    console.log(`  Child[${idx}]: id=${c.id}, parent_id=${c.parent_id}, name=${c.user?.first_name || 'N/A'} ${c.user?.last_name || ''}`);
  });
} else {
  console.log(`  ⚠️ WARNING: No children found for parent! This might be incorrect.`);
  if (parents.length > 0) {
    console.log(`  Parent IDs:`, parents.map(p => p.id));
    // One more attempt: check if students are in parent.student but not in children array
    parents.forEach((p, pIdx) => {
      if (p.student && Array.isArray(p.student) && p.student.length > 0) {
        console.log(`  ⚠️ Parent[${pIdx}] has ${p.student.length} students in p.student but children array is empty!`);
        console.log(`  Adding ${p.student.length} students from parent[${pIdx}].student to children array...`);
        children = children.concat(p.student);
      }
    });
    console.log(`  After final check: children.length=${children.length}`);
  }
}

// Ensure children array is properly set even if it was empty
if (children.length === 0 && parents.length > 0) {
  // Last resort: try to get from any parent's student array
  const allStudentsFromParents = parents.flatMap(p => p.student || []);
  if (allStudentsFromParents.length > 0) {
    console.log(`  ✅ Found ${allStudentsFromParents.length} students in parents[].student arrays, using them`);
    children = allStudentsFromParents;
  }
}

// 🔥 Ensure user object has all required fields, including name fields
// If plainUser exists but name fields are missing/null, try to get from req.user as fallback
if (plainUser) {
  // If name fields are missing or null, try to get from req.user (JWT token) as fallback
  if ((!plainUser.first_name && !plainUser.last_name && !plainUser.name) && req?.user) {
    console.log(`⚠️ ParentContextBuilder: User found but name fields are missing, trying req.user fallback...`);
    plainUser.first_name = req.user.first_name || plainUser.first_name || '';
    plainUser.last_name = req.user.last_name || plainUser.last_name || '';
    plainUser.name = req.user.name || req.user.first_name || plainUser.name || '';
    console.log(`  ✅ Updated user name from req.user: first_name="${plainUser.first_name}", last_name="${plainUser.last_name}", name="${plainUser.name}"`);
  }
  // Log final user object for debugging
  console.log(`🔍 ParentContextBuilder: Final plainUser:`, {
    id: plainUser.id,
    email: plainUser.email,
    first_name: plainUser.first_name,
    last_name: plainUser.last_name,
    name: plainUser.name,
    all_keys: Object.keys(plainUser)
  });
} else {
  // If plainUser is null, create a minimal user object from req.user
  console.log(`⚠️ ParentContextBuilder: plainUser is null, creating minimal user from req.user...`);
  if (req?.user) {
    plainUser = {
      id: req.user.id || userId,
      email: req.user.email || 'unknown',
      first_name: req.user.first_name || req.user.name || '',
      last_name: req.user.last_name || '',
      name: req.user.name || req.user.first_name || '',
      role_id: req.user.role_id || 2
    };
    console.log(`  ✅ Created user from req.user: first_name="${plainUser.first_name}", last_name="${plainUser.last_name}", name="${plainUser.name}"`);
  } else {
    plainUser = {
      id: userId,
      email: 'unknown',
      first_name: '',
      last_name: '',
      name: '',
      role_id: 2
    };
  }
}

const context = {
  user: plainUser,
  parent: parents,
  children: children, // 🔥 Ensure this is always an array, even if empty
  subscription: subscriptions, // Keep singular for backward compatibility with summarizeContextParent
  subscriptions: subscriptions, // Also include plural
  invoices: invoices,
  recent_billing_events_count: 0,
  last_active: new Date().toISOString(),
  preferences: { language: 'en', timezone: 'Africa/Johannesburg' }
};

// 🔥 FINAL FINAL CHECK: Log what we're returning
console.log(`🔍 ParentContextBuilder: Returning context with ${context.children?.length || 0} children`);
if (context.children && context.children.length > 0) {
  context.children.forEach((c, idx) => {
    console.log(`  Returning child[${idx}]: id=${c.id}, name=${c.user?.first_name || 'N/A'} ${c.user?.last_name || ''}`);
  });
}

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
