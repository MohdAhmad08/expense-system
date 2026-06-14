const express = require('express');
const router = express.Router();
const { 
  uploadCsv, 
  getImportReports, 
  getReportAnomalies, 
  resolveAnomaly, 
  commitImportController 
} = require('../controllers/importController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.post('/group/:groupId/upload', upload.single('file'), uploadCsv);
router.get('/group/:groupId/reports', getImportReports);
router.get('/reports/:reportId/anomalies', getReportAnomalies);
router.post('/anomalies/:anomalyId/resolve', resolveAnomaly);
router.post('/reports/:reportId/commit', commitImportController);

module.exports = router;
