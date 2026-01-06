class LearningApp {
    constructor() {
        this.currentCategory = null;
        this.currentTheme = 'all';
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = new Map();
        this.shuffleAnswers = false;
        this.shuffleQuestions = false;
        this.examMode = false;
        this.originalOrder = [];
        this.examStartTime = null;
        this.examTimer = null;
        
        this.initElements();
        this.bindEvents();
    }
    
    initElements() {
        this.categoryButtons = document.querySelectorAll('.category-btn');
        this.themeButtons = document.querySelectorAll('.theme-btn');
        this.examToggle = document.getElementById('examToggle');
        this.aboutBtn = document.getElementById('aboutBtn');
        
        this.progressText = document.getElementById('progressText');
        this.statsElement = document.getElementById('stats');
        this.progressGrid = document.getElementById('progressGrid');
        this.questionNumber = document.getElementById('questionNumber');
        this.questionCategory = document.getElementById('questionCategory');
        this.questionText = document.getElementById('questionText');
        this.imagesContainer = document.getElementById('imagesContainer');
        this.optionsContainer = document.getElementById('optionsContainer');
        this.resultPanel = document.getElementById('resultPanel');
        
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.showAnswerBtn = document.getElementById('showAnswerBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.shuffleAnswersToggle = document.getElementById('shuffleAnswersToggle');
        this.shuffleQuestionsToggle = document.getElementById('shuffleQuestionsToggle');
        this.finishExamBtn = document.getElementById('finishExamBtn');
        
        this.totalQuestionsElement = document.getElementById('totalQuestions');
        this.correctCountElement = document.getElementById('correctCount');
        this.percentageElement = document.getElementById('percentage');
        this.timerElement = document.getElementById('timer');
        
        this.createModal();
        this.createAboutModal();
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <span class="modal-close">&times;</span>
            <img class="modal-content" id="modalImage">
        `;
        document.body.appendChild(this.modal);
        
        this.modalImage = this.modal.querySelector('#modalImage');
        this.modal.querySelector('.modal-close').addEventListener('click', () => {
            this.modal.style.display = 'none';
        });
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.style.display = 'none';
            }
        });
    }
    
    createAboutModal() {
        this.aboutModal = document.createElement('div');
        this.aboutModal.className = 'modal';
        this.aboutModal.innerHTML = `
            <div class="about-modal">
                <span class="modal-close">&times;</span>
                <h2><i class="fas fa-info-circle"></i> О проекте</h2>
                <div class="about-content">
                    <div class="about-section">
                        <h3><i class="fas fa-user"></i> Автор</h3>
                        <p><strong>Семенов Святослав</strong></p>
                        <p><i class="fab fa-telegram"></i> @LinusPingvinus</p>
                    </div>
                    <div class="about-section">
                        <h3><i class="fab fa-github"></i> GitHub</h3>
                        <p>Web версия: <a href="#" target="_blank">Ссылка будет добавлена</a></p>
                        <p>Android версия: <a href="#" target="_blank">Ссылка будет добавлена</a></p>
                    </div>
                    <div class="about-section">
                        <h3><i class="fas fa-book"></i> О проекте</h3>
                        <p>Приложение для подготовки к экзаменам радиолюбителя по всем категориям.</p>
                        <p>Включает режим обучения и экзамена с таймером.</p>
                    </div>
                    <div class="about-section">
                        <h3><i class="fas fa-code"></i> Технологии</h3>
                        <p>Backend: Python Flask</p>
                        <p>Frontend: HTML, CSS, JavaScript</p>
                        <p>Android: Kotlin, Android Studio</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.aboutModal);
        
        this.aboutModal.querySelector('.modal-close').addEventListener('click', () => {
            this.aboutModal.style.display = 'none';
        });
        
        this.aboutModal.addEventListener('click', (e) => {
            if (e.target === this.aboutModal) {
                this.aboutModal.style.display = 'none';
            }
        });
    }
    
    bindEvents() {
        this.categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.selectCategory(category);
            });
        });
        
        this.themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.selectTheme(theme);
            });
        });
        
        this.examToggle.addEventListener('change', () => {
            this.examMode = this.examToggle.checked;
            if (this.currentCategory) {
                this.loadQuestions();
            }
        });
        
        this.aboutBtn.addEventListener('click', () => {
            this.showAboutModal();
        });
        
        this.shuffleAnswersToggle.addEventListener('change', () => {
            this.shuffleAnswers = this.shuffleAnswersToggle.checked;
            if (this.currentCategory) {
                this.loadQuestions();
            }
        });
        
        this.shuffleQuestionsToggle.addEventListener('change', () => {
            this.shuffleQuestions = this.shuffleQuestionsToggle.checked;
            if (this.currentCategory && this.questions.length > 0 && !this.examMode) {
                this.shuffleQuestionsList();
            }
        });
        
        this.prevBtn.addEventListener('click', () => this.prevQuestion());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.showAnswerBtn.addEventListener('click', () => this.showAnswer());
        this.restartBtn.addEventListener('click', () => this.restart());
        this.finishExamBtn.addEventListener('click', () => this.finishExam());
        
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '4') {
                const optionIndex = parseInt(e.key) - 1;
                if (optionIndex < this.optionsContainer.children.length) {
                    this.selectOption(optionIndex);
                }
            } else if (e.key === 'ArrowLeft') {
                this.prevQuestion();
            } else if (e.key === 'ArrowRight') {
                this.nextQuestion();
            } else if (e.key === ' ') {
                e.preventDefault();
                this.showAnswer();
            }
        });
    }
    
    async selectCategory(category) {
        this.currentCategory = category;
        this.currentQuestionIndex = 0;
        this.userAnswers.clear();
        
        this.categoryButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        await this.loadQuestions();
        this.updateStats();
    }
    
    async selectTheme(theme) {
        this.currentTheme = theme;
        this.currentQuestionIndex = 0;
        this.userAnswers.clear();
        
        this.themeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        
        if (this.currentCategory) {
            await this.loadQuestions();
            this.updateStats();
        }
    }
    
    async loadQuestions() {
        try {
            let url = `/api/questions/${this.currentCategory}?shuffle=${this.shuffleAnswers}`;
            if (this.examMode) {
                url += '&exam=true';
                this.startExamTimer();
                this.finishExamBtn.style.display = 'block';
                this.showAnswerBtn.disabled = true;
                this.timerElement.style.display = 'block';
            } else {
                url += this.currentTheme !== 'all' ? `&theme=${this.currentTheme}` : '';
                this.finishExamBtn.style.display = 'none';
                this.showAnswerBtn.disabled = false;
                this.timerElement.style.display = 'none';
                if (this.examTimer) {
                    clearInterval(this.examTimer);
                    this.examTimer = null;
                }
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            this.questions = data.questions;
            this.originalOrder = [...this.questions];
            this.passScore = data.pass_score;
            
            if (this.shuffleQuestions && !this.examMode) {
                this.shuffleQuestionsList();
            } else {
                this.displayQuestion(0);
            }
            
            this.updateProgressGrid();
            this.updateFooterStats();
            
            let infoText = data.category_name;
            if (this.examMode) {
                infoText += ' - Экзамен';
            } else if (data.theme_name !== "Все темы") {
                infoText += ` - ${data.theme_name}`;
            }
            this.progressText.textContent = infoText;
            this.statsElement.textContent = `1/${data.total}`;
            
        } catch (error) {
            console.error('Ошибка загрузки вопросов:', error);
            this.questionText.textContent = 'Ошибка загрузки вопросов. Попробуйте еще раз.';
        }
    }
    
    startExamTimer() {
        if (this.examTimer) {
            clearInterval(this.examTimer);
        }
        
        this.examStartTime = new Date();
        
        this.examTimer = setInterval(() => {
            if (this.examMode) {
                const now = new Date();
                const diff = now - this.examStartTime;
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                
                this.timerElement.textContent = `Время: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    shuffleQuestionsList() {
        if (!this.questions.length) return;
        
        const currentQuestionId = this.questions[this.currentQuestionIndex]?.number;
        
        const shuffled = [...this.questions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        this.questions = shuffled;
        
        let newIndex = 0;
        if (currentQuestionId) {
            newIndex = this.questions.findIndex(q => q.number === currentQuestionId);
            if (newIndex === -1) newIndex = 0;
        }
        
        this.currentQuestionIndex = newIndex;
        this.displayQuestion(newIndex);
        this.updateProgressGrid();
    }
    
    displayQuestion(index) {
        if (index < 0 || index >= this.questions.length) return;
        
        this.currentQuestionIndex = index;
        const question = this.questions[index];
        
        this.questionNumber.textContent = `Вопрос #${question.number}`;
        this.questionCategory.textContent = `Категория: ${question.category}`;
        
        this.questionText.textContent = question.text;
        
        this.displayImages(question.images);
        
        this.displayOptions(question);
        
        this.prevBtn.disabled = index === 0;
        this.nextBtn.disabled = index === this.questions.length - 1;
        
        this.statsElement.textContent = `${index + 1}/${this.questions.length}`;
        
        this.resultPanel.style.display = 'none';
        
        this.updateActiveProgressItem();
    }
    
    displayImages(imagePaths) {
        this.imagesContainer.innerHTML = '';
        
        if (!imagePaths || imagePaths.length === 0) {
            this.imagesContainer.style.display = 'none';
            return;
        }
        
        this.imagesContainer.style.display = 'flex';
        
        imagePaths.forEach(path => {
            const img = document.createElement('img');
            img.src = path;
            img.className = 'question-image';
            img.alt = 'Иллюстрация к вопросу';
            img.addEventListener('click', () => this.openImageModal(path));
            this.imagesContainer.appendChild(img);
        });
    }
    
    openImageModal(src) {
        this.modalImage.src = src;
        this.modal.style.display = 'flex';
    }
    
    showAboutModal() {
        this.aboutModal.style.display = 'flex';
    }
    
    displayOptions(question) {
        this.optionsContainer.innerHTML = '';
        
        const userAnswer = this.userAnswers.get(question.number);
        const letters = ['A', 'B', 'C', 'D'];
        
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.innerHTML = `
                <span class="option-label">${letters[index]}</span>
                <span class="option-text">${option}</span>
            `;
            
            if (userAnswer && !this.examMode) {
                const letter = String.fromCharCode(97 + index);
                const isCorrect = letter === question.correct_answer;
                const isSelected = userAnswer === letter;
                
                if (isSelected) {
                    button.classList.add('selected');
                    button.classList.add(isCorrect ? 'correct' : 'wrong');
                } else if (isCorrect && userAnswer) {
                    button.classList.add('correct');
                }
            } else if (userAnswer && this.examMode) {
                const letter = String.fromCharCode(97 + index);
                const isSelected = userAnswer === letter;
                
                if (isSelected) {
                    button.classList.add('selected');
                }
            }
            
            button.addEventListener('click', () => this.selectOption(index));
            this.optionsContainer.appendChild(button);
        });
    }
    
    selectOption(optionIndex) {
        const question = this.questions[this.currentQuestionIndex];
        const selectedLetter = String.fromCharCode(97 + optionIndex);
        
        this.userAnswers.set(question.number, selectedLetter);
        
        this.displayOptions(question);
        
        this.updateStats();
        
        if (this.examMode) {
            this.updateProgressItem(question.number, false);
            
            if (this.currentQuestionIndex < this.questions.length - 1) {
                setTimeout(() => {
                    this.nextQuestion();
                }, 300);
            } else {
                setTimeout(() => {
                    this.finishExam();
                }, 300);
            }
        } else {
            const isCorrect = selectedLetter === question.correct_answer;
            this.updateProgressItem(question.number, isCorrect);
            
            if (!isCorrect) {
                setTimeout(() => {
                    this.showAnswer();
                }, 500);
            }
            
            setTimeout(() => {
                if (this.currentQuestionIndex < this.questions.length - 1) {
                    this.nextQuestion();
                }
            }, 300);
        }
    }
    
    showAnswer() {
        const question = this.questions[this.currentQuestionIndex];
        const correctAnswer = question.correct_answer;
        const correctIndex = correctAnswer.charCodeAt(0) - 97;
        
        if (correctIndex >= 0 && correctIndex < 4) {
            this.resultPanel.innerHTML = `
                <strong><i class="fas fa-lightbulb"></i> Правильный ответ:</strong> ${question.options[correctIndex]}
            `;
            this.resultPanel.style.display = 'block';
        }
    }
    
    finishExam() {
        if (!this.examMode) return;
        
        let correct = 0;
        let total = this.questions.length;
        
        this.userAnswers.forEach((answer, questionNumber) => {
            const question = this.questions.find(q => q.number === questionNumber);
            if (question && answer === question.correct_answer) {
                correct++;
            }
        });
        
        const percentage = Math.round((correct / total) * 100);
        const passed = correct >= this.passScore;
        
        const now = new Date();
        const timeDiff = now - this.examStartTime;
        const minutes = Math.floor(timeDiff / 60000);
        const seconds = Math.floor((timeDiff % 60000) / 1000);
        
        this.resultPanel.innerHTML = `
            <h3><i class="fas fa-graduation-cap"></i> Результаты экзамена</h3>
            <p><strong>Категория:</strong> ${this.currentCategory}</p>
            <p><strong>Вопросов:</strong> ${total}</p>
            <p><strong>Правильных ответов:</strong> ${correct} из ${total}</p>
            <p><strong>Процент правильных:</strong> ${percentage}%</p>
            <p><strong>Проходной балл:</strong> ${this.passScore} из ${total}</p>
            <p><strong>Время:</strong> ${minutes}:${seconds.toString().padStart(2, '0')}</p>
            <p><strong>Результат:</strong> 
                <span style="color: ${passed ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
                    ${passed ? 'СДАЛ' : 'НЕ СДАЛ'}
                </span>
            </p>
            ${!passed ? `<p style="color: #e74c3c; margin-top: 10px;">
                <i class="fas fa-exclamation-triangle"></i> 
                Необходимо правильно ответить как минимум на ${this.passScore} вопросов.
            </p>` : ''}
            <button id="reviewExamBtn" class="control-btn" style="margin-top: 15px; width: 100%;">
                <i class="fas fa-search"></i> Просмотреть ответы
            </button>
        `;
        this.resultPanel.style.display = 'block';
        
        document.getElementById('reviewExamBtn').addEventListener('click', () => {
            this.examMode = false;
            this.examToggle.checked = false;
            this.showAnswerBtn.disabled = false;
            this.finishExamBtn.style.display = 'none';
            this.timerElement.style.display = 'none';
            this.displayQuestion(0);
            this.updateProgressGrid();
        });
        
        if (this.examTimer) {
            clearInterval(this.examTimer);
            this.examTimer = null;
        }
    }
    
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.displayQuestion(this.currentQuestionIndex - 1);
        }
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.displayQuestion(this.currentQuestionIndex + 1);
        } else if (this.examMode) {
            this.finishExam();
        }
    }
    
    updateProgressGrid() {
        this.progressGrid.innerHTML = '';
        
        this.questions.forEach((q, index) => {
            const item = document.createElement('div');
            item.className = 'progress-item not-answered';
            item.textContent = q.number;
            item.title = `Вопрос ${q.number}`;
            
            if (this.userAnswers.has(q.number)) {
                const userAnswer = this.userAnswers.get(q.number);
                if (this.examMode) {
                    item.classList.remove('not-answered');
                    item.classList.add('answered');
                } else {
                    const isCorrect = userAnswer === q.correct_answer;
                    item.classList.remove('not-answered');
                    item.classList.add(isCorrect ? 'correct' : 'wrong');
                }
            }
            
            if (index === this.currentQuestionIndex) {
                item.classList.add('active');
            }
            
            item.addEventListener('click', () => {
                this.displayQuestion(index);
            });
            
            this.progressGrid.appendChild(item);
        });
    }
    
    updateProgressItem(questionNumber, isCorrect) {
        const items = this.progressGrid.children;
        for (let item of items) {
            if (parseInt(item.textContent) === questionNumber) {
                item.className = 'progress-item';
                if (this.examMode) {
                    item.classList.add('answered');
                } else {
                    item.classList.add(isCorrect ? 'correct' : 'wrong');
                }
                if (parseInt(item.textContent) === this.questions[this.currentQuestionIndex].number) {
                    item.classList.add('active');
                }
                break;
            }
        }
    }
    
    updateActiveProgressItem() {
        const items = this.progressGrid.children;
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove('active');
            if (i === this.currentQuestionIndex) {
                items[i].classList.add('active');
            }
        }
    }
    
    updateStats() {
        let correct = 0;
        let answered = 0;
        
        this.userAnswers.forEach((answer, questionNumber) => {
            answered++;
            const question = this.questions.find(q => q.number === questionNumber);
            if (question && answer === question.correct_answer) {
                correct++;
            }
        });
        
        const percentage = answered > 0 ? Math.round((correct / answered) * 100) : 0;
        
        this.correctCountElement.textContent = correct;
        this.percentageElement.textContent = `${percentage}%`;
    }
    
    updateFooterStats() {
        this.totalQuestionsElement.textContent = this.questions.length;
        this.correctCountElement.textContent = '0';
        this.percentageElement.textContent = '0%';
    }
    
    restart() {
        if (this.currentCategory) {
            this.userAnswers.clear();
            this.currentQuestionIndex = 0;
            
            if (this.examTimer) {
                clearInterval(this.examTimer);
                this.examTimer = null;
            }
            
            if (!this.shuffleQuestions && this.originalOrder.length > 0) {
                this.questions = [...this.originalOrder];
            }
            
            this.loadQuestions();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new LearningApp();
    
});