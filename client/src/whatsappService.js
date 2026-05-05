const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

export const sendWhatsApp = async (to, message) => {
  try {
    const token = localStorage.getItem('machineos_token');
    const res = await fetch(`${API_BASE_URL}/api/notifications/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
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
