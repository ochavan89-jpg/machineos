import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { generateInternalLedger } from '../services/pdfGenerator';
import MobileNav from '../components/MobileNav';
import { useWindowSize } from '../hooks/useWindowSize';
import { getMachines, getAllBookings, getAllUsers, getAllTransactions, getAllIssues } from '../supabaseService';



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

  const NAV = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'machines', icon: '🚜', label: 'Machines' },
    { id: 'clients', icon: '👷', label: 'Clients' },
    { id: 'owners', icon: '🏗️', label: 'Owners' },
    { id: 'operators', icon: '🔧', label: 'Operators' },
    { id: 'wallet', icon: '💳', label: 'Wallet & Billing' },
    { id: 'reports', icon: '📈', label: 'Reports' },
    { id: 'iot', icon: '📡', label: 'IoT & GPS' },
  ];

  const isSmall = isMobile || isTablet;

  return (
    <div style={s.container}>

      {/* ═══ MOBILE NAV ═══ */}
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

      {/* ═══ DESKTOP SIDEBAR ═══ */}
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
            <button key={item.id}
              style={activeTab === item.id ? s.navActive : s.nav}
              onClick={() => setActiveTab(item.id)}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <div style={s.divider} />
          <button style={s.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
          <p style={s.sidebarFooter}>Since 2011 · 15 Yrs Excellence</p>
        </div>
      )}

      {/* ═══ MAIN ═══ */}
      <div style={{ ...s.main, padding: isSmall ? '70px 12px 70px' : '25px' }}>

        {/* Header */}
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
            <LanguageSelector compact={true} />
            {!isSmall && (
              <div style={s.adminBadge}>
                <span style={s.adminDot}></span>
                👑 Om Chavan — MD
              </div>
            )}
          </div>
        </div>

        {/* ═══ TAB: OVERVIEW ═══ */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)' }}>
              {stats(machineData).map((stat, i) => (
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
                    <tr>{['Machine', 'Operator', 'Client', 'Location', 'Fuel %', 'HMR Today', 'Wallet', 'Status'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {machineData.map((m, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><span style={s.machineTag}>{m.name}</span></td>
                        <td style={s.td}><span style={s.machineTag}>{m.name}</span></td>
                        <td style={s.td}>{m.operator_id || 'N/A'}</td>
                        <td style={s.td}>{m.client_id || 'N/A'}</td>
                        <td style={s.td}>{m.location}</td>
                        <td style={s.td}>
                          <div style={s.fuelBar}>
                            <div style={{ ...s.fuelFill, width: (m.fuel_level || 0) + '%', background: (m.fuel_level || 0) > 30 ? '#4CAF50' : '#e94560' }}></div>
                          </div>
                          <span style={{ color: (m.fuel_level || 0) > 30 ? '#4CAF50' : '#e94560', fontSize: '12px' }}>{m.fuel_level || 0}%</span>
                        </td>
                        <td style={s.td}>0 hrs</td>
                        <td style={s.td}>
                          <span style={{ color: '#c9a84c' }}>Rs.0</span>
                        </td>
                        <td style={s.td}><span style={{ background: m.status === 'Active' ? 'rgba(76,175,80,0.15)' : 'rgba(233,69,96,0.15)', color: m.status === 'Active' ? '#4CAF50' : '#e94560', padding: '3px 8px', borderRadius: '20px', fontSize: '11px' }}>{m.status}</span></td>



                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ ...s.bottomRow, gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr' }}>
              <div style={s.bottomCard}>
                <h3 style={s.bottomTitle}>💰 Revenue This Month</h3>
                {revenue.map((r, i) => (
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

        {/* ═══ TAB: MACHINES ═══ */}
        {activeTab === 'machines' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '🚜', val: '12', label: 'Total Machines' },
                { icon: '✅', val: '8', label: 'Active Today' },
                { icon: '🔴', val: '2', label: 'Low Fuel Alert' },
                { icon: '🟡', val: '2', label: 'Idle Machines' },
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
                    <tr>{['Machine', 'Type', 'Operator', 'Client', 'Location', 'Fuel', 'HMR', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {machineData.map((m, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><span style={s.machineTag}>{m.name}</span></td>
                        <td style={s.td}>{m.type || 'Backhoe Loader'}</td>
                        <td style={s.td}>{m.operator}</td>
                        <td style={s.td}>{m.client}</td>
                        <td style={s.td}>📍 {m.location}</td>
                        <td style={s.td}><span style={{ color: m.fuel > 30 ? '#4CAF50' : '#e94560' }}>{m.fuel}%</span></td>
                        <td style={s.td}>{m.hmr} hrs</td>
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

        {/* ═══ TAB: CLIENTS ═══ */}
        {activeTab === 'clients' && (
          <div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>👷 All Clients</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Client Name', 'GST No.', 'Location', 'Bookings', 'Wallet', 'Total Spent', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {clients.map((c, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><strong style={{ color: '#c9a84c' }}>{c.name}</strong></td>
                        <td style={s.td}>{c.gst}</td>
                        <td style={s.td}>{c.location}</td>
                        <td style={s.td}>{c.bookings}</td>
                        <td style={s.td}><span style={{ color: c.wallet > 10000 ? '#4CAF50' : '#e94560' }}>₹{c.wallet.toLocaleString('en-IN')}</span></td>
                        <td style={s.td}>₹{c.spent.toLocaleString('en-IN')}</td>
                        <td style={s.td}>
                          <span style={{ ...s.statusBadge, background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50' }}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: OWNERS ═══ */}
        {activeTab === 'owners' && (
          <div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>🏗️ Machine Owners</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Owner Name', 'PAN', 'Machines', 'Gross (Month)', 'Commission 15%', 'Net Paid', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {owners.map((o, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><strong style={{ color: '#c9a84c' }}>{o.name}</strong></td>
                        <td style={s.td}>{o.pan}</td>
                        <td style={s.td}>{o.machines}</td>
                        <td style={s.td}>₹{o.gross.toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#e94560' }}>- ₹{Math.round(o.gross * 0.15).toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#4CAF50', fontWeight: '700' }}>₹{Math.round(o.gross * 0.83).toLocaleString('en-IN')}</td>
                        <td style={s.td}><span style={{ ...s.statusBadge, background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50' }}>Active</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: OPERATORS ═══ */}
        {activeTab === 'operators' && (
          <div>
            <div style={s.tableCard}>
              <h3 style={s.tableTitle}>🔧 All Operators</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Operator', 'Machine', 'Experience', 'Rating', 'HMR Today', 'HMR Total', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {operators.map((o, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><strong style={{ color: '#c9a84c' }}>{o.name}</strong></td>
                        <td style={s.td}><span style={s.machineTag}>{o.machine}</span></td>
                        <td style={s.td}>{o.exp} Years</td>
                        <td style={s.td}>⭐ {o.rating}/5.0</td>
                        <td style={s.td}>{o.hmrToday} hrs</td>
                        <td style={s.td}>{o.hmrTotal} hrs</td>
                        <td style={s.td}>
                          <span style={{ ...s.statusBadge, background: o.status === 'Active' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)', border: `1px solid ${o.status === 'Active' ? '#4CAF50' : '#FF9800'}`, color: o.status === 'Active' ? '#4CAF50' : '#FF9800' }}>
                            {o.status}
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

        {/* ═══ TAB: WALLET ═══ */}
        {activeTab === 'wallet' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '💰', val: '₹2.4L', label: 'Total Billed (Month)' },
                { icon: '💳', val: '₹1.8L', label: 'Total Collected' },
                { icon: '⏳', val: '₹60K', label: 'Pending' },
                { icon: '👑', val: '₹36K', label: 'Commission Earned' },
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
                    <tr>{['Client', 'Wallet Balance', 'Last Recharge', 'Active Machines', 'Alert'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {clients.map((c, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}><strong style={{ color: '#c9a84c' }}>{c.name}</strong></td>
                        <td style={s.td}><span style={{ color: c.wallet > 10000 ? '#4CAF50' : '#e94560', fontWeight: '700' }}>₹{c.wallet.toLocaleString('en-IN')}</span></td>
                        <td style={s.td}>{c.lastRecharge || '10 Apr 2026'}</td>
                        <td style={s.td}>{c.bookings}</td>
                        <td style={s.td}>{c.wallet < 10000 ? <span style={{ color: '#e94560', fontWeight: '700' }}>⚠️ Low</span> : <span style={{ color: '#4CAF50' }}>✅ OK</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: REPORTS ═══ */}
        {activeTab === 'reports' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '💰', val: '₹2.4L', label: 'Revenue (Month)' },
                { icon: '👑', val: '₹36K', label: 'Commission' },
                { icon: '📄', val: '24', label: 'Invoices Generated' },
                { icon: '🏗️', val: '₹1.8L', label: 'Owner Payments' },
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
                    <tr>{['Txn ID', 'Date', 'Client', 'Machine', 'Gross', 'Commission', 'Owner Paid', 'Net'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={{ ...s.td, color: '#c9a84c', fontSize: '11px' }}>{t.id}</td>
                        <td style={s.td}>{t.date}</td>
                        <td style={s.td}>{t.client}</td>
                        <td style={s.td}><span style={s.machineTag}>{t.machine}</span></td>
                        <td style={s.td}>₹{t.gross.toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#e94560' }}>₹{Math.round(t.gross * 0.15).toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#4CAF50' }}>₹{Math.round(t.gross * 0.83).toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, color: '#c9a84c', fontWeight: '700' }}>₹{Math.round(t.gross * 0.02).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: IoT & GPS ═══ */}
        {activeTab === 'iot' && (
          <div>
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { icon: '📡', val: '12', label: 'GPS Devices Active' },
                { icon: '🎥', val: '10', label: 'Dashcams Online' },
                { icon: '⛽', val: '12', label: 'Fuel Sensors Active' },
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
                        <td style={s.td}><span style={s.machineTag}>{m.name}</span></td>
                        <td style={s.td}><span style={{ color: '#4CAF50' }}>🟢 Online</span></td>
                        <td style={s.td}>📍 {m.location}</td>
                        <td style={s.td}><span style={{ color: m.fuel > 30 ? '#4CAF50' : '#e94560' }}>{m.fuel}%</span></td>
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

// ═══ DATA ═══
const stats = (machineData) => [
  { icon: String.fromCodePoint(0x1F69C), value: machineData.length.toString(), label: 'Total Machines', change: 'Active Fleet', up: true },
  { icon: String.fromCodePoint(0x2705), value: machineData.filter(m => m.status === 'Active').length.toString(), label: 'Active Today', change: '66% utilization', up: true },
  { icon: String.fromCodePoint(0x1F4B0), value: 'Rs.2.4L', label: 'Revenue (Month)', change: '18% vs last month', up: true },
  { icon: '👑', value: '₹36K', label: 'My Commission', change: '15% of total', up: true },
  { icon: '👷', value: '6', label: 'Active Clients', change: '▼ 1 low wallet', up: false },
  { icon: '⛽', value: '2', label: 'Low Fuel Alert', change: '⚠️ Action needed', up: false },
];

const machines = [];
const clients = [
  { name: 'Patil Builders', gst: '27AABCP1234A1Z5', location: 'Karad', bookings: 4, wallet: 268140, spent: 392940, status: 'Active', lastRecharge: '10 Apr 2026' },
  { name: 'KK Infra', gst: '27AABCK5678B1Z3', location: 'Satara', bookings: 1, wallet: 12000, spent: 101480, status: 'Active', lastRecharge: '07 Apr 2026' },
  { name: 'City Corp', gst: '27AABCC9012C1Z7', location: 'Pune', bookings: 1, wallet: 8000, spent: 35400, status: 'Active', lastRecharge: '01 Apr 2026' },
  { name: 'NH Projects', gst: '27AABNP3456D1Z1', location: 'Kolhapur', bookings: 1, wallet: 32000, spent: 47790, status: 'Active', lastRecharge: '08 Apr 2026' },
];








const owners = [
  { name: 'Rajesh Patil', pan: 'ABCDE1234F', machines: 3, gross: 182000 },
  { name: 'Suresh Kadam', pan: 'FGHIJ5678G', machines: 2, gross: 264000 },
];

const operators = [
  { name: 'Ramesh Kadam', machine: 'JCB-001', exp: 8, rating: 4.9, hmrToday: 6.5, hmrTotal: 1842, status: 'Active' },
  { name: 'Suresh Mane', machine: 'EXC-002', exp: 12, rating: 4.7, hmrToday: 4.0, hmrTotal: 2341, status: 'Active' },
  { name: 'Mahesh Patil', machine: 'CRN-003', exp: 15, rating: 5.0, hmrToday: 0, hmrTotal: 3102, status: 'Idle' },
  { name: 'Ganesh Rane', machine: 'DOZ-004', exp: 6, rating: 4.5, hmrToday: 7.0, hmrTotal: 1205, status: 'Active' },
  { name: 'Vijay Shinde', machine: 'GRD-005', exp: 10, rating: 4.8, hmrToday: 5.5, hmrTotal: 1876, status: 'Active' },
];

const revenue = [
  { label: 'JCB-001', value: '₹68K', pct: 85 },
  { label: 'Excavator-002', value: '₹52K', pct: 65 },
  { label: 'Crane-003', value: '₹41K', pct: 51 },
  { label: 'Dozer-004', value: '₹38K', pct: 47 },
  { label: 'Grader-005', value: '₹41K', pct: 51 },
];

const alerts = [
  { icon: '⛽', msg: 'Dozer-004 Fuel 15% - Critical!', time: '10 mins ago', color: '#e94560' },
  { icon: '💳', msg: 'Dozer-004 Wallet ₹4,500 - Low!', time: '10 mins ago', color: '#e94560' },
  { icon: '⛽', msg: 'Excavator-002 Fuel 28% - Low', time: '1 hr ago', color: '#FF9800' },
  { icon: '✅', msg: 'Grader-005 Started - NH Projects', time: '2 hrs ago', color: '#4CAF50' },
  { icon: '💰', msg: 'Patil Builders ₹50K Recharged', time: '3 hrs ago', color: '#c9a84c' },
];

const transactions = [
  { id: 'DE/TXN/041001', date: '10 Apr 2026', client: 'Patil Builders', machine: 'JCB-001', gross: 105000 },
  { id: 'DE/TXN/041002', date: '07 Apr 2026', client: 'KK Infra', machine: 'EXC-002', gross: 86000 },
  { id: 'DE/TXN/041003', date: '01 Apr 2026', client: 'NH Projects', machine: 'GRD-005', gross: 40500 },
];

// ═══ STYLES ═══
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
