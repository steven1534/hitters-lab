import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  console.log('Sending test email...');
  
  try {
    const result = await resend.emails.send({
      from: 'coach@coachstevemobilecoach.com',
      to: 'delivered@resend.dev', // Resend's test inbox
      subject: 'Test Email - DNS Verification Check',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify that the domain coachstevemobilecoach.com is properly configured with Resend.</p>
        <p>Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
        <p><a href="https://coachstevemobilecoach.com/activity-feed">View Activity Feed</a></p>
      `,
    });

    if (result.error) {
      console.error('❌ Error:', result.error);
    } else {
      console.log('✅ Email sent successfully!');
      console.log('Email ID:', result.data?.id);
    }
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
}

sendTestEmail();
