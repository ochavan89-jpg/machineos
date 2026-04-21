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

  const options = {
    key: process.env.REACT_APP_RAZORPAY_KEY_ID,
    amount: amount * 100,
    currency: 'INR',
    name: 'Development Express',
    description: description || 'MachineOS Wallet Recharge',
    image: '',
    handler: function (response) {
      onSuccess(response);
    },
    prefill: { name, email, contact: phone },
    theme: { color: '#c9a84c' },
    modal: { ondismiss: () => { if (onFailure) onFailure(); } }
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (response) {
    if (onFailure) onFailure(response.error);
  });
  rzp.open();
};