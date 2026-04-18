const SUPABASE_URL = 'https://xoqolkqsdkfwxveuwlow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcW9sa3FzZGtmd3h2ZXV3bG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTk5NDUsImV4cCI6MjA5MTYzNTk0NX0.F2VkwQT0l7GdIsqc5QiwO92HtB3sFqrQNgIfvWBQBwM';

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });
    const data = await res.json();
    console.log('Email sent:', data);
    return data;
  } catch (err) {
    console.error('Email error:', err);
  }
};

export const sendBookingConfirmation = (clientEmail, booking) =>
  sendEmail({
    to: clientEmail,
    subject: `✅ Booking Confirmed — ${booking.machine} | Development Express`,
    html: `
      <div style="font-family:Arial;background:#050d1a;color:#fff;padding:30px;border-radius:12px;max-width:600px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:20px;">
          <h1 style="color:#c9a84c;margin:0;">Development Express</h1>
          <p style="color:#8896a8;font-size:11px;letter-spacing:2px;">THE GOLD STANDARD OF INFRASTRUCTURE</p>
        </div>
        <div style="background:#0f2040;border:1px solid rgba(201,168,76,0.3);border-radius:10px;padding:20px;margin-bottom:15px;">
          <h2 style="color:#4CAF50;margin:0 0 15px;">✅ Booking Confirmed!</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">Booking ID</td><td style="color:#c9a84c;font-weight:bold;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${booking.id}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">Machine</td><td style="color:#fff;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${booking.machine}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">Type</td><td style="color:#fff;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${booking.type}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;">Advance Paid</td><td style="color:#4CAF50;font-weight:bold;font-size:18px;padding:8px 0;">₹${booking.advance}</td></tr>
          </table>
        </div>
        <div style="background:rgba(233,69,96,0.1);border:1px solid rgba(233,69,96,0.3);border-radius:8px;padding:12px;margin-bottom:15px;">
          <p style="color:#e94560;margin:0;font-size:13px;">⚠️ Wallet-Only Policy: सर्व payments फक्त Wallet मधून होतील. Cash स्वीकारली जाणार नाही.</p>
        </div>
        <div style="text-align:center;padding-top:15px;border-top:1px solid rgba(201,168,76,0.1);">
          <p style="color:#8896a8;font-size:12px;margin:0;">Development Express | Karad, Satara | +91-9766926636</p>
          <p style="color:#8896a8;font-size:11px;margin:5px 0 0;">© 2026 Development Express. All Rights Reserved.</p>
        </div>
      </div>
    `,
  });

export const sendPaymentReceipt = (ownerEmail, payment) =>
  sendEmail({
    to: ownerEmail,
    subject: `💰 Payment Received — ₹${payment.amount} | Development Express`,
    html: `
      <div style="font-family:Arial;background:#050d1a;color:#fff;padding:30px;border-radius:12px;max-width:600px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:20px;">
          <h1 style="color:#c9a84c;margin:0;">Development Express</h1>
        </div>
        <div style="background:#0f2040;border:1px solid rgba(201,168,76,0.3);border-radius:10px;padding:20px;">
          <h2 style="color:#4CAF50;margin:0 0 15px;">💰 Payment Credited!</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">Machine</td><td style="color:#fff;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${payment.machine}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">Gross Amount</td><td style="color:#c9a84c;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">₹${payment.gross}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">Commission (15%)</td><td style="color:#e94560;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">- ₹${payment.commission}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">TDS (2%)</td><td style="color:#e94560;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">- ₹${payment.tds}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;font-weight:bold;">NET PAID</td><td style="color:#4CAF50;font-weight:bold;font-size:20px;padding:8px 0;">₹${payment.amount}</td></tr>
          </table>
        </div>
        <div style="text-align:center;margin-top:15px;">
          <p style="color:#8896a8;font-size:12px;margin:0;">Development Express | +91-9766926636 | om.chavan2026@zohomail.in</p>
        </div>
      </div>
    `,
  });

export const sendFuelAlert = (adminEmail, machine) =>
  sendEmail({
    to: adminEmail,
    subject: `⚠️ Fuel Alert — ${machine.id} ${machine.fuel}% | Development Express`,
    html: `
      <div style="font-family:Arial;background:#050d1a;color:#fff;padding:30px;border-radius:12px;max-width:600px;margin:0 auto;">
        <div style="background:rgba(233,69,96,0.1);border:2px solid #e94560;border-radius:10px;padding:25px;text-align:center;">
          <h2 style="color:#e94560;margin:0 0 15px;">⚠️ FUEL ALERT!</h2>
          <p style="color:#fff;font-size:16px;margin:0 0 10px;">Machine: <strong style="color:#c9a84c;">${machine.id}</strong></p>
          <p style="color:#e94560;font-size:42px;font-weight:bold;margin:0 0 10px;">${machine.fuel}%</p>
          <p style="color:#8896a8;margin:0 0 10px;">Location: ${machine.location}</p>
          <p style="color:#FF9800;font-weight:bold;margin:0;">तात्काळ Refuel करा!</p>
        </div>
        <div style="text-align:center;margin-top:15px;">
          <p style="color:#8896a8;font-size:12px;margin:0;">Development Express | +91-9766926636</p>
        </div>
      </div>
    `,
  });

export const sendIssueAlert = (adminEmail, issue) =>
  sendEmail({
    to: adminEmail,
    subject: `🚨 Issue Reported — ${issue.type} | ${issue.machine} | Development Express`,
    html: `
      <div style="font-family:Arial;background:#050d1a;color:#fff;padding:30px;border-radius:12px;max-width:600px;margin:0 auto;">
        <div style="background:rgba(233,69,96,0.1);border:2px solid #e94560;border-radius:10px;padding:20px;margin-bottom:15px;">
          <h2 style="color:#e94560;margin:0 0 15px;">🚨 Issue Reported!</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">Machine</td><td style="color:#c9a84c;font-weight:bold;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${issue.machine}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">Issue Type</td><td style="color:#e94560;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${issue.type}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">Description</td><td style="color:#fff;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${issue.description}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">Operator</td><td style="color:#fff;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${issue.operator}</td></tr>
            <tr><td style="color:#8896a8;padding:8px 0;">Time</td><td style="color:#fff;padding:8px 0;">${new Date().toLocaleString('en-IN')}</td></tr>
          </table>
        </div>
        <div style="text-align:center;margin-top:15px;">
          <p style="color:#8896a8;font-size:12px;margin:0;">Development Express | +91-9766926636</p>
        </div>
      </div>
    `,
  });
