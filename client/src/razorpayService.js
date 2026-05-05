export const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

export const initiatePayment = async ({ amount, userId, name, email, phone, description, onSuccess, onFailure }) => {
  const loaded = await loadRazorpay();
  if (!loaded) { alert('Razorpay load failed!'); return; }

  try {
    const token = localStorage.getItem('machineos_token');
    const orderRes = await fetch(`${API_BASE_URL}/api/wallet/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify({ amount, userId }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) throw new Error(order.error || 'Order creation failed');

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: 'INR',
      order_id: order.orderId,
      name: 'Development Express',
      description: description || 'MachineOS Wallet Recharge',
      handler: async function (response) {
        try {
          const verifyRes = await fetch(`${API_BASE_URL}/api/wallet/verify-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token || ''}`,
            },
            body: JSON.stringify({
              userId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const verifyPayload = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyPayload.error || 'Payment verification failed');
          onSuccess({ ...response, verification: verifyPayload });
        } catch (error) {
          if (onFailure) onFailure(error);
        }
      },
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