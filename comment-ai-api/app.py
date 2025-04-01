from flask import Flask, request, jsonify
from transformers import pipeline

app = Flask(__name__)

# Загрузка моделей для русского языка
emotion_classifier = pipeline("text-classification", model="cointegrated/rubert-tiny2-cedr-emotion-detection")
sentiment_classifier = pipeline("text-classification", model="blanchefort/rubert-base-cased-sentiment")

@app.route('/analyze', methods=['POST'])
def analyze_comments():
    data = request.json
    comments = data.get('comments', [])
    
    results = []
    for comment in comments:
        # Анализ эмоций
        print(emotion_classifier(comment))
        emotion_result = emotion_classifier(comment)[0]
        emotion = emotion_result['label']
        if emotion == 'no_emotion':
            emotion = 'neutral'

        # Анализ тональности
        print(sentiment_classifier(comment))
        sentiment_result = sentiment_classifier(comment)[0]
        sentiment = sentiment_result['label'].lower()
        
        results.append({
            'comment': comment,
            'sentiment': sentiment,
            'emotion': emotion
        })
    
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)