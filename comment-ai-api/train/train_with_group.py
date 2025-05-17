import os
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import BertTokenizer, BertModel, get_linear_schedule_with_warmup
from torch.optim import AdamW
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from tqdm import tqdm
import re
import string
from collections import defaultdict

DEVICE = 'cpu'

# Настройки
BATCH_SIZE = 64
MAX_LEN = 96
EPOCHS = 2
LEARNING_RATE = 3e-5

MODEL_PATH = 'emotion_model.pth'
OPTIMIZER_PATH = 'optimizer_state.pth'
SCHEDULER_PATH = 'scheduler_state.pth'

# Многоязычная модель для русского
TOKENIZER_NAME = 'bert-base-multilingual-cased'
MODEL_NAME = 'bert-base-multilingual-cased'

# Маппинг эмоций
EMOTION_MAPPING = {
    'admiration': 'joy',
    'amusement': 'joy',
    'anger': 'anger',
    'annoyance': 'anger',
    'approval': 'anger',
    'caring': None,
    'confusion': 'surprise',
    'curiosity': None,
    'desire': None,
    'disappointment': 'sadness',
    'disapproval': None,
    'disgust': None,
    'embarrassment': 'sadness',
    'excitement': 'joy',
    'fear': 'fear',
    'gratitude': 'joy',
    'grief': 'sadness',
    'joy': 'joy',
    'love': 'joy',
    'nervousness': None,
    'optimism': 'joy',
    'pride': 'joy',
    'realization': 'surprise',
    'relief': 'surprise',
    'remorse': 'sadness',
    'sadness': 'sadness',
    'surprise': 'surprise',
    'neutral': 'neutral'
}

# Фильтруем только нужные эмоции
TARGET_EMOTIONS = ['joy', 'anger', 'fear', 'surprise', 'sadness', 'neutral']
EMOTION_TO_IDX = {emotion: idx for idx, emotion in enumerate(TARGET_EMOTIONS)}
IDX_TO_EMOTION = {idx: emotion for idx, emotion in enumerate(TARGET_EMOTIONS)}

# Пути к датасетам
DATASET_PATHS = [
    '.\\train\\translated1.csv',
    '.\\train\\translated2.csv',
    '.\\train\\translated3.csv',
    # '.\\train\\testtransl.csv',
]

# Токенизатор
tokenizer = BertTokenizer.from_pretrained(TOKENIZER_NAME)


class EmotionDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]

        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=self.max_len,
            return_token_type_ids=False,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': torch.tensor(label, dtype=torch.long)
        }


class EmotionClassifier(nn.Module):
    def __init__(self, n_classes):
        super(EmotionClassifier, self).__init__()
        self.bert = BertModel.from_pretrained(MODEL_NAME)
        self.drop = nn.Dropout(p=0.3)
        self.out = nn.Linear(self.bert.config.hidden_size, n_classes)

    def forward(self, input_ids, attention_mask):
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        pooled_output = outputs.pooler_output
        output = self.drop(pooled_output)
        return self.out(output)


def preprocess_text(text):
    # Удаление URL
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    # Удаление упоминаний пользователей
    text = re.sub(r'@\w+', '', text)
    # Удаление HTML тегов
    text = re.sub(r'<.*?>', '', text)
    # Удаление пунктуации
    text = text.translate(str.maketrans('', '', string.punctuation))
    # Удаление лишних пробелов
    text = re.sub(r'\s+', ' ', text).strip()
    # Приведение к нижнему регистру
    text = text.lower()
    return text


def process_emotion_row(row):
    emotion_counts = defaultdict(int)

    for col, target in EMOTION_MAPPING.items():
        if target is None or row[col] != 1:
            continue
        emotion_counts[target] += 1

    result = None  # Будут пропущены случаи с конфликтом эмоций
    if not emotion_counts:
        result = 'neutral'
    elif len(emotion_counts) == 1:
        result = list(emotion_counts.keys())[0]
    return result


def load_data_in_batches(dataset_paths, batch_size=10000):
    """Генератор для пакетной загрузки данных"""
    for path in dataset_paths:
        if not os.path.exists(path):
            continue

        # Читаем файл порциями
        for chunk in pd.read_csv(path, chunksize=batch_size):
            yield chunk


def load_and_preprocess_data(dataset_paths):
    all_texts = []
    all_emotions = []

    # Обрабатываем данные пакетами для экономии памяти
    for batch in load_data_in_batches(dataset_paths):
        # Фильтрация данных
        batch = batch[batch['example_very_unclear'] == False]
        batch = batch[batch['translated_text'].notna() & (
            batch['translated_text'] != '')]

        if len(batch) == 0:
            continue

        # Определение эмоций
        batch['emotion'] = batch.apply(process_emotion_row, axis=1)
        batch = batch[batch['emotion'].notna()]

        if len(batch) == 0:
            continue

        # Предобработка текста
        batch['processed_text'] = batch['translated_text'].apply(
            preprocess_text)

        # Собираем результаты
        all_texts.extend(batch['processed_text'].tolist())
        all_emotions.extend(batch['emotion'].tolist())

    if not all_texts:
        raise ValueError("No valid data found after preprocessing")

    return all_texts, [EMOTION_TO_IDX[e] for e in all_emotions]


def main():
    # Загрузка и предобработка данных
    print("Loading and preprocessing data...")
    texts, labels = load_and_preprocess_data(DATASET_PATHS)

    # Разделение на train и test
    train_texts, test_texts, train_labels, test_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )

    # Создание датасетов и даталоадеров
    train_dataset = EmotionDataset(
        train_texts, train_labels, tokenizer, MAX_LEN)
    test_dataset = EmotionDataset(test_texts, test_labels, tokenizer, MAX_LEN)

    train_loader = DataLoader(
        train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE)

    # Инициализация модели
    model = EmotionClassifier(len(TARGET_EMOTIONS)).to(DEVICE)

    # Подготовка к дообучению
    start_epoch = 0
    best_accuracy = 0
    total_steps = len(train_loader) * EPOCHS

    # Инициализация оптимизатора и шедулера
    optimizer = AdamW(model.parameters(), lr=LEARNING_RATE)
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=0,
        num_training_steps=total_steps
    )

    # Загрузка полного состояния (если существует)
    if os.path.exists(MODEL_PATH):
        print("Loading existing model and training state...")
        checkpoint = torch.load(MODEL_PATH)

        # Проверяем, старый это формат (только веса) или новый (полный checkpoint)
        if isinstance(checkpoint, dict) and 'model_state' in checkpoint:
            # Новый формат: загружаем всё
            model.load_state_dict(checkpoint['model_state'])
            start_epoch = checkpoint.get('epoch', 0)
            best_accuracy = checkpoint.get('best_accuracy', 0)
        else:
            # Старый формат: загружаем только веса модели
            model.load_state_dict(checkpoint)
            start_epoch = 0
            best_accuracy = 0
            print("Loaded model weights (old format). Starting from epoch 0.")

        # Загрузка оптимизатора и шедулера (если есть)
        if os.path.exists(OPTIMIZER_PATH):
            optimizer.load_state_dict(torch.load(
                OPTIMIZER_PATH, map_location=DEVICE))
        if os.path.exists(SCHEDULER_PATH):
            scheduler.load_state_dict(torch.load(
                SCHEDULER_PATH, map_location=DEVICE))

        print(
            f"Resuming training from epoch {start_epoch + 1}, best accuracy: {best_accuracy:.4f}")

    # Обучение модели
    for epoch in range(start_epoch, EPOCHS):
        print(f'\nEpoch {epoch + 1}/{EPOCHS}')
        print('-' * 10)

        # Обучение
        model.train()
        train_loss = 0
        for batch in tqdm(train_loader, desc="Training"):
            # Перенос данных на GPU
            input_ids = batch['input_ids'].to(DEVICE, non_blocking=True)
            attention_mask = batch['attention_mask'].to(
                DEVICE, non_blocking=True)
            labels = batch['label'].to(DEVICE, non_blocking=True)

            # Обнуление градиентов
            optimizer.zero_grad(set_to_none=True)

            # Прямой проход
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            loss = nn.CrossEntropyLoss()(outputs, labels)

            # Обратный проход
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()

            train_loss += loss.item()

        # Валидация
        model.eval()
        test_preds, test_true = [], []
        with torch.no_grad():
            for batch in tqdm(test_loader, desc="Evaluating"):
                input_ids = batch['input_ids'].to(DEVICE, non_blocking=True)
                attention_mask = batch['attention_mask'].to(
                    DEVICE, non_blocking=True)
                labels = batch['label'].to(DEVICE, non_blocking=True)

                outputs = model(input_ids=input_ids,
                                attention_mask=attention_mask)
                preds = torch.argmax(outputs, dim=1)

                test_preds.extend(preds.cpu().numpy())
                test_true.extend(labels.cpu().numpy())

        # Расчет метрик
        accuracy = np.mean(np.array(test_preds) == np.array(test_true))
        print(
            f"Train loss: {train_loss/len(train_loader):.4f} | Test accuracy: {accuracy:.4f}")

        # Сохранение лучшей модели и полного состояния
        if accuracy > best_accuracy:
            best_accuracy = accuracy
            # Сохраняем полное состояние
            torch.save({
                'model_state': model.state_dict(),
                'epoch': epoch + 1,  # Сохраняем следующую эпоху для продолжения
                'best_accuracy': best_accuracy,
            }, MODEL_PATH)
            # torch.save(model.state_dict(), MODEL_PATH) # simplified save

            # Отдельно сохраняем оптимизатор и шедулер
            torch.save(optimizer.state_dict(), OPTIMIZER_PATH)
            torch.save(scheduler.state_dict(), SCHEDULER_PATH)
            print(
                f"Model saved at epoch {epoch+1} with accuracy {accuracy:.4f}")

    # Финальная оценка
    unique_labels = np.unique(test_true + test_preds)
    print("\nClassification Report:")
    print(classification_report(
        test_true,
        test_preds,
        labels=unique_labels,
        target_names=[IDX_TO_EMOTION[idx] for idx in unique_labels],
        zero_division=0
    ))


if __name__ == '__main__':
    main()
