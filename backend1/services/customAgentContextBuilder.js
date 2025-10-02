const { getEntity } = require('./autoInclude'); // your helper
const db= require('../models'); // Sequelize models are usually capitalized

/**
 * Build a custom agent context by fetching a model with all relations
 * @param {Object} params
 * @param {Object} params.model - Sequelize model to fetch
 * @param {number|string} params.id - Primary key of the record
 * @param {Object} [params.options] - Optional settings: depth, exclude fields
 */
async function mcontext({ model, id, options = {} }) {
  try {
    if (!model || !id) throw new Error('Model and ID are required');

    // Fetch the entity with all relations auto-included
    const entity = await getEntity(model, id, options);

    // Customize returned context if needed
    const context = {
      entity,
      timestamp: new Date(),
    };

    return context;

  } catch (err) {
    console.error('Error building custom agent context:', err);
    return null;
  }
}

// Exported function
exports.buildCustomAgentContext = async (obj) => {
    const myalldata = []; // use array to push results

  for (const entity of obj.entities) { // iterate over entities array
    const ghh = await mcontext({
      model: db[entity],   // db[entity] should reference your Sequelize model
      id: 5,               // replace 5 with a dynamic ID if needed
      options: { depth: 4, exclude: ['password'] },
    });

    myalldata.push(ghh);
  }

  console.log(JSON.stringify(myalldata, null, 2));
};
