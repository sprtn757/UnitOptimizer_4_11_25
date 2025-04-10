// Fix for scroll issues in mobile browsers
(function() {
  // First, set the --app-height CSS variable based on the window height
  const setAppHeight = () => {
    const doc = document.documentElement;
    doc.style.setProperty('--app-height', `${window.innerHeight}px`);
    
    // Also ensure body and root have correct overflow settings
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
    document.getElementById('root').style.overflow = 'auto';
    
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
})();
