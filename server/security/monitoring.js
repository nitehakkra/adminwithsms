// Advanced Monitoring & Intrusion Detection System
// Real-time threat detection and response

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SecurityMonitoring {
    constructor() {
        this.threatDatabase = new Map();
        this.activeThreats = new Set();
        this.securityEvents = [];
        this.alertThresholds = {
            failedLogins: 5,
            suspiciousRequests: 10,
            ddosRequests: 100,
            malwareIndicators: 1
        };
        this.monitoringEnabled = true;
        this.logFile = path.join(__dirname, '../logs/security.log');
        this.initializeMonitoring();
    }

    // 1. INITIALIZE MONITORING SYSTEM
    async initializeMonitoring() {
        console.log('🔒 Initializing Advanced Security Monitoring...');
        
        // Create logs directory if it doesn't exist
        try {
            await fs.mkdir(path.dirname(this.logFile), { recursive: true });
        } catch (error) {
            // Directory might already exist
        }

        // Load threat intelligence database
        await this.loadThreatIntelligence();
        
        // Start monitoring loops
        this.startThreatDetection();
        this.startPerformanceMonitoring();
        this.startAutoResponse();
        
        console.log('✅ Security Monitoring System Active');
    }

    // 2. THREAT INTELLIGENCE DATABASE
    async loadThreatIntelligence() {
        // Known malicious IP ranges and patterns
        const knownThreats = [
            // Tor exit nodes (basic patterns)
            /^192\.42\.116\./, /^199\.87\.154\./, /^176\.10\.104\./,
            // VPN/Proxy patterns
            /^185\.220\./, /^77\.247\.181\./, /^192\.99\./,
            // Known attack patterns
            /^103\./, /^45\./, /^194\./
        ];

        knownThreats.forEach(pattern => {
            this.threatDatabase.set(pattern.source, {
                type: 'suspicious_ip_pattern',
                severity: 'medium',
                description: 'Potentially malicious IP pattern'
            });
        });

        // Malware indicators
        const malwareIndicators = [
            'eval(', 'base64_decode', 'shell_exec', 'system(',
            'exec(', 'passthru', 'file_get_contents', 'curl_exec'
        ];

        malwareIndicators.forEach(indicator => {
            this.threatDatabase.set(indicator, {
                type: 'malware_indicator',
                severity: 'high',
                description: 'Potential malware/exploit attempt'
            });
        });
    }

    // 3. REAL-TIME THREAT DETECTION
    startThreatDetection() {
        // Monitor every 10 seconds
        setInterval(() => {
            if (!this.monitoringEnabled) return;
            
            this.analyzeSecurityEvents();
            this.detectAnomalies();
            this.checkThreatIntelligence();
        }, 10000);
    }

    // 4. REQUEST ANALYSIS MIDDLEWARE
    analyzeRequest(req, res, next) {
        const startTime = Date.now();
        const clientIP = this.getClientIP(req);
        const userAgent = req.headers['user-agent'] || '';
        const requestSignature = this.generateRequestSignature(req);

        // Create security event
        const securityEvent = {
            id: crypto.randomBytes(16).toString('hex'),
            timestamp: new Date().toISOString(),
            ip: clientIP,
            userAgent,
            method: req.method,
            path: req.path,
            headers: { ...req.headers },
            signature: requestSignature,
            suspiciousScore: 0
        };

        // Analyze for threats
        this.performThreatAnalysis(securityEvent);
        
        // Store event
        this.storeSecurityEvent(securityEvent);

        // Continue to next middleware
        req.securityEvent = securityEvent;
        next();

        // Post-request analysis
        res.on('finish', () => {
            securityEvent.responseTime = Date.now() - startTime;
            securityEvent.statusCode = res.statusCode;
            this.analyzeResponse(securityEvent, res);
        });
    }

    // 5. THREAT ANALYSIS ENGINE
    performThreatAnalysis(event) {
        let suspiciousScore = 0;
        const alerts = [];

        // Check IP against threat database
        for (const [pattern, threat] of this.threatDatabase) {
            if (typeof pattern === 'string') {
                if (event.ip.includes(pattern)) {
                    suspiciousScore += this.getSeverityScore(threat.severity);
                    alerts.push(`IP matches threat pattern: ${threat.description}`);
                }
            } else if (pattern instanceof RegExp) {
                if (pattern.test(event.ip)) {
                    suspiciousScore += this.getSeverityScore(threat.severity);
                    alerts.push(`IP matches suspicious pattern: ${threat.description}`);
                }
            }
        }

        // Check for malware indicators in request
        const requestBody = JSON.stringify({
            path: event.path,
            userAgent: event.userAgent,
            headers: event.headers
        });

        for (const [indicator, threat] of this.threatDatabase) {
            if (threat.type === 'malware_indicator' && requestBody.includes(indicator)) {
                suspiciousScore += this.getSeverityScore(threat.severity);
                alerts.push(`Malware indicator detected: ${indicator}`);
            }
        }

        // Check for suspicious user agents
        if (this.isSuspiciousUserAgent(event.userAgent)) {
            suspiciousScore += 3;
            alerts.push('Suspicious user agent detected');
        }

        // Check for rapid requests (potential DDoS)
        if (this.isRapidRequest(event.ip)) {
            suspiciousScore += 5;
            alerts.push('Rapid requests detected - potential DDoS');
        }

        // Check for directory traversal
        if (event.path.includes('../') || event.path.includes('..\\')) {
            suspiciousScore += 8;
            alerts.push('Directory traversal attempt detected');
        }

        // Check for SQL injection patterns
        if (this.containsSQLInjection(requestBody)) {
            suspiciousScore += 10;
            alerts.push('SQL injection attempt detected');
        }

        event.suspiciousScore = suspiciousScore;
        event.alerts = alerts;

        // Take immediate action if high risk
        if (suspiciousScore >= 10) {
            this.handleHighRiskThreat(event);
        }
    }

    // 6. AUTOMATED THREAT RESPONSE
    handleHighRiskThreat(event) {
        const threatId = `THREAT_${Date.now()}_${event.id.substring(0, 8)}`;
        
        console.log(`🚨 HIGH RISK THREAT DETECTED: ${threatId}`);
        console.log(`   IP: ${event.ip}`);
        console.log(`   Score: ${event.suspiciousScore}`);
        console.log(`   Alerts: ${event.alerts.join(', ')}`);

        // Add to active threats
        this.activeThreats.add(event.ip);

        // Log security incident
        this.logSecurityIncident({
            threatId,
            type: 'high_risk_threat',
            ip: event.ip,
            score: event.suspiciousScore,
            alerts: event.alerts,
            timestamp: event.timestamp,
            action: 'auto_blocked'
        });

        // Auto-block for 1 hour
        setTimeout(() => {
            this.activeThreats.delete(event.ip);
            console.log(`🔓 Auto-unblocked IP: ${event.ip}`);
        }, 3600000); // 1 hour
    }

    // 7. SECURITY DASHBOARD METRICS
    getSecurityMetrics() {
        const recentEvents = this.securityEvents.filter(
            event => Date.now() - new Date(event.timestamp).getTime() < 3600000 // Last hour
        );

        return {
            totalEvents: this.securityEvents.length,
            recentEvents: recentEvents.length,
            activeThreats: this.activeThreats.size,
            averageSuspiciousScore: this.calculateAverageSuspiciousScore(recentEvents),
            topThreats: this.getTopThreats(recentEvents),
            threatsByType: this.getThreatsByType(recentEvents),
            blockedIPs: Array.from(this.activeThreats),
            systemHealth: this.getSystemHealth()
        };
    }

    // 8. INTRUSION DETECTION SYSTEM
    detectAnomalies() {
        const recentEvents = this.getRecentEvents(300000); // Last 5 minutes
        
        // Detect unusual traffic patterns
        const ipCounts = {};
        const pathCounts = {};
        
        recentEvents.forEach(event => {
            ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
            pathCounts[event.path] = (pathCounts[event.path] || 0) + 1;
        });

        // Check for potential attacks
        Object.entries(ipCounts).forEach(([ip, count]) => {
            if (count > 50) { // More than 50 requests in 5 minutes
                this.logSecurityIncident({
                    type: 'potential_ddos',
                    ip,
                    requestCount: count,
                    timeWindow: '5_minutes',
                    timestamp: new Date().toISOString()
                });
            }
        });

        Object.entries(pathCounts).forEach(([path, count]) => {
            if (count > 100) { // More than 100 requests to same path
                this.logSecurityIncident({
                    type: 'path_flooding',
                    path,
                    requestCount: count,
                    timeWindow: '5_minutes',
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    // Helper Methods
    getClientIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               req.connection.remoteAddress ||
               '127.0.0.1';
    }

    generateRequestSignature(req) {
        const data = `${req.method}:${req.path}:${req.headers['user-agent']}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    isSuspiciousUserAgent(userAgent) {
        const suspicious = [
            'sqlmap', 'nmap', 'nikto', 'dirb', 'gobuster',
            'wget', 'curl', 'python-requests', 'scanner'
        ];
        return suspicious.some(pattern => userAgent.toLowerCase().includes(pattern));
    }

    isRapidRequest(ip) {
        const recentRequests = this.securityEvents.filter(
            event => event.ip === ip && 
            Date.now() - new Date(event.timestamp).getTime() < 60000 // Last minute
        );
        return recentRequests.length > 10;
    }

    containsSQLInjection(text) {
        const sqlPatterns = [
            /(\b(select|insert|update|delete|drop|create|alter|exec|execute|union)\b)/i,
            /(\b(or|and)\b.*[=<>].*(\b(select|insert|update|delete|drop|create|alter|exec|execute|union)\b))/i,
            /(\'|\"|`).*(or|and).*(\=|<|>)/i
        ];
        return sqlPatterns.some(pattern => pattern.test(text));
    }

    getSeverityScore(severity) {
        const scores = { low: 1, medium: 3, high: 8, critical: 15 };
        return scores[severity] || 1;
    }

    storeSecurityEvent(event) {
        this.securityEvents.push(event);
        
        // Keep only last 10,000 events to prevent memory issues
        if (this.securityEvents.length > 10000) {
            this.securityEvents = this.securityEvents.slice(-5000);
        }
    }

    async logSecurityIncident(incident) {
        const logEntry = `${new Date().toISOString()} [SECURITY] ${JSON.stringify(incident)}\n`;
        
        try {
            await fs.appendFile(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write security log:', error);
        }
    }

    getRecentEvents(timeWindow) {
        const cutoff = Date.now() - timeWindow;
        return this.securityEvents.filter(
            event => new Date(event.timestamp).getTime() > cutoff
        );
    }

    startPerformanceMonitoring() {
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            // Monitor for resource exhaustion attacks
            if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
                this.logSecurityIncident({
                    type: 'high_memory_usage',
                    memoryUsage: memUsage,
                    timestamp: new Date().toISOString()
                });
            }
        }, 30000); // Every 30 seconds
    }

    startAutoResponse() {
        // Cleanup old events every hour
        setInterval(() => {
            const oneHourAgo = Date.now() - 3600000;
            this.securityEvents = this.securityEvents.filter(
                event => new Date(event.timestamp).getTime() > oneHourAgo
            );
        }, 3600000);
    }

    // Public methods for integration
    isBlocked(ip) {
        return this.activeThreats.has(ip);
    }

    blockIP(ip, reason = 'Manual block') {
        this.activeThreats.add(ip);
        this.logSecurityIncident({
            type: 'manual_ip_block',
            ip,
            reason,
            timestamp: new Date().toISOString()
        });
    }

    unblockIP(ip) {
        this.activeThreats.delete(ip);
        this.logSecurityIncident({
            type: 'manual_ip_unblock',
            ip,
            timestamp: new Date().toISOString()
        });
    }

    getSystemHealth() {
        return {
            status: 'operational',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            activeConnections: this.securityEvents.length
        };
    }

    calculateAverageSuspiciousScore(events) {
        if (events.length === 0) return 0;
        const sum = events.reduce((acc, event) => acc + (event.suspiciousScore || 0), 0);
        return (sum / events.length).toFixed(2);
    }

    getTopThreats(events) {
        const threats = {};
        events.forEach(event => {
            if (event.suspiciousScore > 5) {
                threats[event.ip] = (threats[event.ip] || 0) + 1;
            }
        });
        
        return Object.entries(threats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([ip, count]) => ({ ip, count }));
    }

    getThreatsByType(events) {
        const types = {};
        events.forEach(event => {
            if (event.alerts) {
                event.alerts.forEach(alert => {
                    types[alert] = (types[alert] || 0) + 1;
                });
            }
        });
        return types;
    }

    checkThreatIntelligence() {
        // Periodically update threat intelligence
        // In production, this would fetch from external threat feeds
        console.log('🔍 Updating threat intelligence...');
    }

    analyzeResponse(event, res) {
        // Analyze response for data leaks
        const contentType = res.getHeader('content-type') || '';
        
        if (contentType.includes('application/json') && res.statusCode === 500) {
            // Potential information disclosure in error responses
            this.logSecurityIncident({
                type: 'potential_info_disclosure',
                ip: event.ip,
                path: event.path,
                statusCode: res.statusCode,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = new SecurityMonitoring();