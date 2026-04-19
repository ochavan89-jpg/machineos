import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { generateInternalLedger } from '../services/pdfGenerator';
import MobileNav from '../components/MobileNav';
import { useWindowSize } from '../hooks/useWindowSize';
import { getMachines, getAllBookings, getAllUsers, getAllTransactions, getAllIssues } from '../supabaseService';

const NAV = [
  { id: 'overview', icon: String.fromCodePoint(0x1F4CA), label: 'Overview' },
  { id: 'machines', icon: String.fromCodePoint(0x1F69C), label: 'Machines' },
  { id: 'clients', icon: String.fromCodePoint(0x1F477), label: 'Clients' },
  { id: 'owners', icon: String.fromCodePoint(0x1F3D7), label: 'Owners' },
  { id: 'operators', icon: String.fromCodePoint(0x1F527), label: 'Operators' },
  { id: 'wallet', icon: String.fromCodePoint(0x1F4B3), label: 'Wallet & Billing' },
  { id: 'reports', icon: String.fromCodePoint(0x1F4C8), label: 'Reports' },
  { id: 'iot', icon: String.fromCodePoint(0x1F4E1), label: 'IoT & GPS' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage(); // eslint-disable-line
  const { isMobile, isTablet } = useWindowSize();
  const [activeTab, setActiveTab] = useState('overview');

  const [machineData, setMachineData] = useState([]);
  const [bookingData, setBookingData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [transactionData, setTransactionData] = useState([]);
  const [issueData, setIssueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [machines, bookings, users, transactions, issues] = await Promise.all([
        getMachines(),
        getAllBookings(),
        getAllUsers(),
        getAllTransactions(),
        getAllIssues()
      ]);
      setMachineData(machines);
      setBookingData(bookings);
      setUserData(users);
      setTransactionData(transactions);
      setIssueData(issues);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleLogout = () => navigate('/');

  // Derived data from Supabase
  const clientUsers = userData.filter(u => u.role === 'client');
  const ownerUsers = userData.filter(u => u.role === 'owner');
  const operatorUsers = userData.filter(u => u.role === 'operator');
  const activeBookings = bookingData.filter(b => b.status === 'Active');
  const totalRevenue = bookingData.reduce((a, b) => a + (b.base_amount || 0), 0);
  const commission = Math.round(totalRevenue * 0.15);
  const lowFuelMachines = machineData.filter(m => (m.fuel_level || 0) < 30);

  

  const isSmall = isMobile || isTablet;

  const stats = [
    { icon: '🚜', value: machineData.length.toString(), label: 'Total Machines', change: 'Active Fleet', up: true },
    { icon: '✅', value: machineData.filter(m => m.status === 'Active').length.toString(), label: 'Active Today', change: '66% utilization', up: true },
    { icon: '💰', value: totalRevenue > 0 ? 'Rs.' + (totalRevenue / 100000).toFixed(1) + 'L' : 'Rs.2.4L', label: 'Revenue (Month)', change: '18% vs last month', up: true },
    { icon: '👑', value: commission > 0 ? 'Rs.' + (commission / 1000).toFixed(0) + 'K' : 'Rs.36K', label: 'My Commission', change: '15% of total', up: true },
    { icon: '👷', value: activeBookings.length.toString() || '6', label: 'Active Clients', change: 'Live bookings', up: true },
    { icon: '⛽', value: lowFuelMachines.length.toString(), label: 'Low Fuel Alert', change: '⚠️ Action needed', up: false },
  ];

  const revenue = machineData.map(m => ({
    label: m.machine_id,
    value: 'Rs.' + Math.round((m.rate_per_day || 0) * 8 / 1000) + 'K',
    pct: Math.min(100, Math.round((m.rate_per_day || 0) / 300)),
  }));

  const alerts = [
    ...lowFuelMachines.map(m => ({ icon: '⛽', msg: `${m.machine_id} Fuel ${m.fuel_level}% - Critical!`, time: 'Just now', color: '#e94560' })),
    ...issueData.slice(0, 3).map(issue => ({ icon: '⚠️', msg: `Issue: ${issue.issue_type || 'Unknown'} - ${issue.status}`, time: 'Recent', color: '#FF9800' })),
    { icon: '✅', msg: 'System Running Normally', time: 'Live', color: '#4CAF50' },
  ];

  return (
    <div style={s.container}>
      {isSmall && (
        <MobileNav
          navItems={NAV}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          title="Development Express"
          subtitle="Admin Panel"
          bottomContent={
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.08)', color: '#e94560', cursor: 'pointer', fontSize: '13px', width: '100%' }} onClick={handleLogout}>
              🚪 Logout
            </button>
          }
        />
      )}

      {!isSmall && (
        <div style={s.sidebar}>
          <div style={s.sidebarLogo}>
            <div style={s.logoCircle}>DE</div>
            <div>
              <p style={s.logoTitle}>Development Express</p>
              <p style={s.logoSub}>Admin Panel</p>
            </div>
          </div>
          <div style={s.divider} />
          {NAV.map(item => (
            <button key={item.id} style={activeTab === item.id ? s.navActive : s.nav} onClick={() => setActiveTab(item.id)}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <div style={s.divider} />
          <button style={s.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
          <p style={s.sidebarFooter}>Since 2011 · 15 Yrs Excellence</p>
        </div>
      )}

      <div style={{ ...s.main, padding: isSmall ? '70px 12px 70px' : '25px' }}>
        <div style={{ ...s.header, flexDirection: isSmall ? 'column' : 'row', gap: isSmall ? '10px' : '0', alignItems: isSmall ? 'flex-start' : 'center' }}>
          <div>
            <p style={{ color: '#c9a84c', fontSize: '11px', margin: '0 0 2px', cursor: 'pointer' }}
              onClick={() => { const tabs = ['overview', 'machines', 'clients', 'owners', 'operators', 'wallet', 'reports', 'iot']; const i = tabs.indexOf(activeTab); if (i > 0) setActiveTab(tabs[i - 1]); }}>
              ← Back
            </p>
            <h2 style={{ ...s.pageTitle, fontSize: isSmall ? '16px' : '22px' }}>
              {NAV.find(n => n.id === activeTab)?.icon}{' '}
              {NAV.find(n => n.id === activeTab)?.label}
            </h2>
            <p style={s.pageDate}>📅 {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · Karad, Satara</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {!isSmall && <LanguageSelector compact={true} />}
            {!isSmall && <LanguageSelector compact={true} />}
            {!isSmall && (
              <div style={s.adminBadge}>
                <span style={s.adminDot}></span>
                👑 Om Chavan — MD
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#c9a84c' }}>
            <p style={{ fontSize: '30px', margin: '0 0 12px' }}>⏳</p>
            <p>Loading Real Data from Supabase...</p>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {!loading && activeTab === 'overview' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)' }}>
              {stats.map((stat, i) => (
                <div key={i} style={s.card}>
                  <p style={s.cardIcon}>{stat.icon}</p>
                  <h2 style={s.cardNumber}>{stat.value}</h2>
                  <p style={s.cardLabel}>{stat.label}</p>
                  <p style={{ ...s.cardChange, color: stat.up ? '#4CAF50' : '#e94560' }}>{stat.change}</p>
                </div>
              ))}
            </div>

            <div style={s.tableCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={s.tableTitle}>🚜 Live Machine Status</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={s.liveDot}></span>
                  <span style={{ color: '#4CAF50', fontSize: '11px', fontWeight: '700' }}>LIVE</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Machine', 'Type', 'Location', 'Fuel %', 'Rate/Day', 'Status'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {machineData.map((m, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><span style={s.machineTag}>{m.machine_id}</span></td>
                        <td style={s.td}>{m.type || 'N/A'}</td>
                        <td style={s.td}>📍 {m.location}</td>
                        <td style={s.td}>
                          <div style={s.fuelBar}>
                            <div style={{ ...s.fuelFill, width: (m.fuel_level || 0) + '%', background: (m.fuel_level || 0) > 30 ? '#4CAF50' : '#e94560' }}></div>
                          </div>
                          <span style={{ color: (m.fuel_level || 0) > 30 ? '#4CAF50' : '#e94560', fontSize: '12px' }}>{m.fuel_level || 0}%</span>
                        </td>
                        <td style={s.td}>Rs.{(m.rate_per_day || 0).toLocaleString('en-IN')}</td>
                        <td style={s.td}>
                          <span style={{ background: m.status === 'Active' ? 'rgba(76,175,80,0.15)' : 'rgba(233,69,96,0.15)', color: m.status === 'Active' ? '#4CAF50' : '#e94560', padding: '3px 8px', borderRadius: '20px', fontSize: '11px' }}>{m.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ ...s.bottomRow, gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr' }}>
              <div style={s.bottomCard}>
                <h3 style={s.bottomTitle}>💰 Revenue This Month</h3>
                {revenue.slice(0, 5).map((r, i) => (
                  <div key={i} style={s.revenueRow}>
                    <span style={s.revenueLabel}>{r.label}</span>
                    <div style={s.revenueBarBg}>
                      <div style={{ ...s.revenueBarFill, width: `${r.pct}%` }}></div>
                    </div>
                    <span style={s.revenueValue}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div style={s.bottomCard}>
                <h3 style={s.bottomTitle}>⚠️ Alerts & Notifications</h3>
                {alerts.map((a, i) => (
                  <div key={i} style={{ ...s.alertRow, borderLeft: `3px solid ${a.color}` }}>
                    <p style={s.alertMsg}>{a.icon} {a.msg}</p>
                    <p style={s.alertTime}>{a.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MACHINES TAB */}
        {!loading && activeTab === 'machines' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '🚜', val: machineData.length.toString(), label: 'Total Machines' },
                { icon: '✅', val: machineData.filter(m => m.status === 'Active').length.toString(), label: 'Active Today' },
                { icon: '🔴', val: lowFuelMachines.length.toString(), label: 'Low Fuel Alert' },
                { icon: '🟡', val: machineData.filter(m => m.status === 'Deployed').length.toString(), label: 'Deployed' },
              ].map((c, i) => (
                <div key={i} style={s.card}>
                  <p style={s.cardIcon}>{c.icon}</p>
                  <h2 style={s.cardNumber}>{c.val}</h2>
                  <p style={s.cardLabel}>{c.label}</p>
                </div>
              ))}
            </div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>🚜 All Machines</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Machine ID', 'Name', 'Type', 'Location', 'Fuel', 'Rate/Day', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {machineData.map((m, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><span style={s.machineTag}>{m.machine_id}</span></td>
                        <td style={s.td}>{m.name}</td>
                        <td style={s.td}>{m.type || 'N/A'}</td>
                        <td style={s.td}>📍 {m.location}</td>
                        <td style={s.td}><span style={{ color: (m.fuel_level || 0) > 30 ? '#4CAF50' : '#e94560' }}>{m.fuel_level || 0}%</span></td>
                        <td style={s.td}>Rs.{(m.rate_per_day || 0).toLocaleString('en-IN')}</td>
                        <td style={s.td}>
                          <span style={{ ...s.statusBadge, background: m.status === 'Active' ? 'rgba(76,175,80,0.15)' : 'rgba(233,69,96,0.15)', border: `1px solid ${m.status === 'Active' ? '#4CAF50' : '#e94560'}`, color: m.status === 'Active' ? '#4CAF50' : '#e94560' }}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS TAB */}
        {!loading && activeTab === 'clients' && (
          <div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>👷 All Clients ({clientUsers.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Client Name', 'Email', 'Phone', 'GSTIN', 'Bookings', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {clientUsers.length > 0 ? clientUsers.map((c, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><strong style={{ color: '#c9a84c' }}>{c.name}</strong></td>
                        <td style={s.td}>{c.email}</td>
                        <td style={s.td}>{c.phone}</td>
                        <td style={s.td}>{c.gstin || 'N/A'}</td>
                        <td style={s.td}>{bookingData.filter(b => b.client_id === c.id).length}</td>
                        <td style={s.td}><span style={{ ...s.statusBadge, background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50' }}>Active</span></td>
                      </tr>
                    )) : (
                      <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', color: '#8896a8' }}>No clients found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* OWNERS TAB */}
        {!loading && activeTab === 'owners' && (
          <div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>🏗️ Machine Owners ({ownerUsers.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Owner Name', 'Email', 'Phone', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {ownerUsers.length > 0 ? ownerUsers.map((o, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><strong style={{ color: '#c9a84c' }}>{o.name}</strong></td>
                        <td style={s.td}>{o.email}</td>
                        <td style={s.td}>{o.phone}</td>
                        <td style={s.td}><span style={{ ...s.statusBadge, background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50' }}>Active</span></td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" style={{ ...s.td, textAlign: 'center', color: '#8896a8' }}>No owners found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* OPERATORS TAB */}
        {!loading && activeTab === 'operators' && (
          <div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>🔧 All Operators ({operatorUsers.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Operator', 'Email', 'Phone', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {operatorUsers.length > 0 ? operatorUsers.map((o, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><strong style={{ color: '#c9a84c' }}>{o.name}</strong></td>
                        <td style={s.td}>{o.email}</td>
                        <td style={s.td}>{o.phone}</td>
                        <td style={s.td}><span style={{ ...s.statusBadge, background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50' }}>Active</span></td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" style={{ ...s.td, textAlign: 'center', color: '#8896a8' }}>No operators found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* WALLET TAB */}
        {!loading && activeTab === 'wallet' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '💰', val: totalRevenue > 0 ? 'Rs.' + (totalRevenue / 100000).toFixed(1) + 'L' : 'Rs.2.4L', label: 'Total Billed (Month)' },
                { icon: '💳', val: 'Rs.1.8L', label: 'Total Collected' },
                { icon: '⏳', val: 'Rs.60K', label: 'Pending' },
                { icon: '👑', val: commission > 0 ? 'Rs.' + commission.toLocaleString('en-IN') : 'Rs.36K', label: 'Commission Earned' },
              ].map((c, i) => (
                <div key={i} style={s.card}>
                  <p style={s.cardIcon}>{c.icon}</p>
                  <h2 style={s.cardNumber}>{c.val}</h2>
                  <p style={s.cardLabel}>{c.label}</p>
                </div>
              ))}
            </div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>💳 Client Wallet Status</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Client', 'Email', 'Phone', 'Bookings', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {clientUsers.map((c, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><strong style={{ color: '#c9a84c' }}>{c.name}</strong></td>
                        <td style={s.td}>{c.email}</td>
                        <td style={s.td}>{c.phone}</td>
                        <td style={s.td}>{bookingData.filter(b => b.client_id === c.id).length}</td>
                        <td style={s.td}><span style={{ color: '#4CAF50' }}>✅ Active</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {!loading && activeTab === 'reports' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '💰', val: totalRevenue > 0 ? 'Rs.' + (totalRevenue / 100000).toFixed(1) + 'L' : 'Rs.2.4L', label: 'Revenue (Month)' },
                { icon: '👑', val: commission > 0 ? 'Rs.' + (commission / 1000).toFixed(0) + 'K' : 'Rs.36K', label: 'Commission' },
                { icon: '📋', val: bookingData.length.toString(), label: 'Total Bookings' },
                { icon: '🏗️', val: ownerUsers.length.toString(), label: 'Active Owners' },
              ].map((c, i) => (
                <div key={i} style={s.card}>
                  <p style={s.cardIcon}>{c.icon}</p>
                  <h2 style={s.cardNumber}>{c.val}</h2>
                  <p style={s.cardLabel}>{c.label}</p>
                </div>
              ))}
            </div>
            <div style={s.tableCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={s.tableTitle}>📋 Transaction Ledger</h3>
                <button style={s.downloadBtn} onClick={() => generateInternalLedger({
                  txnId: 'DE/TXN/INT/2026/041001',
                  date: new Date().toLocaleDateString('en-IN'),
                  bookingId: 'BK-2026-041001',
                  clientName: 'Patil Builders Pvt. Ltd.',
                  ownerName: 'Rajesh Patil',
                  grossAmount: 105000,
                  commissionPct: 15,
                  hours: 75,
                  ratePerHour: 1400,
                })}>📋 Internal Ledger PDF</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Ref ID', 'Date', 'Type', 'Amount', 'GST', 'Total', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {transactionData.length > 0 ? transactionData.slice(0, 10).map((t, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={{ ...s.td, color: '#c9a84c', fontSize: '11px' }}>{t.ref || 'N/A'}</td>
                        <td style={s.td}>{t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : 'N/A'}</td>
                        <td style={s.td}><span style={{ color: t.type === 'credit' ? '#4CAF50' : '#e94560' }}>{t.type}</span></td>
                        <td style={s.td}>Rs.{(t.amount || 0).toLocaleString('en-IN')}</td>
                        <td style={s.td}>Rs.{Math.round((t.amount || 0) * 0.18).toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#c9a84c', fontWeight: '700' }}>Rs.{Math.round((t.amount || 0) * 1.18).toLocaleString('en-IN')}</td>
                        <td style={s.td}><span style={{ color: '#4CAF50' }}>✅</span></td>
                      </tr>
                    )) : (
                      <tr><td colSpan="7" style={{ ...s.td, textAlign: 'center', color: '#8896a8' }}>No transactions found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* IoT TAB */}
        {!loading && activeTab === 'iot' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '📡', val: machineData.length.toString(), label: 'GPS Devices Active' },
                { icon: '🎥', val: machineData.length.toString(), label: 'Dashcams Online' },
                { icon: '⛽', val: machineData.length.toString(), label: 'Fuel Sensors Active' },
                { icon: '🔒', val: '0', label: 'Machines Locked' },
              ].map((c, i) => (
                <div key={i} style={s.card}>
                  <p style={s.cardIcon}>{c.icon}</p>
                  <h2 style={s.cardNumber}>{c.val}</h2>
                  <p style={s.cardLabel}>{c.label}</p>
                </div>
              ))}
            </div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>📡 IoT Device Status</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Machine', 'GPS', 'Location', 'Fuel %', 'Dashcam', 'Ignition', 'Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {machineData.map((m, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><span style={s.machineTag}>{m.machine_id}</span></td>
                        <td style={s.td}><span style={{ color: '#4CAF50' }}>🟢 Online</span></td>
                        <td style={s.td}>📍 {m.location}</td>
                        <td style={s.td}><span style={{ color: (m.fuel_level || 0) > 30 ? '#4CAF50' : '#e94560' }}>{m.fuel_level || 0}%</span></td>
                        <td style={s.td}><span style={{ color: '#4CAF50' }}>🎥 Live</span></td>
                        <td style={s.td}><span style={{ color: m.status === 'Active' ? '#4CAF50' : '#FF9800' }}>{m.status === 'Active' ? '🔓 ON' : '🔓 OFF'}</span></td>
                        <td style={s.td}>
                          <button style={{ background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.4)', color: '#e94560', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                            🔒 Lock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const s = {
  container: { display: 'flex', minHeight: '100vh', background: '#050d1a', fontFamily: 'Arial, sans-serif', color: '#fff' },
  sidebar: { width: '220px', background: 'linear-gradient(180deg, #0f2040 0%, #0a1628 100%)', borderRight: '1px solid rgba(201,168,76,0.2)', padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  logoCircle: { width: '38px', height: '38px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0a1628', fontSize: '13px', flexShrink: 0 },
  logoTitle: { color: '#c9a84c', fontWeight: '700', fontSize: '14px', margin: 0 },
  logoSub: { color: '#8896a8', fontSize: '10px', margin: 0 },
  divider: { height: '1px', background: 'rgba(201,168,76,0.15)', margin: '10px 0' },
  nav: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#8896a8', cursor: 'pointer', fontSize: '13px', width: '100%', textAlign: 'left' },
  navActive: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.1)', color: '#c9a84c', cursor: 'pointer', fontSize: '13px', width: '100%', textAlign: 'left', fontWeight: '700' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.08)', color: '#e94560', cursor: 'pointer', fontSize: '13px', width: '100%', marginTop: 'auto' },
  sidebarFooter: { color: 'rgba(201,168,76,0.4)', fontSize: '9px', textAlign: 'center', marginTop: '10px', letterSpacing: '1px' },
  main: { flex: 1, overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid rgba(201,168,76,0.15)' },
  pageTitle: { color: '#c9a84c', fontWeight: '700', margin: '0 0 4px 0' },
  pageDate: { color: '#8896a8', fontSize: '12px', margin: 0 },
  adminBadge: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', padding: '8px 16px', borderRadius: '20px', color: '#c9a84c', fontSize: '13px', fontWeight: '600' },
  adminDot: { width: '8px', height: '8px', background: '#4CAF50', borderRadius: '50%', display: 'inline-block' },
  cardRow: { display: 'grid', gap: '15px', marginBottom: '25px' },
  card: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '18px 15px', textAlign: 'center' },
  cardIcon: { fontSize: '22px', margin: '0 0 8px 0' },
  cardNumber: { color: '#c9a84c', fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' },
  cardLabel: { color: '#8896a8', fontSize: '11px', margin: '0 0 6px 0' },
  cardChange: { fontSize: '10px', margin: 0 },
  tableCard: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '20px', marginBottom: '25px' },
  tableTitle: { color: '#c9a84c', margin: '0 0 15px 0', fontSize: '16px' },
  liveDot: { width: '8px', height: '8px', background: '#4CAF50', borderRadius: '50%', display: 'inline-block' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
  th: { padding: '10px 12px', textAlign: 'left', color: 'rgba(201,168,76,0.7)', fontSize: '11px', letterSpacing: '1px', borderBottom: '1px solid rgba(201,168,76,0.15)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
  td: { padding: '12px 12px', fontSize: '13px', color: '#e8e0d0', whiteSpace: 'nowrap' },
  machineTag: { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  fuelBar: { height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '4px', width: '80px' },
  fuelFill: { height: '100%', borderRadius: '2px' },
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  bottomRow: { display: 'grid', gap: '20px' },
  bottomCard: { background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '20px' },
  bottomTitle: { color: '#c9a84c', margin: '0 0 15px 0', fontSize: '15px' },
  revenueRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  revenueLabel: { color: '#8896a8', fontSize: '12px', width: '100px', flexShrink: 0 },
  revenueBarBg: { flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' },
  revenueBarFill: { height: '100%', background: 'linear-gradient(90deg, #a07830, #e2c97e)', borderRadius: '3px' },
  revenueValue: { color: '#c9a84c', fontSize: '12px', fontWeight: '700', width: '40px', textAlign: 'right' },
  alertRow: { padding: '10px 12px', marginBottom: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' },
  alertMsg: { color: '#e8e0d0', fontSize: '12px', margin: '0 0 3px 0' },
  alertTime: { color: '#8896a8', fontSize: '10px', margin: 0 },
  downloadBtn: { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
};

export default AdminDashboard;