import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import time
import requests
import os

# Настройки
INPUT_FILES = [
    'D:\\Main\\Downloads\\emote-data\\goemotions_1.csv',
    'D:\\Main\\Downloads\\emote-data\\goemotions_2.csv'
]
OUTPUT_FILES = [
    '.\\train\\translated1.csv',
    '.\\train\\translated2.csv'
]
MAX_WORKERS = 10
CHUNK_SIZE = 200
SLEEP_TIME = 1


def translate_text(text):
    try:
        if pd.isna(text) or str(text).strip() == '':
            return {'translation': '', 'status': True, 'error': None}

        response = requests.post(
            "http://localhost:5006/translate",
            json={
                "q": str(text),
                "source": "en",
                "target": "ru",
                "format": "text",
                "api_key": ""
            },
            timeout=10
        )
        response.raise_for_status()
        result = response.json()["translatedText"]
        return {'translation': result, 'status': True, 'error': None}

    except requests.exceptions.RequestException as err:
        error_msg = f"Request error: {str(err)}"
        return {'translation': text, 'status': False, 'error': error_msg}
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        return {'translation': text, 'status': False, 'error': error_msg}


def process_chunk(chunk):
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


def analyze_file(file_path):
    df = pd.read_csv(file_path)
    total = len(df)
    failed = len(df[df['translation_status'] == False])

    print(f"\nАнализ файла {os.path.basename(file_path)}:")
    print(f"Всего записей: {total}")
    print(f"Не переведено: {failed} ({failed/total:.1%})")

    return total, failed


def retry_failed_translations(input_file, output_file):
    df = pd.read_csv(input_file)
    failed_df = df[df['translation_status'] == False].copy()

    if len(failed_df) == 0:
        print(f"Все записи в {os.path.basename(input_file)} уже переведены")
        return

    print(
        f"\nНачинаем повторный перевод {len(failed_df)} записей в {os.path.basename(input_file)}...")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        for idx, row in failed_df.iterrows():
            futures.append(executor.submit(translate_text, row['text']))

        results = []
        for future in tqdm(as_completed(futures), total=len(futures),
                           desc="Повторный перевод"):
            results.append(future.result())

    for i, (idx, row) in enumerate(failed_df.iterrows()):
        df.at[idx, 'translated_text'] = results[i]['translation']
        df.at[idx, 'translation_status'] = results[i]['status']
        df.at[idx, 'translation_error'] = results[i]['error']

    df.to_csv(output_file, index=False, encoding='utf-8')
    print(f"\nОбновленный файл сохранен: {output_file}")
    new_failed = len(df[df['translation_status'] == False])
    print(f"Осталось непереведенных: {new_failed} ({new_failed/len(df):.1%})")


def full_translation(input_file, output_file):
    print(f"\nНачало полного перевода {os.path.basename(input_file)}...")
    temp_file = output_file + '.tmp'

    chunks = pd.read_csv(input_file, chunksize=CHUNK_SIZE)
    first_chunk = True

    for chunk in tqdm(chunks, desc=f"Обработка {os.path.basename(input_file)}"):
        processed = process_chunk(chunk)
        processed.to_csv(
            temp_file,
            mode='a',
            header=first_chunk,
            index=False,
            encoding='utf-8'
        )
        first_chunk = False
        time.sleep(SLEEP_TIME)

    os.replace(temp_file, output_file)
    print(f"Перевод завершен. Результат в {output_file}")


def process_file_pair(input_file, output_file):
    if os.path.exists(output_file):
        total, failed = analyze_file(output_file)
        if failed > 0:
            retry_failed_translations(output_file, output_file)
    else:
        full_translation(input_file, output_file)
        analyze_file(output_file)


def main():
    for input_file, output_file in zip(INPUT_FILES, OUTPUT_FILES):
        print(f"\n{'='*50}")
        print(f"Обработка пары файлов:")
        print(f"Входной: {input_file}")
        print(f"Выходной: {output_file}")
        print(f"{'='*50}")

        process_file_pair(input_file, output_file)

        # Пауза между файлами для избежания перегрузки
        time.sleep(SLEEP_TIME * 3)


if __name__ == "__main__":
    main()
    print("\nОбработка всех файлов завершена!")
