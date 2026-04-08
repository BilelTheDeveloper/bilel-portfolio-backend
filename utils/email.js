const { MailtrapClient } = require("mailtrap");

/**
 * @desc    Universal email sender utility using Mailtrap API (HTTPS)
 * @param   {String} targetEmail - The recipient
 * @param   {String} subject - Email subject line
 * @param   {String} htmlContent - The email body in HTML
 */
const sendEliteEmail = async (targetEmail, subject, htmlContent) => {
  try {
    // 1. Initialize the Mailtrap Client
    // This uses Port 443 (HTTPS), so Render won't block it!
    const client = new MailtrapClient({ 
      token: process.env.MAILTRAP_TOKEN 
    });

    // 2. Construct and Execute the Send
    const result = await client.send({
      from: { 
        name: "Bilel Admin", 
        email: process.env.SENDER_EMAIL // Bilel.dev@demomailtrap.com
      },
      to: [{ email: targetEmail }],
      subject: subject,
      html: htmlContent,
      category: "Admin Notifications"
    });

    return result;

  } catch (error) {
    // Detailed logging for your Render dashboard
    console.error('Mailtrap Utility Error:', error);
    throw new Error('Failed to send email via Mailtrap API');
  }
};

module.exports = sendEliteEmail;