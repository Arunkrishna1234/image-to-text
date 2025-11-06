// ===================================
// DOM Element References
// ===================================
const DOM = {
  uploadArea: document.getElementById("uploadArea"),
  fileInput: document.getElementById("fileInput"),
  browseBtn: document.getElementById("browseBtn"),

  // Sections
  uploadSection: document.getElementById("uploadSection"),
  loadingSection: document.getElementById("loadingSection"),
  resultsSection: document.getElementById("resultsSection"),
  errorSection: document.getElementById("errorSection"),

  // Results elements
  textOutput: document.getElementById("textOutput"),
  charCount: document.getElementById("charCount"),
  wordCount: document.getElementById("wordCount"),

  // Error elements
  errorMessage: document.getElementById("errorMessage"),

  // Action buttons
  copyBtn: document.getElementById("copyBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  resetBtn: document.getElementById("resetBtn"),
  errorResetBtn: document.getElementById("errorResetBtn"),
};

// ===================================
// Application Constants
// ===================================
const CONFIG = {
  ALLOWED_EXTENSIONS: [
    "png",
    "jpg",
    "jpeg",
    "bmp",
    "tiff",
    "gif",
    "pdf",
    "docx",
  ],
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB in bytes
  API_ENDPOINTS: {
    upload: "/upload",
    download: "/download",
  },
  ANIMATION: {
    counterDuration: 1000,
    counterSteps: 50,
    buttonFeedbackDuration: 2000,
  },
};

// ===================================
// Application State
// ===================================
const state = {
  currentFilename: "",
  isProcessing: false,
};

// ===================================
// Utility Functions
// ===================================
const Utils = {
  /**
   * Get file extension from filename
   */
  getFileExtension(filename) {
    return filename.toLowerCase().split(".").pop();
  },

  /**
   * Format file size to human readable format
   */
  formatFileSize(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  },

  /**
   * Format number with locale string
   */
  formatNumber(number) {
    return number.toLocaleString();
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
};

// ===================================
// Section Management
// ===================================
const SectionManager = {
  /**
   * Show a section with animation
   */
  show(element) {
    if (element) {
      element.style.display = "block";
      // Trigger reflow to enable CSS animation
      void element.offsetHeight;
    }
  },

  /**
   * Hide a section
   */
  hide(element) {
    if (element) {
      element.style.display = "none";
    }
  },

  /**
   * Hide all sections
   */
  hideAll() {
    this.hide(DOM.uploadSection);
    this.hide(DOM.loadingSection);
    this.hide(DOM.resultsSection);
    this.hide(DOM.errorSection);
  },

  /**
   * Switch to upload view
   */
  showUpload() {
    this.hideAll();
    this.show(DOM.uploadSection);
  },

  /**
   * Switch to loading view
   */
  showLoading() {
    this.hideAll();
    this.show(DOM.loadingSection);
  },

  /**
   * Switch to results view
   */
  showResults() {
    this.hideAll();
    this.show(DOM.resultsSection);
  },

  /**
   * Switch to error view
   */
  showError() {
    this.hideAll();
    this.show(DOM.errorSection);
  },
};

// ===================================
// File Validation
// ===================================
const FileValidator = {
  /**
   * Validate file extension
   */
  validateExtension(file) {
    const extension = Utils.getFileExtension(file.name);
    if (!CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file type. Please upload: Images (PNG, JPG, GIF), PDF, or Word (.docx)`,
      };
    }
    return { valid: true };
  },

  /**
   * Validate file size
   */
  validateSize(file) {
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File is too large. Maximum size is ${Utils.formatFileSize(
          CONFIG.MAX_FILE_SIZE
        )}.`,
      };
    }
    return { valid: true };
  },

  /**
   * Validate file (extension and size)
   */
  validate(file) {
    const extensionCheck = this.validateExtension(file);
    if (!extensionCheck.valid) {
      return extensionCheck;
    }

    const sizeCheck = this.validateSize(file);
    if (!sizeCheck.valid) {
      return sizeCheck;
    }

    return { valid: true };
  },
};

// ===================================
// Drag and Drop Handlers
// ===================================
const DragDropHandler = {
  /**
   * Handle drag over event
   */
  onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    DOM.uploadArea.classList.add("drag-over");
  },

  /**
   * Handle drag leave event
   */
  onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    DOM.uploadArea.classList.remove("drag-over");
  },

  /**
   * Handle drop event
   */
  onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    DOM.uploadArea.classList.remove("drag-over");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      FileUploadHandler.processFile(files[0]);
    }
  },
};

// ===================================
// File Upload Handler
// ===================================
const FileUploadHandler = {
  /**
   * Process and validate file before upload
   */
  processFile(file) {
    if (state.isProcessing) {
      console.warn("Upload already in progress");
      return;
    }

    const validation = FileValidator.validate(file);

    if (!validation.valid) {
      ErrorHandler.show(validation.error);
      return;
    }

    this.upload(file);
  },

  /**
   * Upload file to server
   */
  async upload(file) {
    state.isProcessing = true;
    const formData = new FormData();
    formData.append("file", file);

    // Show loading state
    SectionManager.showLoading();

    try {
      const response = await fetch(CONFIG.API_ENDPOINTS.upload, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        ResultsHandler.display(data);
      } else {
        ErrorHandler.show(data.error || "Failed to extract text from file");
      }
    } catch (error) {
      console.error("Upload error:", error);
      ErrorHandler.show(
        "Network error. Please check your connection and try again."
      );
    } finally {
      state.isProcessing = false;
    }
  },

  /**
   * Handle file input change
   */
  onFileSelect(e) {
    if (e.target.files.length > 0) {
      this.processFile(e.target.files[0]);
    }
  },
};

// ===================================
// Results Handler
// ===================================
const ResultsHandler = {
  /**
   * Display extraction results
   */
  display(data) {
    // Set text output
    DOM.textOutput.textContent = data.text;

    // Animate counters
    this.animateCounter(DOM.charCount, data.char_count);
    this.animateCounter(DOM.wordCount, data.word_count);

    // Store filename for download
    state.currentFilename = data.filename;

    // Show results section
    SectionManager.showResults();
  },

  /**
   * Animate counter from 0 to target value
   */
  animateCounter(element, targetValue) {
    const duration = CONFIG.ANIMATION.counterDuration;
    const steps = CONFIG.ANIMATION.counterSteps;
    const stepDuration = duration / steps;
    const increment = targetValue / steps;
    let currentValue = 0;

    const timer = setInterval(() => {
      currentValue += increment;

      if (currentValue >= targetValue) {
        element.textContent = Utils.formatNumber(targetValue);
        clearInterval(timer);
      } else {
        element.textContent = Utils.formatNumber(Math.floor(currentValue));
      }
    }, stepDuration);
  },
};

// ===================================
// Error Handler
// ===================================
const ErrorHandler = {
  /**
   * Show error message
   */
  show(message) {
    DOM.errorMessage.textContent = message;
    SectionManager.showError();
    state.isProcessing = false;
  },
};

// ===================================
// Action Button Handlers
// ===================================
const ActionHandlers = {
  /**
   * Copy text to clipboard
   */
  async copyText() {
    try {
      const text = DOM.textOutput.textContent;
      await navigator.clipboard.writeText(text);

      this.showButtonFeedback(
        DOM.copyBtn,
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied!`,
        "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
      );
    } catch (err) {
      console.error("Copy failed:", err);
      ErrorHandler.show("Failed to copy text to clipboard");
    }
  },

  /**
   * Download extracted text as file
   */
  downloadFile() {
    if (!state.currentFilename) {
      console.error("No filename available for download");
      return;
    }

    window.location.href = `${CONFIG.API_ENDPOINTS.download}/${state.currentFilename}`;

    this.showButtonFeedback(
      DOM.downloadBtn,
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Downloaded!`
    );
  },

  /**
   * Reset application to initial state
   */
  reset() {
    // Clear file input
    DOM.fileInput.value = "";

    // Clear state
    state.currentFilename = "";
    state.isProcessing = false;

    // Clear results
    DOM.textOutput.textContent = "";
    DOM.charCount.textContent = "0";
    DOM.wordCount.textContent = "0";

    // Show upload section
    SectionManager.showUpload();
  },

  /**
   * Show temporary feedback on button
   */
  showButtonFeedback(button, newHTML, backgroundColor = null) {
    const originalHTML = button.innerHTML;
    const originalBackground = button.style.background;

    button.innerHTML = newHTML;
    if (backgroundColor) {
      button.style.background = backgroundColor;
    }

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = originalBackground;
    }, CONFIG.ANIMATION.buttonFeedbackDuration);
  },
};

// ===================================
// Event Listeners Setup
// ===================================
const EventListeners = {
  /**
   * Initialize all event listeners
   */
  init() {
    // Browse button
    DOM.browseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      DOM.fileInput.click();
    });

    // File input
    DOM.fileInput.addEventListener("change", (e) => {
      FileUploadHandler.onFileSelect(e);
    });

    // Upload area (click to browse)
    DOM.uploadArea.addEventListener("click", () => {
      DOM.fileInput.click();
    });

    // Drag and drop
    DOM.uploadArea.addEventListener("dragover", (e) => {
      DragDropHandler.onDragOver(e);
    });

    DOM.uploadArea.addEventListener("dragleave", (e) => {
      DragDropHandler.onDragLeave(e);
    });

    DOM.uploadArea.addEventListener("drop", (e) => {
      DragDropHandler.onDrop(e);
    });

    // Action buttons
    DOM.copyBtn.addEventListener("click", () => {
      ActionHandlers.copyText();
    });

    DOM.downloadBtn.addEventListener("click", () => {
      ActionHandlers.downloadFile();
    });

    DOM.resetBtn.addEventListener("click", () => {
      ActionHandlers.reset();
    });

    DOM.errorResetBtn.addEventListener("click", () => {
      ActionHandlers.reset();
    });

    // Prevent default drag behavior on document
    document.addEventListener("dragover", (e) => e.preventDefault());
    document.addEventListener("drop", (e) => e.preventDefault());

    // Log initialization
    console.log("✅ Event listeners initialized");
  },
};

// ===================================
// Application Initialization
// ===================================
const App = {
  /**
   * Initialize the application
   */
  init() {
    console.log("🚀 Initializing OCR Text Extractor...");

    // Setup event listeners
    EventListeners.init();

    // Show upload section by default
    SectionManager.showUpload();

    console.log("✅ OCR Text Extractor initialized successfully");
    console.log("📊 Config:", {
      allowedExtensions: CONFIG.ALLOWED_EXTENSIONS,
      maxFileSize: Utils.formatFileSize(CONFIG.MAX_FILE_SIZE),
    });
  },
};

// ===================================
// Start Application
// ===================================
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

// ===================================
// Export for debugging (optional)
// ===================================
if (typeof window !== "undefined") {
  window.OCRApp = {
    state,
    config: CONFIG,
    utils: Utils,
    reset: () => ActionHandlers.reset(),
  };
}
