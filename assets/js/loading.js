// Loading Indicators JavaScript
(function() {
  'use strict';

  // Handle lazy-loaded images
  function handleImageLoading() {
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');

    lazyImages.forEach(img => {
      if (img.complete) {
        img.classList.add('loaded');
      } else {
        img.addEventListener('load', function() {
          this.classList.add('loaded');
        });

        // Fallback for error cases
        img.addEventListener('error', function() {
          this.classList.add('loaded');
        });
      }
    });
  }

  // Mark document as JS-enabled for progressive enhancement
  document.documentElement.classList.add('js-loaded');

  // Intersection Observer for fade-in animations
  function setupScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.fade-in-on-scroll');
    animatedElements.forEach(el => observer.observe(el));
  }

  // Page loading indicator
  function showPageLoadingIndicator() {
    // Only show on initial page load
    if (document.readyState === 'loading') {
      const indicator = document.createElement('div');
      indicator.className = 'page-loading';
      document.body.appendChild(indicator);

      window.addEventListener('load', function() {
        setTimeout(() => {
          indicator.remove();
        }, 2000);
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      handleImageLoading();
      setupScrollAnimations();
      showPageLoadingIndicator();
    });
  } else {
    // DOM already loaded
    handleImageLoading();
    setupScrollAnimations();
  }

  // Re-check images when they're dynamically added
  const imgObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeName === 'IMG' && node.loading === 'lazy') {
          if (node.complete) {
            node.classList.add('loaded');
          } else {
            node.addEventListener('load', function() {
              this.classList.add('loaded');
            });
          }
        }
      });
    });
  });

  imgObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
