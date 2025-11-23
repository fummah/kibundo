const { buildContext } = require("../services/parentContextBuilder");
const { childBuildContext } = require("../services/childContextBuilder");
const { teacherContextBuilder } = require("../services/teacherContextBuilder");
const { buildCustomAgentContext } = require("../services/customAgentContextBuilder");
const { fetchEntityData, getAgentEntities } = require("../services/entityDataFetcher");
const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// -----------------------------------------------------------------------------
// Response personalization helper - force 2nd person for parents
// -----------------------------------------------------------------------------
function personalizeResponse(text, parentName) {
  if (!text || typeof text !== "string") return text;

  let personalized = text;

  // For parent agents, German is the primary language - default to German
  // For parent agents, German is the primary language - default to German
  // Rough German detection (whole words only) - but prefer German for parent agents
  const hasGermanWords = /\b(ist|sind|haben|heißt|heißen|Elternteil|Klasse|Kind|Kinder|Sie|Ihr|Ihre)\b/i.test(
    personalized
  );
  const hasEnglishWords = /\b(is|are|have|has|Your|You|They|Their|The parent)\b/i.test(
    personalized
  );
  // Default to German for parent agents (unless clearly English)
  const isGerman = hasGermanWords || !hasEnglishWords;

  const yourName = isGerman ? "Ihr Name ist" : "Your name is";
  const youHave = isGerman ? "Sie haben" : "You have";
  const yourKids = isGerman ? "Ihre Kinder" : "Your children";
  const youPronoun = isGerman ? "Sie" : "You";
  const yourPron = isGerman ? "Ihr" : "Your";

  // 1) Specific patterns first
  // "Their name is ..." → "Your name is ..."
  personalized = personalized.replace(/\bTheir name is\b/gi, yourName);

  // "They have ..." → "You have ..."
  personalized = personalized.replace(/\bThey have\b/gi, youHave);
  personalized = personalized.replace(/They have/gi, youHave); // fallback without word boundary

  // "Their children ..." → "Your children ..."
  personalized = personalized.replace(/\bTheir children\b/gi, yourKids);

  // 2) Generic 3rd-person → 2nd-person
  // "The parent's" → "Your" / "Ihr"
  personalized = personalized.replace(/\bThe parent's\b/gi, yourPron);

  // "The parent" → "You" / "Sie"
  personalized = personalized.replace(/\bThe parent\b/gi, youPronoun);

  // Standalone "Their" → "Your" / "Ihr"
  personalized = personalized.replace(/\bTheir\b/gi, yourPron);

  // Standalone "They" → "You" / "Sie"
  personalized = personalized.replace(/\bThey\b/gi, youPronoun);

  // 3) If we know the parent name, normalise the “what is my name” answer
  if (parentName && /\b(Your name is|Ihr Name ist|Their name is)\b/i.test(personalized)) {
    const final = isGerman
      ? `Ihr Name ist ${parentName}.`
      : `Your name is ${parentName}.`;
    return final;
  }

  return personalized;
}

// -----------------------------------------------------------------------------
// Main controller
// -----------------------------------------------------------------------------
exports.chatWithAgent = async (req, res) => {
  try {
    const {
      question,
      ai_agent,
      entities,
      class: classFilter,
      state,
      scanId,
      mode,
      conversationId,
    } = req.body;

    console.log("🎯 AI Chat received ai_agent:", ai_agent);

    const userId = req.user?.id || null;

    // -------------------------------------------------------------------------
    // 1) Load agent configuration & master prompt from DB
    // -------------------------------------------------------------------------
    let agentEntities = [];
    let agentInfo = null;
    let customSystemPrompt = null;

    if (ai_agent) {
      console.log(`🔍 [chatWithAgent] Fetching agent info for: "${ai_agent}"`);
      agentInfo = await getAgentEntities(ai_agent);

      if (agentInfo) {
        if (agentInfo.entities) {
          agentEntities = Array.isArray(agentInfo.entities) ? agentInfo.entities : [];
          console.log(
            `✅ [chatWithAgent] Found agent "${ai_agent}" with entities:`,
            agentEntities
          );
        } else {
          console.log(
            `⚠️ [chatWithAgent] Agent "${ai_agent}" has no entities field`
          );
        }

        if (agentInfo.prompts && typeof agentInfo.prompts === "object") {
          customSystemPrompt =
            agentInfo.prompts.system || agentInfo.prompts.systemPrompt || null;
          if (customSystemPrompt) {
            console.log(
              `✅ [chatWithAgent] Found custom system prompt for agent "${ai_agent}" (length: ${customSystemPrompt.length} chars)`
            );
          } else {
            console.log(
              `⚠️ [chatWithAgent] Agent "${ai_agent}" has prompts object but no system/systemPrompt field`
            );
            console.log(
              `📋 [chatWithAgent] Available prompt keys:`,
              Object.keys(agentInfo.prompts)
            );
          }
        } else {
          console.log(
            `⚠️ [chatWithAgent] Agent "${ai_agent}" has no prompts or prompts is not an object`
          );
        }
      } else {
        console.log(
          `⚠️ [chatWithAgent] Agent "${ai_agent}" not found in database, using default prompts`
        );
      }
    } else {
      console.log(`⚠️ [chatWithAgent] No ai_agent provided, using default prompts`);
    }

    // Entities from request override those from agent config
    const entitiesToFetch = entities || agentEntities || [];

    // -------------------------------------------------------------------------
    // 2) Determine agent type
    // -------------------------------------------------------------------------
    let agentType = "child"; // default
    if (ai_agent && ai_agent.toLowerCase().includes("parent")) {
      agentType = "parent";
    } else if (ai_agent && ai_agent.toLowerCase().includes("teacher")) {
      agentType = "teacher";
    } else if (ai_agent && ai_agent.toLowerCase().includes("custom")) {
      agentType = "custom";
    }

    // -------------------------------------------------------------------------
    // 3) Build context per agent type & fetch entity_data snapshot
    // -------------------------------------------------------------------------
    let contextObj = {};
    let trimmedContext = {};
    let entityData = {}; // snapshot used by prompts & AI

    if (agentType === "parent" || ai_agent === "ParentAgent") {
      console.log(
        `🔍 AI Controller (Parent): req.user=`,
        req.user
          ? { id: req.user.id, email: req.user.email, role_id: req.user.role_id }
          : "null/undefined"
      );

      contextObj = await buildContext(req);
      trimmedContext = await summarizeContextParent(contextObj, req);

      const parentId = contextObj.parent?.[0]?.id || null;

      // ✅ Only use entities assigned by admin (in ai_agent) or sent in the request
      const entitiesList = Array.isArray(entitiesToFetch)
        ? entitiesToFetch.filter(Boolean)
        : [];

      if (entitiesList.length > 0) {
        console.log(
          `📊 Fetching data from admin-assigned entities for parent:`,
          entitiesList
        );

        entityData = await fetchEntityData(entitiesList, {
          class: classFilter,
          state,
          userId,
          parentId,
        });

        console.log(
          `✅ Fetched entity data counts:`,
          Object.keys(entityData)
            .map((k) => {
              const d = entityData[k];
              const count =
                typeof d.count === "number"
                  ? d.count
                  : Array.isArray(d.data)
                  ? d.data.length
                  : 0;
              return `${k}: ${count}${d.truncated ? " (truncated)" : ""}`;
            })
            .join(", ")
        );
      } else {
        console.log(
          "ℹ️ No entities assigned for this parent agent (entityData will be empty)."
        );
      }

      if (Object.keys(entityData).length > 0) {
        trimmedContext.entity_data = entityData;
      }
    } else if (agentType === "child" || ai_agent === "ChildAgent") {
      contextObj = await childBuildContext(req);
      trimmedContext = summarizeContextChild(contextObj);

      const studentId =
        contextObj.user?.student?.[0]?.id || contextObj.student?.[0]?.id || null;

      if (entitiesToFetch.length > 0) {
        console.log(
          `📊 Fetching data from entities for child:`,
          entitiesToFetch,
          `userId: ${userId}, studentId: ${studentId}`
        );
        entityData = await fetchEntityData(entitiesToFetch, {
          class: classFilter,
          state,
          userId,
          studentId,
        });
      }

      if (Object.keys(entityData).length > 0) {
        trimmedContext.entity_data = entityData;
      }

      // Homework scan context (for solvable vs creative)
      if (scanId && mode === "homework") {
        console.log(
          "🔍 AI Chat: Fetching homework context for scanId:",
          scanId,
          "mode:",
          mode
        );
        try {
          const { pool } = require("../config/db.js");
          const scanResult = await pool.query(
            `
              SELECT raw_text, detected_subject, task_type
              FROM homework_scans WHERE id=$1
            `,
            [scanId]
          );
          if (scanResult.rows[0]) {
            const scan = scanResult.rows[0];
            trimmedContext.homework_context = `CURRENT HOMEWORK: ${scan.raw_text}`;
            trimmedContext.homework_subject = scan.detected_subject || null;
            trimmedContext.homework_task_type = scan.task_type || null; // 'solvable' or 'creative'
            console.log("✅ AI Chat: Homework context found for scanId:", scanId);
          } else {
            console.log("❌ AI Chat: No homework context found for scanId:", scanId);
          }
        } catch (error) {
          console.warn(
            "❌ AI Chat: Failed to fetch homework context for scanId:",
            scanId,
            error
          );
        }
      }
    } else if (agentType === "teacher" || ai_agent === "TeacherAgent") {
      contextObj = await teacherContextBuilder(req);
      trimmedContext = summarizeContextTeacher(contextObj);

      if (entitiesToFetch.length > 0) {
        console.log(
          `📊 Fetching data from entities for teacher:`,
          entitiesToFetch,
          `userId: ${userId}`
        );
        entityData = await fetchEntityData(entitiesToFetch, {
          class: classFilter,
          state,
          userId,
        });
      }

      if (Object.keys(entityData).length > 0) {
        trimmedContext.entity_data = entityData;
      }
    } else if (agentType === "custom" || ai_agent === "CustomAgent") {
      // Custom agents: try to attach parent/student context
      let parentId = null;
      let studentId = null;

      if (req.user?.role_id === 2) {
        const parentContext = await buildContext(req);
        parentId = parentContext.parent?.[0]?.id || null;
      } else if (req.user?.role_id === 1) {
        const childContext = await childBuildContext(req);
        studentId =
          childContext.user?.student?.[0]?.id || childContext.student?.[0]?.id || null;
      }

      if (entitiesToFetch.length > 0) {
        console.log(
          `📊 Fetching data from entities for custom agent:`,
          entitiesToFetch,
          `userId: ${userId}, parentId: ${parentId}, studentId: ${studentId}`
        );
        entityData = await fetchEntityData(entitiesToFetch, {
          class: classFilter,
          state,
          userId,
          parentId,
          studentId,
        });
      }

      contextObj = await buildCustomAgentContext({
        user: req.user,
        entities: entitiesToFetch,
        class: classFilter,
        state,
      });

      trimmedContext = contextObj || {};
      if (Object.keys(entityData).length > 0) {
        trimmedContext.entity_data = entityData;
      }
    } else {
      // Fallback: treat as child agent
      console.log("🤖 Unknown agent type, falling back to child context:", ai_agent);
      contextObj = await childBuildContext(req);
      trimmedContext = summarizeContextChild(contextObj);

      const studentId =
        contextObj.user?.student?.[0]?.id || contextObj.student?.[0]?.id || null;

      if (entitiesToFetch.length > 0) {
        console.log(
          `📊 Fetching data from entities for unknown agent:`,
          entitiesToFetch,
          `userId: ${userId}, studentId: ${studentId}`
        );
        entityData = await fetchEntityData(entitiesToFetch, {
          class: classFilter,
          state,
          userId,
          studentId,
        });
      }

      if (Object.keys(entityData).length > 0) {
        trimmedContext.entity_data = entityData;
      }
    }

    console.log("🎯 Full context object:", JSON.stringify(contextObj, null, 2));
    console.log("🎯 Trimmed context:", JSON.stringify(trimmedContext, null, 2));

    // -------------------------------------------------------------------------
    // 4) Build system prompt (DB-first, anti-hallucination)
    // -------------------------------------------------------------------------
    let systemContent = await buildSystemPrompt({
      agentType,
      ai_agent,
      customSystemPrompt,
      trimmedContext,
      entityData,
      req,
    });

    // -------------------------------------------------------------------------
    // 5) Homework-specific instructions (solvable vs creative)
    // -------------------------------------------------------------------------
    if (trimmedContext.homework_context) {
      const taskType = trimmedContext.homework_task_type || "solvable";

      if (taskType === "creative") {
        systemContent += `

🔥🔥🔥 CRITICAL - HOMEWORK CONTEXT - ABSOLUTE PRIORITY 🔥🔥🔥:
The student has a creative or manual homework task (e.g., drawing, crafting, music, sports). THIS IS THE ACTUAL HOMEWORK CONTENT:

${trimmedContext.homework_context}

⚠️⚠️⚠️ ABSOLUTE REQUIREMENTS - READ THIS CAREFULLY ⚠️⚠️⚠️:
- You MUST ALWAYS reference this specific homework content when answering questions.
- If the student asks "what is my homework about" or "what are the questions", you MUST describe the homework content shown above.
- NEVER say "I don't have homework context" or "I can't see the homework" - the homework is provided above.
- NEVER talk about different homework (like flashcards, mental math, etc.) unless it matches the content above.
- This task cannot be solved by AI - it requires creativity and manual work.
- Your main role is MOTIVATION and emotional support, NOT solving the task.
- Use a positive, encouraging, and playful tone.
- Give praise and recognition for progress.
- Offer motivating phrases and playful suggestions.
- Keep the child engaged and positive throughout the task.
- Adapt your language to the student's grade (1-4): use very simple words for Grade 1-2, slightly more detailed for Grade 3-4.`;
      } else {
        systemContent += `

🔥🔥🔥 CRITICAL - HOMEWORK CONTEXT - ABSOLUTE PRIORITY 🔥🔥🔥:
The student has a solvable homework task (e.g., math, reading, grammar). THIS IS THE ACTUAL HOMEWORK CONTENT:

${trimmedContext.homework_context}

⚠️⚠️⚠️ ABSOLUTE REQUIREMENTS - READ THIS CAREFULLY ⚠️⚠️⚠️:
- You MUST ALWAYS reference this specific homework content when answering questions.
- If the student asks "what is my homework about" or "what are the questions", you MUST describe the homework content shown above.
- NEVER say "I don't have homework context" or "I can't see the homework" - the homework is provided above.
- NEVER talk about different homework (like flashcards, mental math, etc.) unless it matches the content above.
- When the student asks about "question 1", "question 2", etc., you MUST refer to the questions in the homework content above.
- Always answer questions based on THIS SPECIFIC homework content, not generic examples.
- If the student asks "help with question 1", look at the homework content above and identify what question 1 actually is.

PEDAGOGICAL APPROACH:
- MOTIVATE FIRST: When the student asks a question, encourage them to think for themselves first.
- GIVE TIPS: If they struggle, provide hints and tips, not full answers.
- FULL ANSWER ONLY AS LAST RESORT: Give the complete answer only if the student really can't proceed after trying.
- EXPLAIN THE PROCESS: When you give the answer, always explain the solution steps so the student learns.

- Provide interactive, step-by-step help for the SPECIFIC tasks in the homework above.
- Guide the student through each step, but don't give the full answer immediately.
- Ask follow-up questions to ensure the student understands.
- Adapt your explanations to the student's grade (1-4): use very simple words for Grade 1-2, slightly more detailed for Grade 3-4.`;
      }
    }

    if (process.env.DEBUG_AI === "true") {
      console.log("🎯 System prompt being sent to AI:", systemContent);
    } else {
      console.log(
        "🎯 System prompt length:",
        systemContent?.length || 0,
        "chars"
      );
    }

    // -------------------------------------------------------------------------
    // 6) Create / retrieve conversation + history & images
    // -------------------------------------------------------------------------
    let convId = conversationId;
    let conversationMessages = [];
    let scanImages = [];

    try {
      const { pool } = require("../config/db.js");

      if (!convId) {
        const chatMode = req.body?.mode || "general";

        if (userId) {
          try {
            const existingResult = await pool.query(
              `SELECT id FROM conversations 
               WHERE user_id = $1 
               AND (mode = $2 OR mode IS NULL)
               ORDER BY created_at DESC 
               LIMIT 1`,
              [userId, chatMode]
            );

            if (existingResult.rows.length > 0) {
              convId = existingResult.rows[0].id;
              console.log(
                "✅ Found existing conversation:",
                convId,
                "for user",
                userId,
                "mode",
                chatMode
              );
            }
          } catch (err) {
            console.warn("⚠️ Error checking for existing conversation:", err);
          }
        }

        if (!convId) {
          const title = `Chat for ${
            trimmedContext.user?.first_name || "user"
          } ${new Date().toISOString()}`;
          console.log("🆕 Creating new conversation for userId:", userId);

          let result;
          try {
            result = await pool.query(
              `INSERT INTO conversations(user_id, title, mode) VALUES($1,$2,$3) RETURNING *`,
              [userId || null, title, chatMode]
            );
          } catch (err) {
            console.log("ℹ️ Mode column not available, inserting without mode");
            result = await pool.query(
              `INSERT INTO conversations(user_id, title) VALUES($1,$2) RETURNING *`,
              [userId || null, title]
            );
          }

          convId = result.rows[0].id;
          console.log("✅ Created new conversation:", convId);
        }
      }

      if (convId) {
        console.log(
          "🔍 Fetching conversation history for conversationId:",
          convId
        );
        const historyResult = await pool.query(
          `SELECT sender, content, meta FROM messages 
           WHERE conversation_id=$1 
           ORDER BY created_at ASC`,
          [convId]
        );

        const history = historyResult.rows || [];
        console.log(
          `✅ Retrieved ${history.length} messages from conversation history`
        );

        // collect scan IDs from conversation + message meta
        try {
          const convResult = await pool.query(
            `SELECT scan_id FROM conversations WHERE id=$1`,
            [convId]
          );
          const conversationScanId = convResult.rows[0]?.scan_id;

          const scanIds = new Set();
          if (conversationScanId) scanIds.add(conversationScanId);

          history.forEach((msg) => {
            try {
              const meta = msg.meta ? JSON.parse(msg.meta) : {};
              if (meta.scanId) scanIds.add(meta.scanId);
            } catch {
              // ignore bad meta
            }
          });

          if (scanIds.size > 0) {
            const scanIdsArray = Array.from(scanIds);
            console.log(
              `🖼️ Fetching images from ${scanIdsArray.length} scans:`,
              scanIdsArray
            );
            const scansResult = await pool.query(
              `SELECT id, file_url FROM homework_scans WHERE id = ANY($1::int[]) AND file_url IS NOT NULL`,
              [scanIdsArray]
            );

            const fs = require("fs");
            const path = require("path");

            for (const scan of scansResult.rows) {
              if (scan.file_url) {
                try {
                  const relativePath = scan.file_url.startsWith("/")
                    ? scan.file_url.slice(1)
                    : scan.file_url;
                  const filePath = path.join(process.cwd(), relativePath);

                  if (fs.existsSync(filePath)) {
                    const fileBuffer = fs.readFileSync(filePath);
                    const fileBase64 = fileBuffer.toString("base64");

                    const mimeType = scan.file_url.endsWith(".png")
                      ? "image/png"
                      : scan.file_url.endsWith(".jpg") ||
                        scan.file_url.endsWith(".jpeg")
                      ? "image/jpeg"
                      : scan.file_url.endsWith(".gif")
                      ? "image/gif"
                      : scan.file_url.endsWith(".webp")
                      ? "image/webp"
                      : "image/png";

                    scanImages.push({
                      type: "image_url",
                      image_url: {
                        url: `data:${mimeType};base64,${fileBase64}`,
                      },
                    });
                    console.log(
                      `✅ Added image from scan ${scan.id}: ${scan.file_url}`
                    );
                  } else {
                    console.warn(
                      `⚠️ Image file not found: ${filePath} (looking for ${scan.file_url})`
                    );
                  }
                } catch (err) {
                  console.warn(
                    `⚠️ Failed to read image from scan ${scan.id}:`,
                    err.message
                  );
                }
              }
            }
            console.log(`✅ Loaded ${scanImages.length} images from scans`);
          }
        } catch (err) {
          console.warn("⚠️ Failed to fetch scan images:", err.message);
        }

        conversationMessages = history.map((msg) => ({
          role:
            msg.sender === "student"
              ? "user"
              : msg.sender === "bot" || msg.sender === "agent"
              ? "assistant"
              : "user",
          content: msg.content,
        }));
      }
    } catch (error) {
      console.warn("⚠️ Failed to create/fetch conversation:", error);
    }

    // -------------------------------------------------------------------------
    // 7) Build messages for OpenAI
    // -------------------------------------------------------------------------
    let messages = [{ role: "system", content: systemContent }];

    if (conversationMessages.length > 0) {
      messages = messages.concat(conversationMessages);
      console.log(
        `📜 Including ${conversationMessages.length} previous messages for context`
      );
    }

    let questionWithContext = question;
    if (trimmedContext.homework_context) {
      const homeworkText = trimmedContext.homework_context.replace(
        /^CURRENT HOMEWORK: /,
        ""
      );
      questionWithContext = `[HOMEWORK CONTEXT - This is the student's actual homework they are working on:\n\n${homeworkText}\n\n]\n\nStudent's question: ${question}`;
      console.log("✅ Prepending homework context to user question");
    }

    const currentQuestionContent =
      scanImages.length > 0
        ? [{ type: "text", text: questionWithContext }, ...scanImages]
        : questionWithContext;

    messages.push({ role: "user", content: currentQuestionContent });

    console.log(
      `📤 Sending ${messages.length} messages to OpenAI (1 system + ${conversationMessages.length} history + 1 current)`
    );
    console.log(
      `📊 Entity data available: ${
        Object.keys(entityData).length > 0
          ? Object.keys(entityData)
              .map((k) => {
                const d = entityData[k];
                const count =
                  typeof d.count === "number"
                    ? d.count
                    : (d.data || []).length;
                return `${k}(${count})`;
              })
              .join(", ")
          : "none"
      }`
    );
    console.log(`🖼️ Including ${scanImages.length} images with current question`);

    const model = scanImages.length > 0 ? "gpt-4o" : "gpt-4o-mini";

    const resp = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.2, // lower temperature for reliability
      top_p: 0.9,
      max_tokens: 800,
    });

    let answer = resp.choices?.[0]?.message?.content || "";

    // 🔥 POST-PROCESSING: Replace third person with second person for parent agents
    const isParentAgent = agentType === "parent" || ai_agent === "ParentAgent";

    if (isParentAgent) {
      // Prefer the canonical name from buildParentPrompt
      let parentName =
        trimmedContext.parent_full_name ||
        trimmedContext.user?.name ||
        trimmedContext.user?.first_name ||
        req?.user?.name ||
        req?.user?.first_name ||
        "Elternteil";

      // Avoid generic "Parent" as a name
      if (/^parent$/i.test(parentName)) {
        const email =
          trimmedContext.user?.email || req?.user?.email || "";
        if (email && email.includes("@")) {
          const local = email.split("@")[0];
          parentName =
            local.charAt(0).toUpperCase() + local.slice(1);
        } else {
          parentName = "Elternteil";
        }
      }

      console.log("🎯 Using parentName for personalization:", parentName);
      answer = personalizeResponse(answer, parentName);
      console.log("✅ Post-processed response to use 2nd person for parent");
    }

    // -------------------------------------------------------------------------
    // 8) Persist messages to DB
    // -------------------------------------------------------------------------
    if (convId) {
      const { pool } = require("../config/db.js");

      let sender = "student";
      if (req.body?.mode === "parent" || req.user?.role_id === 2) {
        sender = "student";
      } else if (req.user?.role_id === 1) {
        sender = "student";
      }

      console.log(
        `📝 [Message Storage] Setting sender: "${sender}" (mode: ${req.body?.mode}, role_id: ${req.user?.role_id})`
      );

      try {
        const userMessageMeta = {
          userId: userId || null,
          scanId: scanId || null,
          mode: mode || null,
          agentName: ai_agent || null,
          timestamp: new Date().toISOString(),
          messageType: "text",
          roleId: req.user?.role_id || null,
        };
        await pool.query(
          `INSERT INTO messages(conversation_id, sender, content, meta) VALUES($1,$2,$3,$4)`,
          [convId, sender, question, JSON.stringify(userMessageMeta)]
        );
        console.log(
          "✅ Stored user message in conversation:",
          convId,
          "with metadata"
        );
      } catch (error) {
        console.error(
          "❌ CRITICAL: Failed to store user message in conversation:",
          error
        );
        throw new Error(`Failed to store user message: ${error.message}`);
      }

      try {
        const aiMessageMeta = {
          userId: userId || null,
          scanId: scanId || null,
          mode: mode || null,
          agentName: ai_agent || "Kibundo",
          timestamp: new Date().toISOString(),
          messageType: "text",
          roleId: req.user?.role_id || null,
          interests: trimmedContext?.interests || null,
          childName: trimmedContext?.user?.first_name || null,
        };
        await pool.query(
          `INSERT INTO messages(conversation_id, sender, content, meta) VALUES($1,$2,$3,$4)`,
          [convId, "bot", answer, JSON.stringify(aiMessageMeta)]
        );
        console.log(
          "✅ Stored AI response in conversation:",
          convId,
          "with metadata"
        );
      } catch (error) {
        console.error(
          "❌ CRITICAL: Failed to store AI response in conversation:",
          error
        );
        throw new Error(`Failed to store AI response: ${error.message}`);
      }

      console.log("✅ Successfully stored both messages in conversation:", convId);
    } else {
      console.warn("⚠️ No conversationId provided - messages will not be persisted");
    }

    const agentDisplayName = ai_agent || "Kibundo";
    console.log(
      "🎯 AI Chat sending back agentName:",
      agentDisplayName,
      "conversationId:",
      convId
    );

    res.json({
      answer,
      agentName: agentDisplayName,
      conversationId: convId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -----------------------------------------------------------------------------
// Context summarizers (unchanged logic, just used by the prompt builder)
// -----------------------------------------------------------------------------
async function summarizeContextParent(ctx, req = null) {
  console.log(
    `🔍 summarizeContextParent: ctx.children type=${
      Array.isArray(ctx.children) ? "array" : typeof ctx.children
    }, length=${ctx.children?.length || 0}`
  );
  console.log(
    `🔍 summarizeContextParent: ctx.user=`,
    ctx.user
      ? {
          id: ctx.user.id,
          email: ctx.user.email,
          first_name: ctx.user.first_name,
          last_name: ctx.user.last_name,
        }
      : "null"
  );
  console.log(
    `🔍 summarizeContextParent: ctx.parent=`,
    ctx.parent
      ? Array.isArray(ctx.parent)
        ? `Array with ${ctx.parent.length} parents`
        : `Object with id=${ctx.parent.id}`
      : "null"
  );

  let childrenToProcess = ctx.children || [];
  if (childrenToProcess.length === 0 && ctx.parent) {
    const parentArray = Array.isArray(ctx.parent) ? ctx.parent : [ctx.parent];
    console.log(
      `⚠️ summarizeContextParent: ctx.children is empty, trying to extract from ctx.parent...`
    );
    parentArray.forEach((p, idx) => {
      if (p && p.student && Array.isArray(p.student) && p.student.length > 0) {
        console.log(
          `  ✅ Found ${p.student.length} students in parent[${idx}].student`
        );
        childrenToProcess = childrenToProcess.concat(p.student);
      }
    });
    console.log(`  After extraction: ${childrenToProcess.length} children`);
  }

  if (childrenToProcess && childrenToProcess.length > 0) {
    console.log(
      `  Children data:`,
      childrenToProcess.map((c) => ({
        id: c.id,
        user_id: c.user_id,
        parent_id: c.parent_id,
        has_user: !!c.user,
        user_name: c.user
          ? `${c.user.first_name || ""} ${c.user.last_name || ""}`.trim()
          : "no user",
      }))
    );
  } else {
    console.log(
      `  ⚠️ WARNING: No children found in context! This might be incorrect.`
    );
  }

  // Fetch user data for students that are missing it
  const db = require('../models');
  const User = db.user;
  
  const children = await Promise.all((childrenToProcess || []).map(async (c) => {
    // Try multiple paths to get user data
    let user = c.user || c.User || {};
    const className = c.class?.class_name || c.Class?.class_name || "Unbekannt";

    // Log what we have initially
    console.log(`🔍 Processing student ${c.id}:`, {
      has_user: !!c.user,
      has_User: !!c.User,
      user_id: c.user_id,
      user_first_name: user?.first_name || 'missing',
      user_last_name: user?.last_name || 'missing',
      user_keys: user ? Object.keys(user) : []
    });

    // If user data is missing but we have user_id, fetch it
    let firstName = (user?.first_name || "").trim();
    let lastName = (user?.last_name || "").trim();
    
    // Always try to fetch if we have user_id and no name (even if user object exists but is empty)
    if ((!firstName || !lastName) && c.user_id) {
      console.warn(`⚠️ Student ${c.id} has user_id ${c.user_id} but missing name data (first: "${firstName}", last: "${lastName}"). Fetching...`);
      try {
        const fetchedUser = await User.findByPk(c.user_id, {
          attributes: { exclude: ['password'] }
        });
        if (fetchedUser) {
          const plainUser = fetchedUser.get ? fetchedUser.get({ plain: true }) : fetchedUser;
          firstName = (plainUser.first_name || "").trim();
          lastName = (plainUser.last_name || "").trim();
          user = plainUser; // Update user object
          console.log(`✅ Fetched user data for student ${c.id}: "${firstName} ${lastName}"`);
        } else {
          console.error(`❌ User with id ${c.user_id} not found in database`);
        }
      } catch (err) {
        console.error(`❌ Error fetching user for student ${c.id}:`, err.message);
      }
    }

    const homeworkScans = c.homeworkscan || c.HomeworkScan || [];
    const subjects = (c.subject || c.Subject || [])
      .map(
        (sub) =>
          sub.subject?.subject_name || sub.Subject?.subject_name || sub.subject_name || "Unknown"
      )
      .filter(Boolean);

    const totalScans = homeworkScans.length;
    const completedScans = homeworkScans.filter(
      (h) => h.completed_at || h.completion_photo_url
    ).length;
    const recentScans = homeworkScans.filter((h) => {
      if (!h.created_at) return false;
      const scanDate = new Date(h.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return scanDate >= thirtyDaysAgo;
    }).length;

    const subjectBreakdown = {};
    homeworkScans.forEach((scan) => {
      const subject = scan.detected_subject || "General";
      if (!subjectBreakdown[subject]) {
        subjectBreakdown[subject] = { total: 0, completed: 0 };
      }
      subjectBreakdown[subject].total++;
      if (scan.completed_at || scan.completion_photo_url) {
        subjectBreakdown[subject].completed++;
      }
    });

    // Build full name with better fallback
    const fullName = `${firstName} ${lastName}`.trim();
    const displayName = fullName || `Student #${c.id}`;

    return {
      id: c.id,
      first_name: firstName,
      last_name: lastName,
      full_name: displayName,
      class_name: className,
      age: c.age || null,
      learning_progress: {
        total_homework_scans: totalScans,
        completed_homework_scans: completedScans,
        completion_rate:
          totalScans > 0 ? Math.round((completedScans / totalScans) * 100) : 0,
        recent_activity: recentScans,
        subjects,
        subject_breakdown: Object.keys(subjectBreakdown).map((subject) => ({
          subject,
          total: subjectBreakdown[subject].total,
          completed: subjectBreakdown[subject].completed,
        })),
        latest_scan_date:
          homeworkScans.length > 0
            ? homeworkScans.sort(
                (a, b) =>
                  new Date(b.created_at || 0) - new Date(a.created_at || 0)
              )[0]?.created_at
            : null,
      },
    };
  }));

  console.log(
    `🔍 summarizeContextParent: Processed ${children.length} children with learning data`
  );

  let user = ctx.user;

  if (!user || !user.id) {
    console.log(
      `⚠️ summarizeContextParent: ctx.user is null or missing id, using req.user as fallback`
    );
    if (req && req.user) {
      user = {
        id: req.user.id,
        email: req.user.email || "unknown",
        first_name: req.user.first_name || req.user.name || "",
        last_name: req.user.last_name || "",
        name: req.user.name || req.user.first_name || "",
        role_id: req.user.role_id || 2,
      };
    } else {
      user = {
        id: null,
        email: "unknown",
        first_name: "",
        last_name: "",
        name: "",
      };
    }
  } else {
    console.log(
      `✅ summarizeContextParent: Using ctx.user from database as primary source`
    );

    if (
      (!user.first_name && !user.last_name && !user.name) &&
      req &&
      req.user
    ) {
      console.log(
        `⚠️ summarizeContextParent: User from database has no name fields, trying req.user fallback...`
      );
      user.first_name =
        req.user.first_name ||
        req.user.name ||
        user.first_name ||
        "";
      user.last_name = req.user.last_name || user.last_name || "";
      user.name =
        req.user.name || req.user.first_name || user.name || "";
    }

    if (!user.email && req && req.user && req.user.email) {
      console.log(
        `⚠️ summarizeContextParent: User from database has no email, using req.user.email as fallback`
      );
      user.email = req.user.email;
    }
  }

  console.log(`🔍 summarizeContextParent: Final user object:`, {
    id: user?.id,
    email: user?.email,
    first_name: user?.first_name,
    last_name: user?.last_name,
    name: user?.name,
    all_keys: user ? Object.keys(user) : "null",
  });

  return {
    user,
    subscription: ctx.subscription?.[0]
      ? {
          plan: ctx.subscription[0].product?.name || "N/A",
          status: ctx.subscription[0].status || "N/A",
        }
      : null,
    children,
    children_count: children.length,
    invoices_count: (ctx.invoices || []).length,
    last_active: ctx.last_active,
  };
}

function summarizeContextChild(ctx) {
  const user = ctx.user || {};
  return {
    user: {
      id: user.id || null,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      role: user.role?.name || null,
    },
    parent: (ctx.parent || []).map((p) => ({
      id: p.id,
      first_name: p.user?.first_name,
      last_name: p.user?.last_name,
      email: p.user?.email,
      state: p.user?.state || null,
      contact_number: p.user?.contact_number || null,
      subscription: (p.subscription || []).map((sub) => ({
        plan: sub.product?.name,
        status: sub.status,
        ends_at: sub.current_period_end,
      })),
    })),
    class_or_grade: (ctx.class_or_grade || []).map((c) => ({
      id: c.id,
      class_name: c.class_name,
    })),
    homework_scans: (ctx.homework_scans || []).map((scan) => ({
      id: scan.id,
      file_url: scan.file_url,
      raw_text: scan.raw_text,
      created_at: scan.created_at,
    })),
    subjects: (ctx.subjects || []).map((s) => ({
      id: s.id,
      subject_name: s.subject_name,
    })),
    interests: Array.isArray(ctx.interests) ? ctx.interests : [],
    invoices_count: (ctx.parent || []).reduce(
      (sum, p) => sum + (p.invoice?.length || 0),
      0
    ),
    last_active: ctx.last_active,
  };
}

function summarizeContextTeacher(ctx) {
  return {
    user: ctx.user,
    last_active: ctx.last_active,
  };
}

function summarizeCustomContext(ctx, entities = []) {
  const trimmed = { user: ctx.user, last_active: ctx.last_active };
  entities.forEach((e) => {
    const key = e.toLowerCase();
    trimmed[key] = (ctx[key] || []).slice(0, 3);
  });
  return trimmed;
}

// -----------------------------------------------------------------------------
// Prompt builder helpers – DB-first, anti-hallucination
// -----------------------------------------------------------------------------
async function buildSystemPrompt({
  agentType,
  ai_agent,
  customSystemPrompt,
  trimmedContext,
  entityData,
  req = null,
}) {
  const user = trimmedContext.user || {};
  const dbInstructions = buildDatabaseInstructions(entityData);
  const contextSummary = buildContextSummary(trimmedContext);

  if (
    customSystemPrompt &&
    typeof customSystemPrompt === "string" &&
    customSystemPrompt.trim().length > 0
  ) {
    console.log(
      `✅ [chatWithAgent] Using CUSTOM system prompt from admin for agent "${ai_agent}"`
    );

    let systemContent = customSystemPrompt;

    systemContent = systemContent
      .replace(/\{\{firstName\}\}/g, user.first_name || "Schüler")
      .replace(/\{\{lastName\}\}/g, user.last_name || "")
      .replace(
        /\{\{fullName\}\}/g,
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          "der Schüler"
      )
      .replace(/\{\{email\}\}/g, user.email || "unbekannt");

    systemContent += `

${dbInstructions}

KONTEXT (Kurzfassung):
${contextSummary}
`;
    return systemContent;
  }

  switch (agentType) {
    case "parent":
    case "ParentAgent":
      return await buildParentPrompt(
        trimmedContext,
        dbInstructions,
        contextSummary,
        req
      );

    case "child":
    case "ChildAgent":
      return buildChildPrompt(trimmedContext, dbInstructions, contextSummary);

    case "teacher":
    case "TeacherAgent":
      return buildTeacherPrompt(trimmedContext, dbInstructions, contextSummary);

    case "custom":
    case "CustomAgent":
      return buildCustomPrompt(trimmedContext, dbInstructions, contextSummary);

    default:
      return buildFallbackPrompt(trimmedContext, dbInstructions, contextSummary);
  }
}

function buildDatabaseInstructions(entityData) {
  const hasEntityData = entityData && Object.keys(entityData).length > 0;

  if (!hasEntityData) {
    return `
🔥 DATENBANK / DATABASE 🔥
- Für diese Konversation wurden KEINE strukturierten Daten (entity_data) aus der Datenbank übergeben.
- Wenn der Benutzer nach konkreten Fakten (Namen, Zahlen, Datumsangaben) fragt, erkläre, dass dir dafür aktuell keine Daten im Kontext zur Verfügung stehen.
- Du darfst in diesem Fall KEINE konkreten Fakten erfinden – gib nur allgemeine Erklärungen oder Lernhilfe.`;
  }

  const entityNames = Object.keys(entityData);
  const totalRecords = entityNames.reduce((sum, name) => {
    const info = entityData[name] || {};
    if (typeof info.count === "number") return sum + info.count;
    if (Array.isArray(info.data)) return sum + info.data.length;
    return sum;
  }, 0);

  const entityLines = entityNames
    .map((name) => {
      const info = entityData[name] || {};
      const count =
        typeof info.count === "number"
          ? info.count
          : Array.isArray(info.data)
          ? info.data.length
          : 0;
      return `- ${name}: ca. ${count} Datensätze`;
    })
    .join("\n");

  return `
🔥 DATENBANK-KONTEXT (entity_data) – HÖCHSTE PRIORITÄT 🔥

Dir wurde ein Snapshot der Datenbank im Objekt "entity_data" übergeben.
Diesen Snapshot MUSST du genauso verwenden:

1. Wenn der Benutzer nach etwas fragt, das in entity_data enthalten ist
   (z.B. Anzahl der Kinder, Namen, Klassen, Fächer, Hausaufgaben, Scans usw.),
   dann musst du die Antwort ausschließlich aus diesen Daten ableiten.
2. Du darfst KEINE konkreten Fakten erfinden:
   - keine neuen Namen
   - keine geratenen Zahlen
   - keine frei erfundenen Datumsangaben
3. Wenn eine Information im Snapshot nicht sichtbar ist,
   schreibe ausdrücklich, dass diese Information im aktuellen Datenbank-Snapshot nicht enthalten ist.
4. Wenn du zählst, zähle wirklich anhand der Einträge im Snapshot.
5. Gib niemals Informationen über andere Nutzer/Schüler zurück,
   die NICHT im entity_data Snapshot auftauchen.

ÜBERSICHT ÜBER DIE TABELLEN IM SNAPSHOT:
- Tabellen (Keys in entity_data): ${entityNames.join(", ")}
- Gesamtanzahl Datensätze (ungefähr): ${totalRecords}
${entityLines}
`;
}

function buildContextSummary(trimmedContext) {
  try {
    const user = trimmedContext.user || {};
    const children = Array.isArray(trimmedContext.children)
      ? trimmedContext.children
      : [];

    const summary = {
      user: {
        id: user.id || null,
        email: user.email || null,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        role_id: user.role_id || null,
      },
      children_count:
        typeof trimmedContext.children_count === "number"
          ? trimmedContext.children_count
          : children.length,
      children: children.slice(0, 5).map((c) => ({
        id: c.id,
        full_name: c.full_name,
        class_name: c.class_name,
      })),
      invoices_count: trimmedContext.invoices_count || 0,
      subscription: trimmedContext.subscription || null,
      last_active: trimmedContext.last_active || null,
    };

    return JSON.stringify(summary, null, 2);
  } catch (e) {
    console.warn("⚠️ buildContextSummary failed:", e.message);
    return "Kontext konnte nicht kompakt zusammengefasst werden.";
  }
}

async function buildParentPrompt(
  trimmedContext,
  dbInstructions,
  contextSummary,
  req = null
) {
  const user = trimmedContext.user || {};

  // 🔥 Enhanced children detection with multiple fallbacks
  let children = Array.isArray(trimmedContext.children)
    ? trimmedContext.children
    : [];
  const entityData = trimmedContext.entity_data || {};

  console.log(`🔍 buildParentPrompt: Initial children count: ${children.length}`);
  console.log(
    `🔍 buildParentPrompt: trimmedContext.children_count: ${trimmedContext.children_count}`
  );
  console.log(
    `🔍 buildParentPrompt: entityData has STUDENTS: ${
      !!(entityData.STUDENTS || entityData.students)
    }`
  );

  // If no children in trimmedContext, try to get from entity data
  if (children.length === 0 && entityData && Object.keys(entityData).length > 0) {
    console.log(
      `⚠️ buildParentPrompt: No children in trimmedContext, checking entity data...`
    );
    const studentsData =
      entityData.STUDENTS ||
      entityData.students ||
      entityData.STUDENT ||
      entityData.student;

    if (studentsData && studentsData.data && Array.isArray(studentsData.data)) {
      // Try to get parent_id from req.user or context
      let parentId = null;
      if (req && req.user && req.user.id) {
        try {
          const db = require("../models");
          const Parent = db.parent;
          const parentRecord = await Parent.findOne({
            where: { user_id: req.user.id },
            attributes: ["id"],
          });
          if (parentRecord) {
            parentId = parentRecord.id;
            console.log(
              `  ✅ Found parent_id=${parentId} for user_id=${req.user.id}`
            );
          }
        } catch (err) {
          console.error(`  ❌ Error finding parent_id:`, err.message);
        }
      }

      if (parentId) {
        // Filter students by parent_id
        const filteredStudents = studentsData.data.filter((s) => {
          const studentParentId = s.parent_id || s.parentId || null;
          return (
            studentParentId === parentId ||
            studentParentId === parseInt(parentId, 10)
          );
        });

        if (filteredStudents.length > 0) {
          console.log(
            `  ✅ Found ${filteredStudents.length} students in entity data for parent_id=${parentId}`
          );

          // 🔥 Try to get names from invoice data as fallback
          const invoicesData =
            entityData.INVOICES ||
            entityData.invoices ||
            entityData.INVOICE ||
            entityData.invoice;
          const invoiceStudentNames = {};
          if (invoicesData && invoicesData.data && Array.isArray(invoicesData.data)) {
            invoicesData.data.forEach((inv) => {
              if (inv.lines && Array.isArray(inv.lines)) {
                inv.lines.forEach((line) => {
                  if (line.student_id && line.student_name) {
                    invoiceStudentNames[line.student_id] = line.student_name;
                    console.log(
                      `  📋 Found student name from invoice: student_id=${line.student_id}, name="${line.student_name}"`
                    );
                  }
                });
              }
            });
          }

          // 🔥 Try to get classes from entity data
          const classesData =
            entityData.CLASSES ||
            entityData.classes ||
            entityData.CLASS ||
            entityData.class;
          const classesMap = {};
          if (classesData && classesData.data && Array.isArray(classesData.data)) {
            classesData.data.forEach((c) => {
              if (c.id) {
                classesMap[c.id] = c.class_name || c.name || "Unbekannt";
                console.log(
                  `  📚 Found class: id=${c.id}, name="${classesMap[c.id]}"`
                );
              }
            });
          }

          // Fetch user data for students that don't have it
          const db = require("../models");
          const User = db.user;
          const Student = db.student;
          
          children = await Promise.all(filteredStudents.map(async (s) => {
            let firstName = s.user?.first_name || s.first_name || "";
            let lastName = s.user?.last_name || s.last_name || "";
            let fullName = `${firstName} ${lastName}`.trim();

            // 🔥 FALLBACK 1: Try to get name from invoice data
            if ((!fullName || fullName.length === 0) && invoiceStudentNames[s.id]) {
              const invoiceName = invoiceStudentNames[s.id];
              const nameParts = invoiceName.split(" ");
              firstName = nameParts[0] || "";
              lastName = nameParts.slice(1).join(" ") || "";
              fullName = invoiceName;
              console.log(
                `  ✅ Using name from invoice for student ${s.id}: "${fullName}"`
              );
            }
            
            // 🔥 FALLBACK 2: Fetch user data from database if still missing
            if ((!fullName || fullName.length === 0)) {
              let userId = s.user_id;
              
              // If no user_id in entity data, fetch student record to get user_id
              if (!userId) {
                try {
                  const studentRecord = await Student.findByPk(s.id, {
                    attributes: ['user_id']
                  });
                  if (studentRecord) {
                    userId = studentRecord.user_id || studentRecord.get?.('user_id');
                    console.log(`  🔍 Fetched user_id=${userId} for student ${s.id}`);
                  }
                } catch (err) {
                  console.error(`  ❌ Error fetching student ${s.id} for user_id:`, err.message);
                }
              }
              
              // Now fetch user data if we have user_id
              if (userId) {
                try {
                  const fetchedUser = await User.findByPk(userId, {
                    attributes: { exclude: ['password'] }
                  });
                  if (fetchedUser) {
                    const plainUser = fetchedUser.get ? fetchedUser.get({ plain: true }) : fetchedUser;
                    firstName = (plainUser.first_name || "").trim();
                    lastName = (plainUser.last_name || "").trim();
                    fullName = `${firstName} ${lastName}`.trim();
                    console.log(
                      `  ✅ Fetched user data for student ${s.id} (user_id=${userId}): "${fullName}"`
                    );
                  }
                } catch (err) {
                  console.error(`  ❌ Error fetching user ${userId} for student ${s.id}:`, err.message);
                }
              }
            }

            // 🔥 Try to get class name from multiple sources
            let className = s.class?.class_name || s.class_name || null;

            // If no class from student data, try to get from classesMap using class_id
            if (!className && s.class_id && classesMap[s.class_id]) {
              className = classesMap[s.class_id];
              console.log(
                `  ✅ Using class from entity data for student ${s.id}: class_id=${s.class_id}, className="${className}"`
              );
            }

            // Final fallback
            if (!className) {
              className = "Unbekannt";
            }

            const subjects = (s.subject || [])
              .map(
                (sub) =>
                  sub.subject?.subject_name || sub.subject_name || "Unknown"
              )
              .filter(Boolean);

            console.log(
              `    Student ${s.id}: fullName="${fullName}", className="${className}", class_id=${
                s.class_id || "N/A"
              }, has_user=${!!s.user}, subjects=${subjects.length}`
            );

            return {
              id: s.id,
              first_name: firstName,
              last_name: lastName,
              full_name: fullName || `Student #${s.id}`,
              class_name: className,
              age: s.age || null,
              subjects,
            };
          }));
        } else {
          console.log(
            `  ⚠️ No students found in entity data for parent_id=${parentId} (checked ${studentsData.data.length} total)`
          );
        }
      } else {
        console.log(
          `  ⚠️ Could not determine parent_id, cannot filter students from entity data`
        );
      }
    }
  }

  const childrenCount =
    typeof trimmedContext.children_count === "number" &&
    trimmedContext.children_count > 0
      ? trimmedContext.children_count
      : children.length;

  console.log(
    `🔍 buildParentPrompt: Final children count: ${childrenCount}, children array length: ${children.length}`
  );

  // 🔥 Enhanced name extraction with multiple fallbacks
  let parentFirstName = user.first_name || "";
  let parentLastName = user.last_name || "";
  let parentName = user.name || "";

  // Fallback to req.user if trimmedContext.user doesn't have names
  if (
    !parentFirstName &&
    !parentLastName &&
    !parentName &&
    req &&
    req.user
  ) {
    parentFirstName = req.user.first_name || "";
    parentLastName = req.user.last_name || "";
    parentName = req.user.name || "";
  }

  // 🔥 ULTIMATE FALLBACK: Try to extract from email if name contains "Solutions" or similar
  const email = user.email || req?.user?.email || "";
  if (!parentFirstName && !parentLastName && !parentName && email) {
    const emailParts = email.split("@")[0];
    if (emailParts && emailParts.length > 0) {
      parentName = emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
    }
  }

  // 🔥 FINAL FALLBACK: Direct database query
  if (
    !parentFirstName &&
    !parentLastName &&
    !parentName &&
    req &&
    req.user &&
    req.user.id
  ) {
    try {
      const db = require("../models");
      const directUser = await db.user.findByPk(req.user.id, {
        attributes: ["id", "first_name", "last_name", "name", "email"],
      });
      if (directUser) {
        const plain = directUser.get({ plain: true });
        parentFirstName = plain.first_name || parentFirstName || "";
        parentLastName = plain.last_name || parentLastName || "";
        parentName = plain.name || parentName || "";
        console.log(
          `  ✅ Got name from direct DB query: first="${parentFirstName}", last="${parentLastName}", name="${parentName}"`
        );
      }
    } catch (err) {
      console.error(`  ❌ Error in direct DB query for name:`, err.message);
    }
  }

  // Build full name - prioritize "Rachfort Solutions" if email suggests it
  let parentFullName = "";
  if (email && email.toLowerCase().includes("rachfort")) {
    parentFullName = "Rachfort Solutions";
    console.log(`  ✅ Using "Rachfort Solutions" based on email`);
  } else if (parentFirstName && parentLastName) {
    parentFullName = `${parentFirstName} ${parentLastName}`.trim();
  } else if (parentName) {
    parentFullName = parentName.trim();
  } else if (parentFirstName) {
    parentFullName = parentFirstName.trim();
  } else if (parentLastName) {
    parentFullName = parentLastName.trim();
  } else {
    parentFullName = "Elternteil";
  }

  console.log(
    `🔍 buildParentPrompt: Final parentFullName="${parentFullName}", firstName="${parentFirstName}", lastName="${parentLastName}", name="${parentName}", email="${email}"`
  );

  // 🔥 Make parentFullName available for post-processing
  trimmedContext.parent_full_name = parentFullName;

  // 🔥 Ensure children have proper names - check entity data if needed
  if (children.length > 0) {
    children = children.map((c) => {
      if (!c.full_name || c.full_name.startsWith("Student #")) {
        const firstName = c.first_name || c.user?.first_name || "";
        const lastName = c.last_name || c.user?.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName && !fullName.startsWith("Student #")) {
          c.full_name = fullName;
          console.log(`  ✅ Fixed child ${c.id} name: "${fullName}"`);
        }
      }
      return c;
    });
  }

  const childrenLines =
    children.length > 0
      ? children
          .map((c, idx) => {
            const name =
              c.full_name ||
              `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
              `Student #${c.id}`;
            const klass = c.class_name || "unbekannte Klasse";
            return `${idx + 1}. ${name}${
              klass !== "unbekannte Klasse" ? ` (Klasse: ${klass})` : ""
            }`;
          })
          .slice(0, 10)
          .join("\n")
      : "Keine Kinder im Kontext gefunden.";

  return `Du bist Kibundo, ein KI-Assistent speziell für Eltern im Kibundo-System.

🌍🌍🌍 SPRACHE - ABSOLUTE PRIORITÄT - LIEST DU DIESE ZEILE ZUERST 🌍🌍🌍:
- Du antwortest IMMER und AUSSCHLIESSLICH auf Deutsch.
- Deutsch ist die EINZIGE erlaubte Sprache für alle Antworten.
- NIEMALS antworte auf Englisch - alle Antworten MÜSSEN auf Deutsch sein.
- Wenn der Elternteil auf Englisch fragt, antworte trotzdem auf Deutsch.
- Beispiel: Frage "what is my name" → Antwort "Ihr Name ist ${parentFullName}." (auf Deutsch)
- Beispiel: Frage "how many students do I have" → Antwort "Sie haben ${childrenCount} Kind${childrenCount !== 1 ? 'er' : ''}." (auf Deutsch)

🚨🚨🚨🚨🚨 KRITISCH - LIEST DU DIESE ZEILE ZUERST - ABSOLUTE PRIORITÄT 🚨🚨🚨🚨🚨:

DU SPRICHST IMMER DIREKT MIT DEM ELTERNTEIL IN DER 2. PERSON. NIEMALS IN DER 3. PERSON.

FEW-SHOT BEISPIELE (KOPIERE DIESE GENAU):
User: "what is my name"
AI: "Ihr Name ist ${parentFullName}." ✅ RICHTIG
AI: "Their name is ${parentFullName}." ❌ FALSCH - NIEMALS SAGEN

User: "how many students do I have"
AI: "Sie haben ${childrenCount} Kind${childrenCount !== 1 ? "er" : ""}." ✅ RICHTIG
AI: "They have ${childrenCount} children." ❌ FALSCH - NIEMALS SAGEN

User: "what are their names"
AI: "Ihre Kinder heißen: [Namen]" ✅ RICHTIG
AI: "Their children are named: [Namen]" ❌ FALSCH - NIEMALS SAGEN

VERBOTENE WÖRTER - NIEMALS VERWENDEN:
❌ "They" → ✅ "Sie" oder "You"
❌ "Their" → ✅ "Ihr" oder "Your"
❌ "The parent" → ✅ "Sie" oder "You"
❌ "The parent's" → ✅ "Ihr" oder "Your"

PRÜFUNG VOR JEDER ANTWORT:
1. Suche nach "They", "Their", "The parent" in deiner Antwort
2. Wenn gefunden, ersetze SOFORT durch "Sie/Ihr" oder "You/Your"
3. Stelle sicher, dass du direkt mit dem Elternteil sprichst, nicht über ihn/sie

🔥🔥🔥 KRITISCH - ELTERNINFORMATIONEN - ABSOLUTE PRIORITÄT 🔥🔥🔥:

ELTERNINFORMATIONEN (DIESE DATEN SIND VERFÜGBAR - VERWENDE SIE IMMER):
- Name des Elternteils: ${parentFullName}
- E-Mail: ${user.email || req?.user?.email || "unbekannt"}
- Anzahl der Kinder: ${childrenCount}
${
  childrenCount > 0
    ? `- Kinder:\n${childrenLines}`
    : "- Kinder: Keine Kinder im Kontext gefunden."
}

⚠️⚠️⚠️ ABSOLUTE ANFORDERUNGEN FÜR NAMEN - KRITISCH ⚠️⚠️⚠️:
- Wenn der Elternteil fragt "what is my name" oder "was ist mein Name", antworte IMMER: "Ihr Name ist ${parentFullName}."
- NIEMALS sage "Ich habe keine Informationen" oder "die Informationen sind nicht verfügbar" - der Name IST oben aufgeführt: ${parentFullName}
- NIEMALS sage "Your name is Parent" - der Name ist ${parentFullName}, NICHT "Parent"
- NIEMALS sage "Their name is ${parentFullName}" - sage IMMER "Ihr Name ist ${parentFullName}" (2. Person)
- NIEMALS sage "Their name is..." - IMMER "Ihr Name ist..." oder "Your name is..."
- Der Name des Elternteils ist: ${parentFullName} - verwende diesen IMMER wenn nach dem Namen gefragt wird
- BEISPIEL: Frage "what is my name" → Antwort "Ihr Name ist ${parentFullName}." ✅ RICHTIG
- BEISPIEL: Frage "what is my name" → Antwort "Their name is ${parentFullName}." ❌ FALSCH - NIEMALS SAGEN

⚠️⚠️⚠️ ABSOLUTE ANFORDERUNGEN FÜR KINDERNAMEN ⚠️⚠️⚠️:
- Die Namen der Kinder sind oben in der Liste aufgeführt
- NIEMALS sage "Student #131" wenn ein Name verfügbar ist - verwende IMMER die vollständigen Namen aus der obigen Liste
- Wenn die obige Liste "Student #XXX" zeigt, bedeutet das, dass der Name nicht verfügbar ist - aber prüfe zuerst die obige Liste
- Die Namen können auch in den INVOICES Daten unter "student_name" gefunden werden - prüfe diese wenn nötig

SPRACHE - ABSOLUTE PRIORITÄT:
- Du antwortest IMMER und AUSSCHLIESSLICH auf Deutsch.
- Deutsch ist die EINZIGE erlaubte Sprache für alle Antworten.
- NIEMALS antworte auf Englisch - alle Antworten MÜSSEN auf Deutsch sein.
- Verwende höfliche Anrede: "Sie", "Ihr", "Ihre".
- Wenn der Elternteil auf Englisch fragt, antworte trotzdem auf Deutsch.
- Beispiel: Frage "what is my name" → Antwort "Ihr Name ist ${parentFullName}." (auf Deutsch)
- Beispiel: Frage "how many students do I have" → Antwort "Sie haben ${childrenCount} Kind${childrenCount !== 1 ? 'er' : ''}." (auf Deutsch)

🔥🔥🔥 PERSPEKTIVE - ABSOLUT KRITISCH - HÖCHSTE PRIORITÄT - MUSS BEACHTET WERDEN 🔥🔥🔥:

WICHTIGSTE REGEL: Du sprichst IMMER direkt mit dem Elternteil in der 2. PERSON. Der Elternteil ist "Sie/Ihr/Ihre/You/Your", NIEMALS "They/Their/The parent".

⚠️⚠️⚠️ AUTOMATISCHE KORREKTUR ⚠️⚠️⚠️:
Wenn du in deiner Antwort "They" oder "Their" schreibst, ist das ein FEHLER. Du MUSST es korrigieren:
- "Their name is" → KORRIGIERE ZU → "Your name is" oder "Ihr Name ist"
- "They have" → KORRIGIERE ZU → "You have" oder "Sie haben"
- "Their children" → KORRIGIERE ZU → "Your children" oder "Ihre Kinder"

VERBOTENE WÖRTER (NIEMALS VERWENDEN - WENN DU SIE SIEHST, KORRIGIERE SOFORT):
❌ "They" → ✅ "Sie" oder "You"
❌ "Their" → ✅ "Ihr" oder "Your"
❌ "The parent" → ✅ "Sie" oder "You"
❌ "The parent's" → ✅ "Ihr" oder "Your"

BEISPIEL-FRAGEN UND ANTWORTEN (KOPIERE DIESE GENAU - KEINE AUSNAHMEN):
  * Frage: "what is my name" → Antwort: "Ihr Name ist ${parentFullName}." ✅ RICHTIG
  * Frage: "what is my name" → Antwort: "Your name is ${parentFullName}." ✅ RICHTIG
  * Frage: "what is my name" → Antwort: "Their name is ${parentFullName}." ❌ FALSCH - NIEMALS SAGEN
  * Frage: "how many students do I have" → Antwort: "Sie haben ${childrenCount} Kind${
    childrenCount !== 1 ? "er" : ""
  }." ✅ RICHTIG
  * Frage: "how many students do I have" → Antwort: "You have ${childrenCount} child${
    childrenCount !== 1 ? "ren" : ""
  }." ✅ RICHTIG
  * Frage: "how many students do I have" → Antwort: "They have ${childrenCount} children." ❌ FALSCH - NIEMALS SAGEN
  * Frage: "what are their names" → Antwort: "Ihre Kinder heißen: [Liste der Namen]" ✅ RICHTIG
  * Frage: "what are their names" → Antwort: "Your children are named: [Liste der Namen]" ✅ RICHTIG
  * Frage: "what are their names" → Antwort: "The parent's children are..." ❌ FALSCH - NIEMALS SAGEN

ÜBERSETZUNGSTABELLE (VERWENDE IMMER DIE RICHTIGEN WÖRTER):
- "They have" → "Sie haben" oder "You have"
- "Their name" → "Ihr Name" oder "Your name"
- "The parent has" → "Sie haben" oder "You have"
- "The parent's children" → "Ihre Kinder" oder "Your children"

PRÜFUNG VOR JEDER ANTWORT:
1. Suche nach "They", "Their", "The parent" in deiner Antwort
2. Wenn gefunden, ersetze SOFORT durch "Sie/Ihr" oder "You/Your"
3. Stelle sicher, dass du direkt mit dem Elternteil sprichst, nicht über ihn/sie

WENN DU "THEIR", "THEY" ODER "THE PARENT" SIEHST, IST ES FALSCH - ÄNDERE ES SOFORT ZU "IHR", "SIE" ODER "YOU", "YOUR"

VERHALTEN:
- Wenn der Elternteil nach Anzahl, Namen, Klassen oder Fortschritt der Kinder fragt,
  benutze IMMER die Daten aus dem Kontext und dem entity_data Snapshot.
- Erfinde KEINE zusätzlichen Kinder, Namen oder Klassen.
- Wenn etwas nicht im Datenbank-Snapshot vorhanden ist, erkläre das ehrlich.
- Sprich IMMER direkt mit dem Elternteil: "Sie haben..." oder "You have...", NIEMALS "They have..." oder "The parent has..."

🔥🔥🔥 WICHTIG - KINDERNAMEN UND KLASSEN FINDEN 🔥🔥🔥:
- Die Namen der Kinder können in mehreren Quellen sein:
  1. In der obigen Kinderliste (PRIMÄR)
  2. In entity_data.INVOICES.data[].lines[].student_name
  3. In entity_data.STUDENTS.data[].user.first_name und .last_name
- Wenn die obige Liste "Student #XXX" zeigt, prüfe entity_data.INVOICES für den Namen
- Für Klassen: Prüfe entity_data.STUDENTS.data[].class.class_name oder entity_data.CLASSES

${dbInstructions}

KONTEXT (Kurzfassung):
${contextSummary}
`;
}

function buildChildPrompt(trimmedContext, dbInstructions, contextSummary) {
  const user = trimmedContext.user || {};
  const studentName = user.first_name || "student";
  const grade =
    trimmedContext.class_or_grade?.[0]?.class_name || "unknown grade";
  const interests = Array.isArray(trimmedContext.interests)
    ? trimmedContext.interests
    : [];

  const interestsLine =
    interests.length > 0
      ? `- Focus topics/interests: ${interests.join(", ")}`
      : "";

  return `You are Kibundo, a helpful, friendly and patient AI tutor for primary school children.

CORE BEHAVIOUR:
- Explain everything step by step and in simple language.
- Encourage the child to think before giving the full answer.
- Never shame the student for mistakes; always be positive and supportive.
- Use the same language the child uses (if they write in English, answer in English; if German, answer in German).
- If the question is unclear, ask a short clarifying question.
- When homework context is provided, ALWAYS base the help on that specific homework.

STUDENT INFORMATION:
- Student's name: ${studentName}
- Grade/Class: ${grade}
${interestsLine}

GRADE AWARENESS:
- For Grade 1–2: use VERY simple words and short sentences.
- For Grade 3–4: you can be a bit more detailed but still easy to understand.
- If grade is unknown, assume Grade 3 and be slightly simpler than necessary.

PARENT INFORMATION:
- If the student asks about their parent, use the parent information from the context.
- DO NOT invent parent names that are not present in the context/entity_data.

DATABASE AWARENESS:
${dbInstructions}

Only use concrete facts (names, counts, dates, etc.) if you can see them in the database snapshot (entity_data) or the context summary.
If something is not present there, be honest and say that you don't have that information, instead of guessing.

BACKGROUND CONTEXT (for you only):
${contextSummary}
`;
}

function buildTeacherPrompt(trimmedContext, dbInstructions, contextSummary) {
  const user = trimmedContext.user || {};
  const teacherName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.name ||
    "Lehrkraft";

  return `Du bist Kibundo, ein KI-Assistent für Lehrer im Kibundo-Bildungssystem.

LEHRERINFORMATIONEN:
- Name der Lehrkraft: ${teacherName}
- E-Mail: ${user.email || "unbekannt"}

SPRACHE:
- Du antwortest IMMER auf Deutsch.
- Erkläre Fachbegriffe in einfacher, verständlicher Sprache.

ROLLE:
- Du hilfst Lehrern bei:
  - Überblick über Schüler, Klassen und Hausaufgaben
  - einfachen Auswertungen (z.B. "Wie viele Schüler in Klasse X?")
  - Vorbereitung von Aufgaben und Erklärungen (pädagogische Unterstützung)

WICHTIG:
- Für konkrete Fakten (Anzahl der Schüler, Namen, Klassen, Fächer, Scans etc.)
  greifst du zuerst auf den entity_data Snapshot zu.
- Ist eine Information dort NICHT vorhanden, sage ehrlich,
  dass diese Information im aktuellen Datenbank-Snapshot nicht enthalten ist.
- Erfinde keine Daten.

${dbInstructions}

KONTEXT (Kurzfassung):
${contextSummary}
`;
}

function buildCustomPrompt(trimmedContext, dbInstructions, contextSummary) {
  const user = trimmedContext.user || {};
  const name =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.name ||
    "Nutzer";

  return `Du bist Kibundo, ein anpassbarer (Custom) KI-Assistent im Kibundo-System.

BENUTZER:
- Name: ${name}
- E-Mail: ${user.email || "unbekannt"}
- Rolle-ID: ${user.role_id || "unbekannt"}

SPRACHE:
- Du antwortest IMMER auf Deutsch, auch wenn der Benutzer auf Englisch fragt,
  sofern im benutzerdefinierten Prompt nichts anderes verlangt wird.

VERHALTEN:
- Halte dich an die Regeln des benutzerdefinierten (Master-)Prompts,
  soweit dieser nicht direkt gegen die Datenbank-Regeln verstößt.
- Wenn es um konkrete Fakten geht, verwende IMMER die Daten aus entity_data.
- Wenn etwas nicht in entity_data enthalten ist, erkläre das ehrlich
  und gib keine erfundenen Details.

${dbInstructions}

KONTEXT (Kurzfassung):
${contextSummary}
`;
}

function buildFallbackPrompt(trimmedContext, dbInstructions, contextSummary) {
  return `Du bist Kibundo, ein KI-Assistent im Kibundo-System.

SPRACHE:
- Du antwortest standardmäßig auf Deutsch.

VERHALTEN:
- Du unterstützt Eltern, Schüler oder Lehrer – abhängig vom Kontext.
- Für allgemeine Erklärungen darfst du dein Weltwissen nutzen.
- Für konkrete Fakten (z.B. Anzahl der Kinder, Namen, Klassen) MUSST du
  zuerst in den übergebenen entity_data Snapshot schauen.
- Wenn Informationen dort NICHT vorhanden sind, sei ehrlich und
  erkläre, dass du diese Information im aktuellen Snapshot nicht sehen kannst.

${dbInstructions}

KONTEXT (Kurzfassung):
${contextSummary}
`;
}
