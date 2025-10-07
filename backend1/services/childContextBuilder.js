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
              include:[        
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'class_name'] // adjust based on your class model
        },
        {
          model: StudentSubjects,
          as: 'subject',
          attributes: ['id'],
          include: [
            {
              model: Subject,
              as: 'subject',   // ✅ match alias in StudentSubjects.js
              attributes: ['id', 'subject_name']
            }
          ]
        },
          {
          model: Parent,
          as: 'parent',
          attributes: { exclude: ['password'] }, // adjust fields
            include: [
            {
              model: User,
              as: 'user',   // ✅ match alias in StudentSubjects.js
              attributes: { exclude: ['password'] }
            },
            {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        },
          {
          model: HomeworkScan,
          as: 'homeworkscan',
          attributes: ['id', 'raw_text', 'file_url', 'created_at']
        },
        {
          model: Invoice,
          as: 'invoice'
        }
          ]
        }  
      ]
    }    
      
      ]
    
    });
 const plainUser = user ? user.get({ plain: true }) : { id: userId };
 //console.log(JSON.stringify(plainUser, null, 2));

const context = {
  user: plainUser,
  parent: (plainUser.student || []).map(s => s.parent).filter(Boolean) || [],
  class_or_grade: (plainUser.student || []).map(s => s.class) || [],
  homework_scans:(plainUser.student || []).flatMap(s => s.homeworkscan || []) || [],
  subjects: (plainUser.student || []).flatMap(s => (s.subject || []).map(sub => sub.subject)) || [],
  last_active: new Date().toISOString(),
  preferences: { language: 'en', timezone: 'Africa/Johannesburg' }
};


    return context;
  } catch (error) {
    console.error('Error building context:', error);
    return {
      user: [],
  parent:  [],
  class_or_grade:  [],
  subjects: [],
      last_active: new Date().toISOString(),
      preferences: { language: 'en', timezone: 'Africa/Johannesburg' },
      error: 'Failed to build context'
    };
  }
}

module.exports = { childBuildContext };
