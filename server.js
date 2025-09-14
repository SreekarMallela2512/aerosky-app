// UPDATED server.js - With Better Error Handling and Debugging
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Debug logging
console.log('Starting AeroSky server...');
console.log('Node ENV:', process.env.NODE_ENV || 'development');
console.log('Port:', PORT);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
  }
};
connectDB();

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  testsTaken: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
});

const testResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testType: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  timeTaken: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now },
  answers: [{ questionId: Number, userAnswer: String, correctAnswer: String, isCorrect: Boolean }],
});

const practiceSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  questionsAnswered: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  lastPracticed: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const TestResult = mongoose.model('TestResult', testResultSchema);
const PracticeSession = mongoose.model('PracticeSession', practiceSessionSchema);

// Sample questions
const questionsBank = {
  math: [
   {
    id: 1,
    question: "Lowest layer of atmosphere is",
    options: ["Troposphere", "Tropopause", "Stratosphere"],
    correctAnswer: "Troposphere"
  },
  {
    id: 2,
    question: "Height of Tropopause at equator is",
    options: ["10-12 km", "16-18 km", "12-14 km"],
    correctAnswer: "16-18 km"
  },
  {
    id: 3,
    question: "Height of Tropopause at Poles is",
    options: ["12-14 km", "12-13 km", "08-10 km"],
    correctAnswer: "08-10 km"
  },
  {
    id: 4,
    question: "Higher the surface temperature, the tropopause would be",
    options: ["Higher", "Lower", "Same"],
    correctAnswer: "Higher"
  },
  {
    id: 5,
    question: "Height of tropopause",
    options: ["Is constant", "Varies with altitude", "Varies with Latitude"],
    correctAnswer: "Varies with Latitude"
  },
  {
    id: 6,
    question: "Above 8 km the lower temperatures are over",
    options: ["Equator", "Mid Latitudes", "Poles"],
    correctAnswer: "Equator"
  },
  ],
  science: [
    { id: 1, question: "What is the chemical symbol for Gold?", options: ["Go", "Gd", "Au", "Ag"], correctAnswer: "Au" },
    { id: 2, question: "How many bones are there in an adult human body?", options: ["204", "206", "208", "210"], correctAnswer: "206" },
    { id: 3, question: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctAnswer: "Carbon Dioxide" },
  ],
  english: [
    { id: 1, question: "Which is the correct spelling?", options: ["Recieve", "Receive", "Receeve", "Receve"], correctAnswer: "Receive" },
    { id: 2, question: "What is the past tense of 'run'?", options: ["Runned", "Ran", "Run", "Running"], correctAnswer: "Ran" },
    { id: 3, question: "Which is a synonym for 'happy'?", options: ["Sad", "Joyful", "Angry", "Tired"], correctAnswer: "Joyful" },
  ],
};

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.get('/', (req, res) => {
  console.log('Root route accessed');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'All fields are required' });

    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database connection unavailable' });

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback-secret-key');
    res.json({ token, user: { id: user._id, username, email } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database connection unavailable' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback-secret-key');
    res.json({ token, user: { id: user._id, username: user.username, email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    const testResults = await TestResult.find({ userId: req.user.userId }).sort({ completedAt: -1 }).limit(5);
    const practiceStats = await PracticeSession.find({ userId: req.user.userId });
    res.json({ user, recentTests: testResults, practiceStats });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/questions/:subject', authenticateToken, (req, res) => {
  const { subject } = req.params;
  const questions = questionsBank[subject] || [];
  res.json(questions);
});

app.post('/api/submit-test', authenticateToken, async (req, res) => {
  try {
    const { testType, answers, timeTaken } = req.body;
    const questions = questionsBank[testType] || [];

    let correctAnswers = 0;
    const processedAnswers = answers.map(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      const isCorrect = question && question.correctAnswer === answer.userAnswer;
      if (isCorrect) correctAnswers++;
      return { questionId: answer.questionId, userAnswer: answer.userAnswer, correctAnswer: question ? question.correctAnswer : '', isCorrect };
    });

    const score = Math.round((correctAnswers / questions.length) * 100);

    const testResult = new TestResult({
      userId: req.user.userId,
      testType,
      score,
      totalQuestions: questions.length,
      correctAnswers,
      timeTaken,
      answers: processedAnswers,
    });

    await testResult.save();

    const userStats = await TestResult.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.userId) } },
      { $group: { _id: null, avg: { $avg: '$score' } } },
    ]);

    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { testsTaken: 1, totalScore: score },
      $set: { averageScore: Math.round(userStats[0]?.avg || 0) },
    });

    res.json({ testResult: { score, correctAnswers, totalQuestions: questions.length, timeTaken, percentage: score } });
  } catch (error) {
    console.error('Test submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/practice', authenticateToken, async (req, res) => {
  try {
    const { subject, questionsAnswered, correctAnswers, timeSpent } = req.body;

    await PracticeSession.findOneAndUpdate(
      { userId: req.user.userId, subject },
      {
        $inc: {
          questionsAnswered: questionsAnswered || 0,
          correctAnswers: correctAnswers || 0,
          timeSpent: timeSpent || 0,
        },
        $set: { lastPracticed: new Date() },
      },
      { upsert: true }
    );

    res.json({ message: 'Practice session updated' });
  } catch (error) {
    console.error('Practice update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    const testResults = await TestResult.find({ userId: req.user.userId }).sort({ completedAt: -1 });
    const practiceStats = await PracticeSession.find({ userId: req.user.userId });

    const analytics = {
      totalTests: testResults.length,
      averageScore: testResults.length > 0 ? Math.round(testResults.reduce((sum, test) => sum + test.score, 0) / testResults.length) : 0,
      bestScore: testResults.length > 0 ? Math.max(...testResults.map(test => test.score)) : 0,
      recentTests: testResults.slice(0, 5),
      subjectWiseStats: {},
    };

    ['math', 'science', 'english'].forEach(subject => {
      const subjectTests = testResults.filter(test => test.testType === subject);
      const subjectPractice = practiceStats.find(stat => stat.subject === subject);
      analytics.subjectWiseStats[subject] = {
        testsCount: subjectTests.length,
        averageScore: subjectTests.length > 0 ? Math.round(subjectTests.reduce((sum, test) => sum + test.score, 0) / subjectTests.length) : 0,
        practiceTime: subjectPractice ? Math.round(subjectPractice.timeSpent / 60) : 0,
        practiceQuestions: subjectPractice ? subjectPractice.questionsAnswered : 0,
      };
    });

    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler (fixed for Express 5)
app.use((req, res) => {
  console.log('404 - Not found:', req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AeroSky server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
});
