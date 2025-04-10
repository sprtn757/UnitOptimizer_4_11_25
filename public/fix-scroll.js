// Comprehensive fix for scroll issues in mobile browsers
(function() {
  try {
    // Watch for DOM changes to apply fixes
    const observer = new MutationObserver(() => {
      try {
        fixScrollIssues();
      } catch (e) {
        console.log('Error in MutationObserver callback:', e);
      }
    });
    
    // Set the --app-height CSS variable based on the window height
    const fixScrollIssues = () => {
      try {
        const doc = document.documentElement;
        doc.style.setProperty('--app-height', `${window.innerHeight}px`);
        
        // Use requestAnimationFrame to ensure we're not fighting against the browser
        requestAnimationFrame(() => {
          try {
            // Reset body and html to default state
            document.body.classList.remove('no-scroll');
            document.documentElement.classList.remove('no-scroll');
            
            // Ensure the body has proper scroll settings
            document.body.style.overflow = 'auto';
            document.body.style.overflowX = 'hidden';
            document.body.style.height = 'auto';
            document.body.style.position = 'static';
            document.body.style.overscrollBehavior = 'none';
            
            // Set document styles
            document.documentElement.style.height = 'auto';
            document.documentElement.style.overflow = 'auto';
            document.documentElement.style.overscrollBehavior = 'none';
            document.documentElement.style.position = 'static';
            
            // Handle root element
            const rootElement = document.getElementById('root');
            if (rootElement) {
              rootElement.style.height = '100%';
              rootElement.style.overflow = 'auto';
              rootElement.style.overscrollBehavior = 'none';
              rootElement.style.position = 'relative';
            }
            
            // Apply overscroll behavior to main content elements
            document.querySelectorAll('.app-main-content, .app-sidebar-content').forEach(el => {
              el.style.overscrollBehavior = 'none';
              el.style.webkitOverflowScrolling = 'touch';
              el.style.overflow = 'auto';
            });
            
            // Fix for select elements and dropdowns
            document.querySelectorAll('select').forEach(select => {
              // Prevent default handling for select and dropdown events
              select.style.webkitAppearance = 'menulist';
              select.style.appearance = 'menulist';
              select.style.fontSize = '16px'; // Prevent iOS zoom
              
              // Add event listeners to detect dropdown interactions
              // We need all these handlers to ensure smooth scrolling after selection
              select.addEventListener('focus', () => {
                // Don't lock scrolling when select is focused
                document.body.style.position = 'static';
                document.documentElement.style.position = 'static';
              }, { passive: true });
              
              select.addEventListener('blur', () => {
                // After dropdown closes, ensure scrolling is restored
                setTimeout(() => {
                  document.body.style.overflow = 'auto';
                  document.documentElement.style.overflow = 'auto';
                  document.body.style.position = 'static';
                  document.documentElement.style.position = 'static';
                }, 100);
              }, { passive: true });
              
              select.addEventListener('change', () => {
                // After selection, ensure scrolling is restored
                setTimeout(() => {
                  document.body.style.overflow = 'auto';
                  document.documentElement.style.overflow = 'auto';
                  document.body.style.position = 'static';
                  document.documentElement.style.position = 'static';
                  
                  // Also reset all parent scrollable containers
                  const mainContent = document.querySelector('.app-main-content');
                  if (mainContent) {
                    mainContent.style.overflow = 'auto';
                    mainContent.style.overflowY = 'auto';
                  }
                }, 100);
              }, { passive: true });
            });
          } catch (e) {
            console.log('Error in requestAnimationFrame callback:', e);
          }
        });
      } catch (e) {
        console.log('Error in fixScrollIssues:', e);
      }
    };

    // Set the height initially and fix scrolling
    fixScrollIssues();
    
    // Update whenever window is resized
    window.addEventListener('resize', fixScrollIssues, { passive: true });
    
    // Also fix when device orientation changes
    window.addEventListener('orientationchange', fixScrollIssues, { passive: true });
    
    // Fix after user interaction
    document.addEventListener('touchend', () => {
      setTimeout(fixScrollIssues, 100);
    }, { passive: true });
    
    // Observe DOM changes
    observer.observe(document.documentElement, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // Special handler for select elements
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.tagName === 'SELECT' || target.closest('select')) {
        // Don't interfere with select clicks
        e.stopPropagation();
      }
    }, { passive: false });
    
    // Modified touchmove handler for iOS Safari bounce effect
    document.addEventListener('touchmove', function(e) {
      try {
        // Never prevent scrolling in select elements or their options
        const target = e.target;
        
        // Check if it's a form control that needs scroll behavior
        const isFormControl = 
          target.tagName === 'SELECT' || 
          target.tagName === 'OPTION' ||
          target.closest('select') ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA';
        
        // Check if it's within a scrollable container
        const isScrollable = 
          target.classList.contains('scrollable') || 
          target.closest('.app-main-content, .app-sidebar-content, .scrollable') ||
          (target.scrollHeight > target.clientHeight);
        
        // Only prevent default at document edges
        if (!isFormControl && !isScrollable) {
          // Only prevent the bounce effect at the boundaries
          const isAtTop = window.scrollY <= 0;
          const isAtBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight;
          
          if ((isAtTop && e.touches[0].clientY > 0) || 
              (isAtBottom && e.touches[0].clientY < window.innerHeight)) {
            e.preventDefault();
          }
        }
      } catch (e) {
        console.log('Error in touchmove handler:', e);
      }
    }, { passive: false });
    
    // Fix scroll issues when content is loaded or DOM changes
    window.addEventListener('load', fixScrollIssues, { passive: true });
    document.addEventListener('DOMContentLoaded', fixScrollIssues, { passive: true });
    
    // Add special handler for select elements
    const fixSelectInteractions = () => {
      // Find and enhance all select elements
      document.querySelectorAll('select').forEach(select => {
        // Mark parent as containing a select
        const parent = select.parentElement;
        if (parent) {
          parent.classList.add('select-container');
        }
      });
    };
    
    // Run the select fix
    fixSelectInteractions();
    
    // Also run after DOM changes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  } catch (e) {
    console.log('Error in fix-scroll.js:', e);
  }
})();