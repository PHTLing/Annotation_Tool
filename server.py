import fastapi
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import joblib
import uvicorn
from underthesea import sent_tokenize, word_tokenize

# Load mô hình CRF đã train
crf_model = joblib.load("crf_model.pkl")

app = FastAPI()

# Cho phép frontend (Vite) truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def predict_text(crf_model, text):
    sentences = sent_tokenize(text)
    tokenized_sentences = [word_tokenize(sent) for sent in sentences]

    predictions = []
    for sentence in tokenized_sentences:
        predicted_labels = crf_model.predict([sentence])[0]
        predictions.append(list(zip(sentence, predicted_labels)))

    # Nối các câu thành một list
    return [item for sublist in predictions for item in sublist]

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8")
    # print(f"Received text: {text}")
    # tách câu
    lines = text.split("\n")
    lines = [line.strip() for line in lines ]
    # print(f"Processed lines: {lines}")
    predictions= []
    for line in lines:
        predictions.append(predict_text(crf_model, line))
    # print(f"Predictions: {predictions[0]}")
    json_response = []
    for senctence in predictions:
        sentence_data = {"word": [], "tag": []}
        for word, tag in senctence:
            sentence_data["word"].append(word)
            sentence_data["tag"].append(tag)
        json_response.append(sentence_data)

    # print(f"JSON Response: {json_response}")

    return json_response

if __name__ == "__main__":
    import webbrowser
    webbrowser.open("http://127.0.0.1:8000")  # Tự mở trình duyệt đúng địa chỉ
    uvicorn.run(app, host="0.0.0.0", port=8000)
