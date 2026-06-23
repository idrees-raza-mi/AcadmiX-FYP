// Vercel serverless entry — exports the Express app as the request handler.
// Socket.io is NOT available here (serverless can't hold persistent
// connections); real-time features run only on a long-lived server.
const { app } = require('../app');

module.exports = app;
