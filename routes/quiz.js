 const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const getQuestionsFromDB = require('../helpers/getQuestions');

// Helper: Shuffle array
function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// 🔹 1. Start Quiz: /start
router.post('/start', async (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone required" });
  }

  const studentId = uuidv4();
  const startTime = new Date();

  await Attempt.create({ studentId, name, phone, ip: req.ip, startTime });

  res.json({ studentId, message: "Quiz started", timeLimitMinutes: 10 });
});

// 🔹 2. Get Questions: /quiz
router.get('/quiz', async (req, res) => {
  let studentId = req.headers['x-student-id'] || uuidv4();

  try {
    const questionBank = await getQuestionsFromDB();
    const randomQuestions = shuffleArray([...questionBank]).map(q => ({
      id: q._id,
      question: q.question,
      options: shuffleArray([...q.options])
    }));

    res.json({
      studentId,
      questions: randomQuestions,
      timeLimitMinutes: 10
    });
  } catch {
    res.status(500).json({ error: "Error fetching questions" });
  }
});

// 🔹 3. Submit Quiz: /submit
router.post('/submit', async (req, res) => {
  const { studentId, answers } = req.body;

  if (!studentId || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const attempt = await Attempt.findOne({ studentId });
  if (!attempt) return res.status(403).json({ error: "Quiz not started" });
  if (attempt.score !== undefined) return res.status(403).json({ error: "Already submitted" });

  const now = new Date();
  const timeElapsed = (now - attempt.startTime) / 1000 / 60;
  if (timeElapsed > 10) return res.status(403).json({ error: "Time limit exceeded" });

  const questionBank = await getQuestionsFromDB();

  let score = 0;
  for (let ans of answers) {
    const actual = questionBank.find(q => q._id.toString() === ans.id);
    if (actual && actual.correctAnswer === ans.selected) score++;
  }

  attempt.score = score;
  await attempt.save();

  res.json({ message: "Submitted successfully", score });
});

// 🔹 4. Top 10 Scorers: /top-users
router.get('/top-users', async (req, res) => {
  const topUsers = await Attempt.find({ score: { $ne: null } })
    .sort({ score: -1, createdAt: 1 })
    .limit(10);

  res.json(topUsers);
});

// 🔹 5. Admin Adds Questions (and deletes old data): /questions
router.post('/questions', async (req, res) => {
  try {
    await Attempt.deleteMany({});
    await Question.deleteMany({});

    const data = req.body;
    if (Array.isArray(data)) {
      await Question.insertMany(data);
    } else {
      await Question.create(data);
    }

    res.status(201).json({ message: "New quiz created. Old data wiped." });
  } catch {
    res.status(500).json({ error: "Quiz creation failed" });
  }
});



// 🔹 Delete entire quiz (questions + attempts)
router.delete('/quiz', async (req, res) => {
  try {
    await Question.deleteMany({});
    await Attempt.deleteMany({});
    res.json({ message: "Quiz and all attempts deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete quiz" });
  }
});










module.exports = router;
