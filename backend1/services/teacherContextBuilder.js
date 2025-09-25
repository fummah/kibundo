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

async function teacherContextBuilder(req) {
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
        }       
      ]
    });

    // Flatten and normalize context
    const plainUser = user ? user.get({ plain: true }) : { id: userId };
const context = {
  user: plainUser,
  last_active: new Date().toISOString(),
  preferences: { language: 'en', timezone: 'Africa/Johannesburg' }
};

    return context;
  } catch (error) {
    console.error('Error building context:', error);
    return {
      user: null,      
      last_active: new Date().toISOString(),
      preferences: { language: 'en', timezone: 'Africa/Johannesburg' },
      error: 'Failed to build context'
    };
  }
}

module.exports = { teacherContextBuilder };
