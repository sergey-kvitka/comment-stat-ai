import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import re
import string


class EmotionClassifier:
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
        return {emotion: float(prob) for emotion, prob in zip(self.CLASSES, probs)}

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
