const Brevo = require('@getbrevo/brevo');

/**
 * @desc    Universal email sender utility using Brevo SDK v3
 * @param   {String} targetEmail - The recipient
 * @param   {String} subject - Email subject line
 * @param   {String} htmlContent - The email body in HTML
 */
const sendEliteEmail = async (targetEmail, subject, htmlContent) => {
  try {
    // 1. Initialize the API Instance (Direct Constructor)
    const apiInstance = new Brevo.TransactionalEmailsApi();
    
    // 2. Set API Key directly on the instance
    apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey, 
      process.env.BREVO_API_KEY
    );

    // 3. Construct the Email Object
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.sender = { 
      name: "Bilel Admin", 
      email: process.env.SENDER_EMAIL // verified email (e.g., your gmail)
    };
    sendSmtpEmail.to = [{ email: targetEmail }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    // 4. Execute the send
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return result;

  } catch (error) {
    // Crucial for debugging Render logs
    console.error('Email Utility Error:', error.response?.body || error);
    throw new Error('Failed to send email via Brevo');
  }
};

module.exports = sendEliteEmail;