import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInvitationEmail = async (email, tempPassword, companyName = 'Your Company') => {
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'gunasundar.intelliod@gmail.com',
    to: email,
    subject: `Welcome to ${companyName} - Complete Your Onboarding`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ${companyName}!</h2>
        <p>You have been invited to join our team. Please use the following credentials to log in and complete your onboarding:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        
        <p>Please log in at: <a href="${process.env.APP_URL || 'http://localhost:3000'}/login">Login Here</a></p>
        
        <p><strong>Important:</strong> You will be required to change your password on first login and complete your profile information.</p>
        
        <p>If you have any questions, please contact HR.</p>
        
        <p>Best regards,<br>HR Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

export const sendApprovalNotification = async (email, approved, companyName = 'Your Company') => {
  const subject = approved 
    ? `Welcome to ${companyName} - Your Account is Approved!`
    : `${companyName} - Additional Information Required`;
    
  const content = approved
    ? `
      <h2>Congratulations!</h2>
      <p>Your onboarding has been approved and your account is now fully active.</p>
      <p>You can now access all company systems and resources.</p>
    `
    : `
      <h2>Additional Information Required</h2>
      <p>Your onboarding submission needs some additional information or corrections.</p>
      <p>Please log in to your account and review the feedback provided.</p>
    `;

  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@company.com',
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${content}
        <p>Best regards,<br>HR Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};