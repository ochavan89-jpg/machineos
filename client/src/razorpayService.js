export const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const initiatePayment = async ({ amount, name, email, phone, description, onSuccess, onFailure }) => {
  const loaded = await loadRazorpay();
  if (!loaded) { alert('Razorpay load failed!'); return; }

  try {
    const orderRes = await fetch('https://xoqolkqsdkfwxveuwlow.supabase.co/functions/v1/create_order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.REACT_APP_SUPABASE_ANON_KEY },
      body: JSON.stringify({ amount })
    });
    const order = await orderRes.json();

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: 'INR',
      order_id: order.id,
      name: 'Development Express',
      description: description || 'MachineOS Wallet Recharge',
      handler: function (response) { onSuccess(response); },
      prefill: {
        name: name || 'Customer',
        email: email || 'customer@machineos.in',
        contact: phone || '8408000084'
      },
      theme: { color: '#c9a84c' },
      modal: { ondismiss: () => { if (onFailure) onFailure(); } }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => { if (onFailure) onFailure(response.error); });
    rzp.open();
  } catch (err) {
    alert('Payment init failed: ' + err.message);
    if (onFailure) onFailure();
  }
};