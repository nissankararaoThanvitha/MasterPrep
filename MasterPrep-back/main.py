from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import pytesseract
import fitz  # PyMuPDF
import io
import os
from dotenv import load_dotenv
from google import genai

# ---------------- LOAD ENV ----------------
load_dotenv()

# ---------------- GEMINI CLIENT ----------------
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ---------------- FASTAPI APP ----------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- TESSERACT (WINDOWS) ----------------
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# ---------------- GLOBAL CONTEXT ----------------
stored_context = ""

# ---------------- FILE UPLOAD ----------------
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global stored_context

    try:
        # ✅ READ FILE ONCE
        file_bytes = await file.read()
        extracted_text = ""

        # ---------- PDF ----------
        if file.filename.lower().endswith(".pdf"):
            pdf = fitz.open(stream=file_bytes, filetype="pdf")
            for page in pdf:
                extracted_text += page.get_text()

        # ---------- IMAGE ----------
        elif file.filename.lower().endswith((".png", ".jpg", ".jpeg")):
            image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            extracted_text = pytesseract.image_to_string(image)

        # ---------- TEXT ----------
        else:
            extracted_text = file_bytes.decode("utf-8", errors="ignore")

        # Store context
        stored_context += "\n" + extracted_text

        return {"message": "Content stored successfully"}

    except Exception as e:
        return {"error": f"File processing failed: {str(e)}"}

# ---------------- ASK QUESTION (GEMINI) ----------------
@app.post("/ask")
async def ask_question(data: dict):
    question = data.get("question", "")

    if not question:
        return {"answer": "⚠️ Question cannot be empty."}

    prompt = f"""
You are an exam-oriented academic assistant.

Answer in clean, plain-text exam notes format.

Strict Rules:
- DO NOT use markdown
- DO NOT use ###, **, ---, or symbols
- DO NOT write long paragraphs
- Use simple headings followed by a colon
- Use '-' for bullet points only
- Keep points short and clear
- Use textbook-style language
- No storytelling or analogies

If examples are needed, keep them very brief.

Question:
{question}

"""


    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )
        return {"answer": response.text}

    except Exception:
        return {"answer": "⚠️ AI failed to generate response. Try again."}

# ---------------- CLEAR CONTEXT ----------------
@app.post("/clear")
async def clear_context():
    global stored_context
    stored_context = ""
    return {"message": "Context cleared successfully"}
