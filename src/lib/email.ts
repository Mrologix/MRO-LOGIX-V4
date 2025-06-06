import nodemailer from 'nodemailer';

// Configure your email transporter with Hostinger credentials
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.EMAIL_SERVER_PORT || '465'),
  secure: true, // Use SSL/TLS
  auth: {
    user: process.env.EMAIL_SERVER_USER || 'no-reply@mro-logix.com',
    pass: process.env.EMAIL_SERVER_PASSWORD || 'ge0cg4nnt@S5N',
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

export async function sendSMSReportEmail(
  to: string, 
  reportData: {
    reportNumber: string;
    reporterName?: string;
    date: string;
    timeOfEvent?: string;
    reportTitle: string;
    reportDescription: string;
  }
) {
  const mailOptions = {
    from: `"MRO Logix SMS Reports" <${process.env.EMAIL_FROM || 'no-reply@mro-logix.com'}>`,
    to,
    subject: `SMS Report Copy - ${reportData.reportNumber}: ${reportData.reportTitle}`,
    text: `
SMS Report Copy

Report Number: ${reportData.reportNumber}
Reporter: ${reportData.reporterName || 'Anonymous'}
Date: ${reportData.date}
Time of Event: ${reportData.timeOfEvent || 'Not specified'}
Title: ${reportData.reportTitle}

Description:
${reportData.reportDescription}

This is a copy of your SMS report submitted to MRO Logix.

Thank you,
MRO Logix Team
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f43f5e;">SMS Report Copy</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Report Details</h3>
          <p><strong>Report Number:</strong> ${reportData.reportNumber}</p>
          <p><strong>Reporter:</strong> ${reportData.reporterName || 'Anonymous'}</p>
          <p><strong>Date:</strong> ${reportData.date}</p>
          <p><strong>Time of Event:</strong> ${reportData.timeOfEvent || 'Not specified'}</p>
          <p><strong>Title:</strong> ${reportData.reportTitle}</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h4 style="margin-top: 0; color: #333;">Description:</h4>
          <p style="white-space: pre-wrap; line-height: 1.6;">${reportData.reportDescription}</p>
        </div>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          This is a copy of your SMS report submitted to MRO Logix.
        </p>
        
        <p style="color: #666;">
          Thank you,<br/>
          <strong>MRO Logix Team</strong>
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending SMS report email:', error);
    return { success: false, error };
  }
}
