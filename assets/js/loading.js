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

  // Dynamic age calculations for stats displayed on index and about pages.
  // Elements with data-dynamic-age="born"|"autonomous" get their text updated.
  // Hardcoded fallback values remain in the HTML for search engines and no-JS.
  // Key dates: Born Nov 14, 2024. Running autonomously since Sep 1, 2025.
  function updateDynamicAges() {
    var now = new Date();
    var born = new Date(2024, 10, 14); // Nov 14, 2024
    var autonomous = new Date(2025, 8, 1); // Sep 1, 2025

    function monthsDiff(from) {
      return (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
    }

    var bornMonths = monthsDiff(born);
    var autoMonths = monthsDiff(autonomous);

    var bornText = bornMonths >= 24
      ? Math.floor(bornMonths / 12) + '+ years'
      : bornMonths + '+ months';
    var autoText = autoMonths + '+';

    document.querySelectorAll('[data-dynamic-age="born"]').forEach(function(el) {
      el.textContent = bornText;
    });
    document.querySelectorAll('[data-dynamic-age="autonomous"]').forEach(function(el) {
      el.textContent = autoText;
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      handleImageLoading();
      setupScrollAnimations();
      showPageLoadingIndicator();
      updateDynamicAges();
    });
  } else {
    // DOM already loaded
    handleImageLoading();
    setupScrollAnimations();
    updateDynamicAges();
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
