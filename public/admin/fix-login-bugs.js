/**
 * TinaCMS Login Bug Fixes
 * Fixes:
 * 1. Double login requirement issue
 * 2. Password visibility toggle button causing form submission
 */

(function() {
  'use strict';

  // Track authentication state to prevent double login
  let isAuthenticating = false;
  let authComplete = false;

  // Fix for double login issue
  function preventDoubleLogin() {
    // Override fetch to intercept auth requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      const options = args[1] || {};
      
      // Check if this is an authentication request
      if (typeof url === 'string' && (
          url.includes('/auth') || 
          url.includes('/login') || 
          url.includes('/authenticate')
        )) {
        
        if (isAuthenticating) {
          console.log('Preventing duplicate authentication request');
          return Promise.reject(new Error('Authentication already in progress'));
        }
        
        isAuthenticating = true;
        
        return originalFetch.apply(this, args)
          .then(response => {
            if (response.ok) {
              authComplete = true;
              console.log('Authentication successful, preventing future double logins');
            }
            isAuthenticating = false;
            return response;
          })
          .catch(error => {
            isAuthenticating = false;
            throw error;
          });
      }
      
      return originalFetch.apply(this, args);
    };

    // Also monitor form submissions
    document.addEventListener('submit', function(e) {
      const form = e.target;
      if (form && form.querySelector('input[type="password"]')) {
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
          if (isAuthenticating) {
            e.preventDefault();
            console.log('Preventing duplicate form submission during authentication');
            return false;
          }
          
          isAuthenticating = true;
          submitBtn.disabled = true;
          
          // Re-enable after timeout
          setTimeout(() => {
            if (submitBtn && document.contains(submitBtn)) {
              submitBtn.disabled = false;
            }
            if (!authComplete) {
              isAuthenticating = false;
            }
          }, 5000);
        }
      }
    }, true);
  }

  // Fix for password visibility toggle button submission issue
  function fixPasswordToggle() {
    function applyPasswordToggleFix() {
      // Find all buttons that might be password toggles
      const potentialToggleButtons = document.querySelectorAll('button');
      
      potentialToggleButtons.forEach(button => {
        // Skip if already fixed
        if (button.hasAttribute('data-password-toggle-fixed')) {
          return;
        }
        
        // Check if this looks like a password toggle button
        const isPasswordToggle = (
          button.getAttribute('aria-label')?.toLowerCase().includes('password') ||
          button.getAttribute('title')?.toLowerCase().includes('password') ||
          button.getAttribute('aria-label')?.toLowerCase().includes('show') ||
          button.getAttribute('aria-label')?.toLowerCase().includes('hide') ||
          button.querySelector('svg') && (
            button.closest('.password') ||
            button.closest('[class*="password"]') ||
            button.parentElement?.querySelector('input[type="password"]') ||
            button.parentElement?.querySelector('input[name="password"]')
          )
        );

        if (isPasswordToggle) {
          console.log('Found password toggle button, applying fix');
          
          // Mark as fixed
          button.setAttribute('data-password-toggle-fixed', 'true');
          
          // Ensure it's not a submit button
          if (button.type !== 'button') {
            button.type = 'button';
          }
          
          // Remove any existing form submission handlers
          button.removeAttribute('onclick');
          
          // Add our controlled click handler
          button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            console.log('Password toggle clicked');
            
            // Find the associated password input
            let passwordInput = null;
            
            // Try different strategies to find the password input
            const searchStrategies = [
              () => this.closest('div')?.querySelector('input[type="password"], input[type="text"][name*="password"]'),
              () => this.parentElement?.querySelector('input[type="password"], input[type="text"][name*="password"]'),
              () => this.parentElement?.parentElement?.querySelector('input[type="password"], input[type="text"][name*="password"]'),
              () => document.querySelector('input[type="password"]'),
              () => document.querySelector('input[name="password"]'),
              () => document.querySelector('input[name*="password"]')
            ];
            
            for (const strategy of searchStrategies) {
              passwordInput = strategy();
              if (passwordInput) break;
            }
            
            if (passwordInput) {
              console.log('Found password input, toggling visibility');
              
              if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.setAttribute('aria-label', 'Hide password');
                this.setAttribute('title', 'Hide password');
              } else {
                passwordInput.type = 'password';
                this.setAttribute('aria-label', 'Show password');
                this.setAttribute('title', 'Show password');
              }
            } else {
              console.warn('Could not find associated password input');
            }
            
            return false;
          }, { capture: true, passive: false });
        }
      });
    }

    // Apply fixes immediately
    applyPasswordToggleFix();

    // Set up mutation observer for dynamic content
    const observer = new MutationObserver(function(mutations) {
      let shouldReapply = false;
      
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && (
              node.tagName === 'BUTTON' ||
              node.querySelector && node.querySelector('button')
            )) {
            shouldReapply = true;
          }
        });
      });
      
      if (shouldReapply) {
        setTimeout(applyPasswordToggleFix, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also reapply periodically for SPA updates
    setInterval(applyPasswordToggleFix, 2000);
  }

  // Add CSS fixes
  function addCSsFixes() {
    const style = document.createElement('style');
    style.id = 'tinacms-login-fixes';
    style.textContent = `
      /* Prevent accidental form submission on password toggle */
      button[data-password-toggle-fixed] {
        background: none !important;
        border: none !important;
        cursor: pointer !important;
        outline: none !important;
        padding: 4px 8px !important;
        z-index: 10 !important;
        position: relative !important;
      }

      button[data-password-toggle-fixed]:focus {
        outline: 2px solid #0066cc !important;
        outline-offset: 2px !important;
      }

      /* Visual feedback for disabled submit buttons */
      button[type="submit"]:disabled,
      input[type="submit"]:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
        pointer-events: none !important;
      }

      /* Better visibility for password input when shown as text */
      input[type="text"][name*="password"] {
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
        letter-spacing: 0.5px !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  // Initialize all fixes
  function initializeFixes() {
    console.log('Initializing TinaCMS login bug fixes...');
    
    preventDoubleLogin();
    fixPasswordToggle();
    addCSsFixes();
    
    console.log('TinaCMS login bug fixes applied successfully');
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFixes);
  } else {
    initializeFixes();
  }

  // Also run when page becomes visible (for SPA navigation)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      setTimeout(initializeFixes, 100);
    }
  });

})();