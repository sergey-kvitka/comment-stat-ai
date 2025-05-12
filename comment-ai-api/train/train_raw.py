import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from transformers import AutoTokenizer, AutoModelForSequenceClassification, get_linear_schedule_with_warmup
from torch.optim import AdamW
from torch.utils.data import Dataset, DataLoader
import torch
import torch.nn as nn
from tqdm import tqdm
import re
import string


class Config:
    DATASET_PATHS = [
        "D:\\Учёба\\магистратура\\диплом\\datasets\\backup-fully-translated-11.05\\translated1.csv",
        "D:\\Учёба\\магистратура\\диплом\\datasets\\backup-fully-translated-11.05\\translated2.csv",
        "D:\\Учёба\\магистратура\\диплом\\datasets\\backup-fully-translated-11.05\\translated3.csv"
    ]

    MODEL_SAVE_PATH = "model_weights.pth"
    OPTIMIZER_SAVE_PATH = "optimizer.pth"
    SCHEDULER_SAVE_PATH = "scheduler.pth"

    MODEL_NAME = "bert-base-multilingual-uncased"
    MAX_LEN = 128
    BATCH_SIZE = 64
    EPOCHS = 1  # Можно увеличить при необходимости
    LEARNING_RATE = 2e-5
    NUM_WARMUP_STEPS = 0
    WEIGHT_DECAY = 0.01

    CLASSES = [
        'admiration', 'amusement', 'anger', 'annoyance', 'approval', 'caring', 'confusion',
        'curiosity', 'desire', 'disappointment', 'disapproval', 'disgust', 'embarrassment',
        'excitement', 'fear', 'gratitude', 'grief', 'joy', 'love', 'nervousness', 'optimism',
        'pride', 'realization', 'relief', 'remorse', 'sadness', 'surprise', 'neutral'
    ]

    EARLY_STOPPING_PATIENCE = 3


def preprocess_text(text):
    if not isinstance(text, str):
        return ""
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'<.*?>', '', text)
    text = text.translate(str.maketrans('', '', string.punctuation))
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.lower()
    return text


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
            return_tensors='pt',
        )

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.FloatTensor(label)
        }


def load_and_prepare_data(dataset_paths):
    dfs = []
    for path in dataset_paths:
        df = pd.read_csv(path)
        dfs.append(df)

    df = pd.concat(dfs, ignore_index=True)
    df = df[df['translated_text'].notna()]
    df['cleaned_text'] = df['translated_text'].apply(preprocess_text)

    labels = []
    for _, row in df.iterrows():
        if row.get('example_very_unclear', False) or row[Config.CLASSES[:-1]].sum() == 0:
            label = [0] * (len(Config.CLASSES)-1) + [1]
        else:
            label = row[Config.CLASSES[:-1]].tolist() + [0]

        labels.append(label)

    return df['cleaned_text'].tolist(), np.array(labels)


def create_data_loaders(texts, labels, tokenizer):
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42
    )

    train_dataset = EmotionDataset(
        train_texts, train_labels, tokenizer, Config.MAX_LEN)
    val_dataset = EmotionDataset(
        val_texts, val_labels, tokenizer, Config.MAX_LEN)

    train_loader = DataLoader(
        train_dataset, batch_size=Config.BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(
        val_dataset, batch_size=Config.BATCH_SIZE, shuffle=False)

    return train_loader, val_loader


def multi_label_accuracy(preds, labels):
    preds = torch.sigmoid(preds) > 0.5
    correct = (preds == labels.byte()).float()
    acc = correct.sum() / (labels.size(0) * labels.size(1))
    return acc


def train_model():
    device = torch.device("cpu")
    print(f"Using device: {device}")

    # Загрузка данных
    texts, labels = load_and_prepare_data(Config.DATASET_PATHS)

    # Инициализация токенизатора и модели
    tokenizer = AutoTokenizer.from_pretrained(Config.MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(
        Config.MODEL_NAME,
        num_labels=len(Config.CLASSES),
        problem_type="multi_label_classification"
    ).to(device)

    nn.init.xavier_uniform_(model.classifier.weight)
    nn.init.zeros_(model.classifier.bias)
    model.classifier.weight.requires_grad = True
    model.classifier.bias.requires_grad = True

    # Создание даталоадеров
    train_loader, val_loader = create_data_loaders(texts, labels, tokenizer)

    # Оптимизатор и шедулер
    optimizer = AdamW(
        model.parameters(),
        lr=Config.LEARNING_RATE,
        weight_decay=Config.WEIGHT_DECAY
    )

    total_steps = len(train_loader) * Config.EPOCHS
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=Config.NUM_WARMUP_STEPS,
        num_training_steps=total_steps
    )

    # Загрузка состояния для дообучения
    start_epoch = 0
    best_val_acc = 0.0
    epochs_without_improvement = 0

    if os.path.exists(Config.MODEL_SAVE_PATH):
        print("Loading saved model and optimizer states...")
        model.load_state_dict(torch.load(Config.MODEL_SAVE_PATH, map_location=device))
        optimizer.load_state_dict(torch.load(Config.OPTIMIZER_SAVE_PATH, map_location=device))
        scheduler.load_state_dict(torch.load(Config.SCHEDULER_SAVE_PATH, map_location=device))

        # Для продолжения обучения нужно загрузить дополнительные параметры
        checkpoint = torch.load(Config.MODEL_SAVE_PATH, map_location=device)
        start_epoch = checkpoint.get('epoch', 0) + 1
        best_val_acc = checkpoint.get('best_val_acc', 0.0)
        print(
            f"Resuming training from epoch {start_epoch}, best val acc: {best_val_acc:.4f}")

    # Обучение
    for epoch in range(start_epoch, start_epoch + Config.EPOCHS):
        print(f"\nEpoch {epoch + 1}/{start_epoch + Config.EPOCHS}")
        print("-" * 10)

        # Фаза обучения
        model.train()
        train_loss = 0.0
        train_acc = 0.0

        for batch in tqdm(train_loader, desc="Training"):
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)

            optimizer.zero_grad()

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels
            )

            loss = outputs.loss
            logits = outputs.logits

            loss.backward()
            optimizer.step()
            scheduler.step()

            train_loss += loss.item()
            train_acc += multi_label_accuracy(logits, labels).item()

        train_loss /= len(train_loader)
        train_acc /= len(train_loader)

        # Фаза валидации
        model.eval()
        val_loss = 0.0
        val_acc = 0.0

        with torch.no_grad():
            for batch in tqdm(val_loader, desc="Validation"):
                input_ids = batch['input_ids'].to(device)
                attention_mask = batch['attention_mask'].to(device)
                labels = batch['labels'].to(device)

                outputs = model(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    labels=labels
                )

                loss = outputs.loss
                logits = outputs.logits

                val_loss += loss.item()
                val_acc += multi_label_accuracy(logits, labels).item()

        val_loss /= len(val_loader)
        val_acc /= len(val_loader)

        print(f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.4f}")
        print(f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f}")

        # Сохранение модели и оптимизатора
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            epochs_without_improvement = 0

            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'best_val_acc': best_val_acc,
            }, Config.MODEL_SAVE_PATH)

            torch.save(optimizer.state_dict(), Config.OPTIMIZER_SAVE_PATH)
            torch.save(scheduler.state_dict(), Config.SCHEDULER_SAVE_PATH)

            print(f"Model saved with val acc: {best_val_acc:.4f}")
        else:
            epochs_without_improvement += 1
            print(f"No improvement for {epochs_without_improvement} epochs")

            # Ранняя остановка
            if epochs_without_improvement >= Config.EARLY_STOPPING_PATIENCE:
                print("Early stopping triggered")
                break

    print(f"\nTraining complete. Best val acc: {best_val_acc:.4f}")


if __name__ == "__main__":
    train_model()
