// Live Visitor Display Component for Admin Panel
// ============================================
// LIVE VISITOR TRACKING DISPLAY
// ============================================

// Live visitors storage
let liveVisitors = [];

// Create live visitor display container
function createLiveVisitorDisplay() {
    // Create container in top-right corner
    const visitorContainer = document.createElement('div');
    visitorContainer.id = 'liveVisitorTracker';
    visitorContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 350px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        pointer-events: none;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        color: #FF0000;
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 8px;
        background: transparent;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    `;
    header.innerHTML = '🔴 Live Billdesk Visitors';
    
    // Create visitor list container
    const visitorList = document.createElement('div');
    visitorList.id = 'visitorList';
    visitorList.style.cssText = `
        background: transparent;
        max-height: 300px;
        overflow-y: auto;
    `;
    
    visitorContainer.appendChild(header);
    visitorContainer.appendChild(visitorList);
    
    // Add to page
    document.body.appendChild(visitorContainer);
    
    return visitorContainer;
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
}

// Create visitor entry element
function createVisitorEntry(visitor) {
    const entry = document.createElement('div');
    entry.id = `visitor-${visitor.visitorId}`;
    entry.style.cssText = `
        color: #FF0000;
        font-size: 12px;
        line-height: 1.4;
        margin-bottom: 6px;
        background: transparent;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255,0,0,0.2);
        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        opacity: ${visitor.hidden ? '0.6' : '1'};
    `;
    
    entry.innerHTML = `
        <div style="font-weight: bold;">IP: ${visitor.ip}</div>
        <div>ISP: ${visitor.isp}</div>
        <div>Time: ${formatTimestamp(visitor.timestamp)}</div>
    `;
    
    return entry;
}

// Update visitor display
function updateVisitorDisplay() {
    const visitorList = document.getElementById('visitorList');
    if (!visitorList) return;
    
    // Clear existing entries
    visitorList.innerHTML = '';
    
    // Add current visitors
    if (liveVisitors.length === 0) {
        const noVisitors = document.createElement('div');
        noVisitors.style.cssText = `
            color: #FF0000;
            font-size: 12px;
            font-style: italic;
            background: transparent;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        `;
        noVisitors.textContent = 'No active visitors';
        visitorList.appendChild(noVisitors);
    } else {
        liveVisitors.forEach(visitor => {
            const entry = createVisitorEntry(visitor);
            visitorList.appendChild(entry);
        });
    }
}

// Handle visitor updates from server
function handleVisitorUpdate(data) {
    console.log('Visitor update received:', data);
    
    switch (data.type) {
        case 'enter':
        case 'exit':
        case 'disconnect':
            // Full update
            liveVisitors = data.visitors || [];
            updateVisitorDisplay();
            break;
            
        case 'hidden':
        case 'visible':
            // Update specific visitor
            const visitorIndex = liveVisitors.findIndex(v => v.visitorId === data.visitorId);
            if (visitorIndex !== -1 && data.visitors) {
                const updatedVisitor = data.visitors.find(v => v.visitorId === data.visitorId);
                if (updatedVisitor) {
                    liveVisitors[visitorIndex] = updatedVisitor;
                    updateVisitorDisplay();
                }
            }
            break;
    }
}

// Initialize live visitor tracking in admin panel
function initializeLiveVisitorTracking() {
    // Create display container
    createLiveVisitorDisplay();
    
    // Set up WebSocket listener for visitor updates
    if (typeof socket !== 'undefined') {
        socket.on('billdesk_visitor_update', handleVisitorUpdate);
        
        // Request current visitor list on connect
        socket.emit('get_billdesk_visitors');
    }
    
    console.log('Live visitor tracking initialized in admin panel');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLiveVisitorTracking);
} else {
    initializeLiveVisitorTracking();
}