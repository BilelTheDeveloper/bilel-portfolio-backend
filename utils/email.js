const SibApiV3Sdk = require('@getbrevo/brevo');

const sendEliteEmail = async (targetEmail, subject, htmlContent) => {
  let defaultClient = SibApiV3Sdk.ApiClient.instance;
  let apiKey = defaultClient.authentications['api-key'];
  
  // This pulls safely from your hidden .env file
  apiKey.apiKey = process.env.BREVO_API_KEY;

  let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail = {
    sender: { name: "Bilel Admin", email: process.env.SENDER_EMAIL },
    to: [{ email: targetEmail }],
    subject: subject,
    htmlContent: htmlContent
  };

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};

module.exports = sendEliteEmail;