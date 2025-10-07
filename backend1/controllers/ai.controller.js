const { buildContext } = require('../services/parentContextBuilder');
const { childBuildContext } = require('../services/childContextBuilder');
const { teacherBuildContext } = require('../services/teacherContextBuilder');
const { buildCustomAgentContext } = require('../services/customAgentContextBuilder');
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.chatWithAgent = async (req, res) => {
  try {
    const { question,ai_agent,entities, class: classFilter, state } = req.body;

    // Build structured context
    let contextObj = {};
    let trimmedContext = {};
    if(ai_agent == "ParentAgent")
      {
       contextObj = await buildContext(req);  
       trimmedContext = summarizeContextParent(contextObj);
      }
      else if(ai_agent == "ChildAgent")
      {
        contextObj = await childBuildContext(req)
        trimmedContext = summarizeContextChild(contextObj);
      }
      else if(ai_agent == "TeacherAgent")
      {
        contextObj = await teacherBuildContext(req)
        trimmedContext = summarizeContextTeacher(contextObj);
      }
      else if (ai_agent === "CustomAgent") {
      // For custom agents, use the dynamic builder
      
      contextObj = await buildCustomAgentContext({
        user: req.user,
        entities: entities || [], // list of table names selected in frontend
        class: classFilter,
        state
      });
    
      
      // Optionally, create a trimmed context for custom agent
      //trimmedContext = summarizeCustomContext(contextObj, entities);
    }
    //console.log(contextObj);
   // return;
     
    const systemContent = `You are an AI assistant for Kibundo Education System.
Context: ${JSON.stringify(trimmedContext)}`;

    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: question }
      ]
    });

    const answer = resp.choices?.[0]?.message?.content || '';
    res.json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// small helper to reduce context size
function summarizeContextParent(ctx) {
  return {
    user: ctx.user,
    subscription: ctx.subscription ? { plan: ctx.subscription.plan, status: ctx.subscription.status, ends_at: ctx.subscription.ends_at } : null,
    children: (ctx.children || []).slice(0, 3).map(c => ({
      id: c.id, name: c.name, grade_level: c.grade_level,
      recent_grade: c.latest_reports?.[0]?.grade || null
    })),
    recent_invoices_count: (ctx.recent_invoices || []).length,
    last_active: ctx.last_active
  };
}
function summarizeContextChild(ctx) {
  return {
    user: {
      id: ctx.user.id,
      first_name: ctx.user.first_name,
      last_name: ctx.user.last_name,
      email: ctx.user.email,
      role: ctx.user.role?.name
    },
    parent: (ctx.parent || []).map(p => ({
      id: p.id,
      first_name: p.user?.first_name,
      last_name: p.user?.last_name,
      email: p.user?.email,
      subscription: (p.subscription || []).map(sub => ({
        plan: sub.product?.name,
        status: sub.status,
        ends_at: sub.current_period_end
      }))
    })),
    class_or_grade: (ctx.class_or_grade || []).map(c => ({
      id: c.id,
      class_name: c.class_name
    })),
     homework_scans: (ctx.homework_scans || []).map(scan => ({
      id: scan.id,
      file_url: scan.file_url,
      raw_text: scan.raw_text,
      created_at: scan.created_at
    })),
    subjects: (ctx.subjects || []).map(s => ({
      id: s.id,
      subject_name: s.subject_name
    })),
    invoices_count: (ctx.parent || []).reduce(
      (sum, p) => sum + (p.invoice?.length || 0),
      0
    ),
    last_active: ctx.last_active
  };
}

function summarizeContextTeacher(ctx) {
  return {
    user: ctx.user,
    last_active: ctx.last_active
  };
}

function summarizeCustomContext(ctx, entities = []) {
  const trimmed = { user: ctx.user, last_active: ctx.last_active };
  entities.forEach(e => {
    const key = e.toLowerCase();
    trimmed[key] = (ctx[key] || []).slice(0, 3); // keep only first 3 records per entity for brevity
  });
  return trimmed;
}