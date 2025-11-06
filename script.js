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
let currentText = null;
let tesseractWorker = null;

// ===== LOAD TESSERACT.JS =====
let tesseractLoaded = false;

async function initializeTesseract() {
  if (tesseractWorker) return tesseractWorker;

  try {
    // Check if Tesseract is available
    if (typeof Tesseract === "undefined") {
      throw new Error("Tesseract library not loaded");
    }

    console.log("🔄 Initializing Tesseract worker...");
    tesseractWorker = await Tesseract.createWorker("eng", 1, {
      logger: (m) => console.log(m),
    });

    console.log("✅ Tesseract worker ready");
    tesseractLoaded = true;
    return tesseractWorker;
  } catch (error) {
    console.error("❌ Failed to initialize Tesseract:", error);
    throw error;
  }
}

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
    "image/webp",
  ];

  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Supported: PNG, JPG, BMP, TIFF, WEBP",
    };
  }

  if (file.size > maxSize) {
    return { valid: false, error: "File too large. Maximum size is 50MB" };
  }

  return { valid: true };
}

// ===== FILE UPLOAD WITH CLIENT-SIDE OCR =====
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

  try {
    // Initialize Tesseract worker
    const worker = await initializeTesseract();

    // Create image URL
    const imageUrl = URL.createObjectURL(file);

    console.log("🔍 Starting OCR on image...");

    // Perform OCR
    const {
      data: { text },
    } = await worker.recognize(imageUrl);

    // Clean up URL
    URL.revokeObjectURL(imageUrl);

    console.log("✅ OCR completed");

    // Clean and validate text
    const cleanedText = text.trim();

    if (!cleanedText || cleanedText.length < 3) {
      throw new Error(
        "No readable text found in the image. Please ensure the image contains clear, readable text."
      );
    }

    // Calculate stats
    const chars = cleanedText.length;
    const words = cleanedText.split(/\s+/).filter((w) => w.length > 0).length;

    // Update UI with results
    extractedText.value = cleanedText;
    charCount.textContent = formatNumber(chars);
    wordCount.textContent = formatNumber(words);
    currentText = cleanedText;

    // Show results
    showResults();
    showToast("Text extracted successfully!");

    // Scroll to results
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  } catch (error) {
    console.error("OCR error:", error);
    let errorMsg = error.message || "Failed to extract text from image.";

    // Provide helpful error messages
    if (error.message.includes("Tesseract")) {
      errorMsg =
        "OCR library failed to load. Please refresh the page and try again.";
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
    console.log("📁 File selected:", file.name, file.type, file.size);
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
    console.log("📁 File dropped:", file.name, file.type, file.size);
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
  if (!currentText) {
    showToast("No text to download", "error");
    return;
  }

  try {
    const blob = new Blob([currentText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted-text-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

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
});

// ===== INITIALIZATION =====
console.log("🚀 OCR Text Extractor initialized");
console.log("📁 Mode: Client-Side (No Backend Required)");
console.log("📸 Supported formats: PNG, JPG, BMP, TIFF, WEBP");
console.log("💾 Max file size: 50MB");

// Pre-load Tesseract on page load for faster first use
window.addEventListener("load", () => {
  console.log("⚡ Page loaded, pre-initializing OCR engine...");
  initializeTesseract().catch((err) => {
    console.warn("⚠️ Could not pre-initialize OCR:", err.message);
  });
});

// ===== ERROR HANDLING =====
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
});
