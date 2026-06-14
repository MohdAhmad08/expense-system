const express = require('express');
const router = express.Router();
const { 
  getGroupExpenses, 
  addExpense, 
  updateExpense, 
  deleteExpense 
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/group/:groupId')
  .get(getGroupExpenses)
  .post(addExpense);

router.route('/:id')
  .put(updateExpense)
  .delete(deleteExpense);

module.exports = router;
