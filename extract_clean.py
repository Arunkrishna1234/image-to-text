import os
import cv2
import pytesseract
import glob
import re
import numpy as np
from datetime import datetime
from pdf2image import convert_from_path
import fitz  # PyMuPDF
from docx import Document


class ImageNotesManager:
    def __init__(self):
        self.uploads_dir = "uploads"
        self.notes_dir = "my_notes"
        self.supported_formats = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.pdf', '.docx']
        os.makedirs(self.uploads_dir, exist_ok=True)
        os.makedirs(self.notes_dir, exist_ok=True)

    def list_uploaded_images(self):
        """List all uploaded files (images, PDFs, DOCX)"""
        files = []
        for ext in self.supported_formats:
            files.extend(glob.glob(os.path.join(self.uploads_dir, f"*{ext}")))
        return sorted(files)

    def enhanced_preprocess(self, img):
        """Advanced image preprocessing for better OCR accuracy"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Upscale small images
        height, width = gray.shape
        if height < 100 or width < 200:
            scale = 2
            gray = cv2.resize(gray, (width * scale, height * scale), interpolation=cv2.INTER_CUBIC)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        
        # Multiple thresholding techniques
        _, thresh_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        thresh_adapt = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Morphological operations to clean up
        kernel = np.ones((2, 2), np.uint8)
        thresh_clean = cv2.morphologyEx(thresh_otsu, cv2.MORPH_CLOSE, kernel)
        
        return [thresh_otsu, thresh_adapt, thresh_clean]

    def smart_text_cleaner(self, text):
        """Intelligent text cleaning and validation"""
        if not text:
            return ""
        
        lines = text.split('\n')
        clean_lines = []
        
        for line in lines:
            # Skip very short lines
            if len(line.strip()) <= 1:
                continue
            
            # Check if line has reasonable alpha character ratio
            alpha_chars = sum(1 for c in line if c.isalpha())
            total_chars = len(line.strip())
            
            if total_chars > 0 and alpha_chars / total_chars > 0.3:
                # Remove non-standard characters
                line_clean = re.sub(r'[^a-zA-Z0-9\s\.,!?;:()\-]', '', line)
                line_clean = re.sub(r'\s+', ' ', line_clean).strip()
                
                if line_clean:
                    clean_lines.append(line_clean)
        
        return ' '.join(clean_lines)

    def extract_text_from_image(self, image_path):
        """Enhanced OCR extraction with multiple preprocessing and PSM modes"""
        image = cv2.imread(image_path)
        if image is None:
            return None
        
        # Get multiple preprocessed versions
        thresh_images = self.enhanced_preprocess(image)
        
        # Try different PSM (Page Segmentation Modes) configurations
        psm_configs = [
            '--oem 3 --psm 6',   # Assume uniform text block
            '--oem 3 --psm 7',   # Single text line
            '--oem 3 --psm 8',   # Single word
            '--oem 3 --psm 13'   # Raw line (bypass segmentation)
        ]
        
        all_texts = []
        
        # Extract text with different combinations
        for processed_img in thresh_images:
            for config in psm_configs:
                try:
                    text = pytesseract.image_to_string(processed_img, config=config)
                    cleaned = self.smart_text_cleaner(text)
                    if cleaned:
                        all_texts.append(cleaned)
                except:
                    continue
        
        if not all_texts:
            return None
        
        # Score and select best result
        unique_texts = list(set(all_texts))
        scored_texts = []
        
        for text in unique_texts:
            score = 0
            # Prefer texts with spaces (multiple words)
            if ' ' in text:
                score += 10
            # Bonus for common keywords
            for word in ['training', 'data', 'vs', 'testing', 'test', 'train']:
                if word in text.lower():
                    score += 5
            # Prefer reasonable length
            if 10 <= len(text) <= 100:
                score += 5
            
            scored_texts.append((score, text))
        
        scored_texts.sort(reverse=True)
        return scored_texts[0][1] if scored_texts else None

    def extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF (text-based or scanned)"""
        text = ""
        
        try:
            # Try direct text extraction first (for text-based PDFs)
            with fitz.open(pdf_path) as doc:
                for page in doc:
                    text += page.get_text("text") + "\n"
        except:
            text = ""
        
        # If no text found, use OCR on converted images
        if not text.strip():
            try:
                images = convert_from_path(pdf_path, dpi=300)
                for img in images:
                    text += pytesseract.image_to_string(img)
            except Exception as e:
                return None
        
        cleaned_text = re.sub(r'\s+', ' ', text).strip()
        return cleaned_text if cleaned_text else None

    def extract_text_from_docx(self, docx_path):
        """Extract text from Word document"""
        try:
            doc = Document(docx_path)
            text = "\n".join([p.text for p in doc.paragraphs])
            cleaned_text = re.sub(r'\s+', ' ', text).strip()
            return cleaned_text if cleaned_text else None
        except Exception as e:
            return None

    def extract_and_save_text(self, file_path):
        """Extract text from any supported file type and save"""
        if not os.path.exists(file_path):
            return None, None
        
        ext = os.path.splitext(file_path)[1].lower()
        
        # Route to appropriate extractor
        if ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']:
            text = self.extract_text_from_image(file_path)
            file_type = "image"
        elif ext == '.pdf':
            text = self.extract_text_from_pdf(file_path)
            file_type = "pdf"
        elif ext == '.docx':
            text = self.extract_text_from_docx(file_path)
            file_type = "docx"
        else:
            return None, None
        
        if text:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = os.path.basename(file_path)
            note_filename = f"note_{file_type}_{os.path.splitext(filename)[0]}_{timestamp}.txt"
            note_path = os.path.join(self.notes_dir, note_filename)
            
            with open(note_path, 'w', encoding='utf-8') as f:
                f.write(text)
            
            return note_filename, text
        
        return None, None

    def list_notes(self):
        """List all saved notes"""
        return sorted(glob.glob(os.path.join(self.notes_dir, "*.txt")))

    def get_statistics(self):
        """Get storage and file statistics"""
        files = self.list_uploaded_images()
        notes = self.list_notes()
        
        total_files_size = sum(os.path.getsize(f) for f in files) / 1024
        total_notes_size = sum(os.path.getsize(f) for f in notes) / 1024
        
        return {
            "file_count": len(files),
            "note_count": len(notes),
            "uploads_size": total_files_size,
            "notes_size": total_notes_size,
            "total_size": total_files_size + total_notes_size
        }


# Example usage
if __name__ == "__main__":
    manager = ImageNotesManager()
    
    # Process all uploaded files
    uploaded_files = manager.list_uploaded_images()
    print(f"Found {len(uploaded_files)} uploaded files")
    
    for file_path in uploaded_files:
        print(f"\nProcessing: {os.path.basename(file_path)}")
        note_filename, text = manager.extract_and_save_text(file_path)
        
        if note_filename:
            print(f"✓ Saved as: {note_filename}")
            print(f"  Extracted text: {text[:100]}...")
        else:
            print("✗ Failed to extract text")
    
    # Display statistics
    stats = manager.get_statistics()
    print(f"\n{'='*50}")
    print(f"Statistics:")
    print(f"  Files uploaded: {stats['file_count']}")
    print(f"  Notes created: {stats['note_count']}")
    print(f"  Total storage: {stats['total_size']:.2f} KB")
    print(f"{'='*50}")