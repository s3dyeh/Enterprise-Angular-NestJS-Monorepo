module.exports = {
  '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:3001', secure: false, changeOrigin: false },
};
