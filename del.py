import json
import re

def clean_questions(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    answer_pattern = re.compile(r'[abcd]\)[^?]*?\?')
    page_num_pattern = re.compile(r'(\s+\d+)$')
    
    for question in questions:
        text = question['text']
        last_question_mark = text.rfind('?')
        
        if last_question_mark != -1:
            cleaned_text = text[:last_question_mark + 1].strip()
            question['text'] = cleaned_text
        
        cleaned_options = []
        for option in question['options']:
            cleaned_option = page_num_pattern.sub('', option).strip()
            cleaned_options.append(cleaned_option)
        
        question['options'] = cleaned_options
    
    output_path = file_path.replace('.json', '_cleaned.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    
    print(f"Очищенные данные сохранены в: {output_path}")
    print(f"Обработано вопросов: {len(questions)}")
    
    print("\nПримеры изменений:")
    for i in range(min(3, len(questions))):
        print(f"\nВопрос {questions[i]['number']}:")
        print(f"Текст: {questions[i]['text'][:100]}...")
        print(f"Опции: {questions[i]['options']}")

if __name__ == "__main__":
    input_file = "questions.json"
    
    try:
        clean_questions(input_file)
    except FileNotFoundError:
        print(f"Файл {input_file} не найден!")
    except json.JSONDecodeError:
        print(f"Ошибка чтения JSON файла {input_file}!")