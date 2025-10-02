// autoInclude.js
function buildIncludes(model, options = {}, depth = 3, visited = new Set()) {
  if (depth === 0 || visited.has(model)) return [];
  visited.add(model);

  const exclude = options.exclude || ['password'];

  return Object.values(model.associations).map(assoc => {
    return {
      model: assoc.target,
      as: assoc.options.as,
      attributes: assoc.target.rawAttributes
        ? { exclude }
        : undefined,
      include: buildIncludes(assoc.target, options, depth - 1, visited)
    };
  });
}

async function getEntity(Model, id, options = {}) {
  const depth = options.depth || 3;

  const entity = await Model.findOne({
    where: { id },
    attributes: options.exclude ? { exclude: options.exclude } : undefined,
    include: buildIncludes(Model, options, depth)
  });

  return entity;
}

module.exports = { buildIncludes, getEntity };
