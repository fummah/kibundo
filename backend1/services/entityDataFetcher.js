// services/entityDataFetcher.js
const db = require('../models');
const { Op } = require('sequelize');

/**
 * Fetches all data from specified entity tables
 * @param {string[]} entities - Array of table/model names
 * @param {Object} options - Options for filtering (class, state, etc.)
 * @returns {Object} - Object with entity names as keys and their data as values
 */
async function fetchEntityData(entities = [], options = {}) {
  if (!entities || !Array.isArray(entities) || entities.length === 0) {
    return {};
  }

  const entityData = {};
  
  for (const entityName of entities) {
    try {
      // Normalize entity name - handle different naming conventions
      let Model = null;
      let normalizedName = entityName.toLowerCase().trim();
      
      // Map common variations - expanded to include all models
      const entityMap = {
        'users': 'user',
        'students': 'student',
        'teachers': 'teacher',
        'parents': 'parent',
        'classes': 'class',
        'class': 'class',
        'CLASS': 'class',
        'CLASSES': 'class',
        'subjects': 'subject',
        'subject': 'subject',
        'SUBJECT': 'subject',
        'SUBJECTS': 'subject',
        'homeworkscans': 'homeworkScan',
        'homework_scans': 'homeworkScan',
        'HOMEWORK_SCANS': 'homeworkScan',
        'homeworkscanevents': 'homeworkScanEvent',
        'homework_scan_events': 'homeworkScanEvent',
        'blogposts': 'blogpost',
        'blog_posts': 'blogpost',
        'invoices': 'invoice',
        'subscriptions': 'subscription',
        'products': 'product',
        'prices': 'price',
        'coupons': 'coupon',
        'curricula': 'curriculum',
        'curriculums': 'curriculum',
        'CURRICULUMS': 'curriculum',
        'quizzes': 'quiz',
        'quizitems': 'quizitem',
        'quiz_items': 'quizitem',
        'states': 'state',
        'class_states': 'state',
        'CLASS_STATES': 'state',
        'roles': 'role',
        'billingevents': 'billingEvent',
        'billing_events': 'billingEvent',
        'emailtemplates': 'emailTemplate',
        'email_templates': 'emailTemplate',
        'segments': 'segment',
        'campaigns': 'campaign',
        'emaillogs': 'emailLog',
        'email_logs': 'emailLog',
        'newsletteroptins': 'newsletterOptIn',
        'newsletter_opt_ins': 'newsletterOptIn',
        'student_subjects': 'student_subjects',
        'studentsubjects': 'student_subjects',
        'agentpromptsets': 'agentPromptSet',
        'agent_prompt_sets': 'agentPromptSet',
        'agenttests': 'agentTest',
        'agent_tests': 'agentTest',
        'aiagentsettings': 'aiagentsettings',
        'ai_agent_settings': 'aiagentsettings',
        'AIAGENT_SETTINGS': 'aiagentsettings',
        'aiagentsetting': 'aiagentsettings',
        'aiAgentSettings': 'aiagentsettings',
        'worksheets': 'worksheet',
        'WORKSHEETS': 'worksheet'
      };
      
      // Try direct match first
      const mappedName = entityMap[normalizedName] || normalizedName;
      Model = db[mappedName] || db[entityName];
      
      // Try capitalized version (camelCase)
      if (!Model) {
        const capitalized = entityName.charAt(0).toUpperCase() + entityName.slice(1);
        Model = db[capitalized] || db[capitalized.toLowerCase()];
      }
      
      // Try camelCase version (e.g., homeworkScan, homeworkScanEvent)
      if (!Model && normalizedName.includes('_')) {
        const camelCase = normalizedName.split('_').map((word, idx) => 
          idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');
        Model = db[camelCase] || db[camelCase.charAt(0).toUpperCase() + camelCase.slice(1)];
      }
      
      if (!Model) {
        console.warn(`⚠️ Entity "${entityName}" not found in models. Available models:`, Object.keys(db).slice(0, 30).join(', '));
        // Try to find a close match (case-insensitive, ignoring underscores)
        const entityNameLower = entityName.toLowerCase().replace(/_/g, '');
        const availableModels = Object.keys(db).filter(key => {
          const keyLower = key.toLowerCase().replace(/_/g, '');
          return keyLower === entityNameLower || 
                 keyLower.includes(entityNameLower) || 
                 entityNameLower.includes(keyLower);
        });
        if (availableModels.length > 0) {
          console.log(`🔍 Found potential matches for "${entityName}":`, availableModels.join(', '));
          // Try the first match
          Model = db[availableModels[0]];
          if (Model) {
            console.log(`✅ Using model "${availableModels[0]}" for entity "${entityName}"`);
          }
        }
        if (!Model) {
          console.warn(`💡 Did you mean one of these? ${availableModels.join(', ')}`);
          continue;
        }
      }

      // Build where clause based on options
      const whereClause = {};
      
      // Filter by class if provided
      if (options.class && Model.rawAttributes?.class_id) {
        whereClause.class_id = options.class;
      }
      
      // Filter by state if provided
      if (options.state && Model.rawAttributes?.state) {
        whereClause.state = options.state;
      }

      // 🔥 Filter by user/parent/student context
      if (options.userId || options.parentId || options.studentId) {
        const normalizedEntityName = mappedName.toLowerCase();
        
        // Filter STUDENTS by parent_id
        if (normalizedEntityName === 'student' && options.parentId) {
          whereClause.parent_id = options.parentId;
          console.log(`🔍 Filtering STUDENTS by parent_id: ${options.parentId}`);
        }
        
        // Filter SUBSCRIPTIONS by parent_id
        if (normalizedEntityName === 'subscription' && options.parentId) {
          whereClause.parent_id = options.parentId;
          console.log(`🔍 Filtering SUBSCRIPTIONS by parent_id: ${options.parentId}`);
        }
        
        // Filter INVOICES by parent_id
        if (normalizedEntityName === 'invoice' && options.parentId) {
          whereClause.parent_id = options.parentId;
          console.log(`🔍 Filtering INVOICES by parent_id: ${options.parentId}`);
        }
        
        // 🔥 Filter HOMEWORK_SCANS by student_id (for students - highest priority)
        if ((normalizedEntityName === 'homeworkscan' || mappedName === 'homeworkScan') && options.studentId) {
          whereClause.student_id = options.studentId;
          console.log(`🔍 Filtering HOMEWORK_SCANS by student_id: ${options.studentId}`);
        }
        
        // Filter HOMEWORK_SCANS by student's parent_id (via student relationship) - only if no studentId
        if ((normalizedEntityName === 'homeworkscan' || mappedName === 'homeworkScan') && options.parentId && !options.studentId) {
          // We'll handle this below with the include logic
          console.log(`🔍 Filtering HOMEWORK_SCANS by parent_id: ${options.parentId}`);
        }
        
        // Filter USERS - for parents/students, only return the current user
        if (normalizedEntityName === 'user' && options.userId) {
          whereClause.id = options.userId;
          console.log(`🔍 Filtering USERS by user_id: ${options.userId}`);
        }
      }

      // 🔥 Set up include options for models that need relationships
      let includeOptions = undefined;
      
      // For STUDENTS, always include user, class, and subjects relationships to get names and subjects
      if (normalizedName === 'student') {
        const User = db.user;
        const Class = db.class;
        const StudentSubjects = db.student_subjects;
        const Subject = db.subject;
        includeOptions = [
          {
            model: User,
            as: 'user',
            attributes: { exclude: ['password'] },
            required: false // Allow students without user records
          },
          {
            model: Class,
            as: 'class',
            attributes: ['id', 'class_name'],
            required: false // Allow students without class
          },
          {
            model: StudentSubjects,
            as: 'subject',
            attributes: ['id'],
            required: false,
            include: [
              {
                model: Subject,
                as: 'subject',
                attributes: ['id', 'subject_name'],
                required: false
              }
            ]
          }
        ];
        console.log(`🔍 Including user, class, and subjects relationships for STUDENTS`);
      }
      
      // For HOMEWORK_SCANS with parent filter, we need to filter by student_id where student belongs to parent
      // 🔥 Only do this if studentId is NOT already set (studentId takes priority)
      if ((normalizedName === 'homeworkscan' || mappedName === 'homeworkScan') && options.parentId && !options.studentId) {
        // First, get all student IDs for this parent
        const Student = db.student;
        const students = await Student.findAll({
          where: { parent_id: options.parentId },
          attributes: ['id']
        });
        const studentIds = students.map(s => s.id);
        
        if (studentIds.length > 0) {
          // Filter homework scans by student_id
          whereClause.student_id = { [Op.in]: studentIds };
          console.log(`🔍 Filtering HOMEWORK_SCANS by student_ids (via parent): ${studentIds.length} students`);
        } else {
          // No students for this parent, return empty result
          whereClause.student_id = { [Op.in]: [] };
        }
      }

      // Fetch all records (limit to reasonable number to avoid huge context)
      // For parent agents, use smaller limit to prevent context overflow
      // Only fetch most recent/relevant records
      const limit = options.parentId ? 50 : 100; // Reduced limit to prevent context overflow
      
      // Build attributes list - exclude password and handle missing columns gracefully
      let attributes = { exclude: ['password'] };
      
      // For worksheets, check if grade_level column exists before including it
      // We'll use raw query to check column existence, or just catch the error
      let records;
      try {
        records = await Model.findAll({
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          include: includeOptions,
          limit: limit, // Limit to prevent context from being too large
          order: [['id', 'DESC']], // Most recent first
          attributes: attributes // Always exclude passwords
        });
      } catch (dbError) {
        // If error is about missing column (e.g., grade_level in worksheets), try using raw query
        // PostgreSQL error code 42703 = undefined_column
        if (dbError.code === '42703' || (dbError.message && dbError.message.includes('does not exist'))) {
          console.warn(`⚠️ Column mismatch for ${entityName}, trying raw SQL query: ${dbError.message}`);
          try {
            // Use raw SQL to fetch only columns that exist (bypasses model definition)
            const tableName = Model.tableName || (typeof Model.getTableName === 'function' ? Model.getTableName() : normalizedName);
            
            // Build WHERE clause safely
            let whereSQL = '';
            const replacements = { limit };
            if (Object.keys(whereClause).length > 0) {
              const whereParts = [];
              Object.keys(whereClause).forEach((key, idx) => {
                const paramName = `param${idx}`;
                whereParts.push(`"${key}" = :${paramName}`);
                replacements[paramName] = whereClause[key];
              });
              whereSQL = `WHERE ${whereParts.join(' AND ')}`;
            }
            
            const query = `SELECT * FROM "${tableName}" ${whereSQL} ORDER BY id DESC LIMIT :limit`;
            
            const rawRecords = await Model.sequelize.query(query, {
              replacements,
              type: Model.sequelize.QueryTypes.SELECT
            });
            
            // Convert to plain objects (don't use Model.build as it will validate against model definition)
            records = rawRecords.map(record => {
              const instance = Model.build(record, { isNewRecord: false, raw: true });
              return instance;
            });
            
            console.log(`✅ Successfully fetched ${records.length} records from ${entityName} using raw SQL`);
          } catch (retryError) {
            console.error(`❌ Failed to fetch ${entityName} even with raw SQL:`, retryError.message);
            throw retryError; // Re-throw if retry also fails
          }
        } else {
          throw dbError; // Re-throw if it's a different error
        }
      }

      // Convert to plain objects
      const plainRecords = records.map(record => {
        const plain = record.get ? record.get({ plain: true }) : record;
        return plain;
      });

      // For large datasets, only include summaries instead of full data
      // This prevents context overflow while still providing useful information
      const shouldIncludeFullData = plainRecords.length <= 20; // Only include full data for small datasets
      
      entityData[entityName] = {
        count: plainRecords.length,
        // Only include full data for small datasets, otherwise just summaries
        data: shouldIncludeFullData ? plainRecords : plainRecords.slice(0, 5), // Include only first 5 as samples
        // Add summary for AI understanding
        summary: plainRecords.length > 0 ? 
          `Contains ${plainRecords.length} records. Sample keys: ${Object.keys(plainRecords[0] || {}).slice(0, 5).join(', ')}` :
          'No records available',
        // Indicate if data is truncated
        truncated: !shouldIncludeFullData && plainRecords.length > 5
      };

      console.log(`✅ Fetched ${plainRecords.length} records from entity "${entityName}"`);
      if (plainRecords.length > 0) {
        console.log(`📋 Sample record keys:`, Object.keys(plainRecords[0]).slice(0, 10).join(', '));
      }
      
    } catch (error) {
      console.error(`❌ Error fetching data from entity "${entityName}":`, error.message);
      entityData[entityName] = {
        count: 0,
        data: [],
        error: error.message
      };
    }
  }

  return entityData;
}

/**
 * Fetches agent from database and returns its entities and prompts
 * @param {string} agentName - Name of the agent
 * @returns {Object|null} - Agent object with entities, prompts, grade, state, or null if not found
 */
async function getAgentEntities(agentName) {
  if (!agentName) {
    console.log('⚠️ [getAgentEntities] No agent name provided');
    return null;
  }
  
  try {
    console.log(`🔍 [getAgentEntities] Fetching agent "${agentName}" from database...`);
    const AgentPromptSet = db.agentPromptSet;
    const agent = await AgentPromptSet.findOne({
      where: { name: agentName },
      attributes: ['id', 'name', 'entities', 'grade', 'state', 'prompts', 'description', 'version', 'stage']
    });

    if (!agent) {
      console.log(`⚠️ [getAgentEntities] Agent "${agentName}" not found in database`);
      return null;
    }

    const plainAgent = agent.get ? agent.get({ plain: true }) : agent;
    
    // 🔥 CRITICAL: Log prompt information for debugging
    console.log(`✅ [getAgentEntities] Agent "${agentName}" found:`, {
      id: plainAgent.id,
      name: plainAgent.name,
      hasEntities: !!plainAgent.entities,
      entitiesCount: Array.isArray(plainAgent.entities) ? plainAgent.entities.length : 0,
      hasPrompts: !!plainAgent.prompts,
      promptsType: typeof plainAgent.prompts,
      promptsIsObject: typeof plainAgent.prompts === 'object',
      promptsKeys: typeof plainAgent.prompts === 'object' && plainAgent.prompts !== null ? Object.keys(plainAgent.prompts) : null,
      grade: plainAgent.grade,
      state: plainAgent.state,
      version: plainAgent.version,
      stage: plainAgent.stage
    });
    
    // Parse prompts if it's a string (JSONB might be stored as string)
    if (plainAgent.prompts && typeof plainAgent.prompts === 'string') {
      try {
        plainAgent.prompts = JSON.parse(plainAgent.prompts);
        console.log(`✅ [getAgentEntities] Parsed prompts JSON string for agent "${agentName}"`);
      } catch (parseError) {
        console.error(`❌ [getAgentEntities] Failed to parse prompts JSON for agent "${agentName}":`, parseError.message);
        plainAgent.prompts = null;
      }
    }
    
    // Log prompt content (truncated for readability)
    if (plainAgent.prompts && typeof plainAgent.prompts === 'object') {
      const systemPrompt = plainAgent.prompts.system || plainAgent.prompts.systemPrompt || null;
      if (systemPrompt) {
        console.log(`📝 [getAgentEntities] Agent "${agentName}" has custom system prompt (length: ${systemPrompt.length} chars)`);
        console.log(`📝 [getAgentEntities] System prompt preview: ${systemPrompt.substring(0, 200)}...`);
      } else {
        console.log(`⚠️ [getAgentEntities] Agent "${agentName}" has prompts object but no system/systemPrompt field`);
      }
    } else if (!plainAgent.prompts) {
      console.log(`⚠️ [getAgentEntities] Agent "${agentName}" has no prompts field`);
    }
    
    return plainAgent;
  } catch (error) {
    console.error(`❌ [getAgentEntities] Error fetching agent "${agentName}":`, error.message);
    console.error(`❌ [getAgentEntities] Error stack:`, error.stack);
    return null;
  }
}

module.exports = { fetchEntityData, getAgentEntities };

