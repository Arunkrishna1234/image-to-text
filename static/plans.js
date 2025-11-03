// Modern Plans JavaScript with Interactive Features

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initPlanSelection();
  initScrollAnimations();
  initParallaxEffect();
  initCounterAnimations();
  initFAQAccordion();
  initTooltips();
  initPlanComparison();
  addRippleEffect();
  trackUserInteractions();
});

// Plan Selection Handler
function selectPlan(planType) {
  const planNames = {
    free: "Starter",
    pro: "Professional",
    enterprise: "Business",
  };

  const planName = planNames[planType] || planType;

  // Show confirmation with modern styling
  showNotification(
    `🎉 Great choice! You selected the ${planName} plan.`,
    "success"
  );

  // Track analytics
  trackEvent("plan_selected", { plan: planType });

  // Animate button
  const buttons = document.querySelectorAll(".plan-button");
  buttons.forEach((btn) => {
    if (btn.textContent.includes(planName)) {
      btn.classList.add("selected");
      setTimeout(() => btn.classList.remove("selected"), 2000);
    }
  });

  // Simulate redirect (replace with actual logic)
  setTimeout(() => {
    console.log(`Redirecting to checkout for ${planName} plan...`);
    // window.location.href = `/checkout?plan=${planType}`;
  }, 1500);
}

// Modern Notification System
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existing = document.querySelector(".modern-notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = `modern-notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${getNotificationIcon(type)}</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Add styles if not already present
  if (!document.getElementById("notification-styles")) {
    const styles = document.createElement("style");
    styles.id = "notification-styles";
    styles.textContent = `
      .modern-notification {
        position: fixed;
        top: 80px;
        right: 24px;
        background: rgba(30, 41, 59, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        padding: 20px 24px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        max-width: 400px;
      }
      .modern-notification.success {
        border-left: 4px solid #10b981;
      }
      .modern-notification.error {
        border-left: 4px solid #ef4444;
      }
      .modern-notification.info {
        border-left: 4px solid #3b82f6;
      }
      .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
      }
      .notification-icon {
        font-size: 1.5rem;
      }
      .notification-message {
        flex: 1;
        font-size: 0.95rem;
      }
      .notification-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }
      .notification-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      @keyframes slideInRight {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @media (max-width: 768px) {
        .modern-notification {
          right: 16px;
          left: 16px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // Auto-remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease forwards";
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function getNotificationIcon(type) {
  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  };
  return icons[type] || icons.info;
}

// Initialize Plan Selection Events
function initPlanSelection() {
  const cards = document.querySelectorAll(".pricing-card");

  cards.forEach((card, index) => {
    // Add hover sound effect trigger
    card.addEventListener("mouseenter", () => {
      card.style.setProperty("--hover-delay", `${index * 0.1}s`);
    });

    // Add click tracking
    const button = card.querySelector(".plan-button");
    if (button) {
      button.addEventListener("click", (e) => {
        createClickRipple(e, button);
      });
    }
  });
}

// Scroll Animations with Intersection Observer
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate-in");

        // Stagger animation for child elements
        const children = entry.target.querySelectorAll(".stagger-child");
        children.forEach((child, index) => {
          setTimeout(() => {
            child.classList.add("animate-in");
          }, index * 100);
        });
      }
    });
  }, observerOptions);

  // Observe sections
  const sections = document.querySelectorAll(
    ".comparison-section, .faq-section, .faq-item"
  );
  sections.forEach((section) => observer.observe(section));

  // Add stagger class to FAQ items
  document.querySelectorAll(".faq-item").forEach((item) => {
    item.classList.add("stagger-child");
  });
}

// Parallax Effect for Cards
function initParallaxEffect() {
  const cards = document.querySelectorAll(".pricing-card");

  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-12px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

// Animated Counter for Prices
function initCounterAnimations() {
  const priceElements = document.querySelectorAll(".amount");

  const observerOptions = {
    threshold: 0.5,
    rootMargin: "0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !entry.target.classList.contains("counted")) {
        animateCounter(entry.target);
        entry.target.classList.add("counted");
      }
    });
  }, observerOptions);

  priceElements.forEach((el) => observer.observe(el));
}

function animateCounter(element) {
  const target = parseInt(element.textContent);
  const duration = 1000;
  const steps = 30;
  const increment = target / steps;
  let current = 0;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current);
    }
  }, duration / steps);
}

// FAQ Accordion Enhancement
function initFAQAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    item.style.cursor = "pointer";

    item.addEventListener("click", () => {
      const isActive = item.classList.contains("faq-active");

      // Close all items
      faqItems.forEach((i) => {
        i.classList.remove("faq-active");
        const p = i.querySelector("p");
        if (p) p.style.maxHeight = null;
      });

      // Open clicked item if it wasn't active
      if (!isActive) {
        item.classList.add("faq-active");
        const p = item.querySelector("p");
        if (p) {
          p.style.maxHeight = p.scrollHeight + "px";
          p.style.transition = "max-height 0.3s ease";
        }
      }
    });
  });
}

// Tooltips for Features
function initTooltips() {
  const features = document.querySelectorAll(".features-list li");

  features.forEach((feature) => {
    const tooltips = {
      OCR: "Optical Character Recognition - extracts text from images",
      API: "Application Programming Interface - integrate with your apps",
      Batch: "Process multiple invoices at once",
      AI: "Artificial Intelligence powered extraction",
    };

    const text = feature.textContent;
    Object.keys(tooltips).forEach((key) => {
      if (text.includes(key)) {
        feature.title = tooltips[key];
        feature.style.cursor = "help";
      }
    });
  });
}

// Plan Comparison Toggle
function initPlanComparison() {
  const tableRows = document.querySelectorAll("tbody tr");

  tableRows.forEach((row) => {
    row.addEventListener("click", () => {
      row.classList.toggle("highlighted");

      // Add highlight styles if not present
      if (!document.getElementById("highlight-styles")) {
        const styles = document.createElement("style");
        styles.id = "highlight-styles";
        styles.textContent = `
          tbody tr.highlighted {
            background: rgba(99, 102, 241, 0.1) !important;
            border-left: 3px solid var(--primary);
          }
          tbody tr {
            cursor: pointer;
          }
        `;
        document.head.appendChild(styles);
      }
    });
  });
}

// Ripple Effect on Buttons
function addRippleEffect() {
  const buttons = document.querySelectorAll(".plan-button");

  buttons.forEach((button) => {
    button.style.position = "relative";
    button.style.overflow = "hidden";
  });
}

function createClickRipple(event, element) {
  const ripple = document.createElement("span");
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    left: ${x}px;
    top: ${y}px;
    transform: scale(0);
    animation: ripple 0.6s ease-out;
    pointer-events: none;
  `;

  if (!document.getElementById("ripple-styles")) {
    const styles = document.createElement("style");
    styles.id = "ripple-styles";
    styles.textContent = `
      @keyframes ripple {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
      .plan-button.selected {
        animation: successPulse 0.5s ease;
      }
      @keyframes successPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    `;
    document.head.appendChild(styles);
  }

  element.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// Track User Interactions
function trackUserInteractions() {
  // Track scroll depth
  let maxScroll = 0;
  window.addEventListener("scroll", () => {
    const scrollPercent =
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
      100;
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
      if (maxScroll > 25 && maxScroll < 30) {
        trackEvent("scroll_depth", { depth: "25%" });
      } else if (maxScroll > 50 && maxScroll < 55) {
        trackEvent("scroll_depth", { depth: "50%" });
      } else if (maxScroll > 75 && maxScroll < 80) {
        trackEvent("scroll_depth", { depth: "75%" });
      }
    }
  });

  // Track time on page
  const startTime = Date.now();
  window.addEventListener("beforeunload", () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    trackEvent("time_on_page", { seconds: timeSpent });
  });

  // Track card hovers
  document.querySelectorAll(".pricing-card").forEach((card, index) => {
    let hoverTimer;
    card.addEventListener("mouseenter", () => {
      hoverTimer = setTimeout(() => {
        trackEvent("card_hover", { card: index, duration: "3s+" });
      }, 3000);
    });
    card.addEventListener("mouseleave", () => {
      clearTimeout(hoverTimer);
    });
  });
}

// Analytics Event Tracker
function trackEvent(eventName, properties = {}) {
  console.log("📊 Event:", eventName, properties);

  // Integration with analytics services
  // Example: Google Analytics
  if (typeof gtag !== "undefined") {
    gtag("event", eventName, properties);
  }

  // Example: Custom analytics
  // analytics.track(eventName, properties);
}

// Smooth Scroll Enhancement
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Keyboard Navigation
document.addEventListener("keydown", (e) => {
  const buttons = Array.from(document.querySelectorAll(".plan-button"));
  const currentFocus = document.activeElement;
  const currentIndex = buttons.indexOf(currentFocus);

  if (e.key === "ArrowRight" && currentIndex < buttons.length - 1) {
    buttons[currentIndex + 1].focus();
  } else if (e.key === "ArrowLeft" && currentIndex > 0) {
    buttons[currentIndex - 1].focus();
  } else if (e.key === "Enter" && buttons.includes(currentFocus)) {
    currentFocus.click();
  }
});

// Add loading state handler
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = "Processing...";
    button.disabled = true;
    button.style.opacity = "0.7";
    button.style.cursor = "not-allowed";
  } else {
    button.textContent = button.dataset.originalText;
    button.disabled = false;
    button.style.opacity = "1";
    button.style.cursor = "pointer";
  }
}

// Price Toggle (Monthly/Yearly)
function initPriceToggle() {
  const toggleHTML = `
    <div class="price-toggle">
      <button class="toggle-btn active" data-period="monthly">Monthly</button>
      <button class="toggle-btn" data-period="yearly">Yearly</button>
      <span class="toggle-badge">Save 20%</span>
    </div>
  `;

  const header = document.querySelector(".plans-header");
  if (header && !document.querySelector(".price-toggle")) {
    header.insertAdjacentHTML("beforeend", toggleHTML);

    document.querySelectorAll(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".toggle-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        updatePrices(btn.dataset.period);
      });
    });
  }
}

function updatePrices(period) {
  const prices = {
    monthly: { pro: 29, business: 99 },
    yearly: { pro: 24, business: 82 },
  };

  const priceElements = document.querySelectorAll(".amount");
  priceElements.forEach((el, index) => {
    if (index === 1) {
      // Pro plan
      animatePriceChange(el, prices[period].pro);
    } else if (index === 2) {
      // Business plan
      animatePriceChange(el, prices[period].business);
    }
  });
}

function animatePriceChange(element, newPrice) {
  const currentPrice = parseInt(element.textContent);
  const diff = newPrice - currentPrice;
  const steps = 20;
  const increment = diff / steps;
  let current = currentPrice;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    current += increment;
    element.textContent = Math.round(current);

    if (step >= steps) {
      element.textContent = newPrice;
      clearInterval(timer);
    }
  }, 30);
}

// Initialize price toggle
initPriceToggle();

// Console Easter Egg
console.log(
  "%c💎 Smart Invoice Extractor",
  "font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"
);
console.log(
  "%cLooking for something? Check out our API docs!",
  "font-size: 14px; color: #64748b;"
);
