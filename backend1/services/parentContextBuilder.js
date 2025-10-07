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

async function buildContext(req) {
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
          model: Parent,
          as: 'parent',
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
          as: 'subscription',
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        },
        {
          model: Invoice,
          as: 'invoice'
        }
          ]
        }
       
      ]
    });

    // Flatten and normalize context
    const plainUser = user ? user.get({ plain: true }) : { id: userId };
const parents = plainUser.parent || [];
// Flatten children (students) from all parents
const children = parents.flatMap(p => p.student || []);
// Flatten subscriptions from all parents
const subscriptions = parents.flatMap(p => p.subscription || []);
// Flatten invoices from all parents
const invoices = parents.flatMap(p => p.invoice || []);
const context = {
  user: plainUser,
  parent: parents,
  children: children,
  subscription: subscriptions,
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
