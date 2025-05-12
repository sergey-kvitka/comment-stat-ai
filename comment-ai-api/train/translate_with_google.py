import pandas as pd
from deep_translator import GoogleTranslator
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import time


INPUT_FILE = 'D:\\Main\\Downloads\\emote-data\\goemotions_1.csv'
OUTPUT_FILE = '.\\train\\translated1.csv'
MAX_WORKERS = 10
CHUNK_SIZE = 200
SLEEP_TIME = 2


def translate_text(text):
    try:
        if pd.isna(text) or str(text).strip() == '':
            return {'translation': '', 'status': True, 'error': None}
        translation = GoogleTranslator(
            source='auto', target='ru').translate(str(text))
        return {'translation': translation, 'status': True, 'error': None}
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        return {'translation': text, 'status': False, 'error': error_msg}


def process_chunk(chunk):
    """Обрабатывает чанк данных, добавляя переводы"""
    results = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(translate_text, text): idx
                   for idx, text in enumerate(chunk['text'])}

        temp_results = [None] * len(chunk)
        for future in tqdm(as_completed(futures), total=len(futures),
                           desc="Перевод чанка"):
            idx = futures[future]
            temp_results[idx] = future.result()

        results.extend(temp_results)

    chunk['translated_text'] = [r['translation'] for r in results]
    chunk['translation_status'] = [r['status'] for r in results]
    chunk['translation_error'] = [r['error'] for r in results]
    return chunk


def main(inp, outp):
    # Читаем файл по частям
    chunks = pd.read_csv(inp, chunksize=CHUNK_SIZE)
    first_chunk = True

    for chunk in tqdm(chunks, desc="Обработка файла"):
        processed = process_chunk(chunk)

        # Записываем в файл
        processed.to_csv(
            outp,
            mode='a',
            header=first_chunk,
            index=False,
            encoding='utf-8'
        )
        first_chunk = False
        time.sleep(SLEEP_TIME)


if __name__ == "__main__":
    print("Начало обработки...")
    main(INPUT_FILE, OUTPUT_FILE)
