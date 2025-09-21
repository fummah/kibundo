// services/contextBuilder.js
const db = require('../models');
const Role = db.role;

async function buildContext(req) {
  const userId = req.user?.id || req.body?.user?.id;
  if (!userId) return {};

  // Basic user info
  const user = await db.user.findByPk(userId, {
     attributes: {
        exclude: ['password']
      },
      include: [
        {
          model: Role,
          as: "role", // 👈 MUST match the alias in your model
          attributes: { exclude: [] },
          required: true
        }
      ]
  });
  const context = {
    user: user ? user.get({ plain: true }) : { id: userId },
    children: [],
    subscription: null,
    recent_invoices: [],
    recent_billing_events_count: 0,
    last_active: new Date().toISOString(),
    preferences: { language: 'en', timezone: 'Africa/Johannesburg' }
  };

  // Subscription (if present)
  try {
    const sub = await db.subscription.findOne({
      where: { user_id: userId },
      attributes: ['id', 'plan_id', 'status', 'end_date']
    });
    if (sub) context.subscription = {
      id: sub.id, plan: sub.plan_id, status: sub.status, ends_at: sub.end_date
    };
  } catch (e) { /* ignore if table/field differs */ }

  // Try to fetch children (common pattern: students.parent_id = userId)
  try {
    const rawChildren = await db.student.findAll({
      where: { parent_id: userId }, // adjust if you have a join table
      attributes: ['id', 'name', 'grade_level', 'class_id'],
      limit: 5
    });

    const plainChildren = rawChildren.map(c => c.get({ plain: true }));

    // Attach a small summary of latest progress reports per child
    for (const c of plainChildren) {
      const reports = await db.progress_reports.findAll({
        where: { student_id: c.id },
        attributes: ['term', 'subject', 'grade', 'summary', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 3
      });
      c.latest_reports = reports.map(r => r.get({ plain: true }));
    }

    context.children = plainChildren;
  } catch (e) { /* ignore if schema differs */ }

  // Recent invoices (small)
  try {
    const invoices = await db.invoice.findAll({
      where: { user_id: userId },
      attributes: ['id', 'amount', 'status', 'due_date', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 3
    });
    context.recent_invoices = invoices.map(i => i.get({ plain: true }));
  } catch (e) {}

  // billing events count
  try {
    const events = await db.billing_events.count({ where: { user_id: userId } });
    context.recent_billing_events_count = events || 0;
  } catch (e) {}

  // Final: return compact context (no raw Sequelize objects)
  return context;
}

module.exports = { buildContext };
