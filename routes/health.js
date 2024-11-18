import express from 'express';
import { logger } from '../utils/logger.js';
import { sheetsService } from '../services/sheets.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Check environment variables without exposing sensitive data
    const credentials = {
      hasSheetId: Boolean(process.env.GOOGLE_SHEET_ID),
      hasClientEmail: Boolean(process.env.GOOGLE_CLIENT_EMAIL),
      hasPrivateKey: Boolean(process.env.GOOGLE_PRIVATE_KEY),
      sheetIdLength: process.env.GOOGLE_SHEET_ID?.length,
      clientEmailValid: process.env.GOOGLE_CLIENT_EMAIL?.includes('@'),
      privateKeyValid: process.env.GOOGLE_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY')
    };

    // Get sheet status and column headers
    const sheetsStatus = await sheetsService.validateSheet();
    const columnHeaders = await sheetsService.getColumnHeaders();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV,
      credentials,
      sheets: {
        ...sheetsStatus,
        columns: columnHeaders
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
