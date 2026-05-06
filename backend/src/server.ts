// Update your existing server.ts file

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { prisma } from './utils/prisma';

// ← ADD THIS
import authRoutes from './routes/auth';
import propertyRoutes from './routes/property';
import defectRoutes from './routes/defect';
import documentRoutes from './routes/document';
import inquiryRoutes from './routes/inquiry';
import moderationRoutes from './routes/moderation';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('User connected to live chat:', socket.id);

  socket.on('join_room', (inquiryId) => {
    socket.join(inquiryId);
  });

  socket.on('send_message', async (data) => {
    const { inquiryId, senderId, content } = data;
    try {
      const message = await prisma.message.create({
        data: { inquiryId, senderId, content },
        include: { sender: { select: { fullName: true, role: true } } }
      });
      io.to(inquiryId).emit('receive_message', message);
    } catch (error) {
      console.error('Socket message error:', error);
    }
  });
});

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
app.use('/api/properties', propertyRoutes);
app.use('/api/defects', defectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/moderation', moderationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
httpServer.listen(PORT, () => {
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
║  Property Routes: http://localhost:${PORT}/api/properties
║  Defect Routes: http://localhost:${PORT}/api/defects
║  Document Routes: http://localhost:${PORT}/api/documents
║  Inquiry Routes: http://localhost:${PORT}/api/inquiries
║  Moderation Routes: http://localhost:${PORT}/api/moderation
╚════════════════════════════════════════╝
  `);
});

export { app, prisma };
