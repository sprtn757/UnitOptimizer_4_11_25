// Comprehensive fix for scroll issues in mobile browsers
(function() {
  // Watch for DOM changes to apply fixes
  const observer = new MutationObserver(() => {
    fixScrollIssues();
  });
  
  // First, set the --app-height CSS variable based on the window height
  const fixScrollIssues = () => {
    const doc = document.documentElement;
    doc.style.setProperty('--app-height', `${window.innerHeight}px`);
    
    // Use requestAnimationFrame to ensure we're not fighting against the browser
    requestAnimationFrame(() => {
      // Reset body and html to default state
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
      
      // Ensure the body has proper scroll settings
      document.body.style.overflow = '';
      document.body.style.overflowX = 'hidden';
      document.body.style.height = 'auto';
      document.body.style.position = '';
      document.body.style.overscrollBehavior = 'none';
      
      // Set document styles
      document.documentElement.style.height = 'auto';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = 'none';
      
      // Handle root element
      const rootElement = document.getElementById('root');
      if (rootElement) {
        rootElement.style.height = '100%';
        rootElement.style.overflow = '';
        rootElement.style.overscrollBehavior = 'none';
        rootElement.style.position = '';
      }
      
      // Apply overscroll behavior to main content elements
      document.querySelectorAll('.app-main-content, .app-sidebar-content').forEach(el => {
        el.style.overscrollBehavior = 'none';
      });
      
      // Fix for select elements and dropdowns
      document.querySelectorAll('select').forEach(select => {
        select.style.webkitAppearance = 'menulist';
        select.style.appearance = 'menulist';
        
        // Add event listener to fix scroll after select interaction
        select.addEventListener('change', () => {
          setTimeout(() => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            document.body.style.height = 'auto';
            document.documentElement.style.height = 'auto';
            document.body.style.position = '';
            document.documentElement.style.position = '';
          }, 100);
        }, { once: false });
      });
    });
  };

  // Set the height initially and fix scrolling
  fixScrollIssues();
  
  // Update whenever window is resized
  window.addEventListener('resize', fixScrollIssues);
  
  // Also fix when device orientation changes
  window.addEventListener('orientationchange', fixScrollIssues);
  
  // Fix after user interaction
  document.addEventListener('touchend', () => {
    setTimeout(fixScrollIssues, 100);
  });
  
  // Observe DOM changes
  observer.observe(document.documentElement, { 
    childList: true, 
    subtree: true, 
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  // Workaround for iOS Safari bounce effect when scrolling
  document.addEventListener('touchmove', function(e) {
    // Allow scrolling only within elements that should scroll
    const target = e.target;
    const isScrollable = 
      target.classList.contains('scrollable') || 
      target.closest('.app-main-content, .app-sidebar-content, .scrollable') ||
      target.tagName === 'SELECT' || 
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'INPUT';
      
    if (!isScrollable) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Fix scroll issues when content is loaded or DOM changes
  window.addEventListener('load', fixScrollIssues);
  document.addEventListener('DOMContentLoaded', fixScrollIssues);
})();
