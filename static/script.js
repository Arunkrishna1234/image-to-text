// Application state
let uploadedImage = null;
let extractedText = "";
let isProcessing = false;

// DOM elements
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const previewSection = document.getElementById("previewSection");
const imagePreview = document.getElementById("imagePreview");
const processBtn = document.getElementById("processBtn");
const loadingSection = document.getElementById("loadingSection");
const resultsSection = document.getElementById("resultsSection");
const textOutput = document.getElementById("textOutput");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const errorSection = document.getElementById("errorSection");
const errorMessage = document.getElementById("errorMessage");
const errorResetBtn = document.getElementById("errorResetBtn");

// Initialize app
function initApp() {
  setupEventListeners();
  checkTesseractAvailability();
}

// Setup all event listeners
function setupEventListeners() {
  // Browse button
  browseBtn.addEventListener("click", () => fileInput.click());

  // File input change
  fileInput.addEventListener("change", handleFileSelect);

  // Process button
  processBtn.addEventListener("click", processImage);

  // Action buttons
  copyBtn.addEventListener("click", copyText);
  downloadBtn.addEventListener("click", downloadText);
  resetBtn.addEventListener("click", resetApp);
  errorResetBtn.addEventListener("click", resetApp);

  // Drag and drop events
  uploadArea.addEventListener("dragover", handleDragOver);
  uploadArea.addEventListener("dragleave", handleDragLeave);
  uploadArea.addEventListener("drop", handleDrop);
  uploadArea.addEventListener("click", () => fileInput.click());

  // Prevent default drag behavior on document
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
}

// Check if Tesseract is available
function checkTesseractAvailability() {
  if (typeof Tesseract === "undefined") {
    console.error("Tesseract.js not loaded");
    showError("OCR library failed to load. Please refresh the page.");
  }
}

// Drag and drop handlers
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.add("drag-over");
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.remove("drag-over");
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.remove("drag-over");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

// Handle file selection
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

// Validate and process file
function handleFile(file) {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    showError("Please select a valid image file (JPG, PNG, GIF, etc.)");
    return;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showError(
      "Image file is too large. Please select an image smaller than 10MB."
    );
    return;
  }

  // Read and display the file
  const reader = new FileReader();

  reader.onload = (e) => {
    uploadedImage = e.target.result;
    imagePreview.src = uploadedImage;
    showSection(previewSection);
    hideSection(uploadArea.parentElement);
    hideSection(errorSection);
    hideSection(resultsSection);
  };

  reader.onerror = () => {
    showError("Failed to read the image file. Please try again.");
  };

  reader.readAsDataURL(file);
}

// Process image with OCR
async function processImage() {
  if (!uploadedImage || isProcessing) return;

  isProcessing = true;
  processBtn.disabled = true;

  showSection(loadingSection);
  hideSection(previewSection);
  hideSection(resultsSection);
  hideSection(errorSection);

  try {
    // Perform OCR with multiple configurations for better accuracy
    const result = await performOCR(uploadedImage);

    const rawText = result.data.text;

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("No text detected in the image.");
    }

    // Clean the extracted text
    extractedText = smartTextCleaner(rawText);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error(
        "No clean text could be extracted from the image. The image may be too blurry or contain no readable text."
      );
    }

    // Display results
    textOutput.textContent = extractedText;
    hideSection(loadingSection);
    showSection(resultsSection);
  } catch (error) {
    console.error("OCR Error:", error);
    const errorMsg =
      error.message ||
      "Failed to extract text from the image. Please try another image with clearer text.";
    showError(errorMsg);
    hideSection(loadingSection);
    showSection(previewSection);
  } finally {
    isProcessing = false;
    processBtn.disabled = false;
  }
}

// Perform OCR with Tesseract
async function performOCR(imageData) {
  return await Tesseract.recognize(imageData, "eng", {
    logger: (info) => {
      console.log(
        `OCR Progress: ${info.status} - ${Math.round(info.progress * 100)}%`
      );
    },
  });
}

// Smart text cleaner (replicates Python logic)
function smartTextCleaner(text) {
  if (!text) return "";

  const lines = text.split("\n");
  const cleanLines = [];

  for (let line of lines) {
    const trimmed = line.trim();

    // Skip very short lines
    if (trimmed.length <= 1) continue;

    // Calculate alpha character ratio
    const alphaChars = (trimmed.match(/[a-zA-Z]/g) || []).length;
    const totalChars = trimmed.length;

    // Keep lines with at least 30% alphabetic characters
    if (totalChars > 0 && alphaChars / totalChars > 0.3) {
      // Remove special characters but keep basic punctuation
      let cleanLine = trimmed.replace(/[^a-zA-Z0-9\s\.,!?;:()\-]/g, "");

      // Normalize whitespace
      cleanLine = cleanLine.replace(/\s+/g, " ").trim();

      if (cleanLine && cleanLine.length > 0) {
        cleanLines.push(cleanLine);
      }
    }
  }

  // Join lines with spaces
  let result = cleanLines.join(" ");

  // Additional cleaning: remove excessive spaces
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

// Copy text to clipboard
async function copyText() {
  if (!extractedText) return;

  try {
    await navigator.clipboard.writeText(extractedText);

    // Visual feedback
    const originalText = copyBtn.textContent;
    const originalBg = copyBtn.style.background;

    copyBtn.textContent = "✓ Copied!";
    copyBtn.style.background = "#28a745";

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.background = originalBg;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);

    // Fallback for older browsers
    fallbackCopyText(extractedText);
  }
}

// Fallback copy method for older browsers
function fallbackCopyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";

  document.body.appendChild(textArea);
  textArea.select();

  try {
    document.execCommand("copy");

    copyBtn.textContent = "✓ Copied!";
    copyBtn.style.background = "#28a745";

    setTimeout(() => {
      copyBtn.textContent = "Copy Text";
      copyBtn.style.background = "";
    }, 2000);
  } catch (err) {
    console.error("Fallback copy failed:", err);
    showError("Failed to copy text. Please select and copy manually.");
  } finally {
    document.body.removeChild(textArea);
  }
}

// Download text as file
function downloadText() {
  if (!extractedText) return;

  try {
    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19)
      .replace("T", "_");
    const filename = `extracted_text_${timestamp}.txt`;

    // Create blob and download
    const blob = new Blob([extractedText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);

    // Visual feedback
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = "✓ Downloaded!";

    setTimeout(() => {
      downloadBtn.textContent = originalText;
    }, 2000);
  } catch (err) {
    console.error("Download failed:", err);
    showError("Failed to download the file. Please try again.");
  }
}

// Reset app to initial state
function resetApp() {
  uploadedImage = null;
  extractedText = "";
  isProcessing = false;
  fileInput.value = "";

  // Reset button state
  processBtn.disabled = false;

  // Hide all sections except upload
  hideSection(previewSection);
  hideSection(loadingSection);
  hideSection(resultsSection);
  hideSection(errorSection);
  showSection(uploadArea.parentElement);

  // Clear text output
  textOutput.textContent = "";
  imagePreview.src = "";
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  showSection(errorSection);
  hideSection(loadingSection);
}

// Utility: Show section
function showSection(element) {
  if (element) {
    element.style.display = "block";
  }
}

// Utility: Hide section
function hideSection(element) {
  if (element) {
    element.style.display = "none";
  }
}

// Handle page visibility change (pause/resume processing if needed)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("Page hidden - OCR processing may continue in background");
  } else {
    console.log("Page visible");
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + V to paste image (if supported)
  if ((e.ctrlKey || e.metaKey) && e.key === "v") {
    // This could be extended to support pasting images from clipboard
    console.log("Paste shortcut detected");
  }

  // Escape key to reset
  if (e.key === "Escape" && !isProcessing) {
    resetApp();
  }
});

// Prevent accidental navigation during processing
window.addEventListener("beforeunload", (e) => {
  if (isProcessing) {
    e.preventDefault();
    e.returnValue =
      "OCR processing is in progress. Are you sure you want to leave?";
    return e.returnValue;
  }
});

// Initialize the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// Export functions for testing (optional)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    smartTextCleaner,
    handleFile,
    processImage,
  };
}
