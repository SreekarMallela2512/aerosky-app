// public/dashboard.js
let currentUser = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timer = null;
let practiceTimer = null;
let testStartTime = null;
let practiceStartTime = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Load user data
    await loadUserProfile();
    
    // Load dashboard by default
    showSection('dashboard');
});

async function loadUserProfile() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.username}!`;
            
            // Update dashboard stats
            updateDashboardStats(data);
        } else {
            throw new Error('Failed to load profile');
        }
    } catch (error) {
        console.error('Profile loading error:', error);
        logout();
    }
}

function updateDashboardStats(data) {
    document.getElementById('totalTests').textContent = data.user.testsTaken || 0;
    document.getElementById('averageScore').textContent = `${data.user.averageScore || 0}%`;
    
    // Calculate best score from recent tests
    let bestScore = 0;
    if (data.recentTests && data.recentTests.length > 0) {
        bestScore = Math.max(...data.recentTests.map(test => test.score));
    }
    document.getElementById('bestScore').textContent = `${bestScore}%`;
    
    // Calculate total practice time
    let totalPracticeTime = 0;
    if (data.practiceStats) {
        totalPracticeTime = data.practiceStats.reduce((sum, stat) => sum + (stat.timeSpent || 0), 0);
    }
    document.getElementById('practiceTime').textContent = `${Math.round(totalPracticeTime / 60)} min`;
    
    // Display recent tests
    displayRecentTests(data.recentTests || []);
}

function displayRecentTests(tests) {
    const container = document.getElementById('recentTests');
    
    if (tests.length === 0) {
        container.innerHTML = '<p>No test results yet. Take your first test to see results here!</p>';
        return;
    }
    
    container.innerHTML = tests.map(test => `
        <div class="test-result-item">
            <div>
                <strong>${test.testType.charAt(0).toUpperCase() + test.testType.slice(1)} Test</strong>
                <div style="font-size: 0.9em; color: #666;">
                    ${new Date(test.completedAt).toLocaleDateString()}
                </div>
            </div>
            <div class="history-item-score">${test.score}%</div>
        </div>
    `).join('');
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.remove('hidden');
    
    // Add active class to clicked nav link
    event.target.classList.add('active');
    
    // Update page title
    document.getElementById('pageTitle').textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    
    // Load section-specific data
    if (sectionName === 'analytics') {
        loadAnalytics();
    } else if (sectionName === 'dashboard') {
        loadUserProfile();
    }
}

// Practice Functions
async function startPractice(subject) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/questions/${subject}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            currentQuestions = await response.json();
            currentQuestionIndex = 0;
            userAnswers = [];
            
            document.querySelector('.practice-options').classList.add('hidden');
            document.getElementById('practiceQuiz').classList.remove('hidden');
            document.getElementById('practiceSubject').textContent = `${subject.charAt(0).toUpperCase() + subject.slice(1)} Practice`;
            
            startPracticeTimer();
            displayPracticeQuestion();
        }
    } catch (error) {
        console.error('Failed to load questions:', error);
        showAlert('Failed to load questions. Please try again.', 'error');
    }
}

function startPracticeTimer() {
    practiceStartTime = Date.now();
    practiceTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - practiceStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('practiceTimer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function displayPracticeQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        endPractice();
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    const container = document.getElementById('practiceQuestion');
    
    container.innerHTML = `
        <div class="question">
            <h4>${question.question}</h4>
            <div class="options">
                ${question.options.map(option => `
                    <div class="option" onclick="selectPracticeOption('${option}')">${option}</div>
                `).join('')}
            </div>
        </div>
    `;
}

function selectPracticeOption(answer) {
    // Remove previous selection
    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    
    // Add selection to clicked option
    event.target.classList.add('selected');
    
    // Store answer
    userAnswers[currentQuestionIndex] = answer;
}

function nextPracticeQuestion() {
    if (!userAnswers[currentQuestionIndex]) {
        showAlert('Please select an answer before continuing.', 'error');
        return;
    }
    
    currentQuestionIndex++;
    displayPracticeQuestion();
}

async function endPractice() {
    clearInterval(practiceTimer);
    
    const timeSpent = Math.floor((Date.now() - practiceStartTime) / 1000);
    const correctAnswers = userAnswers.filter((answer, index) => 
        answer === currentQuestions[index].correctAnswer
    ).length;
    
    try {
        const token = localStorage.getItem('authToken');
        await fetch('/api/practice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subject: document.getElementById('practiceSubject').textContent.toLowerCase().split(' ')[0],
                questionsAnswered: userAnswers.length,
                correctAnswers: correctAnswers,
                timeSpent: timeSpent
            })
        });
    } catch (error) {
        console.error('Failed to save practice session:', error);
    }
    
    // Reset practice view
    document.querySelector('.practice-options').classList.remove('hidden');
    document.getElementById('practiceQuiz').classList.add('hidden');
    
    showAlert(`Practice completed! You got ${correctAnswers}/${userAnswers.length} questions correct.`, 'success');
}

// Test Functions
async function startTest(subject) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/questions/${subject}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            currentQuestions = await response.json();
            currentQuestionIndex = 0;
            userAnswers = [];
            
            document.querySelector('.test-options').classList.add('hidden');
            document.getElementById('testQuiz').classList.remove('hidden');
            document.getElementById('testSubject').textContent = `${subject.charAt(0).toUpperCase() + subject.slice(1)} Test`;
            document.getElementById('totalQuestions').textContent = currentQuestions.length;
            
            startTestTimer();
            displayTestQuestion();
        }
    } catch (error) {
        console.error('Failed to load questions:', error);
        showAlert('Failed to load questions. Please try again.', 'error');
    }
}

function startTestTimer() {
    testStartTime = Date.now();
    let timeLeft = 5 * 60; // 5 minutes in seconds
    
    timer = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        document.getElementById('testTimer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            submitTest();
        }
    }, 1000);
}

function displayTestQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    const container = document.getElementById('testQuestion');
    
    document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;
    
    container.innerHTML = `
        <div class="question">
            <h4>${question.question}</h4>
            <div class="options">
                ${question.options.map(option => `
                    <div class="option" onclick="selectTestOption('${option}')">${option}</div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Show/hide buttons based on question index
    const nextBtn = document.getElementById('nextTestBtn');
    const submitBtn = document.getElementById('submitTestBtn');
    
    if (currentQuestionIndex === currentQuestions.length - 1) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

function selectTestOption(answer) {
    // Remove previous selection
    document.querySelectorAll('#testQuestion .option').forEach(opt => opt.classList.remove('selected'));
    
    // Add selection to clicked option
    event.target.classList.add('selected');
    
    // Store answer
    userAnswers[currentQuestionIndex] = answer;
}

function nextTestQuestion() {
    if (!userAnswers[currentQuestionIndex]) {
        showAlert('Please select an answer before continuing.', 'error');
        return;
    }
    
    currentQuestionIndex++;
    displayTestQuestion();
}

async function submitTest() {
    clearInterval(timer);
    
    const timeTaken = Math.floor((Date.now() - testStartTime) / 1000);
    
    // Prepare answers for submission
    const answers = currentQuestions.map((question, index) => ({
        questionId: question.id,
        userAnswer: userAnswers[index] || ''
    }));
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/submit-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                testType: document.getElementById('testSubject').textContent.toLowerCase().split(' ')[0],
                answers: answers,
                timeTaken: timeTaken
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            displayTestResult(result.testResult, timeTaken);
        } else {
            throw new Error('Failed to submit test');
        }
    } catch (error) {
        console.error('Failed to submit test:', error);
        showAlert('Failed to submit test. Please try again.', 'error');
    }
}

function displayTestResult(result, timeTaken) {
    document.getElementById('testQuiz').classList.add('hidden');
    document.getElementById('testResult').classList.remove('hidden');
    
    document.getElementById('resultScore').textContent = `${result.score}%`;
    document.getElementById('resultCorrect').textContent = `${result.correctAnswers}/${result.totalQuestions}`;
    
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    document.getElementById('resultTime').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function backToTestSelection() {
    document.getElementById('testResult').classList.add('hidden');
    document.querySelector('.test-options').classList.remove('hidden');
}

// Analytics Functions
async function loadAnalytics() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/analytics', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const analytics = await response.json();
            displayAnalytics(analytics);
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

function displayAnalytics(analytics) {
    // Display subject-wise stats
    const subjectStatsContainer = document.getElementById('subjectStats');
    subjectStatsContainer.innerHTML = Object.entries(analytics.subjectWiseStats).map(([subject, stats]) => `
        <div class="subject-stat">
            <h5>${subject}</h5>
            <div class="subject-stat-grid">
                <div>Tests: ${stats.testsCount}</div>
                <div>Avg Score: ${stats.averageScore}%</div>
                <div>Practice Time: ${stats.practiceTime}min</div>
                <div>Questions: ${stats.practiceQuestions}</div>
            </div>
        </div>
    `).join('');
    
    // Display test history
    const testHistoryContainer = document.getElementById('testHistory');
    if (analytics.recentTests && analytics.recentTests.length > 0) {
        testHistoryContainer.innerHTML = analytics.recentTests.map(test => `
            <div class="history-item">
                <div class="history-item-info">
                    <strong>${test.testType.charAt(0).toUpperCase() + test.testType.slice(1)} Test</strong>
                    <small>${new Date(test.completedAt).toLocaleDateString()} - ${Math.floor(test.timeTaken / 60)}:${(test.timeTaken % 60).toString().padStart(2, '0')}</small>
                </div>
                <div class="history-item-score">${test.score}%</div>
            </div>
        `).join('');
    } else {
        testHistoryContainer.innerHTML = '<p>No test history available.</p>';
    }
    
    // Create simple performance chart
    createPerformanceChart(analytics.recentTests || []);
}

function createPerformanceChart(testData) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (testData.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No test data available', width / 2, height / 2);
        return;
    }
    
    // Prepare data (last 5 tests)
    const recentTests = testData.slice(0, 5).reverse();
    const scores = recentTests.map(test => test.score);
    const maxScore = 100;
    
    // Chart dimensions
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Draw axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw score line
    if (scores.length > 1) {
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        scores.forEach((score, index) => {
            const x = padding + (index * chartWidth / (scores.length - 1));
            const y = height - padding - (score / maxScore * chartHeight);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = '#667eea';
        scores.forEach((score, index) => {
            const x = padding + (index * chartWidth / (scores.length - 1));
            const y = height - padding - (score / maxScore * chartHeight);
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
        const score = (i * 20);
        const y = height - padding - (i * chartHeight / 5);
        ctx.fillText(score + '%', padding - 20, y + 4);
    }
    
    // X-axis labels (test numbers)
    scores.forEach((score, index) => {
        const x = padding + (index * chartWidth / (scores.length - 1));
        ctx.fillText(`Test ${index + 1}`, x, height - padding + 20);
    });
}

// Utility Functions
function showAlert(message, type) {
    // Remove existing alert
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    // Insert at top of main content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(alert, mainContent.firstChild);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Navigation helper
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.remove('hidden');
    
    // Add active class to corresponding nav link
    const navLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (navLink) {
        navLink.classList.add('active');
    }
    
    // Update page title
    document.getElementById('pageTitle').textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    
    // Load section-specific data
    if (sectionName === 'analytics') {
        loadAnalytics();
    } else if (sectionName === 'dashboard') {
        loadUserProfile();
    }
}