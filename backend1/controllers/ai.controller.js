const { buildContext } = require('../services/parentContextBuilder');
const { childBuildContext } = require('../services/childContextBuilder');
const { teacherContextBuilder } = require('../services/teacherContextBuilder');
const { buildCustomAgentContext } = require('../services/customAgentContextBuilder');
const { fetchEntityData, getAgentEntities } = require('../services/entityDataFetcher');
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.chatWithAgent = async (req, res) => {
  try {
    const { question,ai_agent,entities, class: classFilter, state, scanId, mode, conversationId } = req.body;
    console.log("🎯 AI Chat received ai_agent:", ai_agent);

    // 🔥 STEP 1: Fetch agent entities from database if agent name is provided
    let agentEntities = [];
    let agentInfo = null;
    
    if (ai_agent) {
      agentInfo = await getAgentEntities(ai_agent);
      if (agentInfo && agentInfo.entities) {
        agentEntities = Array.isArray(agentInfo.entities) ? agentInfo.entities : [];
        console.log(`✅ Found agent "${ai_agent}" with entities:`, agentEntities);
      }
    }
    
    // Use entities from request body if provided, otherwise use agent's entities
    const entitiesToFetch = entities || agentEntities || [];
    
    // Build structured context
    let contextObj = {};
    let trimmedContext = {};
    let entityData = {}; // 🔥 Declare entityData at top level so it's accessible in system prompt
    
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
       // 🔥 DEBUG: Log req.user before building context
       console.log(`🔍 AI Controller (Parent): req.user=`, req.user ? { id: req.user.id, email: req.user.email, role_id: req.user.role_id } : 'null/undefined');
       console.log(`🔍 AI Controller (Parent): req.body.user=`, req.body?.user ? { id: req.body.user.id, email: req.body.user.email } : 'null/undefined');
       
       contextObj = await buildContext(req);
       console.log(`🔍 AI Controller: contextObj keys=`, Object.keys(contextObj));
       console.log(`🔍 AI Controller: contextObj.user=`, contextObj.user ? { id: contextObj.user.id, email: contextObj.user.email } : contextObj.user);
       console.log(`🔍 AI Controller: contextObj.parent length=${Array.isArray(contextObj.parent) ? contextObj.parent.length : 'not array'}`);
       console.log(`🔍 AI Controller: contextObj.children length=${contextObj.children?.length || 0}`);
       if (contextObj.error) {
         console.log(`❌ AI Controller: buildContext returned error: ${contextObj.error}`);
       }
       trimmedContext = summarizeContextParent(contextObj, req);
       console.log(`🔍 AI Controller: trimmedContext.children_count=${trimmedContext.children_count}`);
       
       // 🔥 STEP 2: Fetch data from entity tables WITH parent context
       // Extract parent ID from context for filtering
       const parentId = contextObj.parent?.[0]?.id || null;
       const userId = req.user?.id || null;
       
       if (entitiesToFetch.length > 0) {
         console.log(`📊 Fetching data from entities for parent:`, entitiesToFetch, `parentId: ${parentId}, userId: ${userId}`);
         entityData = await fetchEntityData(entitiesToFetch, {
           class: classFilter,
           state: state,
           userId: userId,
           parentId: parentId
         });
         console.log(`✅ Fetched entity data counts:`, Object.keys(entityData).map(k => `${k}: ${entityData[k].count}`).join(', '));
       }
       
       // Add entity data to trimmed context
       if (Object.keys(entityData).length > 0) {
         trimmedContext.entity_data = entityData;
         trimmedContext.entities_summary = Object.keys(entityData).map(entityName => {
           const data = entityData[entityName];
           return `${entityName}: ${data.count} records${data.error ? ` (error: ${data.error})` : ''}`;
         }).join(', ');
         console.log(`📊 Entity data summary:`, trimmedContext.entities_summary);
       }
      }
      else if(agentType === "child" || ai_agent == "ChildAgent")
      {
        contextObj = await childBuildContext(req)
        trimmedContext = summarizeContextChild(contextObj);
        
        // 🔥 STEP 2: Fetch data from entity tables WITH user context
        const userId = req.user?.id || null;
        if (entitiesToFetch.length > 0) {
          console.log(`📊 Fetching data from entities for child:`, entitiesToFetch, `userId: ${userId}`);
          entityData = await fetchEntityData(entitiesToFetch, {
            class: classFilter,
            state: state,
            userId: userId
          });
          console.log(`✅ Fetched entity data counts:`, Object.keys(entityData).map(k => `${k}: ${entityData[k].count}`).join(', '));
        }
        
        // Add entity data to trimmed context
        if (Object.keys(entityData).length > 0) {
          trimmedContext.entity_data = entityData;
          trimmedContext.entities_summary = Object.keys(entityData).map(entityName => {
            const data = entityData[entityName];
            return `${entityName}: ${data.count} records${data.error ? ` (error: ${data.error})` : ''}`;
          }).join(', ');
          console.log(`📊 Entity data summary:`, trimmedContext.entities_summary);
        }
        
        // Add specific homework context if scanId is provided
        if (scanId && mode === "homework") {
          console.log("🔍 AI Chat: Fetching homework context for scanId:", scanId, "mode:", mode);
          try {
            const { pool } = require('../config/db.js');
            // Fetch homework scan with task type
            const scanResult = await pool.query(`
              SELECT raw_text, detected_subject, task_type
              FROM homework_scans WHERE id=$1
            `, [scanId]);
            if (scanResult.rows[0]) {
              const scan = scanResult.rows[0];
              trimmedContext.homework_context = `CURRENT HOMEWORK: ${scan.raw_text}`;
              trimmedContext.homework_subject = scan.detected_subject || null;
              trimmedContext.homework_task_type = scan.task_type || null; // 'solvable' or 'creative'
              console.log("✅ AI Chat: Homework context found:", scan.raw_text?.substring(0, 100) + "...");
              console.log("✅ AI Chat: Task type:", scan.task_type || "not set");
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
        
        // 🔥 STEP 2: Fetch data from entity tables WITH user context
        const userId = req.user?.id || null;
        if (entitiesToFetch.length > 0) {
          console.log(`📊 Fetching data from entities for teacher:`, entitiesToFetch, `userId: ${userId}`);
          entityData = await fetchEntityData(entitiesToFetch, {
            class: classFilter,
            state: state,
            userId: userId
          });
          console.log(`✅ Fetched entity data counts:`, Object.keys(entityData).map(k => `${k}: ${entityData[k].count}`).join(', '));
        }
        
        // Add entity data to trimmed context
        if (Object.keys(entityData).length > 0) {
          trimmedContext.entity_data = entityData;
          trimmedContext.entities_summary = Object.keys(entityData).map(entityName => {
            const data = entityData[entityName];
            return `${entityName}: ${data.count} records${data.error ? ` (error: ${data.error})` : ''}`;
          }).join(', ');
          console.log(`📊 Entity data summary:`, trimmedContext.entities_summary);
        }
      }
      else if (agentType === "custom" || ai_agent === "CustomAgent") {
      // For custom agents, use the dynamic builder
      
      // 🔥 Also include user context and parent context if user is a parent
      let parentId = null;
      let parentContext = null;
      if (req.user?.role_id === 2) {
        // User is a parent - get parent ID for entity filtering
        parentContext = await buildContext(req);
        const parentTrimmed = summarizeContextParent(parentContext, req);
        parentId = parentContext.parent?.[0]?.id || null;
        console.log("✅ Custom agent: Parent ID for filtering:", parentId);
      }
      
      // Fetch entity data with appropriate context
      const userId = req.user?.id || null;
      if (entitiesToFetch.length > 0) {
        console.log(`📊 Fetching data from entities for custom agent:`, entitiesToFetch, `userId: ${userId}, parentId: ${parentId}`);
        entityData = await fetchEntityData(entitiesToFetch, {
          class: classFilter,
          state: state,
          userId: userId,
          parentId: parentId
        });
        console.log(`✅ Fetched entity data counts:`, Object.keys(entityData).map(k => `${k}: ${entityData[k].count}`).join(', '));
      }
      
      contextObj = await buildCustomAgentContext({
        user: req.user,
        entities: entitiesToFetch, // Use entities from agent or request
        class: classFilter,
        state
      });
    
      // Custom agents already have entity_data in their context, but we'll override with filtered data
      trimmedContext = contextObj || {};
      trimmedContext.entity_data = entityData;
      trimmedContext.entities_summary = Object.keys(entityData).map(entityName => {
        const data = entityData[entityName];
        return `${entityName}: ${data.count} records${data.error ? ` (error: ${data.error})` : ''}`;
      }).join(', ');
      
      // 🔥 Also include user context and parent context if user is a parent
      if (req.user?.role_id === 2 && parentContext) {
        // User is a parent - include parent context with children
        const parentTrimmed = summarizeContextParent(parentContext, req);
        trimmedContext.user = parentTrimmed.user;
        trimmedContext.children = parentTrimmed.children;
        trimmedContext.children_count = parentTrimmed.children_count;
        console.log("✅ Custom agent: Added parent context with", parentTrimmed.children_count, "children");
      } else if (req.user?.role_id === 1) {
        // User is a student - include student context
        const studentContext = await childBuildContext(req);
        const studentTrimmed = summarizeContextChild(studentContext);
        trimmedContext.user = studentTrimmed.user;
        trimmedContext.class_or_grade = studentTrimmed.class_or_grade;
        trimmedContext.subjects = studentTrimmed.subjects;
        console.log("✅ Custom agent: Added student context");
      } else {
        // Include basic user info
        trimmedContext.user = {
          id: req.user?.id,
          first_name: req.user?.first_name,
          last_name: req.user?.last_name,
          email: req.user?.email,
          role_id: req.user?.role_id
        };
      }
    } else {
      // Fallback to child context for unknown agents
      console.log("🤖 Unknown agent type, falling back to child context:", ai_agent);
      contextObj = await childBuildContext(req)
      trimmedContext = summarizeContextChild(contextObj);
      
      // 🔥 STEP 2: Fetch data from entity tables WITH user context
      const userId = req.user?.id || null;
      if (entitiesToFetch.length > 0) {
        console.log(`📊 Fetching data from entities for unknown agent:`, entitiesToFetch, `userId: ${userId}`);
        entityData = await fetchEntityData(entitiesToFetch, {
          class: classFilter,
          state: state,
          userId: userId
        });
        console.log(`✅ Fetched entity data counts:`, Object.keys(entityData).map(k => `${k}: ${entityData[k].count}`).join(', '));
      }
      
      // Add entity data to trimmed context
      if (Object.keys(entityData).length > 0) {
        trimmedContext.entity_data = entityData;
        trimmedContext.entities_summary = Object.keys(entityData).map(entityName => {
          const data = entityData[entityName];
          return `${entityName}: ${data.count} records${data.error ? ` (error: ${data.error})` : ''}`;
        }).join(', ');
        console.log(`📊 Entity data summary:`, trimmedContext.entities_summary);
      }
    }

    console.log("🎯 Full context object:", JSON.stringify(contextObj, null, 2));
    console.log("🎯 Trimmed context:", JSON.stringify(trimmedContext, null, 2));
     
    // Build system content - different prompts for parent vs child agents
    let systemContent;
    
    if (agentType === "parent" || ai_agent == "ParentAgent") {
      // PARENT AGENT PROMPT
      const childrenInfo = trimmedContext.children || [];
      const childrenCount = trimmedContext.children_count || childrenInfo.length;
      const childrenList = childrenInfo.map((c, idx) => 
        `${idx + 1}. ${c.full_name}${c.class_name ? ` (Klasse: ${c.class_name})` : ''}${c.age ? `, Alter: ${c.age}` : ''}`
      ).join('\n');
      
      systemContent = `Du bist Kibundo, ein KI-Assistent für Eltern im Kibundo-Bildungssystem.

ELTERNINFORMATIONEN:
- Name des Elternteils: ${trimmedContext.user?.first_name || ''} ${trimmedContext.user?.last_name || ''}
- E-Mail: ${trimmedContext.user?.email || 'unbekannt'}

KINDERINFORMATIONEN:
- Anzahl der Kinder: ${childrenCount}
${childrenCount > 0 ? `- Liste der Kinder:\n${childrenList}` : '- Keine Kinder registriert'}

ABSOLUTE ANFORDERUNGEN - BEACHTE DIESE GENAU:
1. Du bist ein Assistent für Eltern - beantworte Fragen über ihre Kinder, Abrechnung, Abonnements und die Plattform
2. Wenn nach der Anzahl der Kinder gefragt wird, sage IMMER: "Sie haben ${childrenCount} Kind${childrenCount !== 1 ? 'er' : ''} registriert"
3. ${childrenCount > 0 ? `Wenn nach den Namen der Kinder gefragt wird, nenne IMMER diese Liste: ${childrenList.split('\n').join(', ')}` : 'Keine Kinder vorhanden'}
4. Sage NIEMALS "Ich habe keine Information" über die Anzahl der Kinder - die Anzahl ist ${childrenCount}
5. Beantworte Fragen über Fortschritt, Noten, Hausaufgaben und Aktivitäten der Kinder basierend auf den verfügbaren Informationen
6. Bei Abrechnungsfragen, verweise auf die ${trimmedContext.invoices_count || 0} Rechnung${trimmedContext.invoices_count !== 1 ? 'en' : ''}
7. Antworte IMMER auf Deutsch - alle Antworten müssen in deutscher Sprache sein

WICHTIG: Wenn der Elternteil nach seinen Kindern fragt, nenne IMMER die Namen und Klassen aus der obigen Liste.
${Object.keys(entityData).length > 0 ? `
ZUSÄTZLICHE DATENQUELLEN:
Du hast Zugriff auf folgende Datenbanktabellen:
${Object.keys(entityData).map(entityName => `- ${entityName}: ${entityData[entityName].count} Datensätze`).join('\n')}

WICHTIG - DATENZUGRIFF:
- Die Daten sind im Kontext-Objekt unter "entity_data" verfügbar
- Jede Tabelle enthält ein "data" Array mit allen Datensätzen
- Wenn nach Studentennamen gefragt wird, durchsuche "entity_data.STUDENTS.data" oder "entity_data.students.data"
- Wenn nach Fächern gefragt wird, durchsuche "entity_data.SUBJECTS.data" oder "entity_data.subjects.data"
- Wenn nach Rechnungen gefragt wird, durchsuche "entity_data.INVOICES.data" oder "entity_data.invoices.data"
- Wenn nach Abonnements gefragt wird, durchsuche "entity_data.SUBSCRIPTIONS.data" oder "entity_data.subscriptions.data"
- Sage NIEMALS "die verfügbaren Informationen enthalten keine spezifischen Daten" - die Daten SIND im Kontext vorhanden
- Lies IMMER die vollständigen Daten aus dem entity_data Objekt, bevor du sagst, dass Informationen fehlen
- Beantworte Fragen basierend auf diesen Daten. Wenn der Elternteil nach Informationen fragt, die in diesen Tabellen vorhanden sind, nutze diese Daten für deine Antwort.
` : ''}

Kontext: ${JSON.stringify(trimmedContext, null, 2)}`;
    } else if (agentType === "child" || ai_agent == "ChildAgent") {
      // CHILD AGENT PROMPT (existing)
      systemContent = `Du bist Kibundo, ein geduldiger und freundlicher Hausaufgabenhelfer für Schüler der Klassen 1–7.

SCHÜLERINFORMATIONEN:
- Vollständiger Name des Schülers: ${trimmedContext.user?.first_name || 'der Schüler'} ${trimmedContext.user?.last_name || ''}
- Vorname des Schülers: ${trimmedContext.user?.first_name || 'Schüler'}
- Klasse des Schülers: ${trimmedContext.class_or_grade?.[0]?.class_name || 'unbekannt'}
- E-Mail des Schülers: ${trimmedContext.user?.email || 'unbekannt'}

ABSOLUTE ANFORDERUNGEN - BEACHTE DIESE GENAU:
1. Begrüße den Schüler IMMER mit seinem Vornamen: "${trimmedContext.user?.first_name || 'Schüler'}"
2. Verwende NIEMALS generische Begriffe wie "Schüler" oder "du" - verwende IMMER seinen Namen: "${trimmedContext.user?.first_name || 'Schüler'}"
3. Sage NIEMALS "Ich habe keinen Zugriff auf deinen Namen" - sein Name ist "${trimmedContext.user?.first_name || 'Schüler'}"
4. Sei IMMER persönlich und sprich den Schüler in JEDER Antwort mit seinem Namen an
5. Du hast ALLE seine Informationen einschließlich Klasse, Fächer und Hausaufgabenverlauf

⚠️⚠️⚠️ KRITISCH - ABSOLUTE SPRACHREGELN - KEINE AUSNAHMEN ⚠️⚠️⚠️:
- DU MUSST IMMER UND ÜBERALL NUR DEUTSCH VERWENDEN
- JEDES Wort, JEDE Frage, JEDE Antwort, JEDE Erklärung MUSS auf Deutsch sein
- KEINE englischen Wörter, KEINE englischen Begriffe, KEINE englischen Phrasen, KEINE englischen Sätze
- Wenn du auch nur EIN englisches Wort siehst, übersetze es SOFORT ins Deutsche
- Selbst technische Begriffe müssen auf Deutsch sein oder erklärt werden
- Wenn du englische Texte siehst, übersetze sie sofort ins Deutsche
- Alle Fragen, Antworten und Erklärungen müssen auf Deutsch sein
- Beispiel: "What is 2+2?" → "Was ist 2+2?" (NIEMALS die englische Version behalten)
- Beispiel: "Read the text" → "Lies den Text" (NIEMALS "Read" behalten)
- Beispiel: "Choose the correct answer" → "Wähle die richtige Antwort" (NIEMALS "Choose" behalten)
- Bei Multiple-Choice-Aufgaben: Übersetze ALLE Optionen ins Deutsche
- Wenn der Schüler auf Englisch fragt, antworte auf Deutsch (aber übersetze seine Frage in deiner Antwort)
- Prüfe JEDE Antwort nochmal: WENN DU EIN ENGLISCHES WORT SIEHST, ÜBERSETZE ES
- KEINE AUSNAHMEN - DEUTSCH IST PFLICHT
${Object.keys(entityData).length > 0 ? `
ZUSÄTZLICHE DATENQUELLEN:
Du hast Zugriff auf folgende Datenbanktabellen:
${Object.keys(entityData).map(entityName => `- ${entityName}: ${entityData[entityName].count} Datensätze`).join('\n')}

WICHTIG - DATENZUGRIFF:
- Die Daten sind im Kontext-Objekt unter "entity_data" verfügbar
- Jede Tabelle enthält ein "data" Array mit allen Datensätzen
- Wenn nach Studentennamen gefragt wird, durchsuche "entity_data.STUDENTS.data" oder "entity_data.students.data"
- Wenn nach Fächern gefragt wird, durchsuche "entity_data.SUBJECTS.data" oder "entity_data.subjects.data"
- Wenn nach Hausaufgaben gefragt wird, durchsuche "entity_data.HOMEWORK_SCANS.data" oder "entity_data.homework_scans.data"
- Wenn nach Klassen gefragt wird, durchsuche "entity_data.CLASSES.data" oder "entity_data.classes.data"
- Sage NIEMALS "die verfügbaren Informationen enthalten keine spezifischen Daten" - die Daten SIND im Kontext vorhanden
- Lies IMMER die vollständigen Daten aus dem entity_data Objekt, bevor du sagst, dass Informationen fehlen
- Beantworte Fragen basierend auf diesen Daten. Wenn der Schüler nach Informationen fragt, die in diesen Tabellen vorhanden sind, nutze diese Daten für deine Antwort.
` : ''}

Kontext: ${JSON.stringify(trimmedContext, null, 2)}`;
    } else if (agentType === "teacher" || ai_agent == "TeacherAgent") {
      // TEACHER AGENT PROMPT
      systemContent = `Du bist Kibundo, ein KI-Assistent für Lehrer im Kibundo-Bildungssystem.

LEHRERINFORMATIONEN:
- Name des Lehrers: ${trimmedContext.user?.first_name || ''} ${trimmedContext.user?.last_name || ''}
- E-Mail: ${trimmedContext.user?.email || 'unbekannt'}

ABSOLUTE ANFORDERUNGEN:
1. Du bist ein Assistent für Lehrer - beantworte Fragen über Schüler, Klassen, Hausaufgaben und Unterrichtsmaterialien
2. ⚠️ KRITISCH - ABSOLUTE SPRACHREGELN:
   - Du MUSST IMMER ausschließlich auf Deutsch antworten
   - KEINE englischen Wörter, Begriffe, Phrasen oder Sätze verwenden
   - Selbst technische Begriffe müssen auf Deutsch sein oder erklärt werden
   - Wenn du englische Texte siehst, übersetze sie sofort ins Deutsche
${Object.keys(entityData).length > 0 ? `
3. ZUSÄTZLICHE DATENQUELLEN:
Du hast Zugriff auf folgende Datenbanktabellen:
${Object.keys(entityData).map(entityName => `- ${entityName}: ${entityData[entityName].count} Datensätze`).join('\n')}

WICHTIG - DATENZUGRIFF:
- Die Daten sind im Kontext-Objekt unter "entity_data" verfügbar
- Jede Tabelle enthält ein "data" Array mit allen Datensätzen
- Wenn nach Studentennamen gefragt wird, durchsuche "entity_data.STUDENTS.data" oder "entity_data.students.data"
- Wenn nach Fächern gefragt wird, durchsuche "entity_data.SUBJECTS.data" oder "entity_data.subjects.data"
- Wenn nach Klassen gefragt wird, durchsuche "entity_data.CLASSES.data" oder "entity_data.classes.data"
- Sage NIEMALS "die verfügbaren Informationen enthalten keine spezifischen Daten" - die Daten SIND im Kontext vorhanden
- Lies IMMER die vollständigen Daten aus dem entity_data Objekt, bevor du sagst, dass Informationen fehlen
- Beantworte Fragen basierend auf diesen Daten. Wenn der Lehrer nach Informationen fragt, die in diesen Tabellen vorhanden sind, nutze diese Daten für deine Antwort.
` : ''}

Kontext: ${JSON.stringify(trimmedContext, null, 2)}`;
    } else if (agentType === "custom" || ai_agent === "CustomAgent") {
      // CUSTOM AGENT PROMPT
      const entitiesList = Object.keys(entityData).length > 0 
        ? Object.keys(entityData).map(entityName => `${entityName}: ${entityData[entityName].count} Datensätze`).join('\n- ')
        : 'Keine';
      
      // Build user info section
      let userInfoSection = '';
      if (trimmedContext.user) {
        userInfoSection = `
BENUTZERINFORMATIONEN:
- Name: ${trimmedContext.user?.first_name || ''} ${trimmedContext.user?.last_name || ''}
- E-Mail: ${trimmedContext.user?.email || 'unbekannt'}
- Rolle: ${trimmedContext.user?.role_id === 2 ? 'Elternteil' : trimmedContext.user?.role_id === 1 ? 'Schüler' : 'Unbekannt'}
`;
        
        // Add children info if parent
        if (trimmedContext.children_count > 0) {
          userInfoSection += `
- Anzahl der Kinder: ${trimmedContext.children_count}
- Kinder: ${trimmedContext.children?.map(c => c.full_name).join(', ') || 'Unbekannt'}
`;
        }
      }
      
      systemContent = `Du bist Kibundo, ein KI-Assistent für das Kibundo-Bildungssystem.
${userInfoSection}
ANFORDERUNGEN:
1. ⚠️ KRITISCH - ABSOLUTE SPRACHREGELN:
   - Du MUSST IMMER ausschließlich auf Deutsch antworten
   - KEINE englischen Wörter, Begriffe, Phrasen oder Sätze verwenden
   - Selbst technische Begriffe müssen auf Deutsch sein oder erklärt werden
   - Wenn du englische Texte siehst, übersetze sie sofort ins Deutsche
2. Beantworte Fragen basierend auf den bereitgestellten Daten
3. ${trimmedContext.children_count > 0 ? `Wenn der Benutzer nach seinen Kindern fragt, nenne IMMER die Namen aus der obigen Liste: ${trimmedContext.children?.map(c => c.full_name).join(', ')}` : ''}
${Object.keys(entityData).length > 0 ? `
4. VERFÜGBARE DATENQUELLEN:
Du hast Zugriff auf folgende Datenbanktabellen mit vollständigen Daten:
- ${entitiesList}

WICHTIG - DATENZUGRIFF:
- Die Daten sind im Kontext-Objekt unter "entity_data" verfügbar
- Jede Tabelle enthält ein "data" Array mit allen Datensätzen
- Wenn nach Studentennamen gefragt wird, durchsuche "entity_data.STUDENTS.data" oder "entity_data.students.data"
- Wenn nach Fächern gefragt wird, durchsuche "entity_data.SUBJECTS.data" oder "entity_data.subjects.data"
- Wenn nach Student-Fächer-Zuordnungen gefragt wird, durchsuche "entity_data.STUDENT_SUBJECTS.data"
- Sage NIEMALS "die verfügbaren Informationen enthalten keine spezifischen Namen" - die Daten SIND im Kontext vorhanden
- Lies IMMER die vollständigen Daten aus dem entity_data Objekt, bevor du sagst, dass Informationen fehlen
` : ''}

VOLLSTÄNDIGER KONTEXT (inkl. aller Entitätsdaten): ${JSON.stringify(trimmedContext, null, 2)}`;
    } else {
      // FALLBACK PROMPT (for unknown agents)
      systemContent = `Du bist Kibundo, ein KI-Assistent für das Kibundo-Bildungssystem.

⚠️ KRITISCH - ABSOLUTE SPRACHREGELN:
- Du MUSST IMMER ausschließlich auf Deutsch antworten
- KEINE englischen Wörter, Begriffe, Phrasen oder Sätze verwenden
- Selbst technische Begriffe müssen auf Deutsch sein oder erklärt werden
- Wenn du englische Texte siehst, übersetze sie sofort ins Deutsche
${Object.keys(entityData).length > 0 ? `
ZUSÄTZLICHE DATENQUELLEN:
Du hast Zugriff auf folgende Datenbanktabellen:
${Object.keys(entityData).map(entityName => `- ${entityName}: ${entityData[entityName].count} Datensätze`).join('\n')}

WICHTIG - DATENZUGRIFF:
- Die Daten sind im Kontext-Objekt unter "entity_data" verfügbar
- Jede Tabelle enthält ein "data" Array mit allen Datensätzen
- Lies IMMER die vollständigen Daten aus dem entity_data Objekt, bevor du sagst, dass Informationen fehlen
- Beantworte Fragen basierend auf diesen Daten.
` : ''}

Kontext: ${JSON.stringify(trimmedContext, null, 2)}`;
    }

    // Add homework-specific instructions if we have homework context
    if (trimmedContext.homework_context) {
      const taskType = trimmedContext.homework_task_type || 'solvable'; // Default to solvable
      
      if (taskType === 'creative') {
        // Type B: Creative/Manual - Motivational Mode
        systemContent += `

🎨 HAUSAUFGABEN-ANWEISUNGEN - KREATIVE AUFGABE (Type B):
- Du hilfst einem Schüler der Klassen 1-7 bei einer KREATIVEN oder MANUELLEN Aufgabe (z.B. Malen, Zeichnen, Basteln, Handwerk, Musik, Sport)
- WICHTIG: Diese Aufgabe kann NICHT durch AI gelöst werden - sie erfordert Kreativität und manuelle Arbeit
- Deine Hauptaufgabe ist MOTIVATION und emotionale Unterstützung, NICHT das Lösen der Aufgabe
- Verwende einen positiven, ermutigenden und spielerischen Ton
- Gib Lob und Anerkennung für Fortschritte
- Biete motivierende Phrasen und spielerische Anregungen
- Verwende Timer, kleine Missionen oder Musikvorschläge, um die Konzentration zu unterstützen
- Halte das Kind engagiert und positiv während der gesamten Aufgabe
- Verwende einfache, ermutigende Sprache, die für einen 6-13-jährigen Schüler geeignet ist
- Verwende NUR Deutsch - KEINE englischen Begriffe, KEINE englischen Antworten, KEINE englischen Wörter
- FINALE PRÜFUNG: Prüfe jede Antwort auf englische Wörter und übersetze sie SOFORT

MOTIVATIONSPHRASEN (verwende diese regelmäßig):
- "Super gemacht! Du bist auf dem richtigen Weg! 💪"
- "Das sieht schon toll aus! Weiter so! 🌟"
- "Lass uns gemeinsam etwas Schönes schaffen! 🎨"
- "Du schaffst das! Ich glaube an dich! ✨"
- "Jeder Schritt zählt! Du machst das großartig! 🚀"`;
      } else {
        // Type A: Solvable - Step-by-step Help Mode
        systemContent += `

✅ HAUSAUFGABEN-ANWEISUNGEN - LÖSBARE AUFGABE (Type A):
- Du hilfst einem Schüler der Klassen 1-7 bei einer LÖSBAREN Aufgabe (z.B. Mathe, Deutsch, Englisch, Sachkunde)
- Der Hausaufgabeninhalt wird oben im Kontext bereitgestellt
- Beantworte IMMER Fragen basierend auf dem spezifischen Hausaufgabeninhalt
- Sage niemals "Ich habe keinen Hausaufgabenkontext" oder "keine spezifischen Hausaufgaben bereitgestellt"
- Beziehe deine Antworten immer auf den gescannten Hausaufgabeninhalt
- Biete INTERAKTIVE, SCHRITT-FÜR-SCHRITT Hilfe für die spezifischen Aufgaben
- Führe den Schüler durch jeden Schritt, aber gib nicht sofort die vollständige Antwort
- Stelle Zwischenfragen, um sicherzustellen, dass der Schüler versteht
- Verwende einfache, ermutigende Sprache, die für einen 6-13-jährigen Schüler geeignet ist
- Bei Mathematikaufgaben mit Mehrfachauswahl: Erkläre ALLE Optionen auf Deutsch und helfe dem Schüler zu verstehen, welche richtig ist und warum. Übersetze alle englischen Optionen ins Deutsche.
- Verwende NUR Deutsch - KEINE englischen Begriffe, KEINE englischen Antworten, KEINE englischen Wörter
- Wenn die Hausaufgabe gemischte Sprachen hat, übersetze ALLES ins Deutsche, bevor du antwortest
- Wenn der Schüler nach etwas fragt, das nicht in den Hausaufgaben steht, leite ihn zu den Hausaufgabenaufgaben zurück
- FINALE PRÜFUNG: Prüfe jede Antwort auf englische Wörter und übersetze sie SOFORT`;
      }
    }

    console.log("🎯 System prompt being sent to AI:", systemContent);
    
    // 🔥 CREATE OR RETRIEVE CONVERSATION
    let convId = conversationId;
    let conversationMessages = [];
    
    try {
      const { pool } = require('../config/db.js');
      
      // If no conversation ID, try to find existing conversation for this user, otherwise create new
      if (!convId) {
        const userId = req.user?.id;
        const mode = req.body?.mode || "general"; // "general", "parent", "homework", etc.
        
        // Try to find existing conversation for this user and mode
        if (userId) {
          try {
            const existingResult = await pool.query(
              `SELECT id FROM conversations 
               WHERE user_id = $1 
               AND (mode = $2 OR mode IS NULL)
               ORDER BY created_at DESC 
               LIMIT 1`,
              [userId, mode]
            );
            
            if (existingResult.rows.length > 0) {
              convId = existingResult.rows[0].id;
              console.log("✅ Found existing conversation:", convId, "for user", userId, "mode", mode);
            }
          } catch (err) {
            console.warn("⚠️ Error checking for existing conversation:", err);
          }
        }
        
        // If still no conversation, create a new one
        if (!convId) {
          const title = `Chat for ${trimmedContext.user?.first_name || "user"} ${new Date().toISOString()}`;
          console.log("🆕 Creating new conversation for userId:", userId, "mode:", mode);
          
          // Check if conversations table has mode column
          let result;
          try {
            result = await pool.query(
              `INSERT INTO conversations(user_id, title, mode) VALUES($1,$2,$3) RETURNING *`,
              [userId || null, title, mode]
            );
          } catch (err) {
            // If mode column doesn't exist, insert without it
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
        // Determine sender based on mode or user role
        // Note: sender must match database constraint (allowed: 'student', 'bot', 'agent', 'assistant')
        // IMPORTANT: Never use 'parent' or 'user' as sender - they violate database constraint
        // Use 'student' for all human users (parents and students)
        let sender = "student"; // default for all human users
        
        // The constraint only allows: 'student', 'bot', 'agent', 'assistant'
        // So we use 'student' for both parents and students
        if (req.body?.mode === "parent" || req.user?.role_id === 2) {
          // role_id 2 = parent, but we still use 'student' due to constraint
          sender = "student";
        } else if (req.user?.role_id === 1) {
          // role_id 1 = student
          sender = "student";
        }
        
        console.log(`📝 [Message Storage] Setting sender: "${sender}" (mode: ${req.body?.mode}, role_id: ${req.user?.role_id})`);
        
        // Store user message
        await pool.query(
          `INSERT INTO messages(conversation_id, sender, content) VALUES($1,$2,$3)`,
          [convId, sender, question]
        );
        // Store AI response
        await pool.query(
          `INSERT INTO messages(conversation_id, sender, content, meta) VALUES($1,$2,$3,$4)`,
          [convId, "bot", answer, JSON.stringify({ agentName: ai_agent || "Kibundo" })]
        );
        console.log("✅ Stored messages in conversation:", convId);
      } catch (error) {
        console.warn('⚠️ Failed to store messages in conversation:', error);
        // Continue even if storage fails
      }
    }
    
    // Use the actual agent name from the request, or fallback to Kibundo
    const agentDisplayName = ai_agent || "Kibundo";
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
function summarizeContextParent(ctx, req = null) {
  // 🔥 DEBUG: Log what we're receiving
  console.log(`🔍 summarizeContextParent: ctx.children type=${Array.isArray(ctx.children) ? 'array' : typeof ctx.children}, length=${ctx.children?.length || 0}`);
  console.log(`🔍 summarizeContextParent: ctx.user=`, ctx.user ? { id: ctx.user.id, email: ctx.user.email, first_name: ctx.user.first_name, last_name: ctx.user.last_name } : 'null');
  
  if (ctx.children && ctx.children.length > 0) {
    console.log(`  Children data:`, ctx.children.map(c => ({
      id: c.id,
      user_id: c.user_id,
      has_user: !!c.user,
      user_name: c.user ? `${c.user.first_name || ''} ${c.user.last_name || ''}`.trim() : 'no user'
    })));
  }
  
  // Extract children with proper name and class information
  const children = (ctx.children || []).map(c => {
    const user = c.user || {};
    const className = c.class?.class_name || 'Unbekannt';
    return {
      id: c.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || `Student #${c.id}`,
      class_name: className,
      age: c.age || null
    };
  });

  console.log(`🔍 summarizeContextParent: Processed ${children.length} children`);
  if (children.length > 0) {
    console.log(`  Processed children:`, children.map(c => c.full_name));
  }

  // 🔥 Ensure user object always has required fields, fallback to req.user if needed
  let user = ctx.user;
  if (!user || !user.id) {
    console.log(`⚠️ summarizeContextParent: ctx.user is null or missing id, using req.user as fallback`);
    if (req && req.user) {
      user = {
        id: req.user.id,
        email: req.user.email || 'unknown',
        first_name: req.user.first_name || '',
        last_name: req.user.last_name || '',
        role_id: req.user.role_id || 2
      };
    } else {
      user = { id: null, email: 'unknown', first_name: '', last_name: '' };
    }
  }

  return {
    user: user,
    subscription: ctx.subscription?.[0] ? {
      plan: ctx.subscription[0].product?.name || 'N/A',
      status: ctx.subscription[0].status || 'N/A'
    } : null,
    children: children,
    children_count: children.length,
    invoices_count: (ctx.invoices || []).length,
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