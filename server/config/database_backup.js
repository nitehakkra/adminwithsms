// LowDB Database Configuration (Production-Ready, No Compilation Required)
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(dataDir, 'payments.json');

class Database {
    constructor() {
        this.db = null;
    }
    
    // Initialize database connection
    async connect() {
        try {
            const adapter = new FileSync(DB_PATH);
            this.db = low(adapter);
            
            // Set default structure
            this.db.defaults({
                transactions: [],
                paymentSessions: [],
                adminUsers: [],
                adminSessions: [],
                auditLog: []
            }).write();
            
            logger.info('Database connected:', DB_PATH);
            return Promise.resolve();
        } catch (error) {
            logger.error('Database connection error:', error);
            return Promise.reject(error);
        }
    }
    
    // Simplified JSON-based methods (no SQL needed)
    
    // Close connection
    close() {
        logger.info('Database connection closed');
        return Promise.resolve();
    }
    
    // ============================================
    // TRANSACTION METHODS
    // ============================================
    
    async createTransaction(transaction) {
        this.db.get('transactions')
            .push({
                ...transaction,
                created_at: new Date().toISOString(),
                completed_at: transaction.status === 'completed' ? new Date().toISOString() : null
            })
            .write();
        return Promise.resolve();
    }
    
    async getTransaction(id) {
        return this.db.get('transactions').find({ id }).value();
    }
    
    async getAllTransactions(limit = 100) {
        return this.db.get('transactions')
            .orderBy(['created_at'], ['desc'])
            .take(limit)
            .value();
    }
    
    // ============================================
    // SESSION METHODS
    // ============================================
    
    async createPaymentSession(session) {
        this.db.get('paymentSessions')
            .push({
                ...session,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .write();
        return Promise.resolve();
    }
    
    async updatePaymentSession(sessionId, updates) {
        this.db.get('paymentSessions')
            .find({ sessionId })
            .assign({ ...updates, updated_at: new Date().toISOString() })
            .write();
        return Promise.resolve();
    }
    
    async getPaymentSession(sessionId) {
        return this.db.get('paymentSessions').find({ sessionId }).value();
    }
    
    // ============================================
    // ADMIN METHODS
    // ============================================
    
    async createAdminUser(username, passwordHash) {
        const id = this.db.get('adminUsers').size().value() + 1;
        this.db.get('adminUsers')
            .push({
                id,
                username,
                password_hash: passwordHash,
                role: 'admin',
                is_active: true,
                failed_login_attempts: 0,
                locked_until: null,
                created_at: new Date().toISOString(),
                last_login: null
            })
            .write();
        return Promise.resolve();
    }
    
    async getAdminUser(username) {
        return this.db.get('adminUsers').find({ username }).value();
    }
    
    async updateFailedLoginAttempts(username, attempts, lockedUntil = null) {
        this.db.get('adminUsers')
            .find({ username })
            .assign({ 
                failed_login_attempts: attempts,
                locked_until: lockedUntil
            })
            .write();
        return Promise.resolve();
    }
    
    async updateLastLogin(username) {
        this.db.get('adminUsers')
            .find({ username })
            .assign({ 
                last_login: new Date().toISOString(),
                failed_login_attempts: 0,
                locked_until: null
            })
            .write();
        return Promise.resolve();
    }
    
    // ============================================
    // AUDIT LOG
    // ============================================
    
    async logAudit(event) {
        this.db.get('auditLog')
            .push({
                ...event,
                created_at: new Date().toISOString()
            })
            .write();
        return Promise.resolve();
    }
}

// Singleton instance
const database = new Database();

module.exports = database;
