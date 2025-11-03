// ============================================
// MODERN JAVASCRIPT FOR SMART INVOICE EXTRACTOR
// ============================================

// Smooth scroll and animations on load
document.addEventListener("DOMContentLoaded", () => {
  initAnimations();
  initFileUpload();
  initParticles();
  initScrollEffects();
});

// ============================================
// ANIMATIONS ON PAGE LOAD
// ============================================
function initAnimations() {
  // Animate feature cards on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -100px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, observerOptions);

  // Observe all feature cards
  document.querySelectorAll(".feature-card").forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(50px)";
    card.style.transition = `all 0.6s ease ${index * 0.2}s`;
    observer.observe(card);
  });
}

// ============================================
// FILE UPLOAD FUNCTIONALITY
// ============================================
function initFileUpload() {
  const uploadArea = document.querySelector(".upload-area");
  const fileInput = document.getElementById("fileInput");

  // Drag and drop functionality
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight on drag
  ["dragenter", "dragover"].forEach((eventName) => {
    uploadArea.addEventListener(eventName, () => {
      uploadArea.style.borderColor = "#6366f1";
      uploadArea.style.background = "rgba(99, 102, 241, 0.15)";
      uploadArea.style.transform = "scale(1.02)";
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    uploadArea.addEventListener(eventName, () => {
      uploadArea.style.borderColor = "rgba(99, 102, 241, 0.4)";
      uploadArea.style.background = "rgba(99, 102, 241, 0.05)";
      uploadArea.style.transform = "scale(1)";
    });
  });

  // Handle dropped files
  uploadArea.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
  });

  // Handle file input change
  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });
}

// ============================================
// FILE PROCESSING
// ============================================
function handleFiles(files) {
  if (files.length === 0) return;

  const file = files[0];

  // Validate file type
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "application/pdf",
  ];

  if (!validTypes.includes(file.type)) {
    showNotification(
      "❌ Invalid file type. Please upload an image or PDF.",
      "error"
    );
    return;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showNotification("❌ File too large. Maximum size is 10MB.", "error");
    return;
  }

  // Show file preview and process
  showFilePreview(file);
  processFile(file);
}

// ============================================
// FILE PREVIEW
// ============================================
function showFilePreview(file) {
  const uploadArea = document.querySelector(".upload-area");
  const reader = new FileReader();

  reader.onload = (e) => {
    const preview = document.createElement("div");
    preview.className = "file-preview";
    preview.innerHTML = `
            <div style="margin-top: 20px; padding: 20px; background: rgba(99, 102, 241, 0.1); border-radius: 12px;">
                <p style="color: #6366f1; font-weight: 600; margin-bottom: 8px;">📄 ${
                  file.name
                }</p>
                <p style="color: #64748b; font-size: 0.9em;">${formatFileSize(
                  file.size
                )}</p>
                ${
                  file.type.startsWith("image/")
                    ? `<img src="${e.target.result}" style="max-width: 200px; margin-top: 12px; border-radius: 8px;">`
                    : ""
                }
            </div>
        `;

    const existingPreview = uploadArea.querySelector(".file-preview");
    if (existingPreview) existingPreview.remove();

    uploadArea.appendChild(preview);
  };

  if (file.type.startsWith("image/")) {
    reader.readAsDataURL(file);
  } else {
    reader.readAsText(file);
  }
}

// ============================================
// FILE PROCESSING SIMULATION
// ============================================
function processFile(file) {
  showNotification("⏳ Processing your file...", "info");

  // Create progress bar
  createProgressBar();

  // Simulate processing with progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;

    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(() => {
        showNotification("✅ Extraction complete! Ready to export.", "success");
        showExportOptions();
        removeProgressBar();
      }, 500);
    }

    updateProgressBar(progress);
  }, 300);
}

// ============================================
// PROGRESS BAR
// ============================================
function createProgressBar() {
  const uploadSection = document.querySelector(".upload-section");
  const progressContainer = document.createElement("div");
  progressContainer.className = "progress-container";
  progressContainer.innerHTML = `
        <div style="margin: 30px auto; max-width: 500px;">
            <div style="background: rgba(99, 102, 241, 0.1); height: 8px; border-radius: 10px; overflow: hidden;">
                <div class="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #6366f1, #ec4899); transition: width 0.3s ease; border-radius: 10px;"></div>
            </div>
            <p class="progress-text" style="text-align: center; margin-top: 12px; color: #64748b; font-size: 0.9em;">Processing: 0%</p>
        </div>
    `;
  uploadSection.appendChild(progressContainer);
}

function updateProgressBar(progress) {
  const progressBar = document.querySelector(".progress-bar");
  const progressText = document.querySelector(".progress-text");

  if (progressBar && progressText) {
    progressBar.style.width = `${Math.min(progress, 100)}%`;
    progressText.textContent = `Processing: ${Math.floor(progress)}%`;
  }
}

function removeProgressBar() {
  const progressContainer = document.querySelector(".progress-container");
  if (progressContainer) {
    progressContainer.style.opacity = "0";
    progressContainer.style.transform = "translateY(-20px)";
    setTimeout(() => progressContainer.remove(), 300);
  }
}

// ============================================
// EXPORT OPTIONS
// ============================================
function showExportOptions() {
  const uploadSection = document.querySelector(".upload-section");
  const existingOptions = document.querySelector(".export-options");
  if (existingOptions) existingOptions.remove();

  const exportOptions = document.createElement("div");
  exportOptions.className = "export-options";
  exportOptions.innerHTML = `
        <div style="margin: 40px 0; padding: 30px; background: rgba(99, 102, 241, 0.05); border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.2);">
            <h3 style="color: #f8fafc; margin-bottom: 20px; font-size: 1.5em;">📊 Export Your Data</h3>
            <div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;">
                <button class="export-btn" data-format="excel">
                    📗 Excel
                </button>
                <button class="export-btn" data-format="word">
                    📘 Word
                </button>
                <button class="export-btn" data-format="powerpoint">
                    📙 PowerPoint
                </button>
                <button class="export-btn" data-format="json">
                    📄 JSON
                </button>
            </div>
        </div>
    `;

  uploadSection.appendChild(exportOptions);

  // Add click handlers for export buttons
  document.querySelectorAll(".export-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const format = btn.dataset.format;
      exportData(format);
    });
  });

  // Animate in
  setTimeout(() => {
    exportOptions.style.opacity = "1";
    exportOptions.style.transform = "translateY(0)";
  }, 100);

  exportOptions.style.opacity = "0";
  exportOptions.style.transform = "translateY(20px)";
  exportOptions.style.transition = "all 0.4s ease";
}

function exportData(format) {
  showNotification(`📥 Downloading ${format.toUpperCase()} file...`, "success");

  // Simulate download
  setTimeout(() => {
    showNotification(
      `✅ ${format.toUpperCase()} file downloaded successfully!`,
      "success"
    );
  }, 1500);
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = "notification";

  const colors = {
    success: "#14b8a6",
    error: "#ef4444",
    info: "#6366f1",
  };

  notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(10px);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            border-left: 4px solid ${colors[type]};
            animation: slideIn 0.3s ease;
        ">
            ${message}
        </div>
    `;

  document.body.appendChild(notification);

  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// ============================================
// PARTICLE BACKGROUND EFFECT
// ============================================
function initParticles() {
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = "-1";
  canvas.style.pointerEvents = "none";
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const particleCount = 50;

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(99, 102, 241, 0.3)";
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
      particle.update();
      particle.draw();
    });

    // Draw connections
    particles.forEach((p1, i) => {
      particles.slice(i + 1).forEach((p2) => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(99, 102, 241, ${
            0.15 * (1 - distance / 150)
          })`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });

    requestAnimationFrame(animate);
  }

  animate();

  // Resize handler
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ============================================
// SCROLL EFFECTS
// ============================================
function initScrollEffects() {
  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;

    // Parallax effect on header
    const header = document.querySelector("header");
    if (header) {
      header.style.transform = `translateY(${currentScroll * 0.5}px)`;
      header.style.opacity = 1 - currentScroll / 500;
    }

    lastScroll = currentScroll;
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + U to upload
  if ((e.ctrlKey || e.metaKey) && e.key === "u") {
    e.preventDefault();
    document.getElementById("fileInput").click();
  }
});

// ============================================
// ADD REQUIRED STYLES FOR ANIMATIONS
// ============================================
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .export-btn {
        background: linear-gradient(135deg, #6366f1, #ec4899);
        color: white;
        border: none;
        padding: 14px 28px;
        border-radius: 10px;
        font-size: 1em;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
    }

    .export-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
    }

    .export-btn:active {
        transform: translateY(-1px);
    }
`;
document.head.appendChild(style);

console.log("🚀 Smart Invoice Extractor initialized successfully!");
