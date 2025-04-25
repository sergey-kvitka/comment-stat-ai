from flask import Flask, request, jsonify
from transformers import pipeline
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:4000"],
        "methods": ["POST"],
        "allow_headers": ["Content-Type"]
    }
})

# Загрузка моделей для русского языка
emotion_classifier = pipeline(
    "text-classification", model="cointegrated/rubert-tiny2-cedr-emotion-detection")
sentiment_classifier = pipeline(
    "text-classification", model="blanchefort/rubert-base-cased-sentiment")


@app.route('/api/analyze', methods=['POST'])
def analyze_comments():
    start_time = time.perf_counter()

    data = request.json
    comments = data.get('comments', [])

    response = {
        'elapsed_ms': 0,
        'amount': len(comments)
    }
    comments_result = {}
    for comment in comments:
        text = comment['text']

        # Анализ эмоций
        print(emotion_classifier(text))
        emotion_result = emotion_classifier(text)[0]
        emotion = emotion_result['label']
        if emotion == 'no_emotion':
            emotion = 'neutral'

        # Анализ тональности
        print(sentiment_classifier(text))
        sentiment_result = sentiment_classifier(text)[0]
        sentiment = sentiment_result['label'].lower()

        comments_result[comment['id']] = {
            'text': text,
            'sentiment': sentiment,
            'emotion': emotion
        }

    response['comments'] = comments_result
    end_time = time.perf_counter()
    processing_time_ms = (end_time - start_time) * 1000
    response['elapsed_ms'] = round(processing_time_ms, 3)

    return jsonify(response)


if __name__ == '__main__':
    app.run(debug=True)
