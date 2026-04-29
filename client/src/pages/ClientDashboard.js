import { initiatePayment } from '../razorpayService';
import React, { useState, useEffect,  } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionTimeout from '../hooks/useSessionTimeout';
import { useLanguage } from '../context/LanguageContext';
// import LanguageSelector from '../components/LanguageSelector';
import { generateGSTInvoice, generateBookingReport } from '../services/pdfGenerator';
import MobileNav from '../components/MobileNav';
import { useWindowSize } from '../hooks/useWindowSize';
import { sendBookingConfirmation } from '../emailService';
import { sendBookingWhatsApp } from '../whatsappService';
import { getMachines, createBooking, getWalletBalance, updateWalletBalance, addTransaction } from '../supabaseService';

const MACHINES = [];

const BOOKING_HISTORY = [
  { id: 'BK001', date: '09 Apr 2026', machine: 'JCB-001', type: 'Daily', hours: 7.5, baseAmt: 10500, gst: 1890, total: 12390, status: 'Completed' },
  { id: 'BK002', date: '07 Apr 2026', machine: 'EXC-002', type: 'Daily', hours: 7.5, baseAmt: 16500, gst: 2970, total: 19470, status: 'Completed' },
  { id: 'BK003', date: '01 Apr 2026', machine: 'GRD-005', type: 'Weekly', hours: 45, baseAmt: 86000, gst: 15480, total: 101480, status: 'Completed' },
  { id: 'BK004', date: '15 Mar 2026', machine: 'JCB-001', type: 'Monthly', hours: 195, baseAmt: 220000, gst: 39600, total: 259600, status: 'Completed' },
];

const TRANSACTIONS = [
  { type: 'credit', desc: 'Wallet Recharge — UPI/PhonePe', date: '10 Apr 2026, 9:15 AM', amount: 100000, ref: 'TXN9823741' },
  { type: 'debit', desc: 'JCB-001 — Daily Booking Advance', date: '09 Apr 2026, 7:30 AM', amount: 4200, ref: 'BK001-ADV' },
  { type: 'debit', desc: 'JCB-001 — Daily Settlement', date: '09 Apr 2026, 6:00 PM', amount: 8190, ref: 'BK001-SET' },
  { type: 'debit', desc: 'EXC-002 — Daily Booking Advance', date: '07 Apr 2026, 8:00 AM', amount: 6600, ref: 'BK002-ADV' },
  { type: 'debit', desc: 'EXC-002 — Daily Settlement', date: '07 Apr 2026, 5:30 PM', amount: 12870, ref: 'BK002-SET' },
  { type: 'credit', desc: 'Wallet Recharge — NEFT', date: '01 Apr 2026, 11:00 AM', amount: 200000, ref: 'TXN8712340' },
];

const NAV = [
  { id: 'book', icon: String.fromCodePoint(0x1F69C), label: 'Book Machine' },
  { id: 'calculator', icon: String.fromCodePoint(0x1F4B0), label: 'Cost & Booking' },
  { id: 'mybookings', icon: String.fromCodePoint(0x1F4CB), label: 'My Bookings' },
  { id: 'tracking', icon: String.fromCodePoint(0x1F4CD), label: 'Live Tracking' },
  { id: 'wallet', icon: String.fromCodePoint(0x1F4B3), label: 'Wallet & Pay' },
  { id: 'reports', icon: String.fromCodePoint(0x1F4CA), label: 'Reports' },
];

const NAV_LABELS = {
  bookMachine: 'Book Machine',
  costCalculator: 'Cost & Booking',
  myBookings: 'My Bookings',
  liveTracking: 'Live Tracking',
  wallet: 'Wallet & Pay',
  reports: 'Reports',
};

const ClientDashboard = () => {
  const navigate = useNavigate();
  useSessionTimeout();
  const { t } = useLanguage(); // eslint-disable-line
  const { isMobile, isTablet } = useWindowSize();
  const isSmall = isMobile || isTablet;

  const [activeTab, setActiveTab] = useState('book');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [bookingType, setBookingType] = useState('hourly');
  const [quantity, setQuantity] = useState(3);
  const [walletBalance, setWalletBalance] = useState(268140);
  const [rechargeAmt, setRechargeAmt] = useState('');
  const [showRecharge, setShowRecharge] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showBlacklistWarning, setShowBlacklistWarning] = useState(false);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelledCredit, setCancelledCredit] = useState(null);
  const [machineList, setMachineList] = useState([]);
  const [activeBookings, setActiveBookings] = useState([
    { id: 'BK005', machine: 'JCB-001', machineFull: 'JCB 3DX Backhoe Loader', operator: 'Ramesh Kadam', ratePerHour: 1400, type: 'Daily', startTime: '7:30 AM', hours: 7.5, advancePaid: 4200, status: 'Running', location: 'Karad, Satara', fuel: 72, date: '10 Apr 2026' },
  ]);

  const user = JSON.parse(localStorage.getItem('machineos_user') || '{}');

  useEffect(() => {
    const loadData = async () => {
      const machines = await getMachines();
      if (machines.length > 0) {
        const formatted = machines.map(m => ({
          id: m.machine_id, name: m.name, type: m.type, regNo: m.reg_no,
          year: m.year, location: m.location, fuel: m.fuel_level,
          condition: m.condition_pct, available: m.status !== 'Deployed',
          operator: 'Ramesh Kadam', operatorExp: 8, operatorRating: 4.9, operatorReviews: 47,
          rates: { perHour: m.rate_per_hour, perDay: m.rate_per_day, perWeek: m.rate_per_week, perMonth: m.rate_per_month },
          advance: { hourly: 3, weekly: 3, monthly: 15 },
          specs: 'Engine: 92 HP | Bucket: 0.21 m3',
        }));
        setMachineList(formatted);
      }
      if (user?.id) {
        const bal = await getWalletBalance(user.id);
        setWalletBalance(bal);
      }
    };
    loadData();

    const walletInterval = setInterval(async () => {
      const user = JSON.parse(localStorage.getItem('machineos_user') || '{}');
      if (user?.id) {
        const bal = await getWalletBalance(user.id);
        if (bal !== null) setWalletBalance(bal);
      }
    }, 30000);
    return () => clearInterval(walletInterval);
  }, []); // eslint-disable-line

  const displayMachines = machineList.length > 0 ? machineList : MACHINES;

  const calcAdvance = (machine, type) => {
    if (!machine) return 0;
    switch (type) {
      case 'hourly': return machine.rates.perHour * machine.advance.hourly;
      case 'daily': return machine.rates.perDay * 1;
      case 'weekly': return machine.rates.perDay * machine.advance.weekly;
      case 'monthly': return machine.rates.perDay * machine.advance.monthly;
      default: return 0;
    }
  };

  const calcTotal = (machine, type, qty) => {
    if (!machine) return 0;
    switch (type) {
      case 'hourly': return machine.rates.perHour * qty;
      case 'daily': return machine.rates.perDay * qty;
      case 'weekly': return machine.rates.perWeek * qty;
      case 'monthly': return machine.rates.perMonth * qty;
      default: return 0;
    }
  };

  const advanceAmt = calcAdvance(selectedMachine, bookingType);
  const totalCost = calcTotal(selectedMachine, bookingType, quantity);

  const handleBook = () => {
    if (walletBalance < advanceAmt) { setShowRecharge(true); return; }
    setShowPayment(true);
  };

  const handleConfirmBooking = async () => {
    const bookingRef = 'BK' + Date.now();
    await createBooking({
      booking_ref: bookingRef,
      client_id: user.id,
      booking_type: bookingType,
      quantity: quantity,
      base_amount: totalCost,
      gst_amount: Math.round(totalCost * 0.18),
      total_amount: Math.round(totalCost * 1.18),
      advance_paid: advanceAmt,
      status: 'Active',
      start_date: new Date().toISOString().split('T')[0],
      location: selectedMachine.location,
    });
    await updateWalletBalance(user.id, -advanceAmt);
    await addTransaction({ user_id: user.id, type: 'debit', amount: advanceAmt, description: selectedMachine.name + ' Booking Advance', ref: bookingRef });
    setWalletBalance(prev => prev - advanceAmt);
    setActiveBookings(prev => [...prev, {
      id: bookingRef, machine: selectedMachine.id, machineFull: selectedMachine.name,
      operator: selectedMachine.operator, ratePerHour: selectedMachine.rates.perHour,
      type: bookingType.charAt(0).toUpperCase() + bookingType.slice(1),
      startTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      hours: quantity, advancePaid: advanceAmt, status: 'Running',
      location: selectedMachine.location, fuel: selectedMachine.fuel,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    }]);
    sendBookingConfirmation('machineos@developmentexpress.in', { id: bookingRef, machine: selectedMachine.name, type: bookingType, advance: advanceAmt.toLocaleString('en-IN') });
    sendBookingWhatsApp('+918408000084', { id: bookingRef, machine: selectedMachine.name, type: bookingType, advance: advanceAmt.toLocaleString('en-IN') });
    setShowPayment(false);
    setActiveTab('mybookings');
  };

  const CLIENT = JSON.parse(localStorage.getItem('machineos_user') || '{}');
const clientName = CLIENT.name || 'Client';

 const handleRecharge = async () => {
  const amt = parseInt(rechargeAmt);
  if (!amt || amt < 1) { alert('Minimum Rs.1 recharge करा!'); return; }
  
  await initiatePayment({
    amount: amt,
    name: clientName,
    email: CLIENT.email || 'machineos@developmentexpress.in',
    phone: CLIENT.phone || '+919766926636',
    description: 'MachineOS Wallet Recharge',
    onSuccess: async (response) => {
      const newBalance = walletBalance + amt;
      if (CLIENT?.id) {
        await updateWalletBalance(CLIENT.id, newBalance);
        await addTransaction({
          user_id: CLIENT.id,
          type: 'credit',
          amount: amt,
          description: 'Wallet Recharge - Razorpay',
          reference: response.razorpay_payment_id
        });
      }
      setWalletBalance(newBalance);
      setShowRecharge(false);
      // WhatsApp alert to admin
fetch('https://xoqolkqsdkfwxveuwlow.supabase.co/functions/v1/send_whatsapp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+918408000084',
    message: 'MachineOS Payment Received!\nClient: ' + (CLIENT.name || 'Client') + '\nAmount: Rs.' + amt.toLocaleString('en-IN') + '\nPayment ID: ' + response.razorpay_payment_id + '\nNew Balance: Rs.' + newBalance.toLocaleString('en-IN')
  })
}).catch(e => console.log('WhatsApp error:', e));

alert(String.fromCodePoint(0x2705) + ' Payment Successful!\nRs.' + amt.toLocaleString('en-IN') + ' wallet मध्ये add झाले!\nPayment ID: ' + response.razorpay_payment_id);
    },
    onFailure: () => {
      alert(String.fromCodePoint(0x274C) + ' Payment failed! पुन्हा try करा.');
    }
  });
};

  const handleCancelRequest = (booking) => { setCancelBooking(booking); setShowCancelModal(true); };

  const handleConfirmCancel = () => {
    const penalty = cancelBooking.ratePerHour * 1;
    const credit = cancelBooking.advancePaid - penalty;
    setWalletBalance(prev => prev + credit);
    setActiveBookings(prev => prev.filter(b => b.id !== cancelBooking.id));
    setCancelledCredit({ machine: cancelBooking.machine, deducted: penalty, credited: credit });
    setShowCancelModal(false);
    setCancelBooking(null);
  };

  const getQtyConfig = () => {
    switch (bookingType) {
      case 'hourly': return { min: 3, max: 12, unit: 'Hours' };
      case 'daily': return { min: 1, max: 30, unit: 'Days' };
      case 'weekly': return { min: 1, max: 12, unit: 'Weeks' };
      case 'monthly': return { min: 1, max: 12, unit: 'Months' };
      default: return { min: 1, max: 30, unit: 'Days' };
    }
  };
  const qtyConfig = getQtyConfig();

  const mobileNavItems = NAV.map(n => ({ ...n, label: NAV_LABELS[n.label] || n.label }));

  return (
    <div style={s.container}>
      {isSmall && (
        <MobileNav
          navItems={mobileNavItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          title="Development Express"
          subtitle="Client Portal"
          topContent={
            <div style={{ background: 'rgba(201,168,76,0.08)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <p style={{ color: '#8896a8', fontSize: '9px', margin: '0 0 3px', letterSpacing: '1px' }}>WALLET BALANCE</p>
              <p style={{ color: '#c9a84c', fontSize: '18px', fontWeight: '700', margin: '0 0 6px' }}>Rs.{walletBalance.toLocaleString('en-IN')}</p>
              <button style={{ background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '6px', padding: '6px 16px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', width: '100%' }} onClick={() => setShowRecharge(true)}>+ Recharge</button>
            </div>
          }
          bottomContent={
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.08)', color: '#e94560', cursor: 'pointer', fontSize: '13px', width: '100%' }} onClick={() => navigate('/')}>Logout</button>
          }
        />
      )}

      {!isSmall && (
        <div style={s.sidebar}>
          <div style={s.sidebarLogo}>
            <div style={s.logoCircle}>DE</div>
            <div>
              <p style={s.logoTitle}>Development Express</p>
              <p style={s.logoSub}>Client Portal</p>
            </div>
          </div>
          <div style={s.divider} />
          {mobileNavItems.map(item => (
            <button key={item.id} style={activeTab === item.id ? s.navActive : s.nav} onClick={() => setActiveTab(item.id)}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
          <div style={s.divider} />
          <div style={s.walletBox}>
            <p style={s.walletLabel}>WALLET BALANCE</p>
            <p style={s.walletAmount}>Rs.{walletBalance.toLocaleString('en-IN')}</p>
            <p style={{ color: 'rgba(201,168,76,0.5)', fontSize: '9px', margin: '0 0 8px', letterSpacing: '1px' }}>WALLET-ONLY - NO CASH</p>
            <button style={s.rechargeBtn} onClick={() => setShowRecharge(true)}>+ Recharge Wallet</button>
          </div>
          <div style={s.warningBox} onClick={() => setShowBlacklistWarning(true)}>
            <p style={s.warningText}>Direct Contact = Blacklist</p>
          </div>
          <button style={s.logoutBtn} onClick={() => navigate('/')}>Logout</button>
          <p style={s.sidebarFooter}>Since 2011 - 15 Yrs Excellence</p>
        </div>
      )}

      <div style={{ ...s.main, padding: isSmall ? '70px 12px 70px' : '25px' }}>
        <div style={{ ...s.header, flexDirection: isSmall ? 'column' : 'row', gap: isSmall ? '8px' : '0' }}>
          <div>
            <button style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.25)', color:'#c9a84c', borderRadius:'8px', padding:'4px 10px', fontSize:'12px', cursor:'pointer', fontWeight:'600', marginBottom:'6px' }} onClick={() => { const tabs=['book','calculator','mybookings','tracking','wallet','reports']; const i=tabs.indexOf(activeTab); if(i>0) setActiveTab(tabs[i-1]); }}>←</button>
            <h2 style={{ ...s.pageTitle, fontSize: isSmall ? '16px' : '20px' }}>
              {mobileNavItems.find(n => n.id === activeTab)?.icon}{' '}
              {mobileNavItems.find(n => n.id === activeTab)?.label}
            </h2>
            <p style={s.pageDate}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            
            {!isSmall && (
              <div style={s.clientBadge}>
                <span style={s.onlineDot}></span>
                Patil Builders Pvt. Ltd.
              </div>
            )}
          </div>
        </div>

        {activeTab === 'book' && (
          <div>
            <div style={{ ...s.infoBanner, fontSize: isSmall ? '11px' : '12px' }}>
              <p style={{ margin: 0, color: '#c9a84c' }}><strong>Wallet-Only Policy:</strong> All transactions via Wallet only. No cash accepted.</p>
            </div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '🚜', val: displayMachines.filter(m => m.available).length, label: 'Available Now' },
                { icon: '💳', val: 'Rs.' + (walletBalance / 1000).toFixed(0) + 'K', label: 'Wallet Balance' },
                { icon: '📋', val: activeBookings.length, label: 'Active Bookings' },
                { icon: '⭐', val: '4.78', label: 'Avg Rating' },
              ].map((c, i) => (
                <div key={i} style={s.card}>
                  <p style={s.cardIcon}>{c.icon}</p>
                  <h3 style={s.cardVal}>{c.val}</h3>
                  <p style={s.cardLbl}>{c.label}</p>
                </div>
              ))}
            </div>
            <h3 style={s.sectionTitle}>Available Machinery</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
              {displayMachines.map((m, i) => (
                <div key={i} style={{ ...s.machineCard, opacity: m.available ? 1 : 0.6 }}>
                  <div style={s.machineHeader}>
                    <div>
                      <p style={s.machineName}>{m.name}</p>
                      <p style={s.machineType}>{m.type} - {m.regNo}</p>
                      <p style={{ color: '#8896a8', fontSize: '10px', margin: '2px 0 0' }}>{m.specs}</p>
                    </div>
                    <span style={{ ...s.availBadge, background: m.available ? 'rgba(76,175,80,0.15)' : 'rgba(233,69,96,0.15)', border: '1px solid ' + (m.available ? '#4CAF50' : '#e94560'), color: m.available ? '#4CAF50' : '#e94560' }}>
                      {m.available ? 'Available' : 'Deployed'}
                    </span>
                  </div>
                  <div style={s.fuelRow}>
                    <span style={s.fuelLabel}>Fuel:</span>
                    <div style={s.fuelBarBg}><div style={{ ...s.fuelBarFill, width: m.fuel + '%', background: m.fuel > 50 ? '#4CAF50' : m.fuel > 25 ? '#FF9800' : '#e94560' }}></div></div>
                    <span style={{ color: m.fuel > 50 ? '#4CAF50' : '#e94560', fontSize: '12px', fontWeight: '700' }}>{m.fuel}%</span>
                  </div>
                  <div style={s.rateCardBox}>
                    <p style={s.rateCardTitle}>Rate Card (Operator Included)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                      {[
                        { val: 'Rs.' + m.rates.perHour.toLocaleString('en-IN'), lbl: '/hr', adv: m.advance.hourly + 'hr adv' },
                        { val: 'Rs.' + m.rates.perDay.toLocaleString('en-IN'), lbl: '/day', adv: '1 day adv' },
                        { val: 'Rs.' + m.rates.perWeek.toLocaleString('en-IN'), lbl: '/wk', adv: m.advance.weekly + 'd adv' },
                        { val: 'Rs.' + m.rates.perMonth.toLocaleString('en-IN'), lbl: '/mo', adv: m.advance.monthly + 'd adv' },
                      ].map((r, j) => (
                        <div key={j} style={{ textAlign: 'center', background: 'rgba(201,168,76,0.05)', borderRadius: '6px', padding: '6px 3px' }}>
                          <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '11px', margin: '0 0 1px' }}>{r.val}</p>
                          <p style={{ color: '#8896a8', fontSize: '9px', margin: '0 0 1px' }}>{r.lbl}</p>
                          <p style={{ color: 'rgba(233,69,96,0.8)', fontSize: '8px', margin: 0 }}>{r.adv}</p>
                        </div>
                      ))}
                    </div>
                    <p style={s.gstNote}>* GST 18% extra - Fuel included - Operator included</p>
                  </div>
                  <div style={s.operatorBox}>
                    <div style={s.operatorAvatar}>{m.operator.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <p style={s.operatorName}>{m.operator}</p>
                      <p style={s.operatorExp}>{m.operatorExp} yrs - {m.operatorReviews} reviews</p>
                    </div>
                    <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '14px', margin: 0 }}>⭐ {m.operatorRating}</p>
                  </div>
                  {m.available ? (
                    <button style={s.selectBtn} onClick={() => { setSelectedMachine(m); setQuantity(3); setBookingType('hourly'); setActiveTab('calculator'); }}>
                      Book This Machine
                    </button>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(233,69,96,0.08)', borderRadius: '8px', color: '#e94560', fontSize: '12px' }}>Currently Deployed</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'calculator' && (
          <div>
            {!selectedMachine ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ fontSize: '50px', margin: '0 0 15px' }}>🚜</p>
                <p style={{ color: '#8896a8', fontSize: '15px', marginBottom: '20px' }}>Select a Machine first</p>
                <button style={s.goBtn} onClick={() => setActiveTab('book')}>View Fleet</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '1.2fr 1fr', gap: '20px' }}>
                <div style={s.calcCard}>
                  <h3 style={s.calcTitle}>Booking & Cost Calculator</h3>
                  <div style={s.selectedBox}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <p style={s.selLabel}>Selected Machine</p>
                        <p style={s.selName}>{selectedMachine.name}</p>
                        <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>{selectedMachine.type} - {selectedMachine.regNo}</p>
                      </div>
                      <button style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }} onClick={() => setActiveTab('book')}>Change</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ color: '#8896a8', fontSize: '12px', margin: '0 0 8px' }}>Booking Type:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'hourly', label: 'Hourly', icon: '⏱️', rate: 'Rs.' + selectedMachine.rates.perHour + '/hr' },
                        { id: 'daily', label: 'Daily', icon: '📅', rate: 'Rs.' + selectedMachine.rates.perDay + '/d' },
                        { id: 'weekly', label: 'Weekly', icon: '📆', rate: 'Rs.' + selectedMachine.rates.perWeek + '/wk' },
                        { id: 'monthly', label: 'Monthly', icon: '🗓️', rate: 'Rs.' + selectedMachine.rates.perMonth + '/mo' },
                      ].map(tp => (
                        <div key={tp.id} style={{ borderRadius: '8px', padding: '8px 4px', textAlign: 'center', cursor: 'pointer', border: bookingType === tp.id ? '2px solid #c9a84c' : '1px solid rgba(201,168,76,0.2)', background: bookingType === tp.id ? 'rgba(201,168,76,0.12)' : 'rgba(0,0,0,0.3)' }}
                          onClick={() => { setBookingType(tp.id); setQuantity(tp.id === 'hourly' ? 3 : 1); }}>
                          <p style={{ fontSize: '16px', margin: '0 0 2px' }}>{tp.icon}</p>
                          <p style={{ color: bookingType === tp.id ? '#c9a84c' : '#e8e0d0', fontWeight: '700', fontSize: '11px', margin: '0 0 2px' }}>{tp.label}</p>
                          <p style={{ color: '#4CAF50', fontSize: '9px', margin: 0 }}>{tp.rate}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ color: '#8896a8', fontSize: '12px', margin: '0 0 6px' }}>{qtyConfig.unit}: <span style={{ color: '#c9a84c', fontWeight: '700' }}>{quantity}</span></p>
                    <input type="range" min={qtyConfig.min} max={qtyConfig.max} value={quantity} onChange={e => setQuantity(Number(e.target.value))} style={{ width: '100%', accentColor: '#c9a84c' }} />
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                    {[
                      { label: 'Base Amount', val: 'Rs.' + totalCost.toLocaleString('en-IN') },
                      { label: 'GST @ 18%', val: 'Rs.' + Math.round(totalCost * 0.18).toLocaleString('en-IN') },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ color: '#8896a8', fontSize: '12px' }}>{r.label}</span>
                        <span style={{ color: '#e8e0d0', fontSize: '12px', fontWeight: '600' }}>{r.val}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0' }}>
                      <span style={{ color: '#c9a84c', fontWeight: '700' }}>Grand Total</span>
                      <span style={{ color: '#c9a84c', fontWeight: '700', fontSize: '16px' }}>Rs.{Math.round(totalCost * 1.18).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', padding: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>Min Advance Required</p>
                      <p style={{ color: '#c9a84c', fontWeight: '700', margin: 0 }}>Rs.{advanceAmt.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div style={{ borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between', marginBottom: '12px', border: walletBalance >= advanceAmt ? '1px solid rgba(76,175,80,0.4)' : '1px solid rgba(233,69,96,0.4)', background: walletBalance >= advanceAmt ? 'rgba(76,175,80,0.08)' : 'rgba(233,69,96,0.08)' }}>
                    <span style={{ fontSize: '12px' }}>Wallet: Rs.{walletBalance.toLocaleString('en-IN')}</span>
                    <span style={{ fontWeight: '700', color: walletBalance >= advanceAmt ? '#4CAF50' : '#e94560' }}>{walletBalance >= advanceAmt ? 'OK' : 'Low'}</span>
                  </div>
                  {walletBalance >= advanceAmt ? (
                    <button style={s.bookNowBtn} onClick={handleBook}>BOOK — Pay Rs.{advanceAmt.toLocaleString('en-IN')} Advance</button>
                  ) : (
                    <button style={{ width: '100%', padding: '12px', background: 'rgba(233,69,96,0.1)', color: '#e94560', border: '1px solid rgba(233,69,96,0.4)', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }} onClick={() => setShowRecharge(true)}>
                      Recharge — Rs.{(advanceAmt - walletBalance).toLocaleString('en-IN')} short
                    </button>
                  )}
                </div>
                {!isSmall && (
                  <div style={s.detailCard}>
                    <h3 style={s.calcTitle}>Machine Details</h3>
                    <div>
                      {[
                        { label: 'Machine ID', val: selectedMachine.id },
                        { label: 'Type', val: selectedMachine.type },
                        { label: 'Location', val: selectedMachine.location },
                        { label: 'Fuel Level', val: selectedMachine.fuel + '%' },
                        { label: 'Condition', val: selectedMachine.condition + '%' },
                        { label: 'Operator', val: selectedMachine.operator },
                        { label: 'Experience', val: selectedMachine.operatorExp + ' Years' },
                        { label: 'Rating', val: '⭐ ' + selectedMachine.operatorRating },
                      ].map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ color: '#8896a8', fontSize: '12px' }}>{d.label}</span>
                          <span style={{ color: '#e8e0d0', fontSize: '12px', fontWeight: '600' }}>{d.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mybookings' && (
          <div>
            {cancelledCredit && (
              <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: '10px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <p style={{ color: '#4CAF50', fontSize: '12px', margin: 0 }}>{cancelledCredit.machine} Cancelled | Rs.{cancelledCredit.credited.toLocaleString('en-IN')} Wallet Credit!</p>
                <button style={{ background: 'transparent', border: 'none', color: '#8896a8', cursor: 'pointer', fontSize: '16px' }} onClick={() => setCancelledCredit(null)}>X</button>
              </div>
            )}
            <div style={{ background: 'rgba(233,69,96,0.06)', border: '1px solid rgba(233,69,96,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '20px' }}>
              <p style={{ color: '#e94560', fontWeight: '700', fontSize: '12px', margin: '0 0 4px' }}>Cancellation Policy — No Refund</p>
              <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>1 hour charge deducted on cancel. Balance credited to Wallet. No bank refund.</p>
            </div>
            <h3 style={s.sectionTitle}>Active Bookings ({activeBookings.length})</h3>
            {activeBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ fontSize: '40px', margin: '0 0 12px' }}>📋</p>
                <p style={{ color: '#8896a8', marginBottom: '15px' }}>No active bookings</p>
                <button style={s.goBtn} onClick={() => setActiveTab('book')}>Book Machine</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
                {activeBookings.map((b, i) => (
                  <div key={i} style={{ background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '3px 10px', borderRadius: '20px', fontSize: '11px' }}>{b.machine}</span>
                        <span style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50', padding: '3px 10px', borderRadius: '20px', fontSize: '11px' }}>{b.status}</span>
                      </div>
                      <button style={{ background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.4)', color: '#e94560', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }} onClick={() => handleCancelRequest(b)}>Cancel</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {[
                        { label: 'Operator', val: b.operator },
                        { label: 'Location', val: b.location },
                        { label: 'Started', val: b.startTime },
                        { label: 'Advance', val: 'Rs.' + b.advancePaid.toLocaleString('en-IN') },
                      ].map((d, j) => (
                        <div key={j} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px' }}>
                          <p style={{ color: '#8896a8', fontSize: '9px', margin: '0 0 2px' }}>{d.label}</p>
                          <p style={{ color: '#e8e0d0', fontSize: '12px', fontWeight: '600', margin: 0 }}>{d.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <h3 style={s.sectionTitle}>Booking History</h3>
            <div style={s.tableCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ color: '#c9a84c', margin: 0, fontSize: '14px' }}>All Bookings</h3>
                <button style={s.downloadBtn} onClick={() => generateGSTInvoice({ invoiceNo: 'DE/INV/2026/041001', invoiceDate: new Date().toLocaleDateString('en-IN'), bookingId: 'BK-2026-041001', clientName: 'Patil Builders Pvt. Ltd.', clientAddr: 'Karad, Satara - 415110', clientGST: '27AABCP1234A1Z5', clientPhone: '+91-9876543210', machineName: 'JCB 3DX Backhoe Loader', operator: 'Ramesh Kadam', location: 'Karad, Satara', workPeriod: '01-10 Apr 2026', hours: 75, ratePerHour: 1400, baseAmount: 105000, advancePaid: 4200 })}>GST Invoice</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...s.table, minWidth: '600px' }}>
                  <thead><tr>{['ID', 'Date', 'Machine', 'Type', 'Hrs', 'Base', 'GST', 'Total', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {BOOKING_HISTORY.map((b, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={{ ...s.td, color: '#c9a84c', fontSize: '11px' }}>{b.id}</td>
                        <td style={s.td}>{b.date}</td>
                        <td style={s.td}><span style={s.machineTag}>{b.machine}</span></td>
                        <td style={s.td}>{b.type}</td>
                        <td style={s.td}>{b.hours}</td>
                        <td style={s.td}>Rs.{b.baseAmt.toLocaleString('en-IN')}</td>
                        <td style={s.td}>Rs.{b.gst.toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#c9a84c', fontWeight: '700' }}>Rs.{b.total.toLocaleString('en-IN')}</td>
                        <td style={s.td}><span style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50', padding: '3px 8px', borderRadius: '20px', fontSize: '10px' }}>Done</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tracking' && (
          <div style={{ background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: '#c9a84c', margin: 0 }}>Live Machine Location</h3>
              <span style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50', padding: '4px 12px', borderRadius: '20px', fontSize: '11px' }}>LIVE</span>
            </div>
            <div style={{ height: isSmall ? '200px' : '280px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(201,168,76,0.1)', marginBottom: '15px' }}>
              <p style={{ fontSize: '35px', margin: '0 0 8px' }}>📍</p>
              <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '14px', margin: '0 0 4px' }}>Karad, Satara</p>
              <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>JCB-001 - Last Updated: Just Now</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { icon: '🚜', label: 'Machine', val: 'JCB-001' },
                { icon: '⏱️', label: 'HMR Today', val: '6.5 hrs' },
                { icon: '⛽', label: 'Fuel', val: '72%' },
              ].map((t, i) => (
                <div key={i} style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '18px', margin: '0 0 4px' }}>{t.icon}</p>
                  <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 2px' }}>{t.label}</p>
                  <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '13px', margin: 0 }}>{t.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr', gap: '20px' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '16px', padding: '25px' }}>
              <p style={{ color: '#8896a8', fontSize: '11px', letterSpacing: '2px', margin: '0 0 4px' }}>WALLET BALANCE</p>
              <h2 style={{ color: '#c9a84c', fontSize: isSmall ? '32px' : '44px', fontWeight: '900', margin: '0 0 2px', lineHeight: 1 }}>Rs.{walletBalance.toLocaleString('en-IN')}</h2>
              <p style={{ color: '#8896a8', fontSize: '12px', margin: '0 0 4px' }}>Patil Builders Pvt. Ltd.</p>
              <span style={{ background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.3)', color: '#e94560', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700' }}>WALLET-ONLY — NO CASH</span>
              <div style={{ height: '1px', background: 'rgba(201,168,76,0.15)', margin: '18px 0' }} />
              <p style={{ color: '#c9a84c', fontWeight: '700', marginBottom: '12px', fontSize: '13px' }}>Quick Recharge via UPI</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'center', background: '#fff', borderRadius: '12px', padding: '12px', flexShrink: 0 }}>
                  <p style={{ color: '#333', fontWeight: '700', fontSize: '10px', margin: '0 0 8px' }}>Scan to Pay</p>
                  <img src={process.env.PUBLIC_URL + '/upi_qr.png'} alt="UPI QR" style={{ width: '110px', height: '110px', display: 'block' }} />
                  <p style={{ color: '#666', fontSize: '9px', margin: '6px 0 0' }}>PhonePe | GPay | Paytm | BHIM</p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#8896a8', fontSize: '11px', margin: '0 0 6px' }}>Quick Select:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '10px' }}>
                    {[10000, 25000, 50000, 100000].map(amt => (
                      <button key={amt} style={{ background: rechargeAmt === amt.toString() ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.1)', border: rechargeAmt === amt.toString() ? '2px solid #c9a84c' : '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '8px 4px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }} onClick={() => setRechargeAmt(amt.toString())}>
                        Rs.{(amt / 1000).toFixed(0)}K
                      </button>
                    ))}
                  </div>
                  <input style={{ width: '100%', padding: '9px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box', marginBottom: '8px' }} type="number" placeholder="Custom (Min Rs.5,000)" value={rechargeAmt} onChange={e => setRechargeAmt(e.target.value)} />
                  <button style={{ width: '100%', background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '13px', marginBottom: '10px' }} onClick={handleRecharge}>Pay Now</button>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['UPI', 'NEFT', 'IMPS', 'Card', 'Net Banking'].map(m => (
                      <span key={m} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '600' }}>{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '25px' }}>
              <h3 style={{ color: '#c9a84c', margin: '0 0 15px', fontSize: '15px' }}>Transaction History</h3>
              {TRANSACTIONS.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, background: t.type === 'credit' ? 'rgba(76,175,80,0.15)' : 'rgba(233,69,96,0.15)', color: t.type === 'credit' ? '#4CAF50' : '#e94560', fontWeight: '700' }}>
                    {t.type === 'credit' ? '+' : '-'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#e8e0d0', fontSize: '11px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</p>
                    <p style={{ color: '#8896a8', fontSize: '10px', margin: 0 }}>{t.date}</p>
                  </div>
                  <p style={{ color: t.type === 'credit' ? '#4CAF50' : '#e94560', fontWeight: '700', fontSize: '13px', margin: 0, flexShrink: 0 }}>
                    {t.type === 'credit' ? '+' : '-'}Rs.{t.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '💰', val: 'Rs.' + BOOKING_HISTORY.reduce((a, b) => a + b.total, 0).toLocaleString('en-IN'), label: 'Total Spent' },
                { icon: '⏱️', val: BOOKING_HISTORY.reduce((a, b) => a + b.hours, 0) + ' hrs', label: 'Machine Hours' },
                { icon: '📋', val: BOOKING_HISTORY.length, label: 'Total Bookings' },
                { icon: '📄', val: BOOKING_HISTORY.length, label: 'GST Invoices' },
              ].map((c, i) => (
                <div key={i} style={s.card}>
                  <p style={s.cardIcon}>{c.icon}</p>
                  <h3 style={s.cardVal}>{c.val}</h3>
                  <p style={s.cardLbl}>{c.label}</p>
                </div>
              ))}
            </div>
            <div style={s.tableCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ color: '#c9a84c', margin: 0, fontSize: '14px' }}>Booking Report</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={s.downloadBtn} onClick={() => generateGSTInvoice({ invoiceNo: 'DE/INV/2026/041001', invoiceDate: new Date().toLocaleDateString('en-IN'), bookingId: 'BK-2026-041001', clientName: 'Patil Builders Pvt. Ltd.', clientAddr: 'Karad, Satara - 415110', clientGST: '27AABCP1234A1Z5', clientPhone: '+91-9876543210', machineName: 'JCB 3DX Backhoe Loader', operator: 'Ramesh Kadam', location: 'Karad, Satara', workPeriod: '01-10 Apr 2026', hours: 75, ratePerHour: 1400, baseAmount: 105000, advancePaid: 4200 })}>GST PDF</button>
                  <button style={s.downloadBtn} onClick={() => generateBookingReport(BOOKING_HISTORY, 'Patil Builders Pvt. Ltd.')}>Report PDF</button>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...s.table, minWidth: '600px' }}>
                  <thead><tr>{['ID', 'Date', 'Machine', 'Type', 'Hrs', 'Base', 'GST', 'Total', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {BOOKING_HISTORY.map((b, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={{ ...s.td, color: '#c9a84c', fontSize: '11px' }}>{b.id}</td>
                        <td style={s.td}>{b.date}</td>
                        <td style={s.td}><span style={s.machineTag}>{b.machine}</span></td>
                        <td style={s.td}>{b.type}</td>
                        <td style={s.td}>{b.hours}</td>
                        <td style={s.td}>Rs.{b.baseAmt.toLocaleString('en-IN')}</td>
                        <td style={s.td}>Rs.{b.gst.toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#c9a84c', fontWeight: '700' }}>Rs.{b.total.toLocaleString('en-IN')}</td>
                        <td style={s.td}><span style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50', padding: '3px 8px', borderRadius: '20px', fontSize: '10px' }}>Done</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPayment && selectedMachine && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, width: isSmall ? '95%' : '430px' }}>
            <h3 style={s.modalTitle}>Confirm Booking</h3>
            <div style={s.modalDetail}>
              {[
                { label: 'Machine', val: selectedMachine.name },
                { label: 'Booking Type', val: bookingType.toUpperCase() },
                { label: 'Advance', val: 'Rs.' + advanceAmt.toLocaleString('en-IN'), gold: true },
                { label: 'Wallet After', val: 'Rs.' + (walletBalance - advanceAmt).toLocaleString('en-IN'), green: true },
              ].map((r, i) => (
                <div key={i} style={s.modalRow}>
                  <span style={{ color: '#8896a8' }}>{r.label}</span>
                  <span style={{ color: r.gold ? '#c9a84c' : r.green ? '#4CAF50' : '#e8e0d0', fontWeight: r.gold || r.green ? '700' : '400' }}>{r.val}</span>
                </div>
              ))}
            </div>
            <p style={{ color: '#FF9800', fontSize: '11px', textAlign: 'center', marginBottom: '15px' }}>Advance will be deducted from Wallet</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={s.cancelBtn} onClick={() => setShowPayment(false)}>Cancel</button>
              <button style={s.confirmBtn} onClick={handleConfirmBooking}>Confirm Booking</button>
            </div>
          </div>
        </div>
      )}

      {showRecharge && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, width: isSmall ? '95%' : '430px' }}>
            <h3 style={s.modalTitle}>Wallet Recharge</h3>
            <p style={{ color: '#8896a8', textAlign: 'center', marginBottom: '15px' }}>Current: Rs.{walletBalance.toLocaleString('en-IN')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[10000, 25000, 50000, 100000].map(amt => (
                <button key={amt} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }} onClick={() => setRechargeAmt(amt.toString())}>Rs.{(amt / 1000).toFixed(0)}K</button>
              ))}
            </div>
            <input style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', marginBottom: '15px' }} type="number" placeholder="Custom (Min Rs.5,000)" value={rechargeAmt} onChange={e => setRechargeAmt(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={s.cancelBtn} onClick={() => setShowRecharge(false)}>Cancel</button>
              <button style={s.confirmBtn} onClick={handleRecharge}>Pay Now</button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && cancelBooking && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, width: isSmall ? '95%' : '430px' }}>
            <h3 style={{ ...s.modalTitle, color: '#e94560' }}>Cancel Booking?</h3>
            <div style={s.modalDetail}>
              <div style={s.modalRow}><span style={{ color: '#8896a8' }}>Machine</span><span style={{ color: '#c9a84c' }}>{cancelBooking.machine}</span></div>
              <div style={s.modalRow}><span style={{ color: '#8896a8' }}>Penalty (1 hr)</span><span style={{ color: '#e94560', fontWeight: '700' }}>- Rs.{cancelBooking.ratePerHour.toLocaleString('en-IN')}</span></div>
              <div style={{ ...s.modalRow, borderBottom: 'none' }}><span style={{ color: '#4CAF50', fontWeight: '700' }}>Wallet Credit</span><span style={{ color: '#4CAF50', fontWeight: '700', fontSize: '16px' }}>+ Rs.{(cancelBooking.advancePaid - cancelBooking.ratePerHour).toLocaleString('en-IN')}</span></div>
            </div>
            <p style={{ color: '#e94560', fontSize: '11px', textAlign: 'center', margin: '10px 0 15px' }}>No Bank Refund — Wallet Credit Only</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={s.cancelBtn} onClick={() => setShowCancelModal(false)}>?</button>
              <button style={{ ...s.confirmBtn, background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }} onClick={handleConfirmCancel}>Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showBlacklistWarning && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, width: isSmall ? '95%' : '430px' }}>
            <h3 style={{ ...s.modalTitle, color: '#e94560' }}>BLACKLIST WARNING</h3>
            <div style={{ background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.4)', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
              <p style={{ color: '#e94560', fontWeight: '700', fontSize: '13px', margin: '0 0 8px', textAlign: 'center' }}>Direct Contact Strictly Prohibited</p>
              {['Client and Machine will be Blacklisted', 'All Bookings will be Cancelled', 'Wallet Balance will be Frozen', 'Legal Action will be taken'].map((item, i) => (
                <p key={i} style={{ color: '#e94560', fontSize: '12px', margin: '4px 0' }}>X {item}</p>
              ))}
            </div>
            <button style={s.confirmBtn} onClick={() => setShowBlacklistWarning(false)}>Understood</button>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  container: { display: 'flex', minHeight: '100vh', background: '#050d1a', fontFamily: 'Arial, sans-serif', color: '#fff' },
  sidebar: { width: '230px', background: 'linear-gradient(180deg, #0f2040 0%, #0a1628 100%)', borderRight: '1px solid rgba(201,168,76,0.2)', padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  logoCircle: { width: '38px', height: '38px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0a1628', fontSize: '13px', flexShrink: 0 },
  logoTitle: { color: '#c9a84c', fontWeight: '700', fontSize: '12px', margin: 0 },
  logoSub: { color: '#8896a8', fontSize: '10px', margin: 0 },
  divider: { height: '1px', background: 'rgba(201,168,76,0.15)', margin: '8px 0' },
  nav: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#8896a8', cursor: 'pointer', fontSize: '12px', width: '100%', textAlign: 'left' },
  navActive: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.1)', color: '#c9a84c', cursor: 'pointer', fontSize: '12px', width: '100%', textAlign: 'left', fontWeight: '700' },
  walletBox: { background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '10px', padding: '12px', textAlign: 'center', margin: '5px 0' },
  walletLabel: { color: '#8896a8', fontSize: '9px', margin: '0 0 4px', letterSpacing: '1px' },
  walletAmount: { color: '#c9a84c', fontSize: '18px', fontWeight: '700', margin: '0 0 4px' },
  rechargeBtn: { background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '6px', padding: '6px 16px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', width: '100%' },
  warningBox: { background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.25)', borderRadius: '8px', padding: '8px', textAlign: 'center', cursor: 'pointer', margin: '4px 0' },
  warningText: { color: '#e94560', fontSize: '10px', margin: 0, fontWeight: '600' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.08)', color: '#e94560', cursor: 'pointer', fontSize: '12px', width: '100%', marginTop: 'auto' },
  sidebarFooter: { color: 'rgba(201,168,76,0.4)', fontSize: '9px', textAlign: 'center', marginTop: '8px', letterSpacing: '1px' },
  main: { flex: 1, overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '18px', borderBottom: '1px solid rgba(201,168,76,0.15)' },
  pageTitle: { color: '#c9a84c', fontWeight: '700', margin: '0 0 4px' },
  pageDate: { color: '#8896a8', fontSize: '11px', margin: 0 },
  clientBadge: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', padding: '8px 14px', borderRadius: '20px', color: '#c9a84c', fontSize: '12px' },
  onlineDot: { width: '7px', height: '7px', background: '#4CAF50', borderRadius: '50%', display: 'inline-block' },
  infoBanner: { background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '10px', padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px' },
  cardRow: { display: 'grid', gap: '12px', marginBottom: '18px' },
  card: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '16px', textAlign: 'center' },
  cardIcon: { fontSize: '22px', margin: '0 0 6px' },
  cardVal: { color: '#c9a84c', fontSize: '18px', fontWeight: '700', margin: '0 0 4px' },
  cardLbl: { color: '#8896a8', fontSize: '11px', margin: 0 },
  sectionTitle: { color: '#c9a84c', marginBottom: '12px', fontSize: '14px' },
  machineCard: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '18px' },
  machineHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' },
  machineName: { color: '#c9a84c', fontWeight: '700', fontSize: '14px', margin: '0 0 3px' },
  machineType: { color: '#8896a8', fontSize: '11px', margin: '0 0 2px' },
  availBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', flexShrink: 0 },
  fuelRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' },
  fuelLabel: { color: '#8896a8', fontSize: '11px', width: '40px', flexShrink: 0 },
  fuelBarBg: { flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' },
  fuelBarFill: { height: '100%', borderRadius: '3px' },
  rateCardBox: { background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '10px', marginBottom: '10px' },
  rateCardTitle: { color: 'rgba(201,168,76,0.7)', fontSize: '10px', letterSpacing: '1px', margin: '0 0 8px' },
  gstNote: { color: 'rgba(201,168,76,0.4)', fontSize: '9px', margin: '6px 0 0' },
  operatorBox: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  operatorAvatar: { width: '32px', height: '32px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a1628', fontWeight: '700', fontSize: '12px', flexShrink: 0 },
  operatorName: { color: '#e8e0d0', fontSize: '12px', fontWeight: '600', margin: '0 0 2px' },
  operatorExp: { color: '#8896a8', fontSize: '10px', margin: 0 },
  selectBtn: { width: '100%', padding: '10px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  goBtn: { background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', padding: '11px 28px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  calcCard: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '20px' },
  calcTitle: { color: '#c9a84c', margin: '0 0 16px', fontSize: '15px', fontWeight: '700' },
  selectedBox: { background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '15px' },
  selLabel: { color: '#8896a8', fontSize: '10px', margin: '0 0 4px', letterSpacing: '1px' },
  selName: { color: '#c9a84c', fontWeight: '700', fontSize: '14px', margin: '0 0 2px' },
  bookNowBtn: { width: '100%', padding: '13px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', marginBottom: '8px' },
  detailCard: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '20px' },
  tableCard: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '18px', marginBottom: '20px' },
  downloadBtn: { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 10px', textAlign: 'left', color: 'rgba(201,168,76,0.7)', fontSize: '10px', letterSpacing: '1px', borderBottom: '1px solid rgba(201,168,76,0.15)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  td: { padding: '10px', fontSize: '12px', color: '#e8e0d0', whiteSpace: 'nowrap' },
  machineTag: { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' },
  modal: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '16px', padding: '24px', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' },
  modalTitle: { color: '#c9a84c', fontSize: '16px', margin: '0 0 16px', textAlign: 'center' },
  modalDetail: { background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '12px' },
  modalRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px', color: '#e8e0d0' },
  cancelBtn: { flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#8896a8', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  confirmBtn: { flex: 1, padding: '11px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
};

export default ClientDashboard;






