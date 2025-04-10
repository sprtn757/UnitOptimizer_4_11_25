import { ReactNode, useEffect } from 'react';

// Component that provides scrolling container to prevent mobile scrolling issues
export function AppContainer({ children }: { children: ReactNode }) {
  // Handle viewport height issues on mobile
  useEffect(() => {
    const fixHeight = () => {
      // First, lock the viewport to prevent bouncing
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
      
      // Set a CSS variable to the actual viewport height
      // This is more reliable than using 100vh which has issues on mobile
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    fixHeight();
    window.addEventListener('resize', fixHeight);
    window.addEventListener('orientationchange', fixHeight);

    return () => {
      window.removeEventListener('resize', fixHeight);
      window.removeEventListener('orientationchange', fixHeight);
    };
  }, []);

  return (
    <div className="app-container">
      <div className="app-scroll-container">
        {children}
      </div>
    </div>
  );
}