import { Router, Request, Response } from 'express';
import { notifyOwner } from '../_core/notification';

const router = Router();

interface ContactFormData {
  name: string;
  email: string;
  projectType: string;
  message: string;
}

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { name, email, projectType, message } = req.body as ContactFormData;

    // Validate required fields
    if (!name || !email || !projectType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send notification to owner
    const notificationSent = await notifyOwner({
      title: `New Lead: ${projectType}`,
      content: `
Name: ${name}
Email: ${email}
Project Type: ${projectType}
Message: ${message || 'No message provided'}
      `.trim()
    });

    if (!notificationSent) {
      console.warn('Failed to send owner notification for lead');
      // Don't fail the request, still return success to user
    }

    res.json({ 
      success: true, 
      message: 'Lead captured successfully' 
    });
  } catch (error) {
    console.error('Email endpoint error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;
