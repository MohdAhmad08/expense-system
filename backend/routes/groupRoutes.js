const express = require('express');
const router = express.Router();
const { 
  createGroup, 
  getGroups, 
  getGroupDetails, 
  addGroupMember, 
  updateGroupMember 
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getGroups)
  .post(createGroup);

router.route('/:id')
  .get(getGroupDetails);

router.route('/:id/members')
  .post(addGroupMember);

router.route('/:id/members/:memberId')
  .put(updateGroupMember);

module.exports = router;
