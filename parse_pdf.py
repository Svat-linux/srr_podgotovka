import re
import json
import pdfplumber
import os
from typing import Dict, List
from dataclasses import dataclass
from pathlib import Path

@dataclass
class Question:
    number: int
    text: str
    options: List[str]
    images: List[str]
    category: str

class PDFParser:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        
    def extract_text_with_pages(self) -> List[Dict]:
        pages_text = []
        try:
            with pdfplumber.open(self.pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if text:
                        pages_text.append({
                            'page': page_num,
                            'text': text
                        })
                    else:
                        pages_text.append({
                            'page': page_num,
                            'text': ''
                        })
        except Exception as e:
            print(f"Ошибка при чтении PDF: {e}")
        return pages_text
    
    def parse_questions(self, pages_text: List[Dict]) -> List[Question]:
        questions = []
        
        questions_text = ""
        for page_data in pages_text:
            if 2 <= page_data['page'] <= 104:
                questions_text += f"=== PAGE {page_data['page']} ===\n{page_data['text']}\n\n"
        
        question_blocks = re.split(r'Вопрос № \d+', questions_text)
        
        for i in range(1, len(question_blocks)):
            block = question_blocks[i]
            
            if i > 0:
                start_idx = questions_text.find(block) - 20
                if start_idx < 0:
                    start_idx = 0
                prev_text = questions_text[start_idx:start_idx + 50]
                
                num_match = re.search(r'Вопрос № (\d+)', prev_text)
                if num_match:
                    q_num = int(num_match.group(1))
                else:
                    num_match = re.match(r'^\s*(\d+)(.*)', block, re.DOTALL)
                    if num_match:
                        q_num = int(num_match.group(1))
                        block = num_match.group(2)
                    else:
                        continue
            else:
                continue
            
            options = []
            option_pattern = r'([abcd])\)\s*(.+?)(?=\n[abcd]\)|=== PAGE|\n\n|\Z)'
            option_matches = re.findall(option_pattern, block, re.DOTALL)
            
            for opt_letter, opt_text in option_matches:
                opt_text = ' '.join(opt_text.strip().split())
                options.append(opt_text)
            
            if len(options) < 4:
                lines = block.split('\n')
                for line in lines:
                    line = line.strip()
                    if re.match(r'^[abcd]\)', line):
                        opt_text = line[2:].strip()
                        if opt_text and opt_text not in options:
                            options.append(opt_text)
            
            q_text = block
            q_text = re.sub(r'=== PAGE \d+ ===', '', q_text)
            
            for j, opt in enumerate(options):
                if j < len('abcd'):
                    letter = 'abcd'[j]
                    q_text = re.sub(f'{letter}\)\s*{re.escape(opt)}', '', q_text, flags=re.DOTALL)
            
            q_text = ' '.join(q_text.strip().split())
            q_text = re.sub(r'\s+', ' ', q_text)
            
            category = self.get_category(q_num)
            
            if len(options) < 4:
                options.extend([''] * (4 - len(options)))
            elif len(options) > 4:
                options = options[:4]
            
            question = Question(
                number=q_num,
                text=q_text[:500],
                options=options,
                images=[],
                category=category
            )
            
            questions.append(question)
        
        questions.sort(key=lambda x: x.number)
        
        unique_questions = []
        seen_numbers = set()
        for q in questions:
            if q.number not in seen_numbers:
                seen_numbers.add(q.number)
                unique_questions.append(q)
        
        return unique_questions
    
    def parse_answers(self, pages_text: List[Dict]) -> Dict[str, str]:
        answers = {}
        
        answers_text = ""
        for page_data in pages_text:
            if 105 <= page_data['page'] <= 106:
                answers_text += page_data['text'] + "\n"
        
        pattern = r'\[(\d+)\]\s*([a-dA-D])'
        matches = re.findall(pattern, answers_text)
        
        for num, ans in matches:
            answers[num] = ans.lower()
        
        if len(answers) < 426:
            lines = answers_text.split('\n')
            for line in lines:
                line = line.strip()
                line_matches = re.findall(pattern, line)
                for num, ans in line_matches:
                    if num not in answers:
                        answers[num] = ans.lower()
        
        return answers
    
    def get_category(self, q_num: int) -> str:
        if ((1 <= q_num <= 17) or
            (47 <= q_num <= 98) or
            (100 <= q_num <= 135) or
            (150 <= q_num <= 226) or
            (387 <= q_num <= 391) or
            (409 <= q_num <= 422)):
            return "4"
        
        if ((1 <= q_num <= 34) or
            (47 <= q_num <= 98) or
            (100 <= q_num <= 135) or
            (150 <= q_num <= 226) or
            (387 <= q_num <= 391) or
            (409 <= q_num <= 422)):
            return "3"
        
        if ((1 <= q_num <= 38) or
            (47 <= q_num <= 98) or
            (100 <= q_num <= 374) or
            (387 <= q_num <= 426)):
            return "2"
        
        return "1"
    
    def save_questions_json(self, questions: List[Question], output_path: str = "questions.json"):
        questions_dict = []
        for q in questions:
            q_dict = {
                "number": q.number,
                "text": q.text.strip(),
                "options": [opt.strip() for opt in q.options],
                "images": [],
                "category": q.category
            }
            questions_dict.append(q_dict)
        
        questions_dict.sort(key=lambda x: x['number'])
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(questions_dict, f, ensure_ascii=False, indent=2)
        
        return len(questions_dict)
    
    def save_answers_json(self, answers: Dict[str, str], output_path: str = "answers.json"):
        sorted_answers = {k: answers[k] for k in sorted(answers.keys(), key=int)}
        
        if len(sorted_answers) < 426:
            print(f"Заполняю недостающие ответы...")
            for i in range(1, 427):
                if str(i) not in sorted_answers:
                    sorted_answers[str(i)] = "a"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(sorted_answers, f, ensure_ascii=False, indent=2)
        
        return len(sorted_answers)
    
    def run(self):
        print("="*60)
        print("ПАРСЕР ВОПРОСОВ ДЛЯ РАДИОЛЮБИТЕЛЕЙ")
        print("="*60)
        
        print("\n1. Извлечение текста из PDF...")
        pages_text = self.extract_text_with_pages()
        print(f"   Извлечено страниц: {len(pages_text)}")
        
        print("\n2. Парсинг вопросов (страницы 2-104)...")
        questions = self.parse_questions(pages_text)
        print(f"   Найдено вопросов: {len(questions)}")
        
        print("\n3. Парсинг ответов (страницы 105-106)...")
        answers = self.parse_answers(pages_text)
        print(f"   Найдено ответов: {len(answers)}")
        
        print("\n4. Сохранение в JSON...")
        questions_count = self.save_questions_json(questions)
        answers_count = self.save_answers_json(answers)
        
        print("\n" + "="*60)
        print("РЕЗУЛЬТАТЫ:")
        print("="*60)
        
        categories = {}
        for q in questions:
            cat = q.category
            categories[cat] = categories.get(cat, 0) + 1
        
        print(f"\n Вопросы по категориям:")
        for cat in sorted(categories.keys()):
            print(f"   Категория {cat}: {categories[cat]} вопросов")
        
        question_numbers = set(str(q.number) for q in questions)
        answer_numbers = set(answers.keys())
        
        missing_answers = question_numbers - answer_numbers
        extra_answers = answer_numbers - question_numbers
        
        if missing_answers:
            print(f"\n Нет ответов для {len(missing_answers)} вопросов")
            if len(missing_answers) <= 20:
                missing_list = sorted(map(int, missing_answers))
                print(f"   Номера: {missing_list}")
        if extra_answers:
            print(f" Лишних ответов: {len(extra_answers)}")
        
        print(f"\n ФАЙЛЫ СОЗДАНЫ:")
        print(f"   questions.json ({questions_count} вопросов)")
        print(f"   answers.json ({answers_count} ответов)")
        
        if questions:
            print(f"\Пример вопроса #{questions[0].number}:")
            print(f"   Текст: {questions[0].text[:100]}...")
            print(f"   Варианты: {len([opt for opt in questions[0].options if opt.strip()])}")
            print(f"   Категория: {questions[0].category}")
            print(f"   Изображений: {len(questions[0].images)} (всегда 0, заполните вручную)")

def main():
    pdf_path = "source.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"Файл {pdf_path} не найден!")
        print("Поместите файл source.pdf в текущую папку.")
        return
    
    parser = PDFParser(pdf_path)
    parser.run()

if __name__ == "__main__":
    main()