const axios = require('axios');

const retryRequest = async (config, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      if (error.response?.status === 429 && i < retries - 1) {
        console.warn(`Rate limit hit, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
};

module.exports = retryRequest;