from flask import Flask, request, jsonify
from flask_cors import CORS
import time
from emotion_classifier import EmotionClassifier
from dotenv import dotenv_values
import uuid as _uuid

CONFIG = dotenv_values(".env")

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": [CONFIG["BACKEND_API_URL"]],
        "methods": ["POST"],
        "allow_headers": ["Content-Type"]
    }
})

emotion_classifier = EmotionClassifier('./model/trained/model.pth')

emotion_classifier.predict_raw('Я люблю писать код!')
print('\nEmotion classifier is ready!\n')


def uuid():
    return str(_uuid.uuid4())


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

        if 'id' in comment:
            id = comment['id']
        else:
            id = uuid()

        classification_result = emotion_classifier.classify(text)

        comments_result[id] = {
            'text': text,
            'sentiment': classification_result['sentiment'],
            'emotion': classification_result['emotion'],
        }

    response['comments'] = comments_result
    end_time = time.perf_counter()
    processing_time_ms = (end_time - start_time) * 1000
    response['elapsed_ms'] = round(processing_time_ms, 3)

    return jsonify(response)


if __name__ == '__main__':
    app.run(
        port=int(CONFIG['PORT']),
        debug=True
    )
