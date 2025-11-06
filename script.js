// ===== DOM ELEMENTS =====
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const resultsSection = document.getElementById("resultsSection");
const errorMessage = document.getElementById("errorMessage");
const tryAgainBtn = document.getElementById("tryAgainBtn");
const extractedText = document.getElementById("extractedText");
const charCount = document.getElementById("charCount");
const wordCount = document.getElementById("wordCount");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const uploadAnotherBtn = document.getElementById("uploadAnotherBtn");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");

// ===== STATE =====
let currentFilename = null;

// ===== UTILITY FUNCTIONS =====
function showToast(message, type = "success") {
  toastMessage.textContent = message;
  toast.style.background = type === "success" ? "#10b981" : "#ef4444";
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function resetUI() {
  uploadArea.style.display = "block";
  loadingState.style.display = "none";
  errorState.style.display = "none";
  resultsSection.style.display = "none";
}

function showLoading() {
  uploadArea.style.display = "none";
  loadingState.style.display = "block";
  errorState.style.display = "none";
  resultsSection.style.display = "none";
}

function showError(message) {
  uploadArea.style.display = "none";
  loadingState.style.display = "none";
  errorState.style.display = "block";
  resultsSection.style.display = "none";
  errorMessage.textContent = message;
}

function showResults() {
  uploadArea.style.display = "none";
  loadingState.style.display = "none";
  errorState.style.display = "none";
  resultsSection.style.display = "block";
}

function formatNumber(num) {
  return num.toLocaleString();
}

function isValidFile(file) {
  const validTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/bmp",
    "image/tiff",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Supported: PNG, JPG, PDF, DOCX",
    };
  }

  if (file.size > maxSize) {
    return { valid: false, error: "File too large. Maximum size is 50MB" };
  }

  return { valid: true };
}

// ===== FILE UPLOAD =====
async function handleFileUpload(file) {
  // Validate file
  const validation = isValidFile(file);
  if (!validation.valid) {
    showError(validation.error);
    showToast(validation.error, "error");
    return;
  }

  // Show loading state
  showLoading();

  // Create FormData
  const formData = new FormData();
  formData.append("file", file);

  try {
    // Upload file
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    if (data.success) {
      // Update UI with results
      extractedText.value = data.text;
      charCount.textContent = formatNumber(data.char_count);
      wordCount.textContent = formatNumber(data.word_count);
      currentFilename = data.filename;

      // Show results
      showResults();
      showToast("Text extracted successfully!");

      // Scroll to results
      setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    } else {
      throw new Error(data.error || "Extraction failed");
    }
  } catch (error) {
    console.error("Upload error:", error);
    let errorMsg =
      error.message ||
      "Network error. Please check your connection and try again.";

    // Handle common errors
    if (
      error.message.includes("NetworkError") ||
      error.message.includes("Failed to fetch")
    ) {
      errorMsg =
        "Unable to connect to server. Please ensure the Flask app is running on port 5000.";
    }

    showError(errorMsg);
    showToast(errorMsg, "error");
  }
}

// ===== EVENT LISTENERS =====

// Browse button click
browseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

// Upload area click
uploadArea.addEventListener("click", (e) => {
  if (e.target !== browseBtn && !browseBtn.contains(e.target)) {
    fileInput.click();
  }
});

// File input change
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    console.log("File selected:", file.name, file.type, file.size);
    handleFileUpload(file);
  }
  // Reset input
  fileInput.value = "";
});

// Drag and drop
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.add("drag-over");
});

uploadArea.addEventListener("dragleave", (e) => {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.remove("drag-over");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.remove("drag-over");

  const file = e.dataTransfer.files[0];
  if (file) {
    console.log("File dropped:", file.name, file.type, file.size);
    handleFileUpload(file);
  }
});

// Try again button
tryAgainBtn.addEventListener("click", () => {
  resetUI();
});

// Upload another button
uploadAnotherBtn.addEventListener("click", () => {
  resetUI();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Copy button
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(extractedText.value);
    showToast("Text copied to clipboard!");

    // Visual feedback
    const originalHTML = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    copyBtn.style.background =
      "linear-gradient(135deg, #10b981 0%, #059669 100%)";

    setTimeout(() => {
      copyBtn.innerHTML = originalHTML;
      copyBtn.style.background = "";
    }, 2000);
  } catch (error) {
    // Fallback for older browsers
    extractedText.select();
    document.execCommand("copy");
    showToast("Text copied to clipboard!");
  }
});

// Download button
downloadBtn.addEventListener("click", () => {
  if (!currentFilename) {
    showToast("No file to download", "error");
    return;
  }

  try {
    // Download the file
    window.location.href = `/download/${currentFilename}`;
    showToast("Download started!");
  } catch (error) {
    console.error("Download error:", error);
    showToast("Download failed", "error");
  }
});

// Smooth scroll for navigation links
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

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener("keydown", (e) => {
  // Escape to reset
  if (e.key === "Escape") {
    if (
      errorState.style.display === "block" ||
      resultsSection.style.display === "block"
    ) {
      resetUI();
    }
  }

  // Ctrl/Cmd + U to trigger upload
  if ((e.ctrlKey || e.metaKey) && e.key === "u") {
    e.preventDefault();
    if (uploadArea.style.display === "block") {
      fileInput.click();
    }
  }

  // Ctrl/Cmd + C when results visible (let browser handle naturally)
  if (
    (e.ctrlKey || e.metaKey) &&
    e.key === "c" &&
    resultsSection.style.display === "block"
  ) {
    // Browser handles this automatically
  }
});

// ===== PAGE VISIBILITY =====
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("Page hidden");
  } else {
    console.log("Page visible");
  }
});

// ===== INITIALIZATION =====
console.log("🚀 OCR Text Extractor initialized");
console.log("📁 Supported formats: PNG, JPG, PDF, DOCX, BMP, TIFF");
console.log("💾 Max file size: 50MB");

// Check backend health on load
fetch("/health")
  .then((response) => response.json())
  .then((data) => {
    console.log("✅ Backend status:", data);
    if (!data.tesseract_available) {
      console.warn("⚠️  Tesseract OCR not available on backend");
      showToast("Warning: OCR engine may not be available", "error");
    } else {
      console.log("✅ Tesseract OCR is ready");
    }
  })
  .catch((error) => {
    console.error("❌ Backend health check failed:", error);
    console.warn("⚠️  Make sure Flask app is running on http://localhost:5000");
  });

// ===== PERFORMANCE MONITORING =====
window.addEventListener("load", () => {
  const loadTime = performance.now();
  console.log(`⚡ Page loaded in ${loadTime.toFixed(2)}ms`);
});

// ===== ERROR HANDLING =====
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
});
