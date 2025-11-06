import cv2
import pytesseract
import os
import re
from datetime import datetime
import numpy as np
from pdf2image import convert_from_path
import fitz  # PyMuPDF
from docx import Document

def extract_text_from_file(file_path, notes_folder="clean_notes"):
    """Extract text from image, PDF, or Word document."""
    if not os.path.exists(file_path):
        return None, f"❌ File not found: {file_path}"

    os.makedirs(notes_folder, exist_ok=True)
    ext = os.path.splitext(file_path)[1].lower()

    # Detect file type
    if ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff"]:
        return extract_text_from_image(file_path, notes_folder)
    elif ext == ".pdf":
        return extract_text_from_pdf(file_path, notes_folder)
    elif ext == ".docx":
        return extract_text_from_docx(file_path, notes_folder)
    else:
        return None, f"⚠️ Unsupported file type: {ext}"

# -----------------------------
# 🖼 IMAGE OCR EXTRACTION
# -----------------------------
def extract_text_from_image(image_path, notes_folder="clean_notes"):
    image = cv2.imread(image_path)
    if image is None:
        return None, "❌ Could not load image"

    # --- Preprocessing ---
    def enhanced_preprocess(img):
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape
        if height < 100 or width < 200:
            scale = 2
            gray = cv2.resize(gray, (width * scale, height * scale), interpolation=cv2.INTER_CUBIC)
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        _, thresh_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        thresh_adapt = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                             cv2.THRESH_BINARY, 11, 2)
        kernel = np.ones((2, 2), np.uint8)
        thresh_clean = cv2.morphologyEx(thresh_otsu, cv2.MORPH_CLOSE, kernel)
        return [thresh_otsu, thresh_adapt, thresh_clean]

    # --- Text cleaner ---
    def smart_text_cleaner(text):
        if not text:
            return ""
        lines = text.split('\n')
        clean_lines = []
        for line in lines:
            if len(line.strip()) <= 1:
                continue
            alpha_chars = sum(1 for c in line if c.isalpha())
            total_chars = len(line.strip())
            if total_chars > 0 and alpha_chars / total_chars > 0.3:
                line_clean = re.sub(r'[^a-zA-Z0-9\s\.,!?;:()\-]', '', line)
                line_clean = re.sub(r'\s+', ' ', line_clean).strip()
                if line_clean:
                    clean_lines.append(line_clean)
        return ' '.join(clean_lines)

    thresh_images = enhanced_preprocess(image)
    all_texts = []
    psm_configs = ['--oem 3 --psm 6', '--oem 3 --psm 7', '--oem 3 --psm 8', '--oem 3 --psm 13']

    for processed_img in thresh_images:
        for config in psm_configs:
            try:
                text = pytesseract.image_to_string(processed_img, config=config)
                cleaned = smart_text_cleaner(text)
                if cleaned:
                    all_texts.append(cleaned)
            except:
                continue

    if not all_texts:
        return None, "❌ No clean text could be extracted"

    unique_texts = list(set(all_texts))
    scored_texts = []
    for text in unique_texts:
        score = 0
        if ' ' in text: score += 10
        for word in ['training', 'data', 'vs', 'testing', 'test', 'train']:
            if word in text.lower():
                score += 5
        if 10 <= len(text) <= 100:
            score += 5
        scored_texts.append((score, text))

    scored_texts.sort(reverse=True)
    best_text = scored_texts[0][1] if scored_texts else ""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    notepad_file = os.path.join(notes_folder, f"clean_text_{timestamp}.txt")
    with open(notepad_file, 'w', encoding='utf-8') as f:
        f.write(best_text)

    return best_text, notepad_file


# -----------------------------
# 📄 PDF TEXT EXTRACTION
# -----------------------------
def extract_text_from_pdf(pdf_path, notes_folder="clean_notes"):
    text = ""
    try:
        # Try direct text extraction first (for text-based PDFs)
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text += page.get_text("text") + "\n"
    except:
        text = ""

    if not text.strip():
        # If no text, convert to images and OCR
        images = convert_from_path(pdf_path, dpi=300)
        for img in images:
            text += pytesseract.image_to_string(img)

    cleaned_text = re.sub(r'\s+', ' ', text).strip()
    if not cleaned_text:
        return None, "❌ No text found in PDF"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    notepad_file = os.path.join(notes_folder, f"clean_pdf_{timestamp}.txt")
    with open(notepad_file, 'w', encoding='utf-8') as f:
        f.write(cleaned_text)

    return cleaned_text, notepad_file


# -----------------------------
# 📝 WORD TEXT EXTRACTION
# -----------------------------
def extract_text_from_docx(docx_path, notes_folder="clean_notes"):
    try:
        doc = Document(docx_path)
        text = "\n".join([p.text for p in doc.paragraphs])
    except Exception as e:
        return None, f"❌ Error reading DOCX: {e}"

    cleaned_text = re.sub(r'\s+', ' ', text).strip()
    if not cleaned_text:
        return None, "❌ No text found in DOCX"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    notepad_file = os.path.join(notes_folder, f"clean_docx_{timestamp}.txt")
    with open(notepad_file, 'w', encoding='utf-8') as f:
        f.write(cleaned_text)

    return cleaned_text, notepad_file
