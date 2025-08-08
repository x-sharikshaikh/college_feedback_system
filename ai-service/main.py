from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="AI Sentiment Service", version="0.1.0")

class Texts(BaseModel):
    texts: List[str]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/sentiment")
def sentiment(data: Texts):
    # Placeholder for future ML model
    return {"scores": [0.0 for _ in data.texts]}
