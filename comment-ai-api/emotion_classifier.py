import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import re
import string


class EmotionClassifier:

    GROUPINGS = {
        'a': {
            'emotions': {
                'joy': [
                    'admiration', 'amusement', 'excitement', 'gratitude',
                    'joy', 'love', 'optimism', 'pride', 'approval'
                ],
                'anger': ['anger', 'annoyance', 'disapproval', 'disgust'],
                'sadness': [
                    'disappointment', 'grief', 'remorse', 'sadness', 'embarrassment',
                    'disappointment', 'grief', 'remorse', 'sadness', 'embarrassment',
                ],
                'surprise': ['confusion', 'curiosity', 'realization', 'relief', 'surprise'],
                'fear': ['embarrassment', 'fear', 'nervousness'],
                'neutral': ['neutral'],
            },
            'sentiments': {
                'positive': ['approval', 'admiration', 'amusement', 'excitement', 'joy', 'love', 'optimism'],
                'negative': [
                    'disapproval', 'anger', 'annoyance', 'disappointment', 'disgust', 'fear', 'grief', 'nervousness', 'sadness'
                ],
                'neutral': [
                    'caring', 'confusion', 'curiosity', 'desire',
                    'gratitude', 'pride', 'realization', 'relief', 'remorse', 'surprise', 'neutral'
                ],
            }
        }
    }

    # Конфигурация класса
    MODEL_NAME = "bert-base-multilingual-uncased"
    CLASSES = [
        'admiration', 'amusement', 'anger', 'annoyance', 'approval', 'caring', 'confusion',
        'curiosity', 'desire', 'disappointment', 'disapproval', 'disgust', 'embarrassment',
        'excitement', 'fear', 'gratitude', 'grief', 'joy', 'love', 'nervousness', 'optimism',
        'pride', 'realization', 'relief', 'remorse', 'sadness', 'surprise', 'neutral'
    ]
    MAX_LEN = 128

    model_path = None

    def __init__(self, model_path):
        """Инициализация модели при создании экземпляра класса"""
        self.model_path = model_path
        self.tokenizer, self.model = self._load_model()

    def _load_model(self):
        """Загрузка модели и токенизатора"""
        tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)
        model = AutoModelForSequenceClassification.from_pretrained(
            self.MODEL_NAME,
            num_labels=len(self.CLASSES),
            problem_type="multi_label_classification"
        ).to('cpu')

        checkpoint = torch.load(self.model_path, map_location='cpu')
        if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
        else:
            model.load_state_dict(checkpoint)

        model.eval()
        return tokenizer, model

    def _preprocess(self, text):
        """Предобработка текста"""
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        text = re.sub(r'<.*?>', '', text)
        text = text.translate(str.maketrans('', '', string.punctuation))
        text = text.lower()
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def predict_raw(self, text):
        """
        Возвращает сырой результат предсказания
        Returns:
            dict: {эмоция: вероятность}
        """
        encoding = self.tokenizer.encode_plus(
            self._preprocess(text),
            add_special_tokens=True,
            max_length=self.MAX_LEN,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt',
        )

        with torch.no_grad():
            outputs = self.model(
                input_ids=encoding['input_ids'],
                attention_mask=encoding['attention_mask']
            )

        probs = torch.sigmoid(outputs.logits).cpu().numpy()[0]
        result = {
            emotion: float(prob) for emotion, prob in zip(self.CLASSES, probs)
        }
        return dict(sorted(result.items(), key=lambda pair: -pair[1]))

    # todo: implement
    @staticmethod
    def handle_prediction(raw_prediction, threshold=0.03):
        """
        Обработка сырого результата предсказания
        Args:
            raw_prediction (dict): Результат predict_raw()
            threshold (float): Порог для фильтрации
        Returns:
            dict: Отфильтрованные и отсортированные результаты
            list: Топ-3 эмоции
            dict: Суммы по категориям
        """
        # Фильтрация и сортировка
        filtered = {k: v for k, v in raw_prediction.items() if v > threshold}
        sorted_emotions = sorted(
            filtered.items(), key=lambda x: x[1], reverse=True)

        # Топ-3 эмоции
        top3 = sorted_emotions[:3]

        # Суммы по категориям
        categories = {
            'joy': sum(raw_prediction[e] for e in [
                'admiration', 'amusement', 'excitement', 'gratitude',
                'joy', 'love', 'optimism', 'pride', 'approval'
            ]),
            'anger': sum(raw_prediction[e] for e in [
                'anger', 'annoyance', 'disapproval', 'disgust'
            ]),
            'sadness': sum(raw_prediction[e] for e in [
                'disappointment', 'grief', 'remorse', 'sadness'
            ]),
            'surprise': sum(raw_prediction[e] for e in [
                'confusion', 'curiosity', 'realization', 'relief', 'surprise'
            ]),
            'fear': sum(raw_prediction[e] for e in [
                'embarrassment', 'fear', 'nervousness'
            ]),
            'neutral': raw_prediction['neutral']
        }

        return {
            'filtered': dict(sorted_emotions),
            'top3': top3,
            'categories': categories
        }

    def classify(self, text, *, grouping="a", neutral_decrease=0.1):

        prediction = self.predict_raw(text)
        selected_grouping = self.GROUPINGS[grouping]

        emotions = {}
        for emotion, classes in selected_grouping['emotions'].items():
            emotions[emotion] = sum(prediction[c] for c in classes)

        emotions = dict(sorted(emotions.items(), key=lambda pair: -pair[1]))

        sentiments = {}
        for sentiment, classes in selected_grouping['sentiments'].items():
            sentiments[sentiment] = sum(prediction[c] for c in classes)

        sentiments = dict(
            sorted(sentiments.items(), key=lambda pair: -pair[1]))

        result = {
            'emotion': next(iter(emotions.items()))[0],
            'sentiment': next(iter(sentiments.items()))[0],
            'raw_emotion': next(iter(prediction.items()))[0],
            'information': {
                'emotions': emotions,
                'sentiments': sentiments,
                'raw_emotions': prediction,
                'correction': [],
            }
        }

        sentiment_values = [pair[1] for pair in list(sentiments.items())]
        emotion_values = [pair[1] for pair in list(emotions.items())]

        if result['emotion'] == 'neutral' \
                and emotion_values[0] - emotion_values[1] <= neutral_decrease \
                and emotion_values[0] - emotion_values[2] > neutral_decrease * 2:
            result['emotion'] = list(emotions.items())[1][0]
            result['information']['correction'].append(
                f'neutral-decrease-emotion-{neutral_decrease:.3f}'
            )

        if result['sentiment'] == 'neutral' \
                and sentiment_values[0] - sentiment_values[1] <= neutral_decrease \
                and sentiment_values[0] - sentiment_values[2] > neutral_decrease * 2:
            result['sentiment'] = list(sentiments.items())[1][0]
            result['information']['correction'].append(
                f'neutral-decrease-sentiment-{neutral_decrease:.3f}'
            )
        elif result['sentiment'] != 'neutral' \
                and sentiment_values[0] - sentiment_values[1] <= neutral_decrease \
                and sentiment_values[1] - sentiment_values[2] <= neutral_decrease:
            result['sentiment'] = 'neutral'
            result['information']['correction'].append(
                f'sentiment-controversial-{neutral_decrease:.3f}'
            )

        if (result['sentiment'] == 'negative' and result['emotion'] == 'joy') \
                or (result['sentiment'] == 'positive' and result['emotion'] in ['anger', 'sadness', 'fear']):
            result['sentiment'] = 'neutral'
            result['information']['correction'].append(
                f'{result["sentiment"]}-{result["emotion"]}'
            )

        return result
