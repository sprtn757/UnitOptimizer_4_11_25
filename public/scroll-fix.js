/**
 * This script provides aggressive scroll fixing to prevent scrolling issues on mobile
 * It ensures that the body scroll can never get stuck
 */

(function() {
  // Keep track of the original scroll position
  let lastScrollTop = 0;
  let isSelectOpen = false;
  let documentHeight = Math.max(
    document.body.scrollHeight, 
    document.documentElement.scrollHeight,
    document.body.offsetHeight, 
    document.documentElement.offsetHeight,
    document.body.clientHeight, 
    document.documentElement.clientHeight
  );

  // Force scroll restoration on page load
  window.addEventListener('load', () => {
    // Force unlock scroll if it's locked
    if (document.body.style.overflow === 'hidden' || document.body.style.position === 'fixed') {
      resetScroll();
    }
    
    // Reset scroll position if it's at the bottom
    if (window.scrollY >= documentHeight - window.innerHeight) {
      window.scrollTo(0, 0);
    }
  });

  // Detect when select elements open/close
  document.addEventListener('click', function(e) {
    const target = e.target;
    const selectElements = document.querySelectorAll('select');
    let clickedOnSelect = false;
    
    // Check if click was on or inside a select element
    selectElements.forEach(select => {
      if (select === target || select.contains(target)) {
        clickedOnSelect = true;
        lastScrollTop = window.scrollY; // Save current scroll position
        
        // Detect iOS specific behavior
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
        
        if (isIOS) {
          // Apply a timeout to check if the scroll gets stuck
          setTimeout(() => {
            // If scroll hasn't changed but select is likely open, force reset
            if (window.scrollY === lastScrollTop) {
              resetScroll();
            }
          }, 300);
        }
      }
    });
    
    // If not clicking on select, ensure scroll is reset
    if (!clickedOnSelect && isSelectOpen) {
      isSelectOpen = false;
      resetScroll();
    }
  });
  
  // Watch for scroll to bottom of page and intervene
  window.addEventListener('scroll', function() {
    documentHeight = Math.max(
      document.body.scrollHeight, 
      document.documentElement.scrollHeight,
      document.body.offsetHeight, 
      document.documentElement.offsetHeight,
      document.body.clientHeight, 
      document.documentElement.clientHeight
    );
    
    // If we're at the bottom of the page, intervene to prevent stuck scroll
    if (window.scrollY >= documentHeight - window.innerHeight - 10) {
      // Apply a small scroll up to prevent "edge bounce" getting stuck
      setTimeout(() => {
        window.scrollTo(0, documentHeight - window.innerHeight - 20);
      }, 50);
    }
  });

  // Reset the scroll state completely
  function resetScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.height = '';
    document.body.style.width = '';
    document.body.style.top = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.position = '';
    document.documentElement.style.height = '';
    document.documentElement.style.width = '';
    document.documentElement.style.top = '';
    
    // Force layout recalculation
    document.body.offsetHeight;
    
    // Apply a small scroll to ensure mobile browser shows scrollbar
    if (window.scrollY > 10) {
      window.scrollTo(0, window.scrollY - 1);
    } else if (window.scrollY < documentHeight - window.innerHeight - 10) {
      window.scrollTo(0, window.scrollY + 1);
    }
  }
  
  // Add special handling for touch events on iOS
  document.addEventListener('touchend', function() {
    // Short delay to let iOS finish its native behaviors
    setTimeout(resetScroll, 300);
  });
  
  // Run periodical checks to ensure scroll isn't stuck
  setInterval(() => {
    if (document.body.style.overflow === 'hidden' && !isSelectOpen) {
      resetScroll();
    }
  }, 1000);
})();