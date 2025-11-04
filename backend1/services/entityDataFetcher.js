// services/entityDataFetcher.js
const db = require('../models');

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
      
      // Map common variations
      const entityMap = {
        'users': 'user',
        'students': 'student',
        'teachers': 'teacher',
        'parents': 'parent',
        'classes': 'class',
        'subjects': 'subject',
        'homeworkscans': 'homeworkscan',
        'homework_scans': 'homeworkscan',
        'blogposts': 'blogpost',
        'blog_posts': 'blogpost',
        'invoices': 'invoice',
        'subscriptions': 'subscription',
        'products': 'product',
        'curricula': 'curriculum',
        'quizzes': 'quiz',
        'states': 'state'
      };
      
      // Try direct match first
      const mappedName = entityMap[normalizedName] || normalizedName;
      Model = db[mappedName] || db[entityName];
      
      // Try capitalized version
      if (!Model) {
        const capitalized = entityName.charAt(0).toUpperCase() + entityName.slice(1);
        Model = db[capitalized] || db[capitalized.toLowerCase()];
      }
      
      if (!Model) {
        console.warn(`⚠️ Entity "${entityName}" not found in models. Skipping.`);
        continue;
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

      // Fetch all records (limit to reasonable number to avoid huge context)
      const records = await Model.findAll({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        limit: 1000, // Limit to prevent context from being too large
        order: [['id', 'DESC']], // Most recent first
        attributes: { exclude: ['password'] } // Always exclude passwords
      });

      // Convert to plain objects
      const plainRecords = records.map(record => {
        const plain = record.get ? record.get({ plain: true }) : record;
        return plain;
      });

      entityData[entityName] = {
        count: plainRecords.length,
        data: plainRecords,
        // Add summary for AI understanding
        summary: plainRecords.length > 0 ? 
          `Contains ${plainRecords.length} records. Sample keys: ${Object.keys(plainRecords[0] || {}).slice(0, 5).join(', ')}` :
          'No records available'
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
 * Fetches agent from database and returns its entities
 * @param {string} agentName - Name of the agent
 * @returns {Object|null} - Agent object with entities, or null if not found
 */
async function getAgentEntities(agentName) {
  if (!agentName) return null;
  
  try {
    const AgentPromptSet = db.agentPromptSet;
    const agent = await AgentPromptSet.findOne({
      where: { name: agentName },
      attributes: ['id', 'name', 'entities', 'grade', 'state']
    });

    if (!agent) {
      console.log(`⚠️ Agent "${agentName}" not found in database`);
      return null;
    }

    const plainAgent = agent.get ? agent.get({ plain: true }) : agent;
    return plainAgent;
  } catch (error) {
    console.error(`❌ Error fetching agent "${agentName}":`, error.message);
    return null;
  }
}

module.exports = { fetchEntityData, getAgentEntities };

