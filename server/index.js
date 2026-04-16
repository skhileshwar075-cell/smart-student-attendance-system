const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db/database');
const { seed } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 5000;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.set('trust proxy', 1);
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth/login', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'postgresql', version: '2.0.0', timestamp: new Date().toISOString() }));

const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.json({
    message: 'SmartAttend API — Android-First Architecture',
    version: '2.0.0',
    database: 'PostgreSQL (MySQL-compatible schema)',
    android: 'Primary client — see /android directory for Kotlin source',
    web: 'Future extension — React.js Admin Dashboard',
    endpoints: ['/api/auth', '/api/admin', '/api/teacher', '/api/student']
  }));
}

async function start() {
  try {
    await initDB();
    await seed();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SmartAttend API running on port ${PORT}`);
      console.log(`Architecture: Android-first (Kotlin + ML Kit + FusedLocation)`);
      console.log(`Database: PostgreSQL (relational schema, complex queries enabled)`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
