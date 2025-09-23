const { buildContext } = require('../services/parentContextBuilder');
const { childBuildContext } = require('../services/childContextBuilder');
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.chatWithAgent = async (req, res) => {
  try {
    const { question,ai_agent } = req.body;

    // Build structured context
    const contextObj = ai_agent=="ParentAgent"?await buildContext(req):await childBuildContext(req);  
    //console.log(contextObj);
    //return;
    const trimmedContext = summarizeContext(contextObj);
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
function summarizeContext(ctx) {
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
