const express = require('express');
const router = express.Router();
const { 
  getGroupSettlements, 
  addSettlement, 
  deleteSettlement 
} = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/group/:groupId')
  .get(getGroupSettlements)
  .post(addSettlement);

router.route('/:id')
  .delete(deleteSettlement);

module.exports = router;
