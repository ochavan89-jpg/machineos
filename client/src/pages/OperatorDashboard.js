import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import MobileNav from '../components/MobileNav';
import { sendIssueAlert } from '../emailService';
import { sendIssueWhatsApp } from '../whatsappService';
import { useWindowSize } from '../hooks/useWindowSize';
import { markAttendance, addFuelLog, reportIssue } from '../supabaseService';

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
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'attendance', icon: '✅', label: 'Attendance' },
  { id: 'machinelog', icon: '🚜', label: 'Machine Log' },
  { id: 'fuel', icon: '⛽', label: 'Fuel Report' },
  { id: 'daily', icon: '📋', label: 'Daily Report' },
  { id: 'issues', icon: '⚠️', label: 'Report Issue' },
];

const attendanceHistory = [
  { date: '12 Apr', day: 'Sunday', status: 'Present', checkIn: '07:28 AM', checkOut: '06:05 PM', hmr: 6.5 },
  { date: '11 Apr', day: 'Saturday', status: 'Present', checkIn: '07:30 AM', checkOut: '05:45 PM', hmr: 7.0 },
  { date: '10 Apr', day: 'Friday', status: 'Present', checkIn: '07:25 AM', checkOut: '06:00 PM', hmr: 6.8 },
  { date: '09 Apr', day: 'Thursday', status: 'Half Day', checkIn: '07:30 AM', checkOut: '01:00 PM', hmr: 4.0 },
  { date: '08 Apr', day: 'Wednesday', status: 'Present', checkIn: '07:32 AM', checkOut: '05:55 PM', hmr: 7.2 },
];

const fuelHistory = [
  { date: '12 Apr', time: '11:00 AM', level: 82, change: +12, note: 'Refilled — 50 Ltrs', by: 'Ramesh K.' },
  { date: '12 Apr', time: '07:30 AM', level: 70, change: -5, note: 'Morning check', by: 'Sensor Auto' },
  { date: '11 Apr', time: '05:45 PM', level: 75, change: -18, note: 'End of day', by: 'Sensor Auto' },
  { date: '11 Apr', time: '07:30 AM', level: 93, change: +25, note: 'Refilled — 100 Ltrs', by: 'Ramesh K.' },
];

const dailyReports = [
  { date: '12 Apr', att: 'P', start: '07:30 AM', end: '06:05 PM', hmr: 6.5, fuelStart: 70, fuelEnd: 65, site: 'Karad NH-48', status: 'Submitted' },
  { date: '11 Apr', att: 'P', start: '07:30 AM', end: '05:45 PM', hmr: 7.0, fuelStart: 93, fuelEnd: 75, site: 'Karad NH-48', status: 'Submitted' },
  { date: '10 Apr', att: 'P', start: '07:25 AM', end: '06:00 PM', hmr: 6.8, fuelStart: 88, fuelEnd: 68, site: 'Karad NH-48', status: 'Submitted' },
  { date: '09 Apr', att: 'H', start: '07:30 AM', end: '01:00 PM', hmr: 4.0, fuelStart: 75, fuelEnd: 62, site: 'Karad NH-48', status: 'Submitted' },
];

const pastIssues = [
  { date: '05 Apr', type: 'Mechanical', note: 'Hydraulic oil leakage detected', action: 'Mechanic sent — Repaired on site', resolved: true },
  { date: '02 Apr', type: 'Fuel', note: 'Fuel level dropped 15% overnight', action: 'Investigation initiated', resolved: true },
  { date: '28 Mar', type: 'Electrical', note: 'Dashboard warning light on', action: 'Electrician inspected — Sensor replaced', resolved: true },
];

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage(); // eslint-disable-line
  const { isMobile, isTablet } = useWindowSize();
  const isSmall = isMobile || isTablet;

  const [activeTab, setActiveTab] = useState('home');
  const [attendance, setAttendance] = useState(null);
  const [machineStarted, setMachineStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [fuelLevel, setFuelLevel] = useState(72);
  const [fuelNote, setFuelNote] = useState('');
  const [workNote, setWorkNote] = useState('');
  const [logs, setLogs] = useState([
    { type: 'start', time: '07:30 AM', note: 'Machine started — Site ready', fuel: 75 },
    { type: 'fuel', time: '11:00 AM', note: 'Fuel refilled — 50 Ltrs added', fuel: 82 },
    { type: 'stop', time: '01:00 PM', note: 'Lunch break', fuel: 78 },
    { type: 'start', time: '02:00 PM', note: 'Resumed after break', fuel: 78 },
  ]);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [issueNote, setIssueNote] = useState('');

  const handleAttendance = async (type) => {
    const user = JSON.parse(localStorage.getItem('machineos_user') || '{}');
    setAttendance(type);
    setLogs(prev => [{ type: 'attendance', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), note: 'Attendance - ' + type, fuel: fuelLevel }, ...prev]);
    if (user?.id) await markAttendance({ operator_id: user.id, date: new Date().toISOString().split('T')[0], status: type, check_in: new Date().toTimeString().split(' ')[0] });
  };

  const handleMachineStart = () => {
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setMachineStarted(true);
    setStartTime(now);
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
    setFuelNote('');
    setShowFuelModal(false);
  };

  const handleReportIssue = async () => {
    const user = JSON.parse(localStorage.getItem('machineos_user') || '{}');
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [{ type: 'issue', time: now, note: '[' + issueType + '] ' + issueNote, fuel: fuelLevel }, ...prev]);
    if (user?.id) await reportIssue({ operator_id: user.id, issue_type: issueType, description: issueNote, status: 'Pending', created_at: new Date().toISOString() });
    setIssueType('');
    setIssueNote('');
    sendIssueWhatsApp('+918408000084', { machine: OPERATOR.machineId, type: issueType, description: issueNote, operator: OPERATOR.name });
    sendIssueAlert('machineos@developmentexpress.in', { machine: OPERATOR.machineId, type: issueType, description: issueNote, operator: OPERATOR.name });
    setShowIssueModal(false);
    alert('Issue reported!');
  };

  const logIcon = (type) => {
    switch (type) {
      case 'start': return { icon: '🟢', color: '#4CAF50' };
      case 'stop': return { icon: '🔴', color: '#e94560' };
      case 'fuel': return { icon: '⛽', color: '#FF9800' };
      case 'issue': return { icon: '⚠️', color: '#e94560' };
      case 'attendance': return { icon: '✅', color: '#4CAF50' };
      default: return { icon: '📋', color: '#c9a84c' };
    }
  };

  return (
    <div style={s.container}>
      {isSmall && (
        <MobileNav
          items={NAV}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          companyName="Development Express"
          userName={OPERATOR.name}
          topContent={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a1628', fontWeight: '900', fontSize: '14px', flexShrink: 0 }}>{OPERATOR.name.charAt(0)}</div>
              <div>
                <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '13px', margin: '0 0 2px' }}>{OPERATOR.name}</p>
                <p style={{ color: '#8896a8', fontSize: '10px', margin: 0 }}>⭐ {OPERATOR.rating} · {OPERATOR.exp}</p>
              </div>
            </div>
          }
          bottomContent={
            <div>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px 10px', marginBottom: '8px' }}>
                <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 2px' }}>🚜 {OPERATOR.machineId}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: machineStarted ? '#4CAF50' : '#FF9800', display: 'inline-block' }}></span>
                  <span style={{ color: machineStarted ? '#4CAF50' : '#FF9800', fontSize: '11px', fontWeight: '700' }}>{machineStarted ? 'Running' : 'Stopped'}</span>
                  <span style={{ color: '#8896a8', fontSize: '10px', marginLeft: '8px' }}>⛽ {fuelLevel}%</span>
                </div>
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.08)', color: '#e94560', cursor: 'pointer', fontSize: '13px', width: '100%' }} onClick={() => navigate('/')}>🚪 Logout</button>
            </div>
          }
        />
      )}

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
              <p style={s.opSub}>⭐ {OPERATOR.rating} · {OPERATOR.exp}</p>
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
            <p style={s.msLabel}>🚜 {OPERATOR.machineId}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ ...s.statusDot, background: machineStarted ? '#4CAF50' : '#FF9800' }}></span>
              <span style={{ color: machineStarted ? '#4CAF50' : '#FF9800', fontSize: '11px', fontWeight: '700' }}>{machineStarted ? 'Running' : 'Stopped'}</span>
            </div>
            <p style={s.msLabel}>⛽ Fuel: {fuelLevel}%</p>
          </div>
          <button style={s.logoutBtn} onClick={() => navigate('/')}>🚪 Logout</button>
          <p style={s.sidebarFooter}>Since 2011 · 15 Yrs Excellence</p>
        </div>
      )}

      <div style={{ ...s.main, padding: isSmall ? '70px 12px 70px' : '25px' }}>
        <div style={{ ...s.header, flexDirection: isSmall ? 'column' : 'row', gap: isSmall ? '8px' : '0' }}>
          <div>
            <p style={{ color: '#c9a84c', fontSize: '11px', margin: '0 0 2px', cursor: 'pointer' }}
              onClick={() => { const tabs = NAV.map(n => n.id); const i = tabs.indexOf(activeTab); if (i > 0) setActiveTab(tabs[i - 1]); }}>← Back</p>
            <h2 style={{ ...s.pageTitle, fontSize: isSmall ? '16px' : '20px' }}>
              {NAV.find(n => n.id === activeTab)?.icon}{' '}{NAV.find(n => n.id === activeTab)?.label}
            </h2>
            <p style={s.pageDate}>📅 {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LanguageSelector compact={true} />
            {!isSmall && (
              <div style={s.opBadge}>
                <span style={s.onlineDot}></span>
                🔧 {OPERATOR.name}
              </div>
            )}
          </div>
        </div>

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '⏱️', val: `${OPERATOR.todayHMR} hrs`, label: 'HMR Today' },
                { icon: '📊', val: `${OPERATOR.totalHMR} hrs`, label: 'Total HMR' },
                { icon: '⛽', val: `${fuelLevel}%`, label: 'Fuel Level', color: fuelLevel > 50 ? '#4CAF50' : '#e94560' },
                { icon: '⭐', val: OPERATOR.rating, label: 'My Rating' },
              ].map((c, i) => (
                <div key={i} style={s.card}>
                  <p style={s.cardIcon}>{c.icon}</p>
                  <h3 style={{ ...s.cardVal, color: c.color || '#c9a84c' }}>{c.val}</h3>
                  <p style={s.cardLbl}>{c.label}</p>
                </div>
              ))}
            </div>

            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>🎯 Today's Assignment</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { icon: '🚜', label: 'Machine', val: isSmall ? OPERATOR.machineId : OPERATOR.machine },
                  { icon: '🔢', label: 'Reg. No.', val: OPERATOR.regNo },
                  { icon: '👷', label: 'Client', val: OPERATOR.client },
                  { icon: '📍', label: 'Work Site', val: OPERATOR.site },
                  { icon: '🔧', label: 'Experience', val: OPERATOR.exp },
                  { icon: '📅', label: 'Date', val: new Date().toLocaleDateString('en-IN') },
                ].map((d, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '18px', margin: '0 0 4px' }}>{d.icon}</p>
                    <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 2px' }}>{d.label}</p>
                    <p style={{ color: '#e8e0d0', fontWeight: '600', fontSize: '11px', margin: 0 }}>{d.val}</p>
                  </div>
                ))}
              </div>
            </div>

            <h3 style={s.tableTitle}>⚡ Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isSmall ? '8px' : '12px', marginBottom: '20px' }}>
              {[
                { icon: '✅', label: 'Attendance', color: '#4CAF50', action: () => setActiveTab('attendance') },
                { icon: machineStarted ? '🔴' : '🟢', label: machineStarted ? 'Stop' : 'Start', color: machineStarted ? '#e94560' : '#4CAF50', action: () => setActiveTab('machinelog') },
                { icon: '⛽', label: 'Fuel', color: '#FF9800', action: () => setShowFuelModal(true) },
                { icon: '⚠️', label: 'Issue', color: '#e94560', action: () => setShowIssueModal(true) },
              ].map((btn, i) => (
                <button key={i} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${btn.color}`, borderRadius: '10px', padding: isSmall ? '12px 6px' : '16px 8px', cursor: 'pointer', textAlign: 'center', color: btn.color }} onClick={btn.action}>
                  <span style={{ fontSize: isSmall ? '22px' : '26px', display: 'block', marginBottom: '6px' }}>{btn.icon}</span>
                  <span style={{ fontSize: isSmall ? '10px' : '12px', fontWeight: '700' }}>{btn.label}</span>
                </button>
              ))}
            </div>

            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>⛽ Fuel Level — Omnicomm Sensor</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '50px', height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ width: '100%', height: `${fuelLevel}%`, background: fuelLevel > 50 ? '#4CAF50' : fuelLevel > 25 ? '#FF9800' : '#e94560', borderRadius: '6px', transition: 'height 0.5s' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: fuelLevel > 50 ? '#4CAF50' : '#e94560', fontSize: isSmall ? '36px' : '44px', fontWeight: '900', margin: '0 0 6px' }}>{fuelLevel}%</p>
                  <p style={{ color: '#8896a8', fontSize: '12px', margin: '0 0 12px' }}>
                    {fuelLevel > 50 ? '✅ Fuel OK' : fuelLevel > 25 ? '⚠️ Fuel Low' : '🚨 Critical — Refuel Now!'}
                  </p>
                  <button style={{ background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }} onClick={() => setShowFuelModal(true)}>
                    ⛽ Update Fuel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div>
            <div style={{ ...s.tableCard, textAlign: 'center', padding: '30px 20px', marginBottom: '15px' }}>
              <h3 style={{ color: '#c9a84c', fontSize: '16px', margin: '0 0 20px' }}>
                📅 {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </h3>
              {attendance ? (
                <div>
                  <p style={{ fontSize: '50px', margin: '0 0 12px' }}>
                    {attendance === 'present' ? '✅' : attendance === 'halfday' ? '🕐' : '❌'}
                  </p>
                  <p style={{ color: '#4CAF50', fontSize: '18px', fontWeight: '700', margin: '0 0 6px' }}>Attendance Marked!</p>
                  <p style={{ color: '#8896a8', fontSize: '13px', margin: 0 }}>
                    {attendance === 'present' ? 'Present ✅' : attendance === 'halfday' ? 'Half Day 🕐' : 'Absent ❌'}
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#8896a8', fontSize: '13px', marginBottom: '20px' }}>आजची Attendance Mark करा:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
                    {[
                      { type: 'present', icon: '✅', label: 'Present', color: '#4CAF50', bg: 'rgba(76,175,80,0.1)', border: 'rgba(76,175,80,0.4)' },
                      { type: 'halfday', icon: '🕐', label: 'Half Day', color: '#FF9800', bg: 'rgba(255,152,0,0.1)', border: 'rgba(255,152,0,0.4)' },
                      { type: 'absent', icon: '❌', label: 'Absent', color: '#e94560', bg: 'rgba(233,69,96,0.1)', border: 'rgba(233,69,96,0.4)' },
                    ].map((btn) => (
                      <button key={btn.type} style={{ borderRadius: '12px', padding: '20px 10px', cursor: 'pointer', textAlign: 'center', background: btn.bg, border: `2px solid ${btn.border}`, color: btn.color }} onClick={() => handleAttendance(btn.type)}>
                        <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>{btn.icon}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>📅 Attendance History</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...s.table, minWidth: '480px' }}>
                  <thead><tr>{['Date', 'Day', 'Status', 'Check In', 'Check Out', 'HMR'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {attendanceHistory.map((a, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}>{a.date}</td>
                        <td style={s.td}>{a.day}</td>
                        <td style={s.td}><span style={{ color: a.status === 'Present' ? '#4CAF50' : '#FF9800', fontWeight: '700' }}>{a.status === 'Present' ? '✅' : '🕐'} {a.status}</span></td>
                        <td style={s.td}>{a.checkIn}</td>
                        <td style={s.td}>{a.checkOut}</td>
                        <td style={{ ...s.td, color: '#c9a84c', fontWeight: '700' }}>{a.hmr} hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MACHINE LOG TAB */}
        {activeTab === 'machinelog' && (
          <div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>🚜 Machine Control — {OPERATOR.machineId}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div style={{ borderRadius: '12px', padding: '20px', textAlign: 'center', background: machineStarted ? 'rgba(76,175,80,0.1)' : 'rgba(233,69,96,0.1)', border: `2px solid ${machineStarted ? '#4CAF50' : '#e94560'}` }}>
                  <p style={{ fontSize: '40px', margin: '0 0 8px' }}>{machineStarted ? '🟢' : '🔴'}</p>
                  <p style={{ color: machineStarted ? '#4CAF50' : '#e94560', fontSize: '16px', fontWeight: '700', margin: '0 0 4px' }}>
                    {machineStarted ? 'Machine Running' : 'Machine Stopped'}
                  </p>
                  {startTime && <p style={{ color: '#8896a8', fontSize: '12px', margin: 0 }}>Started: {startTime}</p>}
                </div>
                <div>
                  <p style={{ color: '#8896a8', fontSize: '11px', marginBottom: '6px' }}>Work Note (Optional):</p>
                  <input style={{ ...s.input, marginBottom: '10px' }} placeholder="काम सुरू/बंद करण्याचे कारण..." value={workNote} onChange={e => setWorkNote(e.target.value)} />
                  {!machineStarted ? (
                    <button style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #2e7d32, #4CAF50)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }} onClick={handleMachineStart}>
                      🟢 Machine START करा
                    </button>
                  ) : (
                    <button style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #c0392b, #e74c3c)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }} onClick={handleMachineStop}>
                      🔴 Machine STOP करा
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '15px' }}>
                {[
                  { label: 'HMR Today', val: `${OPERATOR.todayHMR} hrs`, icon: '⏱️' },
                  { label: 'Start Time', val: startTime || '07:30 AM', icon: '🟢' },
                  { label: 'Fuel Level', val: `${fuelLevel}%`, icon: '⛽' },
                  { label: 'Condition', val: '91% ✅', icon: '🔧' },
                ].map((d, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', margin: '0 0 4px' }}>{d.icon}</p>
                    <p style={{ color: '#c9a84c', fontWeight: '700', fontSize: '13px', margin: '0 0 2px' }}>{d.val}</p>
                    <p style={{ color: '#8896a8', fontSize: '9px', margin: 0 }}>{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>📋 Today's Activity Log</h3>
              {logs.map((log, i) => {
                const { icon, color } = logIcon(log.type);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '6px', borderLeft: `3px solid ${color}` }}>
                    <span style={{ fontSize: '16px' }}>{icon}</span>
                    <span style={{ color: '#8896a8', fontSize: '11px', width: '65px', flexShrink: 0 }}>{log.time}</span>
                    <span style={{ color: '#e8e0d0', fontSize: '12px', flex: 1 }}>{log.note}</span>
                    <span style={{ color: '#FF9800', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>⛽{log.fuel}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FUEL TAB */}
        {activeTab === 'fuel' && (
          <div>
            <div style={{ ...s.tableCard, marginBottom: '15px' }}>
              <h3 style={s.tableTitle}>⛽ Fuel Update</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                <div style={{ width: '50px', height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ width: '100%', height: `${fuelLevel}%`, background: fuelLevel > 50 ? '#4CAF50' : fuelLevel > 25 ? '#FF9800' : '#e94560', transition: 'height 0.3s' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: fuelLevel > 50 ? '#4CAF50' : '#e94560', fontSize: '40px', fontWeight: '900', margin: '0 0 8px' }}>{fuelLevel}%</p>
                  <p style={{ color: '#8896a8', fontSize: '11px', margin: '0 0 10px' }}>Omnicomm Sensor · 99.2% Accuracy</p>
                  <input type="range" min="0" max="100" value={fuelLevel} onChange={e => setFuelLevel(Number(e.target.value))} style={{ width: '100%', accentColor: '#c9a84c', marginBottom: '8px' }} />
                  <input style={{ ...s.input, marginBottom: '10px', fontSize: '13px' }} placeholder="Note: Refilled / Fuel used..." value={fuelNote} onChange={e => setFuelNote(e.target.value)} />
                  <button style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }} onClick={handleFuelUpdate}>
                    ✅ Fuel Update Submit करा
                  </button>
                </div>
              </div>
            </div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>⛽ Fuel History</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...s.table, minWidth: '480px' }}>
                  <thead><tr>{['Date', 'Time', 'Level', 'Change', 'Note', 'By'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {fuelHistory.map((f, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}>{f.date}</td>
                        <td style={s.td}>{f.time}</td>
                        <td style={s.td}><span style={{ color: f.level > 50 ? '#4CAF50' : '#FF9800', fontWeight: '700' }}>{f.level}%</span></td>
                        <td style={s.td}><span style={{ color: f.change > 0 ? '#4CAF50' : '#e94560', fontWeight: '700' }}>{f.change > 0 ? '+' : ''}{f.change}%</span></td>
                        <td style={s.td}>{f.note}</td>
                        <td style={s.td}>{f.by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DAILY REPORT TAB */}
        {activeTab === 'daily' && (
          <div style={s.tableCard}>
            <h3 style={s.tableTitle}>📋 Daily Work Report — April 2026</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...s.table, minWidth: '600px' }}>
                <thead><tr>{['Date', 'Att.', 'Start', 'End', 'HMR', 'Fuel↑', 'Fuel↓', 'Site', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dailyReports.map((r, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}>{r.date}</td>
                      <td style={s.td}><span style={{ color: r.att === 'P' ? '#4CAF50' : '#FF9800' }}>{r.att === 'P' ? '✅' : '🕐'}</span></td>
                      <td style={s.td}>{r.start}</td>
                      <td style={s.td}>{r.end}</td>
                      <td style={{ ...s.td, color: '#c9a84c', fontWeight: '700' }}>{r.hmr}h</td>
                      <td style={s.td}>{r.fuelStart}%</td>
                      <td style={s.td}><span style={{ color: r.fuelEnd < 30 ? '#e94560' : '#4CAF50' }}>{r.fuelEnd}%</span></td>
                      <td style={s.td}>{r.site}</td>
                      <td style={s.td}><span style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50', padding: '2px 8px', borderRadius: '20px', fontSize: '10px' }}>✅</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ISSUES TAB */}
        {activeTab === 'issues' && (
          <div>
            <div style={{ ...s.tableCard, border: '1px solid rgba(233,69,96,0.3)' }}>
              <h3 style={{ color: '#e94560', fontSize: '16px', margin: '0 0 12px' }}>⚠️ Issue Report करा</h3>
              <p style={{ color: '#8896a8', fontSize: '12px', marginBottom: '16px' }}>कोणतीही अडचण आल्यास तात्काळ Report करा. DE आणि Machine Owner ला Alert मिळेल.</p>
              <p style={{ color: '#c9a84c', fontSize: '11px', margin: '0 0 8px', letterSpacing: '1px' }}>ISSUE TYPE *</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '15px' }}>
                {[
                  { id: 'mechanical', icon: '🔧', label: 'Mechanical' },
                  { id: 'fuel', icon: '⛽', label: 'Fuel Issue' },
                  { id: 'accident', icon: '🚨', label: 'Accident' },
                  { id: 'electrical', icon: '⚡', label: 'Electrical' },
                  { id: 'site', icon: '📍', label: 'Site Issue' },
                  { id: 'other', icon: '📋', label: 'Other' },
                ].map(issue => (
                  <button key={issue.id} style={{ borderRadius: '10px', padding: '12px 6px', cursor: 'pointer', textAlign: 'center', border: issueType === issue.id ? '2px solid #e94560' : '1px solid rgba(233,69,96,0.3)', background: issueType === issue.id ? 'rgba(233,69,96,0.15)' : 'rgba(233,69,96,0.05)' }}
                    onClick={() => setIssueType(issue.id)}>
                    <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>{issue.icon}</span>
                    <span style={{ color: issueType === issue.id ? '#e94560' : '#8896a8', fontSize: '10px', fontWeight: '600' }}>{issue.label}</span>
                  </button>
                ))}
              </div>
              <p style={{ color: '#c9a84c', fontSize: '11px', margin: '0 0 8px', letterSpacing: '1px' }}>DESCRIPTION *</p>
              <textarea style={{ ...s.input, height: '90px', resize: 'vertical', marginBottom: '15px', fontSize: '13px' }}
                placeholder="समस्या सविस्तर सांगा..." value={issueNote} onChange={e => setIssueNote(e.target.value)} />
              <button style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #c0392b, #e74c3c)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', opacity: (!issueType || !issueNote) ? 0.5 : 1 }}
                disabled={!issueType || !issueNote} onClick={handleReportIssue}>
                🚨 Issue Report Submit करा
              </button>
            </div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>📋 Past Issues</h3>
              {pastIssues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '8px', borderLeft: `3px solid ${issue.resolved ? '#4CAF50' : '#e94560'}` }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 2px' }}>{issue.date} · [{issue.type}]</p>
                    <p style={{ color: '#e8e0d0', fontSize: '12px', fontWeight: '600', margin: '0 0 2px' }}>{issue.note}</p>
                    <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>{issue.action}</p>
                  </div>
                  <span style={{ color: issue.resolved ? '#4CAF50' : '#e94560', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>
                    {issue.resolved ? '✅' : '🔄'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FUEL MODAL */}
      {showFuelModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, width: isSmall ? '95%' : '380px' }}>
            <h3 style={{ color: '#FF9800', fontSize: '16px', margin: '0 0 15px', textAlign: 'center' }}>⛽ Fuel Level Update</h3>
            <p style={{ color: '#8896a8', textAlign: 'center', marginBottom: '10px' }}>Current: {fuelLevel}%</p>
            <input type="range" min="0" max="100" value={fuelLevel} onChange={e => setFuelLevel(Number(e.target.value))} style={{ width: '100%', accentColor: '#c9a84c', marginBottom: '10px' }} />
            <p style={{ color: '#c9a84c', fontSize: '22px', fontWeight: '700', textAlign: 'center', margin: '0 0 12px' }}>{fuelLevel}%</p>
            <input style={{ ...s.input, marginBottom: '12px', fontSize: '13px' }} placeholder="Note: Refilled 50 Ltrs..." value={fuelNote} onChange={e => setFuelNote(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={s.cancelBtn} onClick={() => setShowFuelModal(false)}>Cancel</button>
              <button style={s.confirmBtn} onClick={handleFuelUpdate}>✅ Update</button>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE MODAL */}
      {showIssueModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, width: isSmall ? '95%' : '380px' }}>
            <h3 style={{ color: '#e94560', fontSize: '16px', margin: '0 0 15px', textAlign: 'center' }}>⚠️ Quick Issue Report</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                { id: 'mechanical', icon: '🔧', label: 'Mechanical' },
                { id: 'fuel', icon: '⛽', label: 'Fuel Issue' },
                { id: 'accident', icon: '🚨', label: 'Accident' },
                { id: 'electrical', icon: '⚡', label: 'Electrical' },
              ].map(issue => (
                <button key={issue.id} style={{ borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', border: issueType === issue.id ? '2px solid #e94560' : '1px solid rgba(233,69,96,0.3)', background: issueType === issue.id ? 'rgba(233,69,96,0.15)' : 'transparent' }}
                  onClick={() => setIssueType(issue.id)}>
                  <span style={{ fontSize: '20px' }}>{issue.icon}</span>
                  <span style={{ color: '#8896a8', fontSize: '11px', display: 'block' }}>{issue.label}</span>
                </button>
              ))}
            </div>
            <textarea style={{ ...s.input, width: '100%', height: '80px', boxSizing: 'border-box', marginBottom: '12px', resize: 'none', fontSize: '13px' }}
              placeholder="समस्या थोडक्यात सांगा..." value={issueNote} onChange={e => setIssueNote(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={s.cancelBtn} onClick={() => setShowIssueModal(false)}>Cancel</button>
              <button style={{ ...s.confirmBtn, background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }} onClick={handleReportIssue}>🚨 Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  container: { display: 'flex', minHeight: '100vh', background: '#050d1a', fontFamily: 'Arial, sans-serif', color: '#fff' },
  sidebar: { width: '230px', background: 'linear-gradient(180deg, #0f2040 0%, #0a1628 100%)', borderRight: '1px solid rgba(201,168,76,0.2)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 },
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
  main: { flex: 1, overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(201,168,76,0.15)' },
  pageTitle: { color: '#c9a84c', fontWeight: '700', margin: '0 0 4px' },
  pageDate: { color: '#8896a8', fontSize: '11px', margin: 0 },
  opBadge: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', padding: '8px 14px', borderRadius: '20px', color: '#c9a84c', fontSize: '12px' },
  onlineDot: { width: '7px', height: '7px', background: '#4CAF50', borderRadius: '50%', display: 'inline-block' },
  cardRow: { display: 'grid', gap: '12px', marginBottom: '18px' },
  card: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '16px', textAlign: 'center' },
  cardIcon: { fontSize: '22px', margin: '0 0 6px' },
  cardVal: { fontSize: '18px', fontWeight: '700', margin: '0 0 4px' },
  cardLbl: { color: '#8896a8', fontSize: '11px', margin: 0 },
  tableCard: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '18px', marginBottom: '15px' },
  tableTitle: { color: '#c9a84c', margin: '0 0 14px', fontSize: '14px', fontWeight: '700' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px', textAlign: 'left', color: 'rgba(201,168,76,0.7)', fontSize: '10px', letterSpacing: '1px', borderBottom: '1px solid rgba(201,168,76,0.15)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  td: { padding: '10px', fontSize: '12px', color: '#e8e0d0', whiteSpace: 'nowrap' },
  input: { width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' },
  modal: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '16px', padding: '24px' },
  cancelBtn: { flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#8896a8', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  confirmBtn: { flex: 1, padding: '11px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
};

export default OperatorDashboard;
