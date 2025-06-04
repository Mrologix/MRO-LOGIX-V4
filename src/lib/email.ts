import nodemailer from 'nodemailer';

// Configure your email transporter with Siteground credentials
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true, // Use SSL/TLS
  auth: {
    user: 'no-reply@mro-logix.com',
    pass: 'ge0cg4nnt@S5N',
  },
});

export async function sendPinEmail(to: string, pin: string, firstName: string) {
  const mailOptions = {
    from: '"MRO Logix" <no-reply@mro-logix.com>',
    to,
    subject: 'Your MRO Logix Verification PIN',
    text: `Hello ${firstName},\n\nYour verification PIN is: ${pin}\n\nThis PIN will expire in 5 minutes.\n\nThank you,\nMRO Logix Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to MRO Logix!</h2>
        <p>Hello ${firstName},</p>
        <p>Thank you for registering. To verify your account, use the following PIN:</p>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
          ${pin}
        </div>
        <p>This PIN will expire in 5 minutes.</p>
        <p>If you didn't request this PIN, please ignore this email.</p>
        <p>Thank you,<br/>MRO Logix Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}
