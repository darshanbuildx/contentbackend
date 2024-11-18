import express from 'express';
import { sheetsService } from '../services/sheets.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all content
router.get('/', async (req, res) => {
  try {
    logger.info('Fetching content from sheets service');
    const content = await sheetsService.syncSheet();
    
    // Log sample of data for debugging
    logger.info('Raw sheet data:', {
      count: content.length,
      firstItem: content[0],
      timestamp: new Date().toISOString()
    });

    // Map the data to ensure consistent format
    const mappedContent = content.map(item => ({
      id: String(item['Post ID'] || ''),
      platform: String(item['Platform'] || '').replace('/X', ''), // Handle Twitter/X case
      topic: String(item['Topic'] || ''),
      content: String(item['Content Text'] || ''),
      status: String(item['Status'] || 'Draft'),
      createdAt: item['Date Created'] || new Date().toISOString(),
      lastFeedback: item['Last Feedback'] || null,
      lastFeedbackDate: item['Last Feedback Date'] || null,
      dateApproved: item['Date Approved'] || null,
      approvedBy: item['Approved By'] || null,
      finalApprovalDate: item['Final Approval Date'] || null,
      postScheduledDate: item['Post Scheduled Date'] || null,
      postedBy: item['Posted By'] || null,
      postLink: item['Post Link'] || null
    }));

    // Filter out any invalid entries
    const validContent = mappedContent.filter(item => 
      item.id && 
      item.platform && 
      item.content && 
      ['Draft', 'In Review', 'Changes Requested', 'Approved', 'Published'].includes(item.status)
    );

    logger.info('Final mapped content:', {
      sampleItem: {
        id: validContent[0]?.id,
        platform: validContent[0]?.platform,
        status: validContent[0]?.status
      },
      totalCount: validContent.length
    });

    res.json(validContent);
  } catch (error) {
    logger.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Update content status
router.post('/status', async (req, res) => {
  const { id, status, feedback } = req.body;

  if (!id || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    logger.info('Updating content status:', { id, status, hasFeedback: Boolean(feedback) });

    // Get current content first
    const content = await sheetsService.getContentById(id);
    if (!content) {
      throw new Error(`Content with ID ${id} not found`);
    }

    // Prepare updates preserving existing data
    const updates = {
      ...content,
      'Status': status
    };

    if (feedback) {
      updates['Last Feedback'] = feedback;
      updates['Last Feedback Date'] = new Date().toISOString();
    }

    if (status === 'Approved') {
      updates['Date Approved'] = new Date().toISOString();
      updates['Approved By'] = 'System';
    }

    await sheetsService.updateContent(id, updates);
    
    logger.info('Status updated successfully:', { id, status });
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    logger.error('Error updating status:', error);
    res.status(error.message.includes('not found') ? 404 : 500)
      .json({ error: error.message || 'Failed to update status' });
  }
});

// Sync content
router.post('/sync', async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid items format' });
  }

  try {
    // Map items to sheet format before updating
    const mappedItems = items.map(item => ({
      'Post ID': item.id,
      'Platform': item.platform,
      'Topic': item.topic,
      'Content Text': item.content,
      'Status': item.status,
      'Last Feedback': item.lastFeedback,
      'Last Feedback Date': item.lastFeedbackDate,
      'Date Created': item.createdAt,
      'Date Approved': item.dateApproved,
      'Approved By': item.approvedBy,
      'Final Approval Date': item.finalApprovalDate,
      'Post Scheduled Date': item.postScheduledDate,
      'Posted By': item.postedBy,
      'Post Link': item.postLink
    }));

    // Update each item in the sheet
    await Promise.all(mappedItems.map(item => sheetsService.updateContent(item['Post ID'], item)));
    
    res.json({ 
      message: 'Content synced successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error syncing content:', error);
    res.status(500).json({ error: 'Failed to sync content' });
  }
});

export default router;
