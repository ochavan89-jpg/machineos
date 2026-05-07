/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionTimeout from '../hooks/useSessionTimeout';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { generateOwnerReceipt } from '../services/pdfGenerator';
import MobileNav from '../components/MobileNav';
import { useWindowSize } from '../hooks/useWindowSize';
import { getOwnerBookingsPage, approveBooking } from '../supabaseService';
import { getMachines } from '../supabaseService';
import { appendUniqueById } from '../utils/pagination';

const OWNER_DATA = {
  name: 'Rajesh Patil',
  pan: 'ABCDE1234F',
  aadhaar: 'XXXX-XXXX-4521',
  phone: '+91-9876543210',
  email: 'rajesh.patil@gmail.com',
  bank: 'SBI: 12345678901',
  ifsc: 'SBIN0001234',
  address: 'Karad, Satara - 415110',
  since: '2021',
  totalMachines: 3,
};

const MACHINES = [
  { id: 'JCB-001', name: 'JCB 3DX Backhoe Loader', regNo: 'MH-09-AB-1234', year: 2022, status: 'Active', client: 'Patil Builders', fuel: 65, hmr: 6.5, monthlyRevenue: 68000 },
  { id: 'EXC-002', name: 'Hyundai R215 Excavator', regNo: 'MH-09-CD-5678', year: 2021, status: 'Active', client: 'KK Infra', fuel: 28, hmr: 4.0, monthlyRevenue: 52000 },
  { id: 'CRN-003', name: 'Tadano 50T Mobile Crane', regNo: 'MH-09-EF-9012', year: 2023, status: 'Idle', client: '—', fuel: 80, hmr: 0, monthlyRevenue: 0 },
];

const PAYMENT_HISTORY = [
  { id: 'PAY001', date: '10 Apr 2026', machine: 'JCB-001', gross: 105000, commission: 15750, tds: 2100, gstTcs: 1050, net: 86100 },
  { id: 'PAY002', date: '07 Apr 2026', machine: 'EXC-002', gross: 86000, commission: 12900, tds: 1720, gstTcs: 860, net: 70520 },
  { id: 'PAY003', date: '01 Apr 2026', machine: 'JCB-001', gross: 63000, commission: 9450, tds: 1260, gstTcs: 630, net: 51660 },
];

const ALERTS = [
  { icon: '⛽', msg: 'EXC-002 Fuel 28% — Low Alert', time: '1 hr ago', color: '#FF9800' },
  { icon: '💰', msg: 'JCB-001 Payment ₹86,100 Received', time: '2 hrs ago', color: '#4CAF50' },
  { icon: '📋', msg: 'CRN-003 — New Booking Request', time: '3 hrs ago', color: '#c9a84c' },
];

const NAV = [
  { id: 'dashboard', icon: String.fromCodePoint(0x1F4CA), label: 'Dashboard', i18nKey: 'dashboard' },
  { id: 'bookings', icon: String.fromCodePoint(0x1F4CB), label: 'Bookings', i18nKey: 'myBookings' },
  { id: 'machines', icon: String.fromCodePoint(0x1F69C), label: 'My Machines', i18nKey: 'myMachines' },
  { id: 'register', icon: String.fromCodePoint(0x1F4DD), label: 'Register Machine', i18nKey: 'register' },
  { id: 'tracking', icon: String.fromCodePoint(0x1F4CD), label: 'GPS Tracking', i18nKey: 'tracking' },
  { id: 'reports', icon: String.fromCodePoint(0x1F4B0), label: 'Reports & Pay', i18nKey: 'reports' },
  { id: 'alerts', icon: String.fromCodePoint(0x1F514), label: 'Alerts', i18nKey: 'alerts' },
  { id: 'support', icon: String.fromCodePoint(0x1F198), label: 'Support', i18nKey: 'support' },

];
const OwnerMonthAccordion = ({ month, days, isSmall, s, setOwnerBookings, ownerBookings }) => {
  const [open, setOpen] = React.useState(false);
  const [openDay, setOpenDay] = React.useState(null);
  const total = Object.values(days).flat().length;
  const pending = Object.values(days).flat().filter(b => !b.owner_approved).length;
  return (
    <div style={{ marginBottom: '12px', border: pending > 0 ? '1px solid rgba(255,152,0,0.4)' : '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'linear-gradient(135deg, #0f2040, #0a1628)', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>{String.fromCodePoint(0x1F4C5)}</span>
          <span style={{ color: '#c9a84c', fontWeight: '700', fontSize: '15px' }}>{month}</span>
          <span style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '2px 10px', borderRadius: '20px', fontSize: '11px' }}>{total} bookings</span>
          {pending > 0 && <span style={{ background: 'rgba(255,152,0,0.15)', border: '1px solid #FF9800', color: '#FF9800', padding: '2px 10px', borderRadius: '20px', fontSize: '11px' }}>{pending} pending</span>}
        </div>
        <span style={{ color: '#c9a84c', fontSize: '18px' }}>{open ? String.fromCodePoint(0x25B2) : String.fromCodePoint(0x25BC)}</span>
      </div>
      {open && (
        <div style={{ padding: '10px' }}>
          {Object.entries(days).map(([day, bookings]) => (
            <div key={day} style={{ marginBottom: '8px', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
              <div onClick={() => setOpenDay(openDay === day ? null : day)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(201,168,76,0.05)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#8896a8', fontSize: '12px' }}>{String.fromCodePoint(0x1F4C6)} {day}</span>
                  <span style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', color: '#4CAF50', padding: '1px 8px', borderRadius: '20px', fontSize: '10px' }}>{bookings.length} bookings</span>
                  {bookings.filter(b => !b.owner_approved).length > 0 && <span style={{ background: 'rgba(255,152,0,0.15)', border: '1px solid #FF9800', color: '#FF9800', padding: '1px 8px', borderRadius: '20px', fontSize: '10px' }}>{bookings.filter(b => !b.owner_approved).length} pending</span>}
                </div>
                <span style={{ color: '#c9a84c', fontSize: '14px' }}>{openDay === day ? String.fromCodePoint(0x25B2) : String.fromCodePoint(0x25BC)}</span>
              </div>
              {openDay === day && (
                <div style={{ padding: '8px' }}>
                  {bookings.map((b, i) => {
                    const t = new Date(b.created_at);
                    return (
                      <div key={i} style={{ background: 'linear-gradient(135deg, #0a1628, #060e1c)', border: b.owner_approved ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(255,152,0,0.3)', borderRadius: '10px', padding: '14px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <span style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>{b.booking_ref}</span>
                            <span style={{ marginLeft: '8px', color: '#8896a8', fontSize: '11px' }}>{t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <span style={{ background: b.owner_approved ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)', border: b.owner_approved ? '1px solid #4CAF50' : '1px solid #FF9800', color: b.owner_approved ? '#4CAF50' : '#FF9800', padding: '3px 10px', borderRadius: '20px', fontSize: '11px' }}>{b.owner_approved ? `${String.fromCodePoint(0x2705)} ${t('approved')}` : `${String.fromCodePoint(0x23F3)} ${t('pending')}`}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isSmall ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
                          {[
                            { label: 'Client', val: b.users ? b.users.name : 'N/A' },
                            { label: 'Machine', val: b.machines ? b.machines.machine_id + ' - ' + b.machines.name : 'N/A' },
                            { label: 'Type', val: b.booking_type },
                            { label: 'Location', val: b.location || 'N/A' },
                            { label: 'Amount', val: 'Rs.' + (b.base_amount || 0).toLocaleString('en-IN') },
                            { label: 'Advance', val: 'Rs.' + (b.advance_paid || 0).toLocaleString('en-IN') },
                          ].map((d, j) => (
                            <div key={j} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px' }}>
                              <p style={{ color: '#8896a8', fontSize: '9px', margin: '0 0 3px' }}>{d.label}</p>
                              <p style={{ color: '#e8e0d0', fontSize: '12px', fontWeight: '600', margin: 0 }}>{d.val}</p>
                            </div>
                          ))}
                        </div>
                        {!b.owner_approved && (
                          <button style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg, #2e7d32, #4CAF50)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                            onClick={async () => {
                              await approveBooking(b.id);
                              setOwnerBookings(prev => prev.map(x => x.id === b.id ? { ...x, owner_approved: true } : x));
                              alert(`${t('approved')}! ${t('dispatched')}.`);
                            }}>
                            {String.fromCodePoint(0x2705)} {t('approveAndDispatch')}
                          </button>
                        )}
                        {b.owner_approved && b.owner_approved_at && (
                          <div style={{ padding: '8px 10px', background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                            <span style={{ color: '#4CAF50', fontSize: '11px' }}>{String.fromCodePoint(0x2705)} Machine Dispatched - {new Date(b.owner_approved_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const OwnerDashboard = () => {
  const navigate = useNavigate();
  useSessionTimeout();
  const { t } = useLanguage(); // eslint-disable-line
  const navItems = NAV.map((item) => ({ ...item, label: item.i18nKey ? t(item.i18nKey) : item.label }));
  const { isMobile, isTablet } = useWindowSize();
  const isSmall = isMobile || isTablet;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [regStep, setRegStep] = useState(1);
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [ownerBookingsOffset, setOwnerBookingsOffset] = useState(0);
  const [ownerBookingsHasMore, setOwnerBookingsHasMore] = useState(false);
  const [ownerBookingsLoadingMore, setOwnerBookingsLoadingMore] = useState(false);
  const [regData, setRegData] = useState({
    ownerName: OWNER_DATA.name, ownerPhone: OWNER_DATA.phone, ownerEmail: OWNER_DATA.email,
    machineName: '', machineType: '', regNo: '', year: '', capacity: '',
    pdiChecked: false, insuranceValid: false, pollutionValid: false,
    agreed: false,
  });


  const [machineData, setMachineData] = useState([]);
  // const [bookingData, setBookingData] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const sessionUser = JSON.parse(localStorage.getItem('machineos_user') || '{}');
      if (sessionUser?.role !== 'owner') {
        navigate(`/${sessionUser?.role || 'login'}`, { replace: true });
        return;
      }
      const machines = await getMachines();
      setMachineData(machines || []);
    };
    loadData();
    getOwnerBookingsPage({ limit: 100, offset: 0 }).then((result) => {
      setOwnerBookings(result.items || []);
      setOwnerBookingsHasMore(Boolean(result.hasMore));
      setOwnerBookingsOffset(result.nextOffset || 0);
    });
  }, [navigate]);
  const loadMoreOwnerBookings = async () => {
    if (!ownerBookingsHasMore || ownerBookingsLoadingMore) return;
    setOwnerBookingsLoadingMore(true);
    const result = await getOwnerBookingsPage({ limit: 100, offset: ownerBookingsOffset });
    if ((result.items || []).length > 0) {
      setOwnerBookings((prev) => appendUniqueById(prev, result.items));
      setOwnerBookingsOffset(result.nextOffset || ownerBookingsOffset);
      setOwnerBookingsHasMore(Boolean(result.hasMore));
    } else {
      setOwnerBookingsHasMore(false);
    }
    setOwnerBookingsLoadingMore(false);
  };

  
  const displayMachines = machineData.length > 0 ? machineData.map(m => ({
    id: m.machine_id, name: m.name, regNo: m.reg_no, year: m.year,
    status: m.status, client: 'N/A', fuel: m.fuel_level, hmr: 0, monthlyRevenue: 0
  })) : MACHINES;

  const totalGross = PAYMENT_HISTORY.reduce((a, b) => a + b.gross, 0);
  const totalNet = PAYMENT_HISTORY.reduce((a, b) => a + b.net, 0);
  const totalCommission = PAYMENT_HISTORY.reduce((a, b) => a + b.commission, 0);
  const handleLogout = () => {
    localStorage.removeItem('machineos_user');
    localStorage.removeItem('machineos_token');
    localStorage.removeItem('machineos_refresh_token');
    navigate('/login', { replace: true });
  };

  return (
    <div style={s.container}>
      {/* Mobile Nav */}
      {isSmall && (
        <MobileNav
          navItems={navItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          title={t('appName')}
          subtitle={t('ownerPortal')}
          topContent={
            <div style={{ padding: '4px 0' }}>
              <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '13px', margin: '0 0 2px' }}>{OWNER_DATA.name}</p>
              <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>🚜 {OWNER_DATA.totalMachines} Machines · Since {OWNER_DATA.since}</p>
            </div>
          }
          bottomContent={
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.08)', color: '#e94560', cursor: 'pointer', fontSize: '13px', width: '100%' }} onClick={handleLogout}>🚪 {t('logout')}</button>
          }
        />
      )}

      {/* Desktop Sidebar */}
      {!isSmall && (
        <div style={s.sidebar}>
          <div style={s.sidebarLogo}>
            <div style={s.logoCircle}>DE</div>
            <div>
              <p style={s.logoTitle}>{t('appName')}</p>
              <p style={s.logoSub}>{t('ownerPortal')}</p>
            </div>
          </div>
          <div style={s.divider} />
          <div style={s.ownerCard}>
            <div style={s.ownerAvatar}>{OWNER_DATA.name.charAt(0)}</div>
            <div>
              <p style={s.ownerName}>{OWNER_DATA.name}</p>
              <p style={s.ownerSub}>🚜 {OWNER_DATA.totalMachines} Machines · Since {OWNER_DATA.since}</p>
            </div>
          </div>
          <div style={s.divider} />
          {navItems.map(item => (
            <button key={item.id} style={activeTab === item.id ? s.navActive : s.nav} onClick={() => setActiveTab(item.id)}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
          <div style={s.divider} />
          <button style={s.logoutBtn} onClick={handleLogout}>🚪 {t('logout')}</button>
          <p style={s.sidebarFooter}>{t('sinceExcellence')}</p>
        </div>
      )}

      {/* Main */}
      <div style={{ ...s.main, padding: isSmall ? '70px 12px 70px' : '25px' }}>
        {/* Header */}
        <div style={{ ...s.header, flexDirection: isSmall ? 'column' : 'row', gap: isSmall ? '8px' : '0' }}>
          <div>
            <button style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', color:'#c9a84c', borderRadius:'20px', padding:'5px 12px 5px 8px', fontSize:'12px', cursor:'pointer', fontWeight:'600', marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px', width:'fit-content' }} onClick={() => { const tabs=navItems.map(n=>n.id); const i=tabs.indexOf(activeTab); if(i>0) setActiveTab(tabs[i-1]); }}>&#8592;</button>
            <h2 style={{ ...s.pageTitle, fontSize: isSmall ? '16px' : '20px' }}>
              {navItems.find(n => n.id === activeTab)?.icon}{' '}{navItems.find(n => n.id === activeTab)?.label}
            </h2>
            <p style={s.pageDate}>📅 {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LanguageSelector compact={true} />
            {!isSmall && (
              <div style={s.ownerBadge}>
                <span style={s.onlineDot}></span>
                🏗️ {OWNER_DATA.name}
              </div>
            )}
          </div>
        </div>

        {/* ═══ TAB: DASHBOARD ═══ */}
        {activeTab === 'bookings' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: isSmall ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { icon: String.fromCodePoint(0x1F4CB), val: ownerBookings.length.toString(), label: 'Total Bookings' },
                { icon: String.fromCodePoint(0x23F3), val: ownerBookings.filter(b => !b.owner_approved).length.toString(), label: t('pendingApproval') },
                { icon: String.fromCodePoint(0x2705), val: ownerBookings.filter(b => b.owner_approved).length.toString(), label: t('approved') },
              ].map((c, i) => (
                <div key={i} style={s.card}><p style={{ fontSize: '22px', margin: '0 0 6px' }}>{c.icon}</p><h3 style={{ color: '#c9a84c', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>{c.val}</h3><p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>{c.label}</p></div>
              ))}
            </div>
            {(() => {
              const grouped = {};
              ownerBookings.forEach(b => {
                const d = new Date(b.created_at || b.start_date);
                const month = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                const day = d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' });
                if (!grouped[month]) grouped[month] = {};
                if (!grouped[month][day]) grouped[month][day] = [];
                grouped[month][day].push(b);
              });
              return Object.entries(grouped).map(([month, days]) => (
                <OwnerMonthAccordion key={month} month={month} days={days} isSmall={isSmall} s={s} setOwnerBookings={setOwnerBookings} ownerBookings={ownerBookings} />
              ));
                        })()}
            {ownerBookingsHasMore && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                <button
                  style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '8px', padding: '8px 14px', cursor: ownerBookingsLoadingMore ? 'wait' : 'pointer', opacity: ownerBookingsLoadingMore ? 0.7 : 1 }}
                  disabled={ownerBookingsLoadingMore}
                  onClick={loadMoreOwnerBookings}
                >
                  {ownerBookingsLoadingMore ? t('loading') : t('loadMoreBookings')}
                </button>
              </div>
            )}
            <p style={{ color: '#8896a8', fontSize: '11px', textAlign: 'center', margin: '8px 0 0' }}>
              Loaded {ownerBookings.length} owner bookings{ownerBookingsHasMore ? ' (more available)' : ' (all loaded)'}
            </p>
          </div>
        )}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '🚜', val: `${OWNER_DATA.totalMachines}`, label: 'Total Machines' },
                { icon: '✅', val: '2', label: 'Active Today' },
                { icon: '💰', val: `₹${(totalNet / 1000).toFixed(0)}K`, label: 'Net Earned (Month)' },
                { icon: '📊', val: `₹${(totalGross / 1000).toFixed(0)}K`, label: 'Gross Billing' },
              ].map((c, i) => (
                <div key={i} style={s.card}>
                  <p style={s.cardIcon}>{c.icon}</p>
                  <h3 style={s.cardVal}>{c.val}</h3>
                  <p style={s.cardLbl}>{c.label}</p>
                </div>
              ))}
            </div>

            {/* Commission Breakdown */}
            <div style={s.commissionCard}>
              <h3 style={s.sectionTitle}>💰 Payment Breakdown — April 2026</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Gross Billing', val: `₹${totalGross.toLocaleString('en-IN')}`, color: '#c9a84c' },
                  { label: 'Commission 15%', val: `- ₹${totalCommission.toLocaleString('en-IN')}`, color: '#e94560' },
                  { label: 'TDS 2% + GST TCS 1%', val: `- ₹${PAYMENT_HISTORY.reduce((a, b) => a + b.tds + b.gstTcs, 0).toLocaleString('en-IN')}`, color: '#e94560' },
                  { label: 'NET RECEIVED', val: `₹${totalNet.toLocaleString('en-IN')}`, color: '#4CAF50' },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 6px', letterSpacing: '0.5px' }}>{item.label}</p>
                    <p style={{ color: item.color, fontWeight: '700', fontSize: isSmall ? '14px' : '16px', margin: 0 }}>{item.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Machine Status */}
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>🚜 {t('machineStatusTitle')}</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...s.table, minWidth: '500px' }}>
                  <thead><tr>{['Machine', 'Status', 'Client', 'Fuel', 'HMR', 'Revenue'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {displayMachines.map((m, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}>
                          <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '12px', margin: '0 0 2px' }}>{m.id}</p>
                          <p style={{ color: '#8896a8', fontSize: '10px', margin: 0 }}>{m.regNo}</p>
                        </td>
                        <td style={s.td}><span style={{ ...s.statusBadge, background: m.status === 'Active' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)', border: `1px solid ${m.status === 'Active' ? '#4CAF50' : '#FF9800'}`, color: m.status === 'Active' ? '#4CAF50' : '#FF9800' }}>{m.status}</span></td>
                        <td style={s.td}>{m.client}</td>
                        <td style={s.td}><span style={{ color: m.fuel > 30 ? '#4CAF50' : '#e94560', fontWeight: '700' }}>{m.fuel}%</span></td>
                        <td style={s.td}>{m.hmr} hrs</td>
                        <td style={{ ...s.td, color: '#c9a84c', fontWeight: '700' }}>₹{m.monthlyRevenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Alerts */}
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>🔔 {t('recentAlerts')}</h3>
              {ALERTS.map((a, i) => (
                <div key={i} style={{ ...s.alertRow, borderLeft: `3px solid ${a.color}` }}>
                  <span style={{ fontSize: '18px' }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#e8e0d0', fontSize: '12px', margin: '0 0 2px' }}>{a.msg}</p>
                    <p style={{ color: '#8896a8', fontSize: '10px', margin: 0 }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB: MY MACHINES ═══ */}
        {activeTab === 'machines' && (
          <div>
            {displayMachines.map((m, i) => (
              <div key={i} style={{ ...s.tableCard, marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '15px', margin: '0 0 3px' }}>{m.name}</p>
                    <p style={{ color: '#8896a8', fontSize: '11px', margin: '0 0 2px' }}>{m.id} · {m.regNo} · Year: {m.year}</p>
                  </div>
                  <span style={{ ...s.statusBadge, background: m.status === 'Active' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)', border: `1px solid ${m.status === 'Active' ? '#4CAF50' : '#FF9800'}`, color: m.status === 'Active' ? '#4CAF50' : '#FF9800' }}>{m.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  {[
                    { label: '👷 Client', val: m.client },
                    { label: '⛽ Fuel', val: `${m.fuel}%` },
                    { label: '⏱️ HMR Today', val: `${m.hmr} hrs` },
                    { label: '💰 Revenue', val: `₹${m.monthlyRevenue.toLocaleString('en-IN')}` },
                  ].map((d, j) => (
                    <div key={j} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px' }}>
                      <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 3px' }}>{d.label}</p>
                      <p style={{ color: '#e8e0d0', fontWeight: '600', fontSize: '13px', margin: 0 }}>{d.val}</p>
                    </div>
                  ))}
                </div>
                {/* Fuel Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#8896a8', fontSize: '11px', width: '40px' }}>⛽</span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                    <div style={{ height: '100%', width: `${m.fuel}%`, background: m.fuel > 30 ? '#4CAF50' : '#e94560', borderRadius: '3px' }}></div>
                  </div>
                  <span style={{ color: m.fuel > 30 ? '#4CAF50' : '#e94560', fontSize: '12px', fontWeight: '700' }}>{m.fuel}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ TAB: REGISTER MACHINE ═══ */}
        {activeTab === 'register' && (
          <div style={s.tableCard}>
            <h3 style={s.tableTitle}>📝 {t('machineRegistrationTitle')}</h3>

            {/* Steps */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto' }}>
              {['Owner Info', 'Machine Info', 'PDI Check', 'Documents', 'Agreement'].map((step, i) => (
                <div key={i} style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', fontWeight: '700', fontSize: '13px', background: regStep > i + 1 ? '#4CAF50' : regStep === i + 1 ? '#c9a84c' : 'rgba(255,255,255,0.1)', color: regStep >= i + 1 ? '#0a1628' : '#8896a8', border: regStep === i + 1 ? '2px solid #c9a84c' : 'none' }}>
                    {regStep > i + 1 ? '✓' : i + 1}
                  </div>
                  <p style={{ color: regStep === i + 1 ? '#c9a84c' : '#8896a8', fontSize: '9px', margin: 0, whiteSpace: 'nowrap' }}>{step}</p>
                </div>
              ))}
            </div>

            {/* Step 1 */}
            {regStep === 1 && (
              <div>
                <h4 style={{ color: '#c9a84c', marginBottom: '15px' }}>👤 Owner Information</h4>
                {[
                  { label: 'Full Name', key: 'ownerName', placeholder: 'Rajesh Patil' },
                  { label: 'Phone', key: 'ownerPhone', placeholder: '+91-XXXXXXXXXX' },
                  { label: 'Email', key: 'ownerEmail', placeholder: 'email@gmail.com' },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: '12px' }}>
                    <p style={{ color: '#8896a8', fontSize: '11px', margin: '0 0 5px' }}>{field.label}</p>
                    <input style={s.input} placeholder={field.placeholder} value={regData[field.key]} onChange={e => setRegData(prev => ({ ...prev, [field.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}

            {/* Step 2 */}
            {regStep === 2 && (
              <div>
                <h4 style={{ color: '#c9a84c', marginBottom: '15px' }}>🚜 Machine Information</h4>
                {[
                  { label: 'Machine Name', key: 'machineName', placeholder: 'JCB 3DX Backhoe Loader' },
                  { label: 'Machine Type', key: 'machineType', placeholder: 'Backhoe Loader / Excavator...' },
                  { label: 'Reg. Number', key: 'regNo', placeholder: 'MH-09-XX-1234' },
                  { label: 'Year of Manufacture', key: 'year', placeholder: '2022' },
                  { label: 'Capacity / Specs', key: 'capacity', placeholder: '92 HP | 0.21 m³ bucket' },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: '12px' }}>
                    <p style={{ color: '#8896a8', fontSize: '11px', margin: '0 0 5px' }}>{field.label}</p>
                    <input style={s.input} placeholder={field.placeholder} value={regData[field.key]} onChange={e => setRegData(prev => ({ ...prev, [field.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}

            {/* Step 3 */}
            {regStep === 3 && (
              <div>
                <h4 style={{ color: '#c9a84c', marginBottom: '15px' }}>🔧 Pre-Delivery Inspection (PDI)</h4>
                {[
                  { key: 'pdiChecked', label: '✅ PDI Inspection Completed' },
                  { key: 'insuranceValid', label: '✅ Insurance Valid & Up-to-Date' },
                  { key: 'pollutionValid', label: '✅ Pollution Certificate Valid' },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '14px', cursor: 'pointer' }} onClick={() => setRegData(prev => ({ ...prev, [item.key]: !prev[item.key] }))}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '4px', border: '2px solid rgba(201,168,76,0.5)', background: regData[item.key] ? '#c9a84c' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {regData[item.key] && <span style={{ color: '#0a1628', fontSize: '14px', fontWeight: '900' }}>✓</span>}
                    </div>
                    <p style={{ color: '#e8e0d0', fontSize: '13px', margin: 0 }}>{item.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Step 4 */}
            {regStep === 4 && (
              <div>
                <h4 style={{ color: '#c9a84c', marginBottom: '15px' }}>📄 Document Upload</h4>
                {['RC Book (Registration Certificate)', 'Insurance Certificate', 'Pollution Certificate', 'PAN Card / Aadhaar'].map((doc, i) => (
                  <div key={i} style={{ marginBottom: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: '#e8e0d0', fontSize: '13px', margin: 0 }}>{doc}</p>
                    <button style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>📤 Upload</button>
                  </div>
                ))}
              </div>
            )}

            {/* Step 5 */}
            {regStep === 5 && (
              <div>
                <h4 style={{ color: '#c9a84c', marginBottom: '12px' }}>📋 Platform Agreement</h4>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '14px', marginBottom: '15px', maxHeight: '200px', overflowY: 'auto' }}>
                  {['Development Express commission: 15% of gross billing', 'TDS deduction: 2% as per Income Tax Act', 'GST TCS: 1% as per GST regulations', 'Payment within 3 working days of client settlement', 'Machine must maintain 40%+ fuel at all times', 'GPS device (Teltonika) mandatory — installed by DE', 'Direct client contact = immediate contract termination'].map((term, i) => (
                    <p key={i} style={{ color: '#8896a8', fontSize: '11px', margin: '0 0 8px', lineHeight: '1.6' }}>• {term}</p>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setRegData(prev => ({ ...prev, agreed: !prev.agreed }))}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '4px', border: '2px solid rgba(201,168,76,0.5)', background: regData.agreed ? '#c9a84c' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {regData.agreed && <span style={{ color: '#0a1628', fontSize: '14px', fontWeight: '900' }}>✓</span>}
                  </div>
                  <p style={{ color: '#e8e0d0', fontSize: '13px', margin: 0 }}>मी सर्व Terms & Conditions वाचले आहेत आणि मान्य आहेत</p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              {regStep > 1 && <button style={s.cancelBtn} onClick={() => setRegStep(s => s - 1)}>← {t('back')}</button>}
              {regStep < 5 ? (
                <button style={{ ...s.confirmBtn, flex: 1 }} onClick={() => setRegStep(s => s + 1)}>{t('nextText')} →</button>
              ) : (
                <button style={{ ...s.confirmBtn, flex: 1, opacity: regData.agreed ? 1 : 0.5 }} disabled={!regData.agreed} onClick={() => alert(`${String.fromCodePoint(0x2705)} ${t('machineRegistrationSubmitted')}`)}>
                  ✅ Registration Submit करा
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: GPS TRACKING ═══ */}
        {activeTab === 'tracking' && (
          <div>
            {displayMachines.map((m, i) => (
              <div key={i} style={{ ...s.tableCard, marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ color: '#c9a84c', margin: 0, fontSize: '14px' }}>📍 {m.id} — {m.name}</h3>
                  <span style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50', padding: '3px 10px', borderRadius: '20px', fontSize: '11px' }}>🟢 GPS Live</span>
                </div>
                <div style={{ height: isSmall ? '120px' : '150px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(201,168,76,0.1)', marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', opacity: 0.08 }}>
                    {[...Array(15)].map((_, j) => <div key={j} style={{ border: '1px solid #c9a84c' }}></div>)}
                  </div>
                  <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <p style={{ fontSize: '28px', margin: '0 0 4px' }}>📍</p>
                    <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '13px', margin: '0 0 2px' }}>Karad, Satara</p>
                    <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>17.2891°N, 74.1893°E</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                  {[
                    { label: '⛽ Fuel', val: `${m.fuel}%` },
                    { label: '⏱️ HMR', val: `${m.hmr} hrs` },
                    { label: '🔑 Ignition', val: m.status === 'Active' ? 'ON' : 'OFF' },
                  ].map((d, j) => (
                    <div key={j} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                      <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 2px' }}>{d.label}</p>
                      <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '13px', margin: 0 }}>{d.val}</p>
                    </div>
                  ))}
                </div>
                <button style={{ width: '100%', padding: '9px', background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.4)', color: '#e94560', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  🔒 Remote Lock Machine
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ═══ TAB: REPORTS & PAY ═══ */}
        {activeTab === 'reports' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '💰', val: `₹${totalNet.toLocaleString('en-IN')}`, label: 'Net Received' },
                { icon: '📊', val: `₹${totalGross.toLocaleString('en-IN')}`, label: 'Gross Billing' },
                { icon: '🏦', val: `₹${totalCommission.toLocaleString('en-IN')}`, label: 'Commission Paid' },
                { icon: '📋', val: `${PAYMENT_HISTORY.length}`, label: 'Settlements' },
              ].map((c, i) => (
                <div key={i} style={s.card}>
                  <p style={s.cardIcon}>{c.icon}</p>
                  <h3 style={{ ...s.cardVal, fontSize: isSmall ? '14px' : '18px' }}>{c.val}</h3>
                  <p style={s.cardLbl}>{c.label}</p>
                </div>
              ))}
            </div>

            <div style={s.tableCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={s.tableTitle}>💳 {t('paymentHistoryTitle')}</h3>
                <button style={s.downloadBtn} onClick={() => generateOwnerReceipt({
                  receiptNo: 'DE/RCPT/OWN/2026/041001',
                  bookingId: 'BK-2026-041001',
                  payDate: new Date().toLocaleDateString('en-IN'),
                  period: 'Apr 2026',
                  ownerName: OWNER_DATA.name,
                  ownerPan: OWNER_DATA.pan,
                  ownerAadhaar: OWNER_DATA.aadhaar,
                  ownerBank: OWNER_DATA.bank,
                  ownerIfsc: OWNER_DATA.ifsc,
                  machineName: 'JCB 3DX Backhoe Loader',
                  regNo: 'MH-09-AB-1234',
                  machineType: 'Backhoe Loader',
                  clientName: 'Patil Builders Pvt. Ltd.',
                  workPeriod: '01-10 Apr 2026',
                  grossAmount: 105000, commissionPct: 15, hours: 75, ratePerHour: 1400,
                  words: 'Rupees Eighty Six Thousand One Hundred Only',
                })}>⬇️ Receipt PDF</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...s.table, minWidth: '550px' }}>
                  <thead><tr>{['Receipt ID', 'Date', 'Machine', 'Gross', 'Commission', 'TDS+TCS', 'Net Paid'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {PAYMENT_HISTORY.map((p, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={{ ...s.td, color: '#c9a84c', fontSize: '11px' }}>{p.id}</td>
                        <td style={s.td}>{p.date}</td>
                        <td style={s.td}><span style={s.machineTag}>{p.machine}</span></td>
                        <td style={s.td}>₹{p.gross.toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#e94560' }}>- ₹{p.commission.toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#e94560' }}>- ₹{(p.tds + p.gstTcs).toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#4CAF50', fontWeight: '700' }}>₹{p.net.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bank Details */}
            <div style={{ ...s.tableCard, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <h3 style={{ ...s.tableTitle, marginBottom: '12px' }}>🏦 Bank Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Bank', val: 'State Bank of India' },
                  { label: 'A/C Number', val: OWNER_DATA.bank.replace('SBI: ', '') },
                  { label: 'IFSC', val: OWNER_DATA.ifsc },
                  { label: 'Payment Mode', val: 'NEFT/RTGS' },
                ].map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#8896a8', fontSize: '12px' }}>{d.label}</span>
                    <span style={{ color: '#e8e0d0', fontWeight: '600', fontSize: '12px' }}>{d.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: ALERTS ═══ */}
        {activeTab === 'alerts' && (
          <div style={s.tableCard}>
            <h3 style={s.tableTitle}>🔔 {t('allAlerts')}</h3>
            {[...ALERTS,
              { icon: '🔧', msg: 'JCB-001 — Scheduled Maintenance Due', time: '1 day ago', color: '#c9a84c' },
              { icon: '📋', msg: 'Monthly Report Ready — April 2026', time: '2 days ago', color: '#4CAF50' },
            ].map((a, i) => (
              <div key={i} style={{ ...s.alertRow, borderLeft: `3px solid ${a.color}`, marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#e8e0d0', fontSize: '13px', margin: '0 0 3px' }}>{a.msg}</p>
                  <p style={{ color: '#8896a8', fontSize: '10px', margin: 0 }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ TAB: SUPPORT ═══ */}
        {activeTab === 'support' && (
          <div>
            <div style={{ ...s.tableCard, marginBottom: '15px' }}>
              <h3 style={s.tableTitle}>🆘 {t('contactCompany')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : 'repeat(2, 1fr)', gap: '12px' }}>
                <a href="tel:+919766926636" style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer' }}>
                    <p style={{ fontSize: '28px', margin: '0 0 8px' }}>📞</p>
                    <p style={{ color: '#4CAF50', fontWeight: '700', fontSize: '14px', margin: '0 0 4px' }}>{t('callNow')}</p>
                    <p style={{ color: '#8896a8', fontSize: '12px', margin: 0 }}>+91-9766926636</p>
                  </div>
                </a>
                <a href="https://wa.me/919766926636" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer' }}>
                    <p style={{ fontSize: '28px', margin: '0 0 8px' }}>💬</p>
                    <p style={{ color: '#25D366', fontWeight: '700', fontSize: '14px', margin: '0 0 4px' }}>WhatsApp</p>
                    <p style={{ color: '#8896a8', fontSize: '12px', margin: 0 }}>+91-9766926636</p>
                  </div>
                </a>
                <a href="mailto:om.chavan2026@zohomail.in" style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer' }}>
                    <p style={{ fontSize: '28px', margin: '0 0 8px' }}>📧</p>
                    <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '14px', margin: '0 0 4px' }}>Email</p>
                    <p style={{ color: '#8896a8', fontSize: '12px', margin: 0 }}>om.chavan2026@zohomail.in</p>
                  </div>
                </a>
                <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.3)', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer' }}>
                  <p style={{ fontSize: '28px', margin: '0 0 8px' }}>📍</p>
                  <p style={{ color: '#1565C0', fontWeight: '700', fontSize: '14px', margin: '0 0 4px' }}>{t('officeLabel')}</p>
                  <p style={{ color: '#8896a8', fontSize: '12px', margin: 0 }}>Karad, Satara - 415110</p>
                </div>
              </div>
            </div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>📋 Company Details</h3>
              {[
                { label: 'Company', val: 'Development Express' },
                { label: 'MD', val: 'Om Chavan (B.Tech Civil)' },
                { label: 'GSTIN', val: '27ABCDE1234F1Z5' },
                { label: 'Since', val: '2011 (15 Years)' },
                { label: 'Commission', val: '15% of Gross Billing' },
                { label: 'Payment Cycle', val: '3 Working Days' },
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#8896a8', fontSize: '12px' }}>{d.label}</span>
                  <span style={{ color: '#e8e0d0', fontWeight: '600', fontSize: '12px' }}>{d.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══ STYLES ═══
const s = {
  container: { display: 'flex', minHeight: '100vh', background: '#050d1a', fontFamily: 'Arial, sans-serif', color: '#fff' },
  sidebar: { width: '230px', background: 'linear-gradient(180deg, #0f2040 0%, #0a1628 100%)', borderRight: '1px solid rgba(201,168,76,0.2)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  logoCircle: { width: '36px', height: '36px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0a1628', fontSize: '12px', flexShrink: 0 },
  logoTitle: { color: '#c9a84c', fontWeight: '700', fontSize: '12px', margin: 0 },
  logoSub: { color: '#8896a8', fontSize: '10px', margin: 0 },
  divider: { height: '1px', background: 'rgba(201,168,76,0.15)', margin: '8px 0' },
  ownerCard: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(201,168,76,0.08)', borderRadius: '10px', margin: '4px 0' },
  ownerAvatar: { width: '36px', height: '36px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a1628', fontWeight: '900', fontSize: '14px', flexShrink: 0 },
  ownerName: { color: '#c9a84c', fontWeight: '700', fontSize: '12px', margin: 0 },
  ownerSub: { color: '#8896a8', fontSize: '10px', margin: 0 },
  nav: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#8896a8', cursor: 'pointer', fontSize: '12px', width: '100%', textAlign: 'left' },
  navActive: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.1)', color: '#c9a84c', cursor: 'pointer', fontSize: '12px', width: '100%', textAlign: 'left', fontWeight: '700' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.08)', color: '#e94560', cursor: 'pointer', fontSize: '12px', width: '100%', marginTop: 'auto' },
  sidebarFooter: { color: 'rgba(201,168,76,0.4)', fontSize: '9px', textAlign: 'center', marginTop: '8px', letterSpacing: '1px' },
  main: { flex: 1, overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(201,168,76,0.15)' },
  pageTitle: { color: '#c9a84c', fontWeight: '700', margin: '0 0 4px' },
  pageDate: { color: '#8896a8', fontSize: '11px', margin: 0 },
  ownerBadge: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', padding: '8px 14px', borderRadius: '20px', color: '#c9a84c', fontSize: '12px' },
  onlineDot: { width: '7px', height: '7px', background: '#4CAF50', borderRadius: '50%', display: 'inline-block' },
  cardRow: { display: 'grid', gap: '12px', marginBottom: '18px' },
  card: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '16px', textAlign: 'center' },
  cardIcon: { fontSize: '22px', margin: '0 0 6px' },
  cardVal: { color: '#c9a84c', fontWeight: '700', margin: '0 0 4px' },
  cardLbl: { color: '#8896a8', fontSize: '11px', margin: 0 },
  sectionTitle: { color: '#c9a84c', marginBottom: '14px', fontSize: '14px' },
  commissionCard: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '18px', marginBottom: '18px' },
  tableCard: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '18px', marginBottom: '18px' },
  tableTitle: { color: '#c9a84c', margin: '0 0 14px', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 10px', textAlign: 'left', color: 'rgba(201,168,76,0.7)', fontSize: '10px', letterSpacing: '1px', borderBottom: '1px solid rgba(201,168,76,0.15)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  td: { padding: '10px', fontSize: '12px', color: '#e8e0d0', whiteSpace: 'nowrap' },
  machineTag: { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  statusBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  alertRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' },
  downloadBtn: { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px' },
  input: { width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' },
  cancelBtn: { flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#8896a8', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  confirmBtn: { padding: '11px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
};

export default OwnerDashboard;







