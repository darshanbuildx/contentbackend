import { google } from 'googleapis';
import { logger } from '../utils/logger.js';

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.sheetTitle = null;
    this.columnHeaders = null;
  }

  async initialize() {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Get sheet info to validate connection and get actual sheet names
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      // Get the first sheet's title
      this.sheetTitle = spreadsheet.data.sheets[0].properties.title;
      
      // Load column headers
      await this.loadColumnHeaders();

      // Start periodic sync
      this.startPeriodicSync();
      
      logger.info('Google Sheets service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets:', error);
      throw error;
    }
  }

  async loadColumnHeaders() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetTitle}!1:1`
      });

      this.columnHeaders = response.data.values?.[0] || [];
      logger.info('Column headers loaded:', this.columnHeaders);
      return this.columnHeaders;
    } catch (error) {
      logger.error('Failed to load column headers:', error);
      throw error;
    }
  }

  async getColumnHeaders() {
    if (!this.columnHeaders) {
      await this.loadColumnHeaders();
    }
    return this.columnHeaders;
  }

  async validateSheet() {
    try {
      const config = {
        hasSheetId: Boolean(this.spreadsheetId),
        hasClientEmail: Boolean(process.env.GOOGLE_CLIENT_EMAIL),
        hasPrivateKey: Boolean(process.env.GOOGLE_PRIVATE_KEY)
      };

      if (!config.hasSheetId || !config.hasClientEmail || !config.hasPrivateKey) {
        throw new Error('Missing required Google Sheets configuration');
      }

      if (!this.sheets) {
        await this.initialize();
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      if (!response.data.sheets?.length) {
        throw new Error('No sheets found in the spreadsheet');
      }

      this.lastSyncTime = new Date();

      return {
        status: 'connected',
        config,
        lastSync: this.lastSyncTime,
        error: null
      };
    } catch (error) {
      logger.error('Sheet validation failed:', error);
      return {
        status: 'error',
        config: {
          hasSheetId: Boolean(this.spreadsheetId),
          hasClientEmail: Boolean(process.env.GOOGLE_CLIENT_EMAIL),
          hasPrivateKey: Boolean(process.env.GOOGLE_PRIVATE_KEY)
        },
        error: error.message
      };
    }
  }

  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncSheet();
        logger.info('Periodic sheet sync completed successfully');
      } catch (error) {
        logger.error('Periodic sheet sync failed:', error);
      }
    }, 30000);
  }

  async syncSheet() {
    if (!this.sheets || !this.sheetTitle) {
      throw new Error('Sheets service not initialized');
    }

    try {
      const headers = await this.getColumnHeaders();
      const lastCol = String.fromCharCode(65 + headers.length - 1);
      const range = `${this.sheetTitle}!A2:${lastCol}`;
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range
      });

      const rows = response.data.values || [];
      this.lastSyncTime = new Date();

      return rows.map(row => {
        const item = {};
        headers.forEach((header, index) => {
          item[header] = row[index] || null;
        });
        return item;
      });
    } catch (error) {
      logger.error('Sheet sync failed:', error);
      throw error;
    }
  }

  async getContentById(id) {
    const allContent = await this.syncSheet();
    return allContent.find(item => item['Post ID'] === id);
  }

  async updateContent(id, updates) {
    if (!this.sheets || !this.sheetTitle) {
      throw new Error('Sheets service not initialized');
    }

    try {
      const headers = await this.getColumnHeaders();
      const lastCol = String.fromCharCode(65 + headers.length - 1);
      const range = `${this.sheetTitle}!A:${lastCol}`;
      
      // First get all data to find the row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range
      });

      const rows = response.data.values || [];
      
      // Find row with matching ID (including header row)
      const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id);

      if (rowIndex === -1) {
        throw new Error(`Content with ID ${id} not found`);
      }

      // Get existing row data
      const existingData = rows[rowIndex];

      // Create new row data preserving existing values
      const newRowData = headers.map((header, colIndex) => {
        // If there's an update for this column, use it
        if (updates[header] !== undefined) {
          return updates[header];
        }
        // Otherwise keep existing value
        return existingData[colIndex] || '';
      });

      // Update the row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetTitle}!A${rowIndex + 1}:${lastCol}${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [newRowData]
        }
      });

      logger.info(`Content ${id} updated successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to update content ${id}:`, error);
      throw error;
    }
  }

  getLastSyncTime() {
    return this.lastSyncTime;
  }

  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    logger.info('Sheets service cleanup completed');
  }
}

export const sheetsService = new GoogleSheetsService();
