const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 60 });

module.exports = cache;