from flask import Flask, render_template, request, redirect, url_for, send_file
import os
from extract_clean import extract_text_from_file  # ✅ supports image, pdf, docx

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    # ✅ Check if file exists
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400

    # ✅ Save uploaded file
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)

    # ✅ Extract text (works for .png, .jpg, .pdf, .docx)
    extracted_text, saved_file = extract_text_from_file(filepath)

    if not extracted_text:
        return render_template('result.html', text="No text could be extracted or file type not supported.")

    # ✅ Render result page
    return render_template('result.html', text=extracted_text, download_link=saved_file)

@app.route('/download/<path:filename>')
def download_file(filename):
    return send_file(filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
