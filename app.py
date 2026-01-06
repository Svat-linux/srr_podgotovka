from flask import Flask, render_template, jsonify, request, send_from_directory
import json
import random

app = Flask(__name__)

CATEGORIES = {
    '4': {
        'name': '4-я категория (начальная)', 
        'ranges': [(1, 17), (47, 98), (100, 135), (150, 226), (387, 391), (409, 422)],
        'exam_questions': 20,
        'pass_score': 15
    },
    '3': {
        'name': '3-я категория (новичок)', 
        'ranges': [(1, 34), (47, 98), (100, 135), (150, 226), (387, 391), (409, 422)],
        'exam_questions': 25,
        'pass_score': 20
    },
    '2': {
        'name': '2-я категория (основная)', 
        'ranges': [(1, 38), (47, 98), (100, 374), (387, 426)],
        'exam_questions': 30,
        'pass_score': 25
    },
    '1': {
        'name': '1-я категоция (высшая)', 
        'ranges': [(1, 426)],
        'exam_questions': 45,
        'pass_score': 40
    }
}

THEMES = {
    '1': {'name': 'Международные правила, нормы и терминология', 'ranges': [(1, 46)]},
    '2': {'name': 'Нормативные правовые акты РФ', 'ranges': [(47, 99)]},
    '3': {'name': 'Правила и процедуры установления радиосвязи', 'ranges': [(100, 129)]},
    '4': {'name': 'Виды радиосвязи', 'ranges': [(130, 149)]},
    '5': {'name': 'Теория радиосистем', 'ranges': [(150, 386)]},
    '6': {'name': 'Параметры и характеристики радиосистем', 'ranges': [(387, 408)]},
    '7': {'name': 'Безопасность при эксплуатации РЭС', 'ranges': [(409, 419)]},
    '8': {'name': 'Электромагнитная совместимость', 'ranges': [(420, 426)]}
}

class QuestionManager:
    def __init__(self):
        self.questions = self.load_questions()
        self.answers = self.load_answers()
    
    def load_questions(self):
        with open('data/questions.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def load_answers(self):
        with open('data/answers.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def get_questions_for_category_and_theme(self, category_id, theme_id=None, shuffle_options=False):
        if theme_id:
            ranges = THEMES[theme_id]['ranges']
        else:
            ranges = CATEGORIES[category_id]['ranges']
        
        category_questions = []
        
        for q in self.questions:
            q_num = q['number']
            in_theme_range = False
            in_category_range = False
            
            for theme_start, theme_end in ranges:
                if theme_start <= q_num <= theme_end:
                    in_theme_range = True
                    break
            
            for cat_start, cat_end in CATEGORIES[category_id]['ranges']:
                if cat_start <= q_num <= cat_end:
                    in_category_range = True
                    break
            
            if in_theme_range and in_category_range:
                question_copy = q.copy()
                
                if shuffle_options:
                    options = question_copy['options'].copy()
                    correct_answer = self.answers.get(str(q_num), 'a')
                    
                    original_indices = list(range(len(options)))
                    random.shuffle(original_indices)
                    
                    shuffled_options = [options[i] for i in original_indices]
                    
                    if correct_answer in ['a', 'b', 'c', 'd']:
                        original_index = ord(correct_answer) - ord('a')
                        new_index = original_indices.index(original_index)
                        question_copy['correct_answer'] = chr(ord('a') + new_index)
                    else:
                        question_copy['correct_answer'] = correct_answer
                    
                    question_copy['options'] = shuffled_options
                else:
                    question_copy['correct_answer'] = self.answers.get(str(q_num), 'a')
                
                category_questions.append(question_copy)
        
        return sorted(category_questions, key=lambda x: x['number'])
    
    def get_exam_questions(self, category_id, shuffle_options=False):
        all_category_questions = self.get_questions_for_category_and_theme(category_id, shuffle_options=shuffle_options)
        
        if len(all_category_questions) <= CATEGORIES[category_id]['exam_questions']:
            return all_category_questions
        else:
            return random.sample(all_category_questions, CATEGORIES[category_id]['exam_questions'])

manager = QuestionManager()

@app.route('/')
def index():
    return render_template('index.html', categories=CATEGORIES, themes=THEMES)

@app.route('/api/questions/<category>')
def get_questions(category):
    theme = request.args.get('theme', None)
    shuffle = request.args.get('shuffle', 'false').lower() == 'true'
    exam = request.args.get('exam', 'false').lower() == 'true'
    
    if exam:
        questions = manager.get_exam_questions(category, shuffle_options=shuffle)
        theme_name = "Экзамен"
    elif theme:
        questions = manager.get_questions_for_category_and_theme(category, theme, shuffle_options=shuffle)
        theme_name = THEMES[theme]['name']
    else:
        questions = manager.get_questions_for_category_and_theme(category, shuffle_options=shuffle)
        theme_name = "Все темы"
    
    result = []
    for q in questions:
        result.append({
            'number': q['number'],
            'text': q['text'],
            'options': q['options'],
            'images': q.get('images', []),
            'correct_answer': q.get('correct_answer', 'a'),
            'category': q.get('category', category)
        })
    
    return jsonify({
        'questions': result,
        'category_name': CATEGORIES[category]['name'],
        'theme_name': theme_name,
        'total': len(result),
        'exam_mode': exam,
        'pass_score': CATEGORIES[category]['pass_score'] if exam else None
    })

@app.route('/api/check_answer', methods=['POST'])
def check_answer():
    data = request.json
    question_num = data.get('number')
    user_answer = data.get('answer')
    
    correct_answer = manager.answers.get(str(question_num), 'a')
    is_correct = (user_answer == correct_answer)
    
    return jsonify({
        'is_correct': is_correct,
        'correct_answer': correct_answer
    })

@app.route('/static/images/<path:filename>')
def serve_image(filename):
    return send_from_directory('static/images', filename)

if __name__ == '__main__':
    app.run(debug=True, port=8080, host='192.168.0.219')