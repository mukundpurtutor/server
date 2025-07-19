 const Question = require('../models/Question');

const getQuestionsFromDB = async () => {
  return await Question.find({});
};

module.exports = getQuestionsFromDB;
