from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import pytesseract
import fitz
import io
import os
from dotenv import load_dotenv
import google.generativeai as genai

# ---------------- LOAD ENV ----------------
load_dotenv()

# ---------------- GEMINI ----------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-3-flash-preview")

# ---------------- FASTAPI ----------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- TESSERACT FIX ----------------
if os.name == "nt":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# ---------------- CONTEXT ----------------
stored_context = ""

# ---------------- UPLOAD ----------------
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global stored_context

    try:
        file_bytes = await file.read()
        extracted_text = ""

        if file.filename.lower().endswith(".pdf"):
            pdf = fitz.open(stream=file_bytes, filetype="pdf")
            for page in pdf:
                extracted_text += page.get_text()

        elif file.filename.lower().endswith((".png", ".jpg", ".jpeg")):
            image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            extracted_text = pytesseract.image_to_string(image)

        else:
            extracted_text = file_bytes.decode("utf-8", errors="ignore")

        stored_context += "\n" + extracted_text

        return {"message": "Content stored successfully"}

    except Exception as e:
        return {"error": str(e)}

# ---------------- ASK ----------------
@app.post("/ask")
async def ask_question(data: dict):
    question = data.get("question", "")

    if not question:
        return {"answer": "Question cannot be empty"}

    prompt = f"""
Answer in exam notes format.

Question:
{question}
"""

    try:
        response = model.generate_content(prompt)
        return {"answer": response.text}

    except Exception as e:
        return {"answer": f"ERROR: {str(e)}"}

# ---------------- CLEAR ----------------
@app.post("/clear")
async def clear_context():
    global stored_context
    stored_context = ""
    return {"message": "Cleared"}