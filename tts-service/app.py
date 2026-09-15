from fastapi import FastAPI, Response
from pydantic import BaseModel
import wave
import io
import os
from piper.voice import PiperVoice

import urllib.request

app = FastAPI()

# Models directory
HI_MODEL_PATH = "models/hi_IN-priyamvada-medium.onnx"

def download_file(url, path):
    if not os.path.exists(path):
        print(f"Downloading {path}...")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        urllib.request.urlretrieve(url, path)

HI_MODEL_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/hi/hi_IN/priyamvada/medium/hi_IN-priyamvada-medium.onnx"

print("Downloading Hindi Piper Model if not present...")
download_file(HI_MODEL_URL, HI_MODEL_PATH)
download_file(HI_MODEL_URL + ".json", HI_MODEL_PATH + ".json")

print("Loading Hindi Piper Model...")
try:
    hi_voice = PiperVoice.load(HI_MODEL_PATH)
    print("Hindi TTS Model loaded successfully")
except Exception as e:
    print(f"Error loading Hindi model: {e}")
    hi_voice = None

class TTSRequest(BaseModel):
    inputs: str
    language: str = "hi"
    emotion: str = "neutral"

@app.post("/speech/v1/tts")
def tts(req: TTSRequest):
    # Only Hindi voice is loaded and used in this hosted service
    voice = hi_voice
    
    if not voice:
        return {"error": "Hindi Voice model not loaded."}, 500

    length_scale = 0.9  # 10% faster synthesis for lower latency
    noise_scale = 0.667
    noise_w = 0.8
    
    emotion = req.emotion.lower().strip()
    
    if emotion in ["calm", "empathetic"]:
        length_scale = 1.2    # Slower, more deliberate
        noise_scale = 0.4     # Less pitch variance, smoother
    elif emotion in ["joyful", "encouraging"]:
        length_scale = 0.85   # Slightly faster
        noise_scale = 0.8     # More dynamic pitch variance
    
    wav_io = io.BytesIO()
    
    # Synthesize speech to WAV format with emotion parameters
    with wave.open(wav_io, "wb") as wav_file:
        voice.synthesize(
            req.inputs, 
            wav_file, 
            length_scale=length_scale, 
            noise_scale=noise_scale, 
            noise_w=noise_w
        )
        
    # Return audio bytes
    return Response(content=wav_io.getvalue(), media_type="audio/wav")

@app.get("/health")
@app.get("/")
def health():
    return {"status": "ok", "hi_loaded": hi_voice is not None}

