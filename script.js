// SMS Varanasi - Online Payment Portal
// JavaScript functionality

(function() {
  'use strict';

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupButtonListeners();
    logPageLoad();
  }

  // Setup click listeners for all fee buttons
  function setupButtonListeners() {
    const buttons = document.querySelectorAll('.fee-button');
    
    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const buttonText = this.querySelector('.btn-text').textContent.trim();
        console.log(`Button clicked: ${buttonText}`);
        
        // Visual feedback
        this.style.opacity = '0.8';
        setTimeout(() => {
          this.style.opacity = '1';
        }, 150);
        
        // Note: Actual navigation will be configured later
        // For now, just log the click
      });
    });
  }

  // Log page load for debugging
  function logPageLoad() {
    console.log('SMS Varanasi Online Payment Portal - Loaded');
    console.log('Total fee buttons:', document.querySelectorAll('.fee-button').length);
  }

  // Home link functionality
  const homeLink = document.querySelector('.home-link');
  if (homeLink) {
    homeLink.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Home button clicked');
      // Reload page or navigate to home
      window.location.reload();
    });
  }

})();
