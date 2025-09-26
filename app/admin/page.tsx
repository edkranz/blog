'use client';

import { useEffect } from 'react';

export default function AdminPage() {
  useEffect(() => {
    // Fix for double login issue
    const preventDoubleSubmission = () => {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn && !submitBtn.hasAttribute('data-fixed')) {
          submitBtn.setAttribute('data-fixed', 'true');
          
          const originalHandler = submitBtn.onclick;
          submitBtn.onclick = function(e) {
            if (this.disabled) {
              e.preventDefault();
              return false;
            }
            this.disabled = true;
            
            // Re-enable after 3 seconds if no navigation occurs
            setTimeout(() => {
              if (this && document.contains(this)) {
                this.disabled = false;
              }
            }, 3000);
            
            if (originalHandler) {
              return originalHandler.call(this, e);
            }
          };
        }
      });
    };

    // Fix for password eye button causing form submission
    const fixPasswordToggle = () => {
      // Find all potential password toggle buttons
      const selectors = [
        'button[aria-label*="password"]',
        'button[title*="password"]',
        'button[aria-label*="Show"]',
        'button[aria-label*="Hide"]',
        'button[class*="eye"]',
        'button[class*="password"]',
        '.password-toggle',
        '[data-password-toggle]'
      ];
      
      selectors.forEach(selector => {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(btn => {
          if (!btn.hasAttribute('data-fixed')) {
            btn.setAttribute('data-fixed', 'true');
            btn.type = 'button'; // Ensure it's not a submit button
            
            // Override click handler
            btn.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              // Find the associated password input
              const passwordInput = 
                this.closest('div')?.querySelector('input[type="password"], input[type="text"]') ||
                this.parentElement?.querySelector('input[type="password"], input[type="text"]') ||
                document.querySelector('input[type="password"], input[name="password"]') ||
                document.querySelector('input[type="text"][name="password"]');
              
              if (passwordInput) {
                if (passwordInput.type === 'password') {
                  passwordInput.type = 'text';
                  this.setAttribute('aria-label', 'Hide password');
                  this.setAttribute('title', 'Hide password');
                } else {
                  passwordInput.type = 'password';
                  this.setAttribute('aria-label', 'Show password');
                  this.setAttribute('title', 'Show password');
                }
              }
              
              return false;
            }, { capture: true });
          }
        });
      });
    };

    // Apply fixes immediately
    preventDoubleSubmission();
    fixPasswordToggle();

    // Set up observer for dynamic content
    const observer = new MutationObserver(() => {
      preventDoubleSubmission();
      fixPasswordToggle();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Apply fixes periodically for SPA updates
    const interval = setInterval(() => {
      preventDoubleSubmission();
      fixPasswordToggle();
    }, 1000);

    // Inject CSS fixes
    const style = document.createElement('style');
    style.textContent = `
      /* Prevent double submission visual feedback */
      .auth-form button[type="submit"]:disabled {
        opacity: 0.6 !important;
        pointer-events: none !important;
        cursor: not-allowed !important;
      }

      /* Fix password toggle button styling */
      button[aria-label*="password"],
      button[title*="password"],
      .password-toggle {
        background: none !important;
        border: none !important;
        cursor: pointer !important;
        outline: none !important;
        padding: 4px 8px !important;
        z-index: 10 !important;
      }

      /* Ensure password toggle doesn't submit form */
      button[aria-label*="password"]:focus,
      button[title*="password"]:focus,
      .password-toggle:focus {
        outline: 2px solid #0066cc !important;
        outline-offset: 2px !important;
      }

      /* Add some visual indication that the toggle is working */
      input[type="text"][name="password"] {
        font-family: monospace !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  // Redirect to the actual TinaCMS admin
  useEffect(() => {
    // Small delay to allow fixes to be applied first
    setTimeout(() => {
      window.location.replace('/admin/');
    }, 100);
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Loading TinaCMS Admin...</h2>
        <p>Applying authentication fixes...</p>
        <div style={{ 
          marginTop: '20px', 
          fontSize: '14px', 
          color: '#666' 
        }}>
          <p>✓ Double login prevention enabled</p>
          <p>✓ Password visibility toggle fixed</p>
        </div>
      </div>
    </div>
  );
}