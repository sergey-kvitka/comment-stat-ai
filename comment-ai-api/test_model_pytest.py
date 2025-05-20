import pytest
from emotion_classifier import EmotionClassifier

emotion_classifier = EmotionClassifier('./model/trained/model.pth')
grouping = 'a'


@pytest.mark.parametrize("sentiment_expect, emotion_expect, text", [
    ('positive', 'joy', 'Я тебя люблю'),
    ('negative', 'anger', 'Я тебя ненавижу'),
    ('negative', 'fear', 'Мне стало страшно'),
    ('negative', 'sadness', 'Это очень печально'),
    ('negative', 'sadness', 'Я расплакалась'),
    ('neutral', 'surprise', 'Не думал, что такое возможно. Очень интересно'),
    ('neutral', 'neutral', 'Земля вращается вокруг Солнца'),
])
def test_classification(sentiment_expect, emotion_expect, text):
    result = emotion_classifier.classify(text, grouping=grouping)
    print(f'sentiment={sentiment_expect}, emotion={emotion_expect}, text="{text}"')
    assert result['sentiment'] == sentiment_expect
    assert result['emotion'] == emotion_expect
    ...
