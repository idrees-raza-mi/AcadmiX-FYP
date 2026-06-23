const mongoose = require('mongoose');
const dns = require('dns');

// Force public DNS to resolve MongoDB Atlas SRV records reliably.
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch { /* noop */ }

// Cache the connection across (warm) serverless invocations and reuse it
// locally. Never call process.exit() — that would kill a serverless function.
let cached = global._mongooseCache;
if (!cached) cached = global._mongooseCache = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then(m => m);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null; // allow a fresh attempt on the next request
    throw err;
  }
};

module.exports = connectDB;
