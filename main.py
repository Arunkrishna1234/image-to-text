from flask import Flask, render_template, request, jsonify, send_file, session
from werkzeug.utils import secure_filename
import os
import cv2
import pytesseract
import numpy as np
import re
from datetime import datetime
import fitz  # PyMuPDF
from docx import Document
import logging
from functools import wraps
import uuid
import json
from PIL import Image
import io
import secrets
import base64

# Llama 3.2 Vision imports
import torch
from transformers import MllamaForConditionalGeneration, AutoProcessor

# Configure Tesseract path - adjust based on your installation
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['OUTPUT_FOLDER'] = 'clean_notes'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'bmp', 'tiff', 'pdf', 'docx', 'gif'}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create necessary folders
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

# =======================
# LLAMA 3.2 VISION SETUP
# =======================

class LlamaVisionProcessor:
    """Llama 3.2 Vision Model Handler"""
    
    def __init__(self):
        self.model = None
        self.processor = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_loaded = False
        logger.info(f"Vision processor will use device: {self.device}")
    
    def load_model(self):
        """Load Llama 3.2 Vision model (lazy loading)"""
        if self.model_loaded:
            return True
        
        try:
            logger.info("Loading Llama 3.2 Vision model...")
            
            # Load the model - using Llama 3.2 11B Vision
            model_id = "meta-llama/Llama-3.2-11B-Vision-Instruct"
            
            self.model = MllamaForConditionalGeneration.from_pretrained(
                model_id,
                torch_dtype=torch.bfloat16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None,
            )
            
            self.processor = AutoProcessor.from_pretrained(model_id)
            
            self.model_loaded = True
            logger.info("✓ Llama 3.2 Vision model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load Llama Vision model: {e}")
            logger.warning("Falling back to traditional OCR only")
            return False
    
    def analyze_image(self, image_path, task="comprehensive"):
        """Analyze image using Llama Vision"""
        if not self.model_loaded:
            if not self.load_model():
                return None, "Vision model not available"
        
        try:
            # Load image
            image = Image.open(image_path).convert("RGB")
            
            # Define prompts based on task
            prompts = {
                "text_extraction": """Extract ALL text from this image. 
                Correct any OCR errors and format the text properly. 
                Include headings, paragraphs, and maintain structure.""",
                
                "table_extraction": """Identify and extract ALL tables from this image.
                Format each table in Markdown format with proper headers.
                If no table exists, say 'No table found.'""",
                
                "object_detection": """List ALL objects, components, and elements visible in this image.
                For each object provide:
                1. Name/type of object
                2. Location (top/bottom/left/right)
                3. Purpose or function
                4. Any text labels associated with it
                Format as JSON.""",
                
                "flow_analysis": """Analyze this diagram/image and explain:
                1. What components are present
                2. How they are connected
                3. The direction of flow (data/power/process)
                4. Step-by-step explanation of the process
                5. The overall purpose of this system""",
                
                "comprehensive": """Provide a comprehensive analysis of this image:
                
                **TEXT CONTENT:**
                - Extract all readable text with proper formatting
                
                **TABLES:**
                - Extract any tables in Markdown format
                
                **OBJECTS & COMPONENTS:**
                - List all visible objects, shapes, and elements
                
                **RELATIONSHIPS & FLOW:**
                - Explain how components are connected
                - Describe the flow of information/process
                
                **INSIGHTS:**
                - What is the main purpose of this image?
                - Any key insights or important information?"""
            }
            
            prompt = prompts.get(task, prompts["comprehensive"])
            
            # Prepare inputs
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image"},
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
            
            input_text = self.processor.apply_chat_template(messages, add_generation_prompt=True)
            inputs = self.processor(image, input_text, return_tensors="pt").to(self.model.device)
            
            # Generate response
            logger.info(f"Generating vision analysis for task: {task}")
            output = self.model.generate(**inputs, max_new_tokens=2048, do_sample=False)
            
            # Decode output
            response = self.processor.decode(output[0], skip_special_tokens=True)
            
            # Extract assistant response (after the prompt)
            if "assistant" in response:
                response = response.split("assistant")[-1].strip()
            
            logger.info(f"Vision analysis complete: {len(response)} characters")
            return response, None
            
        except Exception as e:
            logger.error(f"Vision analysis error: {e}", exc_info=True)
            return None, str(e)
    
    def query_image(self, image_path, user_question):
        """Ask a specific question about the image"""
        if not self.model_loaded:
            if not self.load_model():
                return None, "Vision model not available"
        
        try:
            image = Image.open(image_path).convert("RGB")
            
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image"},
                        {"type": "text", "text": user_question}
                    ]
                }
            ]
            
            input_text = self.processor.apply_chat_template(messages, add_generation_prompt=True)
            inputs = self.processor(image, input_text, return_tensors="pt").to(self.model.device)
            
            output = self.model.generate(**inputs, max_new_tokens=1024, do_sample=False)
            response = self.processor.decode(output[0], skip_special_tokens=True)
            
            if "assistant" in response:
                response = response.split("assistant")[-1].strip()
            
            return response, None
            
        except Exception as e:
            logger.error(f"Vision query error: {e}", exc_info=True)
            return None, str(e)

# Global vision processor instance
vision_processor = LlamaVisionProcessor()

# =======================
# HYBRID EXTRACTION
# =======================

def assess_image_complexity(image_path):
    """Assess whether image is simple or complex"""
    try:
        image = cv2.imread(image_path)
        if image is None:
            return "simple"
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Check for edges (complexity indicator)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        
        # Check for text regions
        mser = cv2.MSER_create()
        regions, _ = mser.detectRegions(gray)
        
        # Detect contours
        contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        significant_contours = [c for c in contours if cv2.contourArea(c) > 100]
        
        # Decision logic
        if edge_density > 0.1 or len(significant_contours) > 10 or len(regions) > 50:
            return "complex"
        else:
            return "simple"
            
    except:
        return "simple"

def extract_with_hybrid_approach(image_path, options=None):
    """Smart extraction: Use OCR for simple, Vision for complex"""
    if options is None:
        options = {}
    
    # Assess complexity
    complexity = options.get('complexity', 'auto')
    if complexity == 'auto':
        complexity = assess_image_complexity(image_path)
    
    logger.info(f"Image complexity: {complexity}")
    
    results = {
        'method': None,
        'text': None,
        'tables': None,
        'objects': None,
        'explanation': None,
        'insights': None,
        'ocr_backup': None
    }
    
    # For simple images or if force_ocr is True
    if complexity == 'simple' or options.get('force_ocr', False):
        logger.info("Using traditional OCR (fast path)")
        results['method'] = 'ocr'
        
        # Traditional OCR
        text, error = extract_text_from_image_traditional(image_path, options)
        if text:
            results['text'] = text
        
        return results, None
    
    # For complex images, use Llama Vision
    logger.info("Using Llama 3.2 Vision (intelligent path)")
    results['method'] = 'llama_vision'
    
    # Get OCR as backup
    ocr_text, _ = extract_text_from_image_traditional(image_path, options)
    results['ocr_backup'] = ocr_text
    
    # Use Llama Vision for comprehensive analysis
    task = options.get('vision_task', 'comprehensive')
    vision_response, error = vision_processor.analyze_image(image_path, task)
    
    if error:
        logger.warning(f"Vision analysis failed, using OCR backup: {error}")
        results['text'] = ocr_text
        return results, None
    
    # Parse vision response
    results['text'] = vision_response
    results['explanation'] = vision_response
    
    # Try to extract structured data from vision response
    if "**TEXT CONTENT:**" in vision_response:
        sections = vision_response.split("**")
        for i, section in enumerate(sections):
            if "TEXT CONTENT:" in section and i+1 < len(sections):
                results['text'] = sections[i+1].strip()
            elif "TABLES:" in section and i+1 < len(sections):
                results['tables'] = sections[i+1].strip()
            elif "OBJECTS" in section and i+1 < len(sections):
                results['objects'] = sections[i+1].strip()
            elif "INSIGHTS:" in section and i+1 < len(sections):
                results['insights'] = sections[i+1].strip()
    
    return results, None

def extract_text_from_image_traditional(image_path, options=None):
    """Traditional OCR extraction (original implementation)"""
    if options is None:
        options = {}
    
    try:
        image = cv2.imread(image_path)
        if image is None:
            return None, "Could not load image"
        
        # Enhanced preprocessing
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, None, h=10)
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # OCR
        text = pytesseract.image_to_string(thresh, config='--oem 3 --psm 6')
        
        if not text.strip():
            return None, "No text found"
        
        # Clean text
        cleaned = smart_text_cleaner(text, 
                                    preserve_newlines=options.get('preserve_newlines', False))
        
        return cleaned, None
        
    except Exception as e:
        logger.error(f"Traditional OCR error: {e}", exc_info=True)
        return None, str(e)

def smart_text_cleaner(text, preserve_newlines=False):
    """Clean extracted text"""
    if not text:
        return ""
    
    lines = text.split('\n')
    clean_lines = []
    
    for line in lines:
        stripped = line.strip()
        if len(stripped) <= 1:
            continue
        
        alpha_chars = sum(1 for c in stripped if c.isalpha())
        total_chars = len(stripped)
        
        if alpha_chars / total_chars > 0.3 if total_chars > 0 else False:
            line_clean = re.sub(r'[^\w\s\.,!?;:()\-\'\"@#$%|]', '', stripped)
            line_clean = re.sub(r'\s+', ' ', line_clean).strip()
            
            if line_clean and len(line_clean) > 2:
                clean_lines.append(line_clean)
    
    separator = '\n' if preserve_newlines else ' '
    return separator.join(clean_lines)

# =======================
# UTILITY FUNCTIONS
# =======================

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def generate_unique_filename(original_filename):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    name, ext = os.path.splitext(secure_filename(original_filename))
    return f"{name}_{timestamp}_{unique_id}{ext}"

# =======================
# FLASK ROUTES
# =======================

@app.route('/')
def index():
    return render_template('index_vision.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload with Vision support"""
    filepath = None
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'File type not allowed'}), 400
        
        # Save file
        filename = generate_unique_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"File uploaded: {filename}")
        
        # Get options
        use_vision = request.form.get('use_vision', 'auto').lower()
        vision_task = request.form.get('vision_task', 'comprehensive')
        
        options = {
            'complexity': 'complex' if use_vision == 'true' else 'auto',
            'force_ocr': use_vision == 'false',
            'vision_task': vision_task,
            'preserve_newlines': request.form.get('preserve_newlines', 'true').lower() == 'true'
        }
        
        # Check file type
        ext = os.path.splitext(filepath)[1].lower()
        
        if ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.gif']:
            # Use hybrid approach for images
            results, error = extract_with_hybrid_approach(filepath, options)
            
            if error:
                if filepath and os.path.exists(filepath):
                    os.remove(filepath)
                return jsonify({'success': False, 'error': error}), 400
            
            # Clean up
            if filepath and os.path.exists(filepath):
                os.remove(filepath)
            
            return jsonify({
                'success': True,
                'method': results['method'],
                'text': results['text'],
                'tables': results['tables'],
                'objects': results['objects'],
                'explanation': results['explanation'],
                'insights': results['insights'],
                'ocr_backup': results['ocr_backup'],
                'char_count': len(results['text']) if results['text'] else 0
            })
        
        else:
            # For PDFs and DOCX, use traditional extraction
            text, error = extract_text_from_file_traditional(filepath)
            
            if error:
                if filepath and os.path.exists(filepath):
                    os.remove(filepath)
                return jsonify({'success': False, 'error': error}), 400
            
            if filepath and os.path.exists(filepath):
                os.remove(filepath)
            
            return jsonify({
                'success': True,
                'method': 'traditional',
                'text': text,
                'char_count': len(text)
            })
        
    except Exception as e:
        logger.error(f"Upload error: {e}", exc_info=True)
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'}), 500

@app.route('/query', methods=['POST'])
def query_image():
    """Ask a question about an uploaded image"""
    filepath = None
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        question = request.form.get('question', '')
        
        if not question:
            return jsonify({'success': False, 'error': 'No question provided'}), 400
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        # Save file
        filename = generate_unique_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Query with vision model
        answer, error = vision_processor.query_image(filepath, question)
        
        # Clean up
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
        
        if error:
            return jsonify({'success': False, 'error': error}), 400
        
        return jsonify({
            'success': True,
            'question': question,
            'answer': answer
        })
        
    except Exception as e:
        logger.error(f"Query error: {e}", exc_info=True)
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health')
def health_check():
    """Health check with vision model status"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'ocr_available': check_tesseract(),
        'vision_model_loaded': vision_processor.model_loaded,
        'device': vision_processor.device,
        'supported_formats': list(app.config['ALLOWED_EXTENSIONS'])
    })

def check_tesseract():
    try:
        pytesseract.get_tesseract_version()
        return True
    except:
        return False

def extract_text_from_file_traditional(file_path):
    """Traditional extraction for PDFs and DOCX"""
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext == '.docx':
        return extract_text_from_docx(file_path)
    else:
        return None, "Unsupported file type"

def extract_text_from_pdf(pdf_path):
    """Extract from PDF"""
    try:
        text = ""
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text += page.get_text("text") + "\n"
        
        if not text.strip():
            return None, "No text in PDF"
        
        return smart_text_cleaner(text), None
    except Exception as e:
        return None, str(e)

def extract_text_from_docx(docx_path):
    """Extract from DOCX"""
    try:
        doc = Document(docx_path)
        text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        
        if not text.strip():
            return None, "No text in document"
        
        return smart_text_cleaner(text), None
    except Exception as e:
        return None, str(e)

# =======================
# RUN APP
# =======================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 OCR + Llama 3.2 Vision Server Starting...")
    print("="*60)
    
    # Check Tesseract
    if check_tesseract():
        version = pytesseract.get_tesseract_version()
        print(f"✓ Tesseract OCR {version} available")
    else:
        print("⚠️  Tesseract not found")
    
    # Check CUDA
    if torch.cuda.is_available():
        print(f"✓ CUDA available: {torch.cuda.get_device_name(0)}")
    else:
        print("⚠️  CUDA not available, using CPU (slower)")
    
    print(f"\n✓ Max file size: {app.config['MAX_CONTENT_LENGTH'] / (1024*1024)}MB")
    print(f"✓ Supported formats: {', '.join(app.config['ALLOWED_EXTENSIONS'])}")
    print("\n💡 Vision model will load on first use (lazy loading)")
    print("\n" + "="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)