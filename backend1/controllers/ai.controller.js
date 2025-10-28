const { buildContext } = require('../services/parentContextBuilder');
const { childBuildContext } = require('../services/childContextBuilder');
const { teacherContextBuilder } = require('../services/teacherContextBuilder');
const { buildCustomAgentContext } = require('../services/customAgentContextBuilder');
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.chatWithAgent = async (req, res) => {
  try {
    const { question,ai_agent,entities, class: classFilter, state, scanId, mode, conversationId } = req.body;
    console.log("🎯 AI Chat received ai_agent:", ai_agent);

    // Build structured context
    let contextObj = {};
    let trimmedContext = {};
    
    // Determine agent type based on naming convention
    let agentType = "child"; // Default to child agent
    if (ai_agent && ai_agent.toLowerCase().includes("parent")) {
      agentType = "parent";
    } else if (ai_agent && ai_agent.toLowerCase().includes("teacher")) {
      agentType = "teacher";
    } else if (ai_agent && ai_agent.toLowerCase().includes("custom")) {
      agentType = "custom";
    }
    
    if(agentType === "parent" || ai_agent == "ParentAgent")
      {
       contextObj = await buildContext(req);  
       trimmedContext = summarizeContextParent(contextObj);
      }
      else if(agentType === "child" || ai_agent == "ChildAgent")
      {
        contextObj = await childBuildContext(req)
        trimmedContext = summarizeContextChild(contextObj);
        
        // Add specific homework context if scanId is provided
        if (scanId && mode === "homework") {
          console.log("🔍 AI Chat: Fetching homework context for scanId:", scanId, "mode:", mode);
          try {
            const { pool } = require('../config/db.js');
            const scanResult = await pool.query(`SELECT raw_text FROM homework_scans WHERE id=$1`, [scanId]);
            if (scanResult.rows[0]) {
              trimmedContext.homework_context = `CURRENT HOMEWORK: ${scanResult.rows[0].raw_text}`;
              console.log("✅ AI Chat: Homework context found:", scanResult.rows[0].raw_text?.substring(0, 100) + "...");
            } else {
              console.log("❌ AI Chat: No homework context found for scanId:", scanId);
            }
          } catch (error) {
            console.warn('❌ AI Chat: Failed to fetch homework context for scanId:', scanId, error);
          }
        } else {
          console.log("❌ AI Chat: No scanId or mode mismatch. scanId:", scanId, "mode:", mode);
        }
      }
      else if(agentType === "teacher" || ai_agent == "TeacherAgent")
      {
        contextObj = await teacherContextBuilder(req)
        trimmedContext = summarizeContextTeacher(contextObj);
      }
      else if (agentType === "custom" || ai_agent === "CustomAgent") {
      // For custom agents, use the dynamic builder
      
      contextObj = await buildCustomAgentContext({
        user: req.user,
        entities: entities || [], // list of table names selected in frontend
        class: classFilter,
        state
      });
    
      
      // Optionally, create a trimmed context for custom agent
      //trimmedContext = summarizeCustomContext(contextObj, entities);
    } else {
      // Fallback to child context for unknown agents
      console.log("🤖 Unknown agent type, falling back to child context:", ai_agent);
      contextObj = await childBuildContext(req)
      trimmedContext = summarizeContextChild(contextObj);
    }
    console.log("🎯 Full context object:", JSON.stringify(contextObj, null, 2));
    console.log("🎯 Trimmed context:", JSON.stringify(trimmedContext, null, 2));
     
    // Build system content with homework-specific instructions
    let systemContent = `You are an AI assistant for Kibundo Education System.

STUDENT INFORMATION:
- Student's full name: ${trimmedContext.user?.first_name || 'the student'} ${trimmedContext.user?.last_name || ''}
- Student's first name: ${trimmedContext.user?.first_name || 'student'}
- Student's grade: ${trimmedContext.class_or_grade?.[0]?.class_name || 'unknown'}
- Student's email: ${trimmedContext.user?.email || 'unknown'}

ABSOLUTE REQUIREMENTS - FOLLOW THESE EXACTLY:
1. ALWAYS greet the student by their first name: "${trimmedContext.user?.first_name || 'student'}"
2. NEVER use generic terms like "student" or "you" - ALWAYS use their name: "${trimmedContext.user?.first_name || 'student'}"
3. NEVER say "I don't have access to your name" - their name is "${trimmedContext.user?.first_name || 'student'}"
4. ALWAYS be personal and address them by name in EVERY response
5. You have ALL their information including grade, subjects, and homework history

Context: ${JSON.stringify(trimmedContext)}`;

    // Add homework-specific instructions if we have homework context
    if (trimmedContext.homework_context) {
      systemContent += `

CRITICAL HOMEWORK INSTRUCTIONS:
- You are helping a Grade 1 student with their homework
- The homework content is provided in the context above
- ALWAYS answer questions based on the specific homework content
- Never say "I don't have homework context" or "no specific homework provided"
- Always relate your answers to the scanned homework content
- Provide step-by-step help for the specific problems shown in the homework
- Use simple, encouraging language appropriate for a 6-year-old
- If the student asks about something not in the homework, guide them back to the homework tasks`;
    }

    console.log("🎯 System prompt being sent to AI:", systemContent);
    
    // 🔥 CREATE OR RETRIEVE CONVERSATION
    let convId = conversationId;
    let conversationMessages = [];
    
    try {
      const { pool } = require('../config/db.js');
      
      // If no conversation ID, create a new conversation
      if (!convId) {
        const userId = req.user?.id || req.user?.student?.[0]?.user_id;
        const title = `Chat for ${trimmedContext.user?.first_name || "student"} ${new Date().toISOString()}`;
        console.log("🆕 Creating new conversation for userId:", userId);
        
        const result = await pool.query(
          `INSERT INTO conversations(user_id, title) VALUES($1,$2) RETURNING *`,
          [userId || null, title]
        );
        convId = result.rows[0].id;
        console.log("✅ Created new conversation:", convId);
      }
      
      // Retrieve conversation history if conversation exists
      if (convId) {
        console.log("🔍 Fetching conversation history for conversationId:", convId);
        const historyResult = await pool.query(
          `SELECT sender, content FROM messages 
           WHERE conversation_id=$1 
           ORDER BY created_at ASC`,
          [convId]
        );
        
        const history = historyResult.rows || [];
        console.log(`✅ Retrieved ${history.length} messages from conversation history`);
        
        // Convert database format to OpenAI format
        conversationMessages = history.map(msg => ({
          role: msg.sender === "student" ? "user" : 
                msg.sender === "bot" || msg.sender === "agent" ? "assistant" : 
                "user",
          content: msg.content
        }));
      }
    } catch (error) {
      console.warn('⚠️ Failed to create/fetch conversation:', error);
      // Continue without history
    }
    
    // Build messages array with conversation history
    let messages = [{ role: 'system', content: systemContent }];
    
    if (conversationMessages.length > 0) {
      // Add conversation history BEFORE the current question
      messages = messages.concat(conversationMessages);
      console.log(`📜 Including ${conversationMessages.length} previous messages for context`);
    }
    
    // Add the current question
    messages.push({ role: 'user', content: question });
    
    console.log(`📤 Sending ${messages.length} messages to OpenAI (1 system + ${conversationMessages.length} history + 1 current)`);
    
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages
    });

    const answer = resp.choices?.[0]?.message?.content || '';
    
    // 🔥 STORE MESSAGE IN CONVERSATION
    if (convId) {
      try {
        const { pool } = require('../config/db.js');
        // Store user message
        await pool.query(
          `INSERT INTO messages(conversation_id, sender, content) VALUES($1,$2,$3)`,
          [convId, "student", question]
        );
        // Store AI response
        await pool.query(
          `INSERT INTO messages(conversation_id, sender, content, meta) VALUES($1,$2,$3,$4)`,
          [convId, "bot", answer, JSON.stringify({ agentName: ai_agent || "ChildAgent" })]
        );
        console.log("✅ Stored messages in conversation:", convId);
      } catch (error) {
        console.warn('⚠️ Failed to store messages in conversation:', error);
        // Continue even if storage fails
      }
    }
    
    // Use the actual agent name from the request, or fallback to a default
    const agentDisplayName = ai_agent || "ChildAgent";
    console.log("🎯 AI Chat sending back agentName:", agentDisplayName, "conversationId:", convId);
    
    res.json({ 
      answer,
      agentName: agentDisplayName,
      conversationId: convId // 🔥 Return conversation ID to frontend
    });

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