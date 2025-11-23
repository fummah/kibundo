// services/contextBuilder.js
const db = require('../models');
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
const HomeworkScan = db.homeworkScan;

async function childBuildContext(req) {
  try {
    const userId = req.user?.id || req.body?.user?.id;
    if (!userId) return {};

    // Fetch user and related entities
    const user = await db.user.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: { exclude: [] },
          required: true
        },
        {
          model: Student,
          as: 'student',
          include: [        
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'class_name']
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
            },
            {
              model: Parent,
              as: 'parent',
              attributes: { exclude: ['password'] },
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: { exclude: ['password'] }
                }
              ]
            },
            {
              model: HomeworkScan,
              as: 'homeworkscan',
              attributes: ['id', 'raw_text', 'file_url', 'created_at']
            }
          ]
        }
      ]
    });
    
    let plainUser = user ? user.get({ plain: true }) : { id: userId };
    console.log("🎯 Raw user data from database:", JSON.stringify(plainUser, null, 2));
    
    // 🔥 HANDLE PARENT USER USING CHILDAGENT: If user is a parent (role_id: 2) and has no student record,
    // find their first child and build context for that child instead
    if (plainUser.role?.id === 2 || plainUser.role_id === 2) {
      if (!plainUser.student || plainUser.student.length === 0) {
        console.log("⚠️ Parent user using ChildAgent - finding first child...");
        try {
          // Find the parent record
          const parentRecord = await Parent.findOne({
            where: { user_id: userId },
            include: [
              {
                model: Student,
                as: 'student',
                include: [
                  {
                    model: User,
                    as: 'user',
                    attributes: { exclude: ['password'] },
                    include: [
                      {
                        model: Role,
                        as: 'role',
                        attributes: { exclude: [] }
                      }
                    ]
                  },
                  {
                    model: Class,
                    as: 'class',
                    attributes: ['id', 'class_name']
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
                  },
                  {
                    model: Parent,
                    as: 'parent',
                    attributes: { exclude: ['password'] },
                    include: [
                      {
                        model: User,
                        as: 'user',
                        attributes: { exclude: ['password'] }
                      }
                    ]
                  },
                  {
                    model: HomeworkScan,
                    as: 'homeworkscan',
                    attributes: ['id', 'raw_text', 'file_url', 'created_at']
                  }
                ],
                limit: 1 // Get first child only
              }
            ]
          });
          
          if (parentRecord && parentRecord.student && parentRecord.student.length > 0) {
            const firstChild = parentRecord.student[0];
            const childUser = firstChild.user;
            console.log("✅ Found child for parent:", childUser?.first_name, childUser?.last_name);
            
            // Rebuild plainUser as if we're the child
            plainUser = {
              id: childUser.id,
              first_name: childUser.first_name,
              last_name: childUser.last_name,
              email: childUser.email,
              role: childUser.role,
              role_id: childUser.role?.id || 1,
              student: [firstChild.get({ plain: true })]
            };
            console.log("✅ Rebuilt context for child user:", plainUser.first_name);
          } else {
            console.log("⚠️ Parent has no children - cannot build child context");
          }
        } catch (err) {
          console.error("❌ Error finding child for parent:", err);
        }
      }
    }

// Extract interests (focus topics) from student data
const interests = (plainUser.student || []).flatMap(s => {
  if (s.interests && Array.isArray(s.interests)) {
    return s.interests;
  }
  return [];
}) || [];

// Extract parent information
let parents = (plainUser.student || []).map(s => s.parent).filter(Boolean) || [];

// 🔥 FALLBACK: If no parent found via student relationship, try to fetch directly
if (parents.length === 0 && plainUser.student && plainUser.student.length > 0) {
  console.log("⚠️ No parent found via student relationship, trying direct query...");
  try {
    const studentRecord = plainUser.student[0];
    if (studentRecord && studentRecord.parent_id) {
      const directParent = await Parent.findByPk(studentRecord.parent_id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: User,
            as: 'user',
            attributes: { exclude: ['password'] }
          }
        ]
      });
      if (directParent) {
        const plainParent = directParent.get({ plain: true });
        parents = [plainParent];
        console.log("✅ Found parent via direct query:", plainParent.user?.first_name, plainParent.user?.last_name);
      }
    }
  } catch (err) {
    console.error("❌ Error fetching parent directly:", err);
  }
}

const context = {
  user: plainUser,
  parent: parents,
  class_or_grade: (plainUser.student || []).map(s => s.class) || [],
  homework_scans:(plainUser.student || []).flatMap(s => s.homeworkscan || []) || [],
  subjects: (plainUser.student || []).flatMap(s => (s.subject || []).map(sub => sub.subject)) || [],
  interests: interests, // Focus topics/interests for personalization
  last_active: new Date().toISOString(),
  preferences: { language: 'en', timezone: 'Africa/Johannesburg' }
};

console.log("🎯 Final context being returned - parent count:", parents.length);
console.log("🎯 Parent details:", JSON.stringify(parents.map(p => ({
  id: p.id,
  first_name: p.user?.first_name,
  last_name: p.user?.last_name,
  email: p.user?.email
})), null, 2));
return context;
  } catch (error) {
    console.error('Error building context:', error);
    return {
      user: [],
  parent:  [],
  class_or_grade:  [],
  subjects: [],
  interests: [],
      last_active: new Date().toISOString(),
      preferences: { language: 'en', timezone: 'Africa/Johannesburg' },
      error: 'Failed to build context'
    };
  }
}

module.exports = { childBuildContext };
