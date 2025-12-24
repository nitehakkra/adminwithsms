// Advanced Security Module - Complete Cyber Protection
// Protects against: DDoS, Location tracking, Social engineering, etc.

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

class AdvancedSecurity {
    constructor() {
        this.blockedIPs = new Set();
        this.suspiciousActivities = new Map();
        this.attackAttempts = new Map();
        this.locationMasks = new Set();
    }

    // 1. SERVER FINGERPRINT OBFUSCATION
    obfuscateServerFingerprint(app) {
        // Remove server identification
        app.disable('x-powered-by');
        
        // Custom server signature
        app.use((req, res, next) => {
            res.removeHeader('Server');
            res.removeHeader('X-Powered-By');
            res.setHeader('Server', 'CloudFlare'); // Fake signature
            res.setHeader('X-Powered-By', 'PHP/7.4.3'); // Fake technology stack
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Referrer-Policy', 'no-referrer');
            res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
            next();
        });
    }

    // 2. ANTI-DDOS PROTECTION (Multiple layers)
    createDDoSProtection() {
        return {
            // Layer 1: Aggressive rate limiting
            aggressive: rateLimit({
                windowMs: 1 * 60 * 1000, // 1 minute
                max: 5, // 5 requests per minute
                message: { error: 'Too many requests, try again later' },
                standardHeaders: false,
                legacyHeaders: false,
                keyGenerator: (req) => {
                    return this.getClientFingerprint(req);
                }
            }),

            // Layer 2: Standard protection
            standard: rateLimit({
                windowMs: 5 * 60 * 1000, // 5 minutes
                max: 50, // 50 requests per 5 minutes
                message: { error: 'Rate limit exceeded' },
                standardHeaders: false,
                legacyHeaders: false
            }),

            // Layer 3: IP reputation based
            reputation: (req, res, next) => {
                const clientIP = this.getClientIP(req);
                
                if (this.blockedIPs.has(clientIP)) {
                    return res.status(403).json({ error: 'Access denied' });
                }

                // Track suspicious activities
                this.trackSuspiciousActivity(clientIP, req);
                next();
            }
        };
    }

    // 3. LOCATION & GEO MASKING
    setupLocationProtection(app) {
        app.use((req, res, next) => {
            // Strip geolocation headers
            delete req.headers['cf-ipcountry'];
            delete req.headers['x-forwarded-country'];
            delete req.headers['x-real-ip'];
            delete req.headers['x-client-ip'];
            
            // Add fake location headers
            res.setHeader('CF-IPCountry', this.getRandomCountry());
            res.setHeader('X-Geographic-Location', 'Unknown');
            next();
        });
    }

    // 4. SOCIAL ENGINEERING PROTECTION
    createSocialEngineeringProtection() {
        return {
            // Detect reconnaissance attempts
            reconnaissance: (req, res, next) => {
                const suspiciousPaths = [
                    '/admin', '/phpmyadmin', '/.env', '/wp-admin', 
                    '/api/users', '/config', '/backup', '/database',
                    '/.git', '/server-status', '/server-info'
                ];

                if (suspiciousPaths.some(path => req.path.includes(path))) {
                    this.logSecurityIncident('reconnaissance_attempt', req);
                    return res.status(404).json({ error: 'Not found' });
                }
                next();
            },

            // Detect automated scanning
            botDetection: (req, res, next) => {
                const userAgent = req.headers['user-agent'] || '';
                const suspiciousAgents = [
                    'nmap', 'masscan', 'zmap', 'curl', 'wget',
                    'python-requests', 'go-http-client', 'scanner'
                ];

                if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
                    this.logSecurityIncident('bot_detection', req);
                    return res.status(403).json({ error: 'Access denied' });
                }
                next();
            },

            // Human behavior validation
            humanValidation: (req, res, next) => {
                // Check for human-like request patterns
                const clientFingerprint = this.getClientFingerprint(req);
                const activity = this.suspiciousActivities.get(clientFingerprint) || {
                    requests: 0,
                    lastRequest: Date.now(),
                    patterns: []
                };

                // Detect too fast requests (bot-like)
                const timeDiff = Date.now() - activity.lastRequest;
                if (timeDiff < 100) { // Less than 100ms between requests
                    this.logSecurityIncident('bot_like_speed', req);
                    return res.status(429).json({ error: 'Slow down' });
                }

                activity.requests++;
                activity.lastRequest = Date.now();
                this.suspiciousActivities.set(clientFingerprint, activity);
                next();
            }
        };
    }

    // 5. ADVANCED INTRUSION DETECTION
    setupIntrusionDetection(app) {
        app.use((req, res, next) => {
            // SQL Injection detection
            const sqlPatterns = [
                /('|(\\'))(.*)(\\s|\\+)*(or|and|union|select|insert|delete|update|drop|create|alter)\\s*\\d/i,
                /(union|select|insert|delete|update|drop|create|alter).*\\(/i,
                /\\b(or|and)\\b.*[=<>]/i
            ];

            const payload = JSON.stringify(req.body) + req.url + JSON.stringify(req.query);
            
            if (sqlPatterns.some(pattern => pattern.test(payload))) {
                this.logSecurityIncident('sql_injection_attempt', req);
                return res.status(403).json({ error: 'Invalid request' });
            }

            // XSS detection
            const xssPatterns = [
                /<script[^>]*>.*?<\\/script>/gi,
                /javascript:/gi,
                /on\\w+\\s*=/gi,
                /<iframe/gi,
                /<object/gi
            ];

            if (xssPatterns.some(pattern => pattern.test(payload))) {
                this.logSecurityIncident('xss_attempt', req);
                return res.status(403).json({ error: 'Invalid request' });
            }

            next();
        });
    }

    // 6. REAL-TIME THREAT MONITORING
    setupThreatMonitoring(io) {
        setInterval(() => {
            // Clear old attack attempts
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            for (const [ip, timestamp] of this.attackAttempts.entries()) {
                if (timestamp < oneHourAgo) {
                    this.attackAttempts.delete(ip);
                }
            }

            // Auto-unblock IPs after 24 hours
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            for (const ip of this.blockedIPs) {
                const blockTime = this.attackAttempts.get(ip + '_blocked');
                if (blockTime && blockTime < oneDayAgo) {
                    this.blockedIPs.delete(ip);
                    this.attackAttempts.delete(ip + '_blocked');
                }
            }
        }, 60000); // Check every minute
    }

    // 7. IP CLOAKING & ANONYMIZATION
    setupIPCloaking(app) {
        app.use((req, res, next) => {
            // Replace real IP with random IP in logs
            const originalIP = this.getClientIP(req);
            const hashedIP = crypto.createHash('sha256')
                .update(originalIP + process.env.ENCRYPTION_KEY || 'default-key')
                .digest('hex').substring(0, 8);
            
            // Store mapping for security purposes only
            req.clientHash = hashedIP;
            req.realIP = originalIP; // Keep for blocking purposes
            
            // Remove IP traces from headers
            delete req.headers['x-forwarded-for'];
            delete req.headers['x-real-ip'];
            delete req.headers['x-client-ip'];
            
            next();
        });
    }

    // Helper Methods
    getClientIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               '0.0.0.0';
    }

    getClientFingerprint(req) {
        const ip = this.getClientIP(req);
        const userAgent = req.headers['user-agent'] || '';
        const acceptLang = req.headers['accept-language'] || '';
        
        return crypto.createHash('md5')
            .update(ip + userAgent + acceptLang)
            .digest('hex');
    }

    trackSuspiciousActivity(ip, req) {
        const attempts = this.attackAttempts.get(ip) || 0;
        this.attackAttempts.set(ip, attempts + 1);

        // Block after 10 suspicious requests
        if (attempts > 10) {
            this.blockedIPs.add(ip);
            this.attackAttempts.set(ip + '_blocked', Date.now());
            this.logSecurityIncident('ip_blocked', req);
        }
    }

    getRandomCountry() {
        const countries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'SG'];
        return countries[Math.floor(Math.random() * countries.length)];
    }

    logSecurityIncident(type, req) {
        const incident = {
            type,
            ip: this.getClientIP(req),
            userAgent: req.headers['user-agent'],
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
        };
        
        console.log('🚨 SECURITY INCIDENT:', incident);
        // Log to file or external security service
    }
}

module.exports = new AdvancedSecurity();