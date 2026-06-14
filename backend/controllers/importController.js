const { ImportReport, Anomaly, Group } = require('../models');
const { processCsvImport, commitImport } = require('../services/csvImportEngine');
const path = require('path');
const fs = require('fs');

// Upload a CSV file and run parser/anomaly engine
const uploadCsv = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a CSV file.');
    }

    const group = await Group.findByPk(groupId);
    if (!group) {
      res.status(404);
      throw new Error('Group not found.');
    }

    const filePath = req.file.path;

    // Trigger process engine
    const result = await processCsvImport(filePath, groupId);

    // Fetch details of created report and anomalies
    const report = await ImportReport.findByPk(result.reportId, {
      include: [{ model: Anomaly, as: 'Anomalies' }]
    });

    return res.status(201).json(report);
  } catch (error) {
    return next(error);
  }
};

// Fetch historical import reports for a group
const getImportReports = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const reports = await ImportReport.findAll({
      where: { groupId },
      order: [['createdAt', 'DESC']]
    });
    return res.json(reports);
  } catch (error) {
    return next(error);
  }
};

// Get anomalies for a specific import report
const getReportAnomalies = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const anomalies = await Anomaly.findAll({
      where: { importReportId: reportId },
      order: [['rowNumber', 'ASC']]
    });
    return res.json(anomalies);
  } catch (error) {
    return next(error);
  }
};

// Resolve an anomaly interactively
const resolveAnomaly = async (req, res, next) => {
  try {
    const { anomalyId } = req.params;
    const { status, resolvedAction } = req.body; // status: APPROVED, IGNORED, RESOLVED

    const anomaly = await Anomaly.findByPk(anomalyId);
    if (!anomaly) {
      res.status(404);
      throw new Error('Anomaly record not found.');
    }

    anomaly.status = status;
    if (resolvedAction) {
      anomaly.resolvedAction = resolvedAction;
    }

    await anomaly.save();

    // Recalculate remaining pending warnings/violations for report
    const report = await ImportReport.findByPk(anomaly.importReportId);
    const totalAnomalies = await Anomaly.count({
      where: { importReportId: report.id }
    });
    const resolvedAnomalies = await Anomaly.count({
      where: { 
        importReportId: report.id, 
        status: ['APPROVED', 'IGNORED', 'RESOLVED'] 
      }
    });

    // If all anomalies resolved/approved/ignored, let user know they can commit
    return res.json({
      message: 'Anomaly status updated.',
      anomaly,
      allResolved: totalAnomalies === resolvedAnomalies
    });
  } catch (error) {
    return next(error);
  }
};

// Finalize and commit imports to main ledger tables
const commitImportController = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const result = await commitImport(reportId);
    return res.json({
      message: 'CSV data committed to database successfully.',
      ...result
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  uploadCsv,
  getImportReports,
  getReportAnomalies,
  resolveAnomaly,
  commitImportController
};
