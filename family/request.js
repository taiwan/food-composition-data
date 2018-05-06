const axios = require('axios');

module.exports = axios.create({
  timeout: 1000 * 60 * 2,
  responseType: 'document',
});
