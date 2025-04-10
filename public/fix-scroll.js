// Fix for scroll issues in mobile browsers
(function() {
  // First, set the --app-height CSS variable based on the window height
  const setAppHeight = () => {
    const doc = document.documentElement;
    doc.style.setProperty('--app-height', `${window.innerHeight}px`);
    
    // Also ensure body and root have correct overflow settings and prevent bouncing
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.position = 'relative';
    
    const rootElement = document.getElementById('root');
    rootElement.style.overflow = 'auto';
    rootElement.style.overscrollBehavior = 'none';
    rootElement.style.position = 'relative';
    rootElement.style.height = '100%';
    
    // Apply overscroll behavior to main content elements
    document.querySelectorAll('.app-main-content, .app-sidebar-content').forEach(el => {
      el.style.overscrollBehavior = 'none';
    });
    
    // Fix for select elements and dropdowns
    document.querySelectorAll('select').forEach(select => {
      select.style.webkitAppearance = 'menulist';
      select.style.appearance = 'menulist';
    });
  };

  // Set the height initially
  setAppHeight();
  
  // Update the height whenever the window is resized
  window.addEventListener('resize', setAppHeight);
  
  // Also fix when device orientation changes
  window.addEventListener('orientationchange', setAppHeight);
  
  // Disable pull-to-refresh on mobile (iOS Safari)
  document.body.addEventListener('touchmove', function(e) {
    // Allow scrolling only within elements that should scroll
    if (!e.target.closest('.app-main-content, .app-sidebar-content, .scrollable, select, textarea')) {
      e.preventDefault();
    }
  }, { passive: false });
})();
