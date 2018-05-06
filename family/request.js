const axios = require('axios');

module.exports = axios.create({
  timeout: 1000 * 60 * 2,
  responseType: 'document',
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  },
});
