const SUPABASE_URL = 'https://xoqolkqsdkfwxveuwlow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcW9sa3FzZGtmd3h2ZXV3bG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTk5NDUsImV4cCI6MjA5MTYzNTk0NX0.F2VkwQT0l7GdIsqc5QiwO92HtB3sFqrQNgIfvWBQBwM';

export const sendWhatsApp = async (to, message) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send_whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ to, message }),
    });
    const data = await res.json();
    console.log('WhatsApp sent:', data);
    return data;
  } catch (err) {
    console.error('WhatsApp error:', err);
  }
};

export const sendBookingWhatsApp = (clientPhone, bookingDetails) => {
  const message = '?? *MachineOS Booking Confirmed!*\n\n' +
    'Machine: ' + bookingDetails.machine + '\n' +
    'Type: ' + bookingDetails.type + '\n' +
    'Advance: Rs.' + bookingDetails.advance + '\n' +
    'Ref: ' + bookingDetails.id + '\n\n' +
    '_Development Express — +91-9766926636_';
  return sendWhatsApp(clientPhone, message);
};

export const sendIssueWhatsApp = (adminPhone, issueDetails) => {
  const message = '?? *MachineOS Issue Alert!*\n\n' +
    'Machine: ' + issueDetails.machine + '\n' +
    'Issue: ' + issueDetails.type + '\n' +
    'Description: ' + issueDetails.description + '\n' +
    'Operator: ' + issueDetails.operator + '\n\n' +
    '_Please take immediate action!_';
  return sendWhatsApp(adminPhone, message);
};
