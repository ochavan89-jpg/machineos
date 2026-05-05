import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionTimeout from '../hooks/useSessionTimeout';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { useWindowSize } from '../hooks/useWindowSize';
import { markAttendance, addFuelLog, reportIssue, getAttendanceByOperator, getFuelLogs } from '../supabaseService';

const OPERATOR = {
  name: 'Ramesh Kadam',
  machine: 'JCB 3DX Backhoe Loader',
  machineId: 'JCB-001',
  regNo: 'MH-09-AB-1234',
  client: 'Patil Builders Pvt. Ltd.',
  site: 'NH-48 Road Widening, Karad',
  exp: '8 Years',
  rating: 4.9,
  todayHMR: 6.5,
  totalHMR: 1842,
};

const NAV = [
  { id: 'home', icon: String.fromCodePoint(0x1F3E0), label: 'Home' },
  { id: 'attendance', icon: String.fromCodePoint(0x2705), label: 'Attendance' },
  { id: 'machinelog', icon: String.fromCodePoint(0x1F69C), label: 'Machine Log' },
  { id: 'fuel', icon: String.fromCodePoint(0x26FD), label: 'Fuel' },
  { id: 'daily', icon: String.fromCodePoint(0x1F4CB), label: 'Reports' },
  { id: 'issues', icon: String.fromCodePoint(0x26A0), label: 'Issues' },
];

const attendanceHistory = [
  { date: '12 Apr', day: 'Sunday', status: 'Present', checkIn: '07:28 AM', checkOut: '06:05 PM', hmr: 6.5 },
  { date: '11 Apr', day: 'Saturday', status: 'Present', checkIn: '07:30 AM', checkOut: '05:45 PM', hmr: 7.0 },
  { date: '10 Apr', day: 'Friday', status: 'Present', checkIn: '07:25 AM', checkOut: '06:00 PM', hmr: 6.8 },
  { date: '09 Apr', day: 'Thursday', status: 'Half Day', checkIn: '07:30 AM', checkOut: '01:00 PM', hmr: 4.0 },
  { date: '08 Apr', day: 'Wednesday', status: 'Present', checkIn: '07:32 AM', checkOut: '05:55 PM', hmr: 7.2 },
];

const fuelHistory = [
  { date: '12 Apr', time: '11:00 AM', level: 82, change: +12, note: 'Refilled - 50 Ltrs', by: 'Ramesh K.' },
  { date: '12 Apr', time: '07:30 AM', level: 70, change: -5, note: 'Morning check', by: 'Sensor Auto' },
  { date: '11 Apr', time: '05:45 PM', level: 75, change: -18, note: 'End of day', by: 'Sensor Auto' },
  { date: '11 Apr', time: '07:30 AM', level: 93, change: +25, note: 'Refilled - 100 Ltrs', by: 'Ramesh K.' },
];

const dailyReports = [
  { date: '12 Apr', att: 'P', start: '07:30 AM', end: '06:05 PM', hmr: 6.5, fuelStart: 70, fuelEnd: 65, site: 'Karad NH-48', status: 'Submitted' },
  { date: '11 Apr', att: 'P', start: '07:30 AM', end: '05:45 PM', hmr: 7.0, fuelStart: 93, fuelEnd: 75, site: 'Karad NH-48', status: 'Submitted' },
  { date: '10 Apr', att: 'P', start: '07:25 AM', end: '06:00 PM', hmr: 6.8, fuelStart: 88, fuelEnd: 68, site: 'Karad NH-48', status: 'Submitted' },
  { date: '09 Apr', att: 'H', start: '07:30 AM', end: '01:00 PM', hmr: 4.0, fuelStart: 75, fuelEnd: 62, site: 'Karad NH-48', status: 'Submitted' },
];

const pastIssues = [
  { date: '05 Apr', type: 'Mechanical', note: 'Hydraulic oil leakage detected', action: 'Mechanic sent - Repaired on site', resolved: true },
  { date: '02 Apr', type: 'Fuel', note: 'Fuel level dropped 15% overnight', action: 'Investigation initiated', resolved: true },
  { date: '28 Mar', type: 'Electrical', note: 'Dashboard warning light on', action: 'Electrician inspected - Sensor replaced', resolved: true },
];

const OperatorDashboard = () => {
  const navigate = useNavigate();
  useSessionTimeout();
  const { t } = useLanguage(); // eslint-disable-line
  const { isMobile, isTablet } = useWindowSize();
  const isSmall = isMobile || isTablet;

  const [activeTab, setActiveTab] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [machineStarted, setMachineStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [fuelLevel, setFuelLevel] = useState(72);
  const [fuelNote, setFuelNote] = useState('');
  const [workNote, setWorkNote] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [logs, setLogs] = useState([
    { type: 'start', time: '07:30 AM', note: 'Machine started - Site ready', fuel: 75 },
    { type: 'fuel', time: '11:00 AM', note: 'Fuel refilled - 50 Ltrs added', fuel: 82 },
    { type: 'stop', time: '01:00 PM', note: 'Lunch break', fuel: 78 },
    { type: 'start', time: '02:00 PM', note: 'Resumed after break', fuel: 78 },
  ]);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [issueNote, setIssueNote] = useState('');
  const [attendanceRows, setAttendanceRows] = useState(attendanceHistory);
  const [fuelRows, setFuelRows] = useState(fuelHistory);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('machineos_user') || '{}');
    if (!user?.id) return;

    getAttendanceByOperator(user.id).then((rows) => {
      if (rows && rows.length > 0) {
        setAttendanceRows(rows.map((r) => ({
          date: r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-',
          day: r.date ? new Date(r.date).toLocaleDateString('en-IN', { weekday: 'long' }) : '-',
          status: r.status === 'present' ? 'Present' : r.status === 'halfday' ? 'Half Day' : 'Absent',
          checkIn: r.check_in || '-',
          checkOut: r.check_out || '-',
          hmr: r.hmr || 0,
        })));
      }
    });

    getFuelLogs(user.id).then((rows) => {
      if (rows && rows.length > 0) {
        setFuelRows(rows.map((r) => ({
          date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-',
          time: r.created_at ? new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-',
          level: r.fuel_level || 0,
          change: 0,
          note: r.note || 'Fuel update',
          by: 'Operator',
        })));
      }
    });
  }, []);

  const handleAttendance = async (type) => {
    const user = JSON.parse(localStorage.getItem('machineos_user') || '{}');
    setAttendance(type);
    setLogs(prev => [{ type: 'attendance', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), note: 'Attendance - ' + type, fuel: fuelLevel }, ...prev]);
    if (user?.id) await markAttendance({ operator_id: user.id, date: new Date().toISOString().split('T')[0], status: type, check_in: new Date().toTimeString().split(' ')[0] });
  };

  const handleMachineStart = () => {
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setMachineStarted(true); setStartTime(now);
    setLogs(prev => [{ type: 'start', time: now, note: workNote || 'Machine Started', fuel: fuelLevel }, ...prev]);
    setWorkNote('');
  };

  const handleMachineStop = () => {
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setMachineStarted(false);
    setLogs(prev => [{ type: 'stop', time: now, note: workNote || 'Machine Stopped', fuel: fuelLevel }, ...prev]);
    setWorkNote('');
  };

  const handleFuelUpdate = async () => {
    const user = JSON.parse(localStorage.getItem('machineos_user') || '{}');
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [{ type: 'fuel', time: now, note: fuelNote || 'Fuel Updated', fuel: fuelLevel }, ...prev]);
    if (user?.id) await addFuelLog({ operator_id: user.id, fuel_level: fuelLevel, note: fuelNote || 'Fuel Updated', created_at: new Date().toISOString() });
    setFuelNote(''); setShowFuelModal(false);
  };

  const handleReportIssue = async () => {
    const user = JSON.parse(localStorage.getItem('machineos_user') || '{}');
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [{ type: 'issue', time: now, note: '[' + issueType + '] ' + issueNote, fuel: fuelLevel }, ...prev]);
    if (user?.id) await reportIssue({ operator_id: user.id, issue_type: issueType, description: issueNote, status: 'Pending', created_at: new Date().toISOString() });
    setIssueType(''); setIssueNote(''); setShowIssueModal(false);
    alert('Issue reported successfully!');
  };

  const logIcon = (type) => {
    const map = { start: { icon: String.fromCodePoint(0x1F7E2), color: '#4CAF50' }, stop: { icon: String.fromCodePoint(0x1F534), color: '#e94560' }, fuel: { icon: String.fromCodePoint(0x26FD), color: '#FF9800' }, issue: { icon: String.fromCodePoint(0x26A0), color: '#e94560' }, attendance: { icon: String.fromCodePoint(0x2705), color: '#4CAF50' } };
    return map[type] || { icon: String.fromCodePoint(0x1F4CB), color: '#c9a84c' };
  };

  const fuelColor = fuelLevel > 50 ? '#4CAF50' : fuelLevel > 25 ? '#FF9800' : '#e94560';
  const currentNavItem = NAV.find(n => n.id === activeTab);

  return (
    <div style={s.container}>

      {/* --- MOBILE LAYOUT --- */}
      {isSmall && (
        <>
          {/* Top Bar */}
          <div style={s.topBar}>
            <div style={s.topBarLeft}>
              <div style={s.topLogoCircle}>DE</div>
              <div>
                <p style={s.topTitle}>Development Express</p>
                <p style={s.topSub}>Operator Portal</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LanguageSelector compact={true} />
              <button style={s.hamburger} onClick={() => setMenuOpen(true)}>
                {String.fromCodePoint(0x2630)}
              </button>
            </div>
          </div>

          {/* Drawer Overlay */}
          {menuOpen && (
            <div style={s.overlay} onClick={() => setMenuOpen(false)}>
              <div style={s.drawer} onClick={e => e.stopPropagation()}>
                {/* Drawer Header */}
                <div style={s.drawerHeader}>
                  <div style={s.drawerAvatar}>{OPERATOR.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '14px', margin: 0 }}>{OPERATOR.name}</p>
                    <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>{String.fromCodePoint(0x2B50)} {OPERATOR.rating} � {OPERATOR.exp}</p>
                  </div>
                  <button style={s.closeBtn} onClick={() => setMenuOpen(false)}>?</button>
                </div>

                {/* Machine Status */}
                <div style={s.drawerMachineStatus}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: machineStarted ? '#4CAF50' : '#FF9800', display: 'inline-block' }}></span>
                    <span style={{ color: '#c9a84c', fontSize: '12px', fontWeight: '700' }}>{OPERATOR.machineId}</span>
                    <span style={{ color: machineStarted ? '#4CAF50' : '#FF9800', fontSize: '11px' }}>{machineStarted ? 'Running' : 'Stopped'}</span>
                  </div>
                  <span style={{ color: fuelColor, fontSize: '12px', fontWeight: '700' }}>{String.fromCodePoint(0x26FD)} {fuelLevel}%</span>
                </div>

                <div style={{ height: '1px', background: 'rgba(201,168,76,0.15)' }} />

                {/* Nav Items */}
                <div style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
                  {NAV.map(item => (
                    <button key={item.id}
                      style={activeTab === item.id ? s.drawerNavActive : s.drawerNav}
                      onClick={() => { setActiveTab(item.id); setMenuOpen(false); }}>
                      <span style={{ fontSize: '20px', minWidth: '28px' }}>{item.icon}</span>
                      <span style={{ flex: 1, fontSize: '14px' }}>{item.label}</span>
                      {activeTab === item.id && <span style={{ color: '#c9a84c', fontSize: '12px' }}>?</span>}
                    </button>
                  ))}
                </div>

                <div style={{ height: '1px', background: 'rgba(201,168,76,0.15)' }} />

                {/* Logout */}
                <div style={{ padding: '12px 16px' }}>
                  <button style={s.drawerLogout} onClick={() => navigate('/')}>
                    🚪 Logout
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Nav */}
          <div style={s.bottomNav}>
            {NAV.slice(0, 6).map(item => (
              <button key={item.id}
                style={{ ...s.bottomNavItem, color: activeTab === item.id ? '#c9a84c' : '#556070' }}
                onClick={() => setActiveTab(item.id)}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span style={{ fontSize: '8px', marginTop: '2px', fontWeight: activeTab === item.id ? '700' : '400' }}>{item.label}</span>
                {activeTab === item.id && <span style={s.bottomNavDot}></span>}
              </button>
            ))}
          </div>
        </>
      )}

      {/* --- DESKTOP SIDEBAR --- */}
      {!isSmall && (
        <div style={s.sidebar}>
          <div style={s.sidebarLogo}>
            <div style={s.logoCircle}>DE</div>
            <div>
              <p style={s.logoTitle}>Development Express</p>
              <p style={s.logoSub}>Operator Portal</p>
            </div>
          </div>
          <div style={s.divider} />
          <div style={s.operatorCard}>
            <div style={s.opAvatar}>{OPERATOR.name.charAt(0)}</div>
            <div>
              <p style={s.opName}>{OPERATOR.name}</p>
              <p style={s.opSub}>{String.fromCodePoint(0x2B50)} {OPERATOR.rating} � {OPERATOR.exp}</p>
            </div>
          </div>
          <div style={s.divider} />
          {NAV.map(item => (
            <button key={item.id} style={activeTab === item.id ? s.navActive : s.nav} onClick={() => setActiveTab(item.id)}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <div style={s.divider} />
          <div style={s.machineStatusBox}>
            <p style={s.msLabel}>{String.fromCodePoint(0x1F69C)} {OPERATOR.machineId}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ ...s.statusDot, background: machineStarted ? '#4CAF50' : '#FF9800' }}></span>
              <span style={{ color: machineStarted ? '#4CAF50' : '#FF9800', fontSize: '11px', fontWeight: '700' }}>{machineStarted ? 'Running' : 'Stopped'}</span>
            </div>
            <p style={{ ...s.msLabel, color: fuelColor }}>{String.fromCodePoint(0x26FD)} Fuel: {fuelLevel}%</p>
          </div>
          <button style={s.logoutBtn} onClick={() => navigate('/')}>🚪 Logout</button>
          <p style={s.sidebarFooter}>Since 2011 � 15 Yrs Excellence</p>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div style={{ ...s.main, padding: isSmall ? '66px 12px 72px' : '25px' }}>

        {/* Header */}
        <div style={{ ...s.header, marginBottom: isSmall ? '14px' : '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab !== 'dashboard' && (
              <button style={s.backBtn}
                onClick={() => { const tabs = NAV.map(n => n.id); const i = tabs.indexOf(activeTab); if (i > 0) setActiveTab(tabs[i - 1]); }}>
                ←
              </button>
            )}
            <div>
              <h2 style={{ ...s.pageTitle, fontSize: isSmall ? '15px' : '20px' }}>
                {currentNavItem?.icon} {currentNavItem?.label}
              </h2>
              <p style={s.pageDate}>
                {String.fromCodePoint(0x1F4C5)} {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })} � {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          {!isSmall && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LanguageSelector compact={true} />
              <div style={s.opBadge}>
                <span style={s.onlineDot}></span>
                {String.fromCodePoint(0x1F527)} {OPERATOR.name}
              </div>
            </div>
          )}
        </div>

        {/* --- HOME TAB --- */}
        {activeTab === 'home' && (
          <div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
              {[
                { icon: String.fromCodePoint(0x23F1), val: `${OPERATOR.todayHMR} hrs`, label: 'HMR Today', color: '#c9a84c' },
                { icon: String.fromCodePoint(0x1F4CA), val: `${OPERATOR.totalHMR} hrs`, label: 'Total HMR', color: '#c9a84c' },
                { icon: String.fromCodePoint(0x26FD), val: `${fuelLevel}%`, label: 'Fuel Level', color: fuelColor },
                { icon: String.fromCodePoint(0x2B50), val: OPERATOR.rating, label: 'My Rating', color: '#FFD700' },
              ].map((c, i) => (
                <div key={i} style={s.statCard}>
                  <div style={s.statIconWrap}><span style={{ fontSize: '22px' }}>{c.icon}</span></div>
                  <h3 style={{ ...s.statVal, color: c.color }}>{c.val}</h3>
                  <p style={s.statLabel}>{c.label}</p>
                </div>
              ))}
            </div>

            {/* Machine Status Banner */}
            <div style={{ ...s.machineBanner, borderColor: machineStarted ? '#4CAF50' : '#FF9800', background: machineStarted ? 'rgba(76,175,80,0.08)' : 'rgba(255,152,0,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: machineStarted ? '#4CAF50' : '#FF9800', display: 'inline-block', boxShadow: `0 0 8px ${machineStarted ? '#4CAF50' : '#FF9800'}` }}></span>
                <span style={{ color: machineStarted ? '#4CAF50' : '#FF9800', fontWeight: '700', fontSize: '13px' }}>{OPERATOR.machineId} � {machineStarted ? 'RUNNING' : 'STOPPED'}</span>
              </div>
              <span style={{ color: '#8896a8', fontSize: '11px' }}>{String.fromCodePoint(0x1F4CD)} {OPERATOR.site}</span>
            </div>

            {/* Today's Assignment */}
            <div style={s.card}>
              <h3 style={s.cardTitle}>{String.fromCodePoint(0x1F3AF)} Today's Assignment</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { icon: String.fromCodePoint(0x1F69C), label: 'Machine', val: OPERATOR.machineId },
                  { icon: String.fromCodePoint(0x1F522), label: 'Reg. No.', val: OPERATOR.regNo },
                  { icon: String.fromCodePoint(0x1F477), label: 'Client', val: isSmall ? 'Patil Builders' : OPERATOR.client },
                  { icon: String.fromCodePoint(0x1F4CD), label: 'Work Site', val: isSmall ? 'NH-48 Karad' : OPERATOR.site },
                  { icon: String.fromCodePoint(0x1F527), label: 'Experience', val: OPERATOR.exp },
                  { icon: String.fromCodePoint(0x1F4C5), label: 'Date', val: new Date().toLocaleDateString('en-IN') },
                ].map((d, i) => (
                  <div key={i} style={s.assignItem}>
                    <span style={{ fontSize: '16px', marginBottom: '4px', display: 'block' }}>{d.icon}</span>
                    <p style={{ color: '#556070', fontSize: '9px', margin: '0 0 2px', letterSpacing: '0.5px' }}>{d.label.toUpperCase()}</p>
                    <p style={{ color: '#e8e0d0', fontWeight: '600', fontSize: '11px', margin: 0, wordBreak: 'break-word' }}>{d.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={s.card}>
              <h3 style={s.cardTitle}>{String.fromCodePoint(0x26A1)} Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { icon: String.fromCodePoint(0x2705), label: 'Attendance', color: '#4CAF50', action: () => setActiveTab('attendance') },
                  { icon: machineStarted ? String.fromCodePoint(0x1F534) : String.fromCodePoint(0x1F7E2), label: machineStarted ? 'Stop' : 'Start', color: machineStarted ? '#e94560' : '#4CAF50', action: () => setActiveTab('machinelog') },
                  { icon: String.fromCodePoint(0x26FD), label: 'Fuel', color: '#FF9800', action: () => setShowFuelModal(true) },
                  { icon: String.fromCodePoint(0x26A0), label: 'Issue', color: '#e94560', action: () => setShowIssueModal(true) },
                ].map((btn, i) => (
                  <button key={i} style={{ ...s.actionBtn, borderColor: btn.color + '60', color: btn.color, background: btn.color + '12' }} onClick={btn.action}>
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }}>{btn.icon}</span>
                    <span style={{ fontSize: '10px', fontWeight: '700' }}>{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fuel Gauge */}
            <div style={s.card}>
              <h3 style={s.cardTitle}>{String.fromCodePoint(0x26FD)} Fuel Level � Omnicomm Sensor</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={s.fuelGaugeWrap}>
                  <div style={{ ...s.fuelGaugeFill, height: `${fuelLevel}%`, background: `linear-gradient(180deg, ${fuelColor}, ${fuelColor}88)` }} />
                  <span style={s.fuelGaugePct}>{fuelLevel}%</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: fuelColor, fontSize: '32px', fontWeight: '900', margin: '0 0 4px' }}>{fuelLevel}%</p>
                  <p style={{ color: '#8896a8', fontSize: '11px', margin: '0 0 12px' }}>
                    {fuelLevel > 50 ? String.fromCodePoint(0x2705) + ' Fuel OK' : fuelLevel > 25 ? String.fromCodePoint(0x26A0) + ' Fuel Low' : String.fromCodePoint(0x1F6A8) + ' Critical!'}
                  </p>
                  <div style={s.fuelProgressBg}>
                    <div style={{ ...s.fuelProgressFill, width: `${fuelLevel}%`, background: `linear-gradient(90deg, ${fuelColor}, ${fuelColor}88)` }} />
                  </div>
                  <button style={s.fuelUpdateBtn} onClick={() => setShowFuelModal(true)}>
                    {String.fromCodePoint(0x26FD)} Update Fuel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- ATTENDANCE TAB --- */}
        {activeTab === 'attendance' && (
          <div>
            <div style={{ ...s.card, textAlign: 'center', padding: '24px 16px', marginBottom: '12px' }}>
              <p style={{ color: '#8896a8', fontSize: '12px', margin: '0 0 16px' }}>
                {String.fromCodePoint(0x1F4C5)} {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              {attendance ? (
                <div>
                  <p style={{ fontSize: '48px', margin: '0 0 10px' }}>
                    {attendance === 'present' ? String.fromCodePoint(0x2705) : attendance === 'halfday' ? String.fromCodePoint(0x1F550) : String.fromCodePoint(0x274C)}
                  </p>
                  <p style={{ color: '#4CAF50', fontSize: '16px', fontWeight: '700', margin: '0 0 4px' }}>Attendance Marked!</p>
                  <p style={{ color: '#8896a8', fontSize: '12px', margin: 0 }}>
                    {attendance === 'present' ? 'Present' : attendance === 'halfday' ? 'Half Day' : 'Absent'}
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#8896a8', fontSize: '13px', marginBottom: '18px' }}>Mark today's attendance:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '340px', margin: '0 auto' }}>
                    {[
                      { type: 'present', icon: String.fromCodePoint(0x2705), label: 'Present', color: '#4CAF50' },
                      { type: 'halfday', icon: String.fromCodePoint(0x1F550), label: 'Half Day', color: '#FF9800' },
                      { type: 'absent', icon: String.fromCodePoint(0x274C), label: 'Absent', color: '#e94560' },
                    ].map((btn) => (
                      <button key={btn.type} style={{ ...s.attBtn, borderColor: btn.color + '80', background: btn.color + '12', color: btn.color }} onClick={() => handleAttendance(btn.type)}>
                        <span style={{ fontSize: '28px', display: 'block', marginBottom: '6px' }}>{btn.icon}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700' }}>{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>{String.fromCodePoint(0x1F4C5)} Attendance History</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead><tr>{['Date', 'Status', 'In', 'Out', 'HMR'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {attendanceRows.map((a, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><p style={{ margin: 0, fontWeight: '600' }}>{a.date}</p><p style={{ margin: 0, color: '#556070', fontSize: '10px' }}>{a.day}</p></td>
                        <td style={s.td}><span style={{ color: a.status === 'Present' ? '#4CAF50' : '#FF9800', fontWeight: '700' }}>{a.status === 'Present' ? String.fromCodePoint(0x2705) : String.fromCodePoint(0x1F550)} {a.status}</span></td>
                        <td style={s.td}>{a.checkIn}</td>
                        <td style={s.td}>{a.checkOut}</td>
                        <td style={{ ...s.td, color: '#c9a84c', fontWeight: '700' }}>{a.hmr}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- MACHINE LOG TAB --- */}
        {activeTab === 'machinelog' && (
          <div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>{String.fromCodePoint(0x1F69C)} Machine Control � {OPERATOR.machineId}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div style={{ borderRadius: '12px', padding: '20px', textAlign: 'center', background: machineStarted ? 'rgba(76,175,80,0.08)' : 'rgba(233,69,96,0.08)', border: `2px solid ${machineStarted ? '#4CAF50' : '#e94560'}` }}>
                  <p style={{ fontSize: '40px', margin: '0 0 8px' }}>{machineStarted ? String.fromCodePoint(0x1F7E2) : String.fromCodePoint(0x1F534)}</p>
                  <p style={{ color: machineStarted ? '#4CAF50' : '#e94560', fontSize: '15px', fontWeight: '700', margin: '0 0 4px' }}>
                    {machineStarted ? 'Machine Running' : 'Machine Stopped'}
                  </p>
                  {startTime && <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>Started: {startTime}</p>}
                </div>
                <div>
                  <textarea style={{ ...s.input, height: '70px', resize: 'none', marginBottom: '10px', fontSize: '13px' }} placeholder="Work note (optional)..." value={workNote} onChange={e => setWorkNote(e.target.value)} />
                  {!machineStarted ? (
                    <button style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #2e7d32, #4CAF50)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }} onClick={handleMachineStart}>
                      {String.fromCodePoint(0x1F7E2)} Machine START ???
                    </button>
                  ) : (
                    <button style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #c0392b, #e74c3c)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }} onClick={handleMachineStop}>
                      {String.fromCodePoint(0x1F534)} Machine STOP ???
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: 'HMR Today', val: `${OPERATOR.todayHMR}h`, icon: String.fromCodePoint(0x23F1) },
                  { label: 'Start Time', val: startTime || '07:30 AM', icon: String.fromCodePoint(0x1F7E2) },
                  { label: 'Fuel Level', val: `${fuelLevel}%`, icon: String.fromCodePoint(0x26FD) },
                  { label: 'Condition', val: '91%', icon: String.fromCodePoint(0x1F527) },
                ].map((d, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', margin: '0 0 4px' }}>{d.icon}</p>
                    <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '13px', margin: '0 0 2px' }}>{d.val}</p>
                    <p style={{ color: '#556070', fontSize: '9px', margin: 0 }}>{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>{String.fromCodePoint(0x1F4CB)} Today's Activity Log</h3>
              {logs.map((log, i) => {
                const { icon, color } = logIcon(log.type);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '6px', borderLeft: `3px solid ${color}` }}>
                    <span style={{ fontSize: '16px' }}>{icon}</span>
                    <span style={{ color: '#556070', fontSize: '10px', width: '60px', flexShrink: 0 }}>{log.time}</span>
                    <span style={{ color: '#e8e0d0', fontSize: '12px', flex: 1 }}>{log.note}</span>
                    <span style={{ color: '#FF9800', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>{String.fromCodePoint(0x26FD)}{log.fuel}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- FUEL TAB --- */}
        {activeTab === 'fuel' && (
          <div>
            <div style={{ ...s.card, marginBottom: '12px' }}>
              <h3 style={s.cardTitle}>{String.fromCodePoint(0x26FD)} Fuel Update</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                <div style={s.fuelGaugeWrap}>
                  <div style={{ ...s.fuelGaugeFill, height: `${fuelLevel}%`, background: `linear-gradient(180deg, ${fuelColor}, ${fuelColor}88)` }} />
                  <span style={s.fuelGaugePct}>{fuelLevel}%</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: fuelColor, fontSize: '36px', fontWeight: '900', margin: '0 0 4px' }}>{fuelLevel}%</p>
                  <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 10px' }}>Omnicomm Sensor � 99.2% Accuracy</p>
                  <input type="range" min="0" max="100" value={fuelLevel} onChange={e => setFuelLevel(Number(e.target.value))} style={{ width: '100%', accentColor: '#c9a84c', marginBottom: '8px' }} />
                  <input style={{ ...s.input, marginBottom: '10px', fontSize: '13px' }} placeholder="Note: Refilled / Fuel used..." value={fuelNote} onChange={e => setFuelNote(e.target.value)} />
                  <button style={s.primaryBtn} onClick={handleFuelUpdate}>
                    {String.fromCodePoint(0x2705)} Fuel Update Submit
                  </button>
                </div>
              </div>
            </div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>{String.fromCodePoint(0x26FD)} Fuel History</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead><tr>{['Date', 'Time', 'Level', 'Change', 'Note'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {fuelRows.map((f, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}>{f.date}</td>
                        <td style={s.td}>{f.time}</td>
                        <td style={s.td}><span style={{ color: f.level > 50 ? '#4CAF50' : '#FF9800', fontWeight: '700' }}>{f.level}%</span></td>
                        <td style={s.td}><span style={{ color: f.change > 0 ? '#4CAF50' : '#e94560', fontWeight: '700' }}>{f.change > 0 ? '+' : ''}{f.change}%</span></td>
                        <td style={s.td}>{f.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- DAILY REPORT TAB --- */}
        {activeTab === 'daily' && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>{String.fromCodePoint(0x1F4CB)} Daily Work Report � April 2026</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead><tr>{['Date', 'Att', 'Start', 'End', 'HMR', 'Fuel?', 'Fuel?', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dailyReports.map((r, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}>{r.date}</td>
                      <td style={s.td}><span style={{ color: r.att === 'P' ? '#4CAF50' : '#FF9800' }}>{r.att === 'P' ? String.fromCodePoint(0x2705) : String.fromCodePoint(0x1F550)}</span></td>
                      <td style={s.td}>{r.start}</td>
                      <td style={s.td}>{r.end}</td>
                      <td style={{ ...s.td, color: '#c9a84c', fontWeight: '700' }}>{r.hmr}h</td>
                      <td style={s.td}>{r.fuelStart}%</td>
                      <td style={s.td}><span style={{ color: r.fuelEnd < 30 ? '#e94560' : '#4CAF50' }}>{r.fuelEnd}%</span></td>
                      <td style={s.td}><span style={s.successBadge}>{String.fromCodePoint(0x2705)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ISSUES TAB --- */}
        {activeTab === 'issues' && (
          <div>
            <div style={{ ...s.card, border: '1px solid rgba(233,69,96,0.3)' }}>
              <h3 style={{ ...s.cardTitle, color: '#e94560' }}>{String.fromCodePoint(0x26A0)} Issue Report ⚠</h3>
              <p style={{ color: '#8896a8', fontSize: '12px', marginBottom: '14px' }}>Any machine issue report kara immediately.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                {[
                  { id: 'mechanical', icon: String.fromCodePoint(0x1F527), label: 'Mechanical' },
                  { id: 'fuel', icon: String.fromCodePoint(0x26FD), label: 'Fuel Issue' },
                  { id: 'accident', icon: String.fromCodePoint(0x1F6A8), label: 'Accident' },
                  { id: 'electrical', icon: String.fromCodePoint(0x26A1), label: 'Electrical' },
                  { id: 'site', icon: String.fromCodePoint(0x1F4CD), label: 'Site Issue' },
                  { id: 'other', icon: String.fromCodePoint(0x1F4CB), label: 'Other' },
                ].map(issue => (
                  <button key={issue.id} style={{ borderRadius: '10px', padding: '12px 6px', cursor: 'pointer', textAlign: 'center', border: issueType === issue.id ? '2px solid #e94560' : '1px solid rgba(233,69,96,0.3)', background: issueType === issue.id ? 'rgba(233,69,96,0.15)' : 'rgba(233,69,96,0.05)' }}
                    onClick={() => setIssueType(issue.id)}>
                    <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>{issue.icon}</span>
                    <span style={{ color: issueType === issue.id ? '#e94560' : '#8896a8', fontSize: '10px', fontWeight: '600' }}>{issue.label}</span>
                  </button>
                ))}
              </div>
              <textarea style={{ ...s.input, height: '80px', resize: 'vertical', marginBottom: '12px', fontSize: '13px' }}
                placeholder="?????? ??????? ?????..." value={issueNote} onChange={e => setIssueNote(e.target.value)} />
              <button style={{ ...s.dangerBtn, opacity: (!issueType || !issueNote) ? 0.5 : 1 }}
                disabled={!issueType || !issueNote} onClick={handleReportIssue}>
                {String.fromCodePoint(0x1F6A8)} 🚨 Issue Report Submit
              </button>
            </div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>{String.fromCodePoint(0x1F4CB)} Past Issues</h3>
              {pastIssues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '8px', borderLeft: `3px solid ${issue.resolved ? '#4CAF50' : '#e94560'}` }}>
                  <span style={{ fontSize: '16px' }}>{String.fromCodePoint(0x26A0)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#556070', fontSize: '10px', margin: '0 0 2px' }}>{issue.date} � [{issue.type}]</p>
                    <p style={{ color: '#e8e0d0', fontSize: '12px', fontWeight: '600', margin: '0 0 2px' }}>{issue.note}</p>
                    <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>{issue.action}</p>
                  </div>
                  <span style={{ color: issue.resolved ? '#4CAF50' : '#e94560', fontSize: '16px', flexShrink: 0 }}>
                    {issue.resolved ? String.fromCodePoint(0x2705) : String.fromCodePoint(0x1F504)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- FUEL MODAL --- */}
      {showFuelModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, width: isSmall ? '94%' : '360px' }}>
            <h3 style={{ color: '#FF9800', fontSize: '16px', margin: '0 0 14px', textAlign: 'center' }}>{String.fromCodePoint(0x26FD)} Fuel Level Update</h3>
            <p style={{ color: '#8896a8', textAlign: 'center', marginBottom: '8px' }}>Current: <strong style={{ color: fuelColor }}>{fuelLevel}%</strong></p>
            <input type="range" min="0" max="100" value={fuelLevel} onChange={e => setFuelLevel(Number(e.target.value))} style={{ width: '100%', accentColor: '#c9a84c', marginBottom: '8px' }} />
            <p style={{ color: '#c9a84c', fontSize: '24px', fontWeight: '700', textAlign: 'center', margin: '0 0 12px' }}>{fuelLevel}%</p>
            <input style={{ ...s.input, marginBottom: '12px', fontSize: '13px' }} placeholder="Note: Refilled 50 Ltrs..." value={fuelNote} onChange={e => setFuelNote(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={s.cancelBtn} onClick={() => setShowFuelModal(false)}>Cancel</button>
              <button style={s.confirmBtn} onClick={handleFuelUpdate}>{String.fromCodePoint(0x2705)} Update</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ISSUE MODAL --- */}
      {showIssueModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, width: isSmall ? '94%' : '360px' }}>
            <h3 style={{ color: '#e94560', fontSize: '16px', margin: '0 0 14px', textAlign: 'center' }}>{String.fromCodePoint(0x26A0)} Quick Issue Report</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                { id: 'mechanical', icon: String.fromCodePoint(0x1F527), label: 'Mechanical' },
                { id: 'fuel', icon: String.fromCodePoint(0x26FD), label: 'Fuel' },
                { id: 'accident', icon: String.fromCodePoint(0x1F6A8), label: 'Accident' },
                { id: 'electrical', icon: String.fromCodePoint(0x26A1), label: 'Electrical' },
              ].map(issue => (
                <button key={issue.id} style={{ borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', border: issueType === issue.id ? '2px solid #e94560' : '1px solid rgba(233,69,96,0.3)', background: issueType === issue.id ? 'rgba(233,69,96,0.15)' : 'transparent' }}
                  onClick={() => setIssueType(issue.id)}>
                  <span style={{ fontSize: '20px' }}>{issue.icon}</span>
                  <span style={{ color: '#8896a8', fontSize: '11px', display: 'block' }}>{issue.label}</span>
                </button>
              ))}
            </div>
            <textarea style={{ ...s.input, width: '100%', height: '80px', boxSizing: 'border-box', marginBottom: '12px', resize: 'none', fontSize: '13px' }}
              placeholder="?????? ???????? ?????..." value={issueNote} onChange={e => setIssueNote(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={s.cancelBtn} onClick={() => setShowIssueModal(false)}>Cancel</button>
              <button style={{ ...s.confirmBtn, background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }} onClick={handleReportIssue}>{String.fromCodePoint(0x1F6A8)} Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  container: { display: 'flex', minHeight: '100vh', background: '#050d1a', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#fff' },

  // Mobile Top Bar
  topBar: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(135deg, #0a1628, #0f2040)', borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '0 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '56px', boxSizing: 'border-box' },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  topLogoCircle: { width: '32px', height: '32px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0a1628', fontSize: '11px' },
  topTitle: { color: '#c9a84c', fontWeight: '700', fontSize: '12px', margin: 0 },
  topSub: { color: '#8896a8', fontSize: '9px', margin: 0 },
  hamburger: { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', borderRadius: '8px', padding: '6px 12px', fontSize: '18px', cursor: 'pointer' },

  // Drawer
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex' },
  drawer: { width: '280px', background: 'linear-gradient(180deg, #0d1f3c, #0a1628)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.6)' },
  drawerHeader: { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderBottom: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)', flexShrink: 0 },
  drawerAvatar: { width: '40px', height: '40px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0a1628', fontSize: '16px', flexShrink: 0 },
  closeBtn: { background: 'transparent', border: 'none', color: '#8896a8', fontSize: '18px', cursor: 'pointer', padding: '4px', flexShrink: 0 },
  drawerMachineStatus: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(0,0,0,0.3)', flexShrink: 0 },
  drawerNav: { display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 14px', borderRadius: '10px', border: 'none', background: 'transparent', color: '#8896a8', cursor: 'pointer', fontSize: '14px', width: '100%', textAlign: 'left', marginBottom: '2px' },
  drawerNavActive: { display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 14px', borderRadius: '10px', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.1)', color: '#c9a84c', cursor: 'pointer', fontSize: '14px', width: '100%', textAlign: 'left', fontWeight: '700', marginBottom: '2px' },
  drawerLogout: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', borderRadius: '8px', border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.08)', color: '#e94560', cursor: 'pointer', fontSize: '13px' },

  // Bottom Nav
  bottomNav: { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(135deg, #0a1628, #0f2040)', borderTop: '1px solid rgba(201,168,76,0.25)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '4px 0 6px', height: '58px' },
  bottomNavItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '8px', minWidth: '44px', position: 'relative' },
  bottomNavDot: { position: 'absolute', bottom: '-2px', width: '4px', height: '4px', borderRadius: '50%', background: '#c9a84c' },

  // Desktop Sidebar
  sidebar: { width: '230px', background: 'linear-gradient(180deg, #0f2040, #0a1628)', borderRight: '1px solid rgba(201,168,76,0.2)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  logoCircle: { width: '36px', height: '36px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0a1628', fontSize: '12px', flexShrink: 0 },
  logoTitle: { color: '#c9a84c', fontWeight: '700', fontSize: '12px', margin: 0 },
  logoSub: { color: '#8896a8', fontSize: '10px', margin: 0 },
  divider: { height: '1px', background: 'rgba(201,168,76,0.15)', margin: '8px 0' },
  operatorCard: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(201,168,76,0.08)', borderRadius: '10px', margin: '4px 0' },
  opAvatar: { width: '36px', height: '36px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a1628', fontWeight: '900', fontSize: '14px', flexShrink: 0 },
  opName: { color: '#c9a84c', fontWeight: '700', fontSize: '12px', margin: 0 },
  opSub: { color: '#8896a8', fontSize: '10px', margin: 0 },
  nav: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#8896a8', cursor: 'pointer', fontSize: '13px', width: '100%', textAlign: 'left' },
  navActive: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.1)', color: '#c9a84c', cursor: 'pointer', fontSize: '13px', width: '100%', textAlign: 'left', fontWeight: '700' },
  machineStatusBox: { background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', margin: '4px 0' },
  msLabel: { color: '#8896a8', fontSize: '11px', margin: '3px 0' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.08)', color: '#e94560', cursor: 'pointer', fontSize: '12px', width: '100%', marginTop: 'auto' },
  sidebarFooter: { color: 'rgba(201,168,76,0.4)', fontSize: '9px', textAlign: 'center', marginTop: '8px', letterSpacing: '1px' },

  // Main
  main: { flex: 1, overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid rgba(201,168,76,0.12)' },
  backBtn: { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', flexShrink: 0 },
  pageTitle: { color: '#c9a84c', fontWeight: '700', margin: '0 0 3px' },
  pageDate: { color: '#556070', fontSize: '11px', margin: 0 },
  opBadge: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', padding: '8px 14px', borderRadius: '20px', color: '#c9a84c', fontSize: '12px' },
  onlineDot: { width: '7px', height: '7px', background: '#4CAF50', borderRadius: '50%', display: 'inline-block' },

  // Cards
  card: { background: 'linear-gradient(135deg, #0d1f3c, #0a1628)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '14px', padding: '16px', marginBottom: '12px' },
  cardTitle: { color: '#c9a84c', margin: '0 0 12px', fontSize: '13px', fontWeight: '700', letterSpacing: '0.3px' },

  // Stats
  statCard: { background: 'linear-gradient(135deg, #0d1f3c, #0a1628)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '14px', padding: '14px 12px', textAlign: 'center' },
  statIconWrap: { width: '40px', height: '40px', background: 'rgba(201,168,76,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
  statVal: { fontSize: '18px', fontWeight: '800', margin: '0 0 3px' },
  statLabel: { color: '#556070', fontSize: '10px', margin: 0 },

  // Machine Banner
  machineBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', border: '1px solid', marginBottom: '12px' },

  // Assignment
  assignItem: { background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px 10px', textAlign: 'center' },

  // Actions
  actionBtn: { borderRadius: '12px', padding: '14px 6px', cursor: 'pointer', textAlign: 'center', border: '1px solid', transition: 'all 0.2s' },

  // Fuel Gauge
  fuelGaugeWrap: { width: '44px', height: '110px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', flexShrink: 0, position: 'relative' },
  fuelGaugeFill: { width: '100%', transition: 'height 0.5s, background 0.3s' },
  fuelGaugePct: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '8px', fontWeight: '700', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' },
  fuelProgressBg: { height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', marginBottom: '12px' },
  fuelProgressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s' },
  fuelUpdateBtn: { background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },

  // Buttons
  primaryBtn: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' },
  dangerBtn: { width: '100%', padding: '13px', background: 'linear-gradient(135deg, #c0392b, #e74c3c)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' },
  attBtn: { borderRadius: '12px', padding: '18px 8px', cursor: 'pointer', textAlign: 'center', border: '2px solid' },
  successBadge: { background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50', padding: '2px 8px', borderRadius: '20px', fontSize: '10px' },

  // Table
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '400px' },
  th: { padding: '10px 8px', textAlign: 'left', color: 'rgba(201,168,76,0.7)', fontSize: '10px', letterSpacing: '0.8px', borderBottom: '1px solid rgba(201,168,76,0.12)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  td: { padding: '10px 8px', fontSize: '12px', color: '#e8e0d0', whiteSpace: 'nowrap' },

  // Input
  input: { width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '8px', color: '#fff', boxSizing: 'border-box', outline: 'none' },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' },
  modal: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '16px', padding: '22px' },
  cancelBtn: { flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8896a8', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  confirmBtn: { flex: 1, padding: '11px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
};

export default OperatorDashboard;
// updated



