const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { initDB } = require('./db/database');
const { seed } = require('./db/seed');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://smart-student-attendance-system-ten.vercel.app',
];

const validateOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`CORS policy does not allow access from origin ${origin}`));
  }
};

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: validateOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth/login', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'postgresql', version: '3.0.0', timestamp: new Date().toISOString(), realtime: 'enabled' }));

const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.json({
    message: 'SmartAttend API — Android-First Architecture',
    version: '3.0.0',
    database: 'PostgreSQL (MySQL-compatible schema)',
    android: 'Primary client — see /android directory for Kotlin source',
    web: 'Future extension — React.js Admin Dashboard',
    realtime: 'Socket.IO enabled for live updates',
    security: 'Helmet.js + rate limiting + input validation',
    endpoints: ['/api/auth', '/api/admin', '/api/teacher', '/api/student']
  }));
}

// ── Socket.IO Real-time Events ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user-specific room for targeted notifications
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });

  // Join role-based rooms
  socket.on('join_role', (role) => {
    socket.join(`role_${role}`);
    console.log(`Socket joined ${role} room`);
  });

  // Join class-specific rooms for attendance updates
  socket.on('join_class', (classId) => {
    socket.join(`class_${classId}`);
    console.log(`Socket joined class ${classId} room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io for use in routes
global.io = io;

async function start() {
  try {
    await initDB();
    await seed();
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`SmartAttend API v3.0.0 running on port ${PORT}`);
      console.log(`Real-time: Socket.IO enabled`);
      console.log(`Architecture: Android-first (Kotlin + ML Kit + FusedLocation)`);
      console.log(`Database: PostgreSQL (relational schema, complex queries enabled)`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
