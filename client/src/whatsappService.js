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
    return await res.json();
  } catch (err) {
    console.error('WhatsApp error:', err);
  }
};

export const sendBookingNotifications = async ({ booking, client, machine, operator, owner }) => {
  const ref = booking.id;
  const machineName = machine?.name || 'N/A';
  const location = booking.location || 'N/A';
  const type = booking.type || 'N/A';
  const advance = booking.advance?.toLocaleString('en-IN') || '0';
  const total = booking.total?.toLocaleString('en-IN') || '0';
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const notifications = [
    // Client
    client?.phone && {
      to: client.phone.startsWith('+') ? client.phone : '+91' + client.phone,
      message: `*MachineOS - Booking Confirmed!*\n\nRef: ${ref}\nDate: ${date} ${time}\nMachine: ${machineName}\nType: ${type}\nLocation: ${location}\nAdvance Paid: Rs.${advance}\nTotal: Rs.${total}\n\nMachine will be dispatched after owner approval.\n\nDevelopment Express\n+91-9766926636`
    },
    // Admin
    {
      to: '+918408000084',
      message: `*MachineOS - New Booking Alert!*\n\nRef: ${ref}\nDate: ${date} ${time}\nClient: ${client?.name || 'N/A'}\nMachine: ${machineName}\nType: ${type}\nLocation: ${location}\nAdvance: Rs.${advance}\nTotal: Rs.${total}\n\nDevelopment Express`
    },
    // Owner
    owner?.phone && {
      to: owner.phone.startsWith('+') ? owner.phone : '+91' + owner.phone,
      message: `*MachineOS - Machine Booking Request!*\n\nRef: ${ref}\nDate: ${date} ${time}\nMachine: ${machineName}\nClient: ${client?.name || 'N/A'}\nLocation: ${location}\nType: ${type}\nTotal: Rs.${total}\n\nPlease approve in Owner Dashboard.\n\nDevelopment Express\n+91-9766926636`
    },
    // Operator
    operator?.phone && {
      to: operator.phone.startsWith('+') ? operator.phone : '+91' + operator.phone,
      message: `*MachineOS - New Assignment!*\n\nRef: ${ref}\nDate: ${date} ${time}\nMachine: ${machineName}\nClient: ${client?.name || 'N/A'}\nLocation: ${location}\nType: ${type}\n\nPlease check Operator Dashboard.\n\nDevelopment Express\n+91-9766926636`
    },
  ].filter(Boolean);

  // Send all notifications
  for (const n of notifications) {
    await sendWhatsApp(n.to, n.message);
  }
};

export const sendWalletNotification = async ({ phone, name, type, amount, balance, ref }) => {
  const message = type === 'credit'
    ? `*MachineOS - Wallet Credit!*\n\nDear ${name},\nRs.${amount?.toLocaleString('en-IN')} credited to your wallet.\nRef: ${ref}\nNew Balance: Rs.${balance?.toLocaleString('en-IN')}\n\nDevelopment Express\n+91-9766926636`
    : `*MachineOS - Wallet Debit!*\n\nDear ${name},\nRs.${amount?.toLocaleString('en-IN')} deducted from your wallet.\nRef: ${ref}\nNew Balance: Rs.${balance?.toLocaleString('en-IN')}\n\nDevelopment Express\n+91-9766926636`;
  return sendWhatsApp(phone.startsWith('+') ? phone : '+91' + phone, message);
};

export const sendBookingWhatsApp = (clientPhone, bookingDetails) => {
  const message = `*MachineOS Booking Confirmed!*\n\nMachine: ${bookingDetails.machine}\nType: ${bookingDetails.type}\nAdvance: Rs.${bookingDetails.advance}\nRef: ${bookingDetails.id}\n\nDevelopment Express - +91-9766926636`;
  return sendWhatsApp(clientPhone, message);
};

export const sendIssueWhatsApp = (adminPhone, issueDetails) => {
  const message = `*MachineOS Issue Alert!*\n\nMachine: ${issueDetails.machine}\nIssue: ${issueDetails.type}\nDescription: ${issueDetails.description}\nOperator: ${issueDetails.operator}\n\nPlease take immediate action!`;
  return sendWhatsApp(adminPhone, message);
};
