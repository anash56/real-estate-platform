// Update your existing server.ts file

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './utils/prisma';

// ← ADD THIS
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'OK',
      message: 'Database connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database error'
    });
  }
});

// ← ADD THIS LINE
// Mount auth routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 SERVER RUNNING                     ║
╠════════════════════════════════════════╣
║  Port: ${PORT}                            
║  Environment: ${process.env.NODE_ENV}           
║  Database: PostgreSQL                  
║  API Base: http://localhost:${PORT}/api        
║  Health Check: http://localhost:${PORT}/api/health
║  Auth Routes: http://localhost:${PORT}/api/auth
╚════════════════════════════════════════╝
  `);
});

export { app, prisma };
