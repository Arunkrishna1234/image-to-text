// ===================================
// DOM Element References
// ===================================
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");

// Sections
const uploadSection = document.getElementById("uploadSection");
const previewSection = document.getElementById("previewSection");
const loadingSection = document.getElementById("loadingSection");
const resultsSection = document.getElementById("resultsSection");
const errorSection = document.getElementById("errorSection");

// Preview elements
const imagePreview = document.getElementById("imagePreview");
const processBtn = document.getElementById("processBtn");

// Results elements
const textOutput = document.getElementById("textOutput");

// Action buttons
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const errorResetBtn = document.getElementById("errorResetBtn");

// Error elements
const errorMessage = document.getElementById("errorMessage");

// ===================================
// Application State
// ===================================
let selectedFile = null;
let extractedText = "";

// ===================================
// Section Management Functions
// ===================================
function showSection(section) {
  hideAllSections();
  section.style.display = "block";
}

function hideAllSections() {
  uploadSection.style.display = "none";
  previewSection.style.display = "none";
  loadingSection.style.display = "none";
  resultsSection.style.display = "none";
  errorSection.style.display = "none";
}

// ===================================
// File Handling Functions
// ===================================
function handleFileSelect(file) {
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    showError("Please select a valid image file (PNG, JPG, JPEG, etc.)");
    return;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showError("File is too large. Please select an image under 10MB.");
    return;
  }

  selectedFile = file;
  displayImagePreview(file);
}

function displayImagePreview(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    imagePreview.src = e.target.result;
    showSection(previewSection);
  };

  reader.onerror = function () {
    showError("Failed to read image file. Please try again.");
  };

  reader.readAsDataURL(file);
}

// ===================================
// OCR Processing Function
// ===================================
async function processImage() {
  if (!selectedFile) {
    showError("No image selected. Please upload an image first.");
    return;
  }

  showSection(loadingSection);

  try {
    // Initialize Tesseract worker
    const worker = await Tesseract.createWorker({
      logger: (m) => {
        // Log OCR progress
        if (m.status === "recognizing text") {
          console.log(`Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // Load language data
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    // Recognize text from image
    const {
      data: { text },
    } = await worker.recognize(selectedFile);

    // Terminate worker to free up memory
    await worker.terminate();

    extractedText = text.trim();

    if (extractedText) {
      displayResults(extractedText);
    } else {
      showError(
        "No text found in the image. Please try another image with clearer text."
      );
    }
  } catch (error) {
    console.error("OCR Error:", error);
    showError(
      "Failed to process image. Please try again or use a different image."
    );
  }
}

// ===================================
// Results Display Function
// ===================================
function displayResults(text) {
  textOutput.textContent = text;
  showSection(resultsSection);
}

// ===================================
// Action Button Handlers
// ===================================
async function copyText() {
  if (!extractedText) {
    showError("No text to copy");
    return;
  }

  try {
    await navigator.clipboard.writeText(extractedText);

    // Visual feedback
    const originalText = copyBtn.textContent;
    const originalBg = copyBtn.style.background;

    copyBtn.textContent = "✓ Copied!";
    copyBtn.style.background =
      "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.background = originalBg;
    }, 2000);
  } catch (err) {
    console.error("Copy failed:", err);

    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = extractedText;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
      copyBtn.textContent = "✓ Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy Text";
      }, 2000);
    } catch (e) {
      showError("Failed to copy text to clipboard");
    }

    document.body.removeChild(textArea);
  }
}

function downloadText() {
  if (!extractedText) {
    showError("No text to download");
    return;
  }

  try {
    // Create blob with extracted text
    const blob = new Blob([extractedText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement("a");
    link.href = url;
    link.download = `extracted-text-${Date.now()}.txt`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

    // Visual feedback
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = "✓ Downloaded!";

    setTimeout(() => {
      downloadBtn.textContent = originalText;
    }, 2000);
  } catch (error) {
    console.error("Download failed:", error);
    showError("Failed to download text file");
  }
}

function reset() {
  // Clear state
  selectedFile = null;
  extractedText = "";

  // Clear file input
  fileInput.value = "";

  // Clear preview image
  imagePreview.src = "";

  // Clear text output
  textOutput.textContent = "";

  // Show upload section
  showSection(uploadSection);
}

// ===================================
// Error Handling Function
// ===================================
function showError(message) {
  errorMessage.textContent = message;
  showSection(errorSection);
}

// ===================================
// Drag and Drop Event Handlers
// ===================================
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
    handleFileSelect(files[0]);
  }
}

// ===================================
// Event Listeners Initialization
// ===================================
function initializeEventListeners() {
  // Browse button click
  browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Upload area click (entire area clickable)
  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  // Drag and drop events
  uploadArea.addEventListener("dragover", handleDragOver);
  uploadArea.addEventListener("dragleave", handleDragLeave);
  uploadArea.addEventListener("drop", handleDrop);

  // Process button
  processBtn.addEventListener("click", processImage);

  // Action buttons
  copyBtn.addEventListener("click", copyText);
  downloadBtn.addEventListener("click", downloadText);
  resetBtn.addEventListener("click", reset);
  errorResetBtn.addEventListener("click", reset);

  // Prevent default drag behavior on entire document
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());

  console.log("✅ Event listeners initialized successfully");
}

// ===================================
// Application Initialization
// ===================================
function initializeApp() {
  console.log("🚀 Initializing OCR Text Extractor...");

  // Check if Tesseract is loaded
  if (typeof Tesseract === "undefined") {
    console.error("❌ Tesseract.js library not loaded");
    showError("OCR library failed to load. Please refresh the page.");
    return;
  }

  // Initialize event listeners
  initializeEventListeners();

  // Show upload section by default
  showSection(uploadSection);

  console.log("✅ OCR Text Extractor initialized successfully");
  console.log("📷 Ready to extract text from images");
  console.log("📝 Supported formats: JPG, PNG, GIF, BMP, TIFF, WebP");
}

// ===================================
// Start Application on DOM Ready
// ===================================
document.addEventListener("DOMContentLoaded", initializeApp);

// ===================================
// Export for debugging (optional)
// ===================================
if (typeof window !== "undefined") {
  window.OCRApp = {
    reset,
    processImage,
    state: {
      get selectedFile() {
        return selectedFile;
      },
      get extractedText() {
        return extractedText;
      },
    },
  };
  console.log("🔧 Debug mode: Access OCRApp from console");
}
