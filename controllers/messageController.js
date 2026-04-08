const Message = require('../models/Message');
const { MailtrapClient } = require("mailtrap");

/**
 * @desc    Send a message from the contact form
 * @route   POST /api/messages
 * @access  Public
 */
exports.sendMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // 1. Save to MongoDB
    await Message.create({
      name,
      email,
      subject: subject || 'New Inquiry from Bilel.dev',
      message
    });

    // 2. Setup Mailtrap Client (Using Sandbox Config)
    const client = new MailtrapClient({ 
      token: process.env.MAILTRAP_TOKEN,
      accountId: 4527274 // Your Sandbox ID
    });

    // 3. Define the Email Content using your Premium UI
    // Note: client.testing.send is required for Sandbox mode
    await client.testing.send({
      from: { name: "Bilel Portfolio Bot", email: "hello@example.com" },
      to: [{ email: process.env.RECEIVER_EMAIL, name: "Bilel Admin" }],
      subject: `📩 ${subject || 'New Portfolio Message'}`,
      html: `
        <div style="font-family: 'Helvetica', sans-serif; background-color: #0f172a; padding: 40px; color: #ffffff;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
              <h2 style="margin: 0; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; font-size: 18px;">New Inquiry Received</h2>
            </div>
            <div style="padding: 40px;">
              <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">From</p>
              <p style="font-size: 18px; margin-bottom: 24px; font-weight: bold;">${name} <span style="color: #3b82f6; font-weight: normal;">(${email})</span></p>
              
              <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">Subject</p>
              <p style="font-size: 16px; margin-bottom: 24px;">${subject || 'General Inquiry'}</p>
              
              <div style="background-color: #0f172a; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6;">
                <p style="color: #e2e8f0; line-height: 1.6; margin: 0;">${message}</p>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; border-top: 1px solid #334155; background-color: #1e293b;">
              <p style="color: #64748b; font-size: 10px; margin: 0;">This inquiry was sent from your bilel.dev contact form.</p>
              <p style="color: #3b82f6; font-size: 8px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">Powered by BILEL.ADMIN & Mailtrap Sandbox</p>
            </div>
          </div>
        </div>
      `,
      category: "Integration Test"
    });

    res.status(201).json({
      success: true,
      message: 'Message sent to Sandbox and saved successfully!'
    });

  } catch (error) {
    console.error('Mailtrap Sandbox Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: Message could not be sent.'
    });
  }
};

/**
 * @desc    Get all messages (For Admin Dashboard)
 */
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

/**
 * @desc    Delete a message
 */
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};