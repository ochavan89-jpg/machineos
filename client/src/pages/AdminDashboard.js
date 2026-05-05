/* eslint-disable unicode-bom */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionTimeout from '../hooks/useSessionTimeout';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { generateInternalLedger } from '../services/pdfGenerator';
import MobileNav from '../components/MobileNav';
import { useWindowSize } from '../hooks/useWindowSize';
import { getMachines, getAllBookings, getAllUsers, getAllTransactions, getAllIssues, getPendingUsers, approveUser, rejectUser, getDlqItems, retryDlqItem, getDlqStats, getAuditLogs, getRateLimitTelemetry, acknowledgeSecuritySignal } from '../supabaseService';

const NAV = [
  { id: 'overview', icon: String.fromCodePoint(0x1F4CA), label: 'Overview' },
  { id: 'machines', icon: String.fromCodePoint(0x1F69C), label: 'Machines' },
  { id: 'bookings', icon: String.fromCodePoint(0x1F4CB), label: 'Bookings' },
  { id: 'clients', icon: String.fromCodePoint(0x1F477), label: 'Clients' },
  { id: 'operators', icon: String.fromCodePoint(0x1F527), label: 'Operators' },
  { id: 'wallet', icon: String.fromCodePoint(0x1F4B3), label: 'Wallet & Billing' },
  { id: 'approvals', icon: String.fromCodePoint(0x23F3), label: 'Approvals' },
  { id: 'dlq', icon: String.fromCodePoint(0x1F9EF), label: 'DLQ Monitor' },
  { id: 'audit', icon: String.fromCodePoint(0x1F4DC), label: 'Audit Logs' },
  { id: 'reports', icon: String.fromCodePoint(0x1F4C8), label: 'Reports' },
];

const MonthAccordion = ({ month, days, userData, s, isSmall }) => {
  const [open, setOpen] = React.useState(false);
  const [openDay, setOpenDay] = React.useState(null);
  const total = Object.values(days).flat().length;
  return (
    <div style={{ marginBottom: '12px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'linear-gradient(135deg, #0f2040, #0a1628)', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>{String.fromCodePoint(0x1F4C5)}</span>
          <span style={{ color: '#c9a84c', fontWeight: '700', fontSize: '15px' }}>{month}</span>
          <span style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '2px 10px', borderRadius: '20px', fontSize: '11px' }}>{total} bookings</span>
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
                </div>
                <span style={{ color: '#c9a84c', fontSize: '14px' }}>{openDay === day ? String.fromCodePoint(0x25B2) : String.fromCodePoint(0x25BC)}</span>
              </div>
              {openDay === day && (
                <div style={{ padding: '8px' }}>
                  {bookings.map((b, i) => {
                    const client = userData.find(u => u.id === b.client_id);
                    const t = new Date(b.created_at);
                    return (
                      <div key={i} style={{ background: 'linear-gradient(135deg, #0a1628, #060e1c)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '10px', padding: '14px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <span style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>{b.booking_ref}</span>
                            <span style={{ marginLeft: '8px', color: '#8896a8', fontSize: '11px' }}>{t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <span style={{ background: b.status === 'Active' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)', border: b.status === 'Active' ? '1px solid #4CAF50' : '1px solid #FF9800', color: b.status === 'Active' ? '#4CAF50' : '#FF9800', padding: '3px 10px', borderRadius: '20px', fontSize: '11px' }}>{b.status}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isSmall ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '8px' }}>
                          {[
                            { label: 'Client', val: client ? client.name : 'Unknown', icon: String.fromCodePoint(0x1F477) },
                            { label: 'Machine', val: b.machine_id || 'N/A', icon: String.fromCodePoint(0x1F69C) },
                            { label: 'Type', val: b.booking_type, icon: String.fromCodePoint(0x1F4CB) },
                            { label: 'Location', val: b.location || 'N/A', icon: String.fromCodePoint(0x1F4CD) },
                            { label: 'Base Amount', val: 'Rs.' + (b.base_amount || 0).toLocaleString('en-IN'), icon: String.fromCodePoint(0x1F4B0) },
                            { label: 'Advance Paid', val: 'Rs.' + (b.advance_paid || 0).toLocaleString('en-IN'), icon: String.fromCodePoint(0x2705) },
                            { label: 'Quantity', val: b.quantity + (b.booking_type === 'hourly' ? ' hrs' : b.booking_type === 'daily' ? ' days' : b.booking_type === 'weekly' ? ' weeks' : ' months'), icon: String.fromCodePoint(0x23F1) },
                            { label: 'Start Date', val: b.start_date ? new Date(b.start_date).toLocaleDateString('en-IN') : 'N/A', icon: String.fromCodePoint(0x1F4C5) },
                          ].map((d, j) => (
                            <div key={j} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px 10px' }}>
                              <p style={{ color: '#8896a8', fontSize: '9px', margin: '0 0 3px', letterSpacing: '0.5px' }}>{d.icon} {d.label}</p>
                              <p style={{ color: '#e8e0d0', fontSize: '12px', fontWeight: '600', margin: 0 }}>{d.val}</p>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '10px', padding: '8px 10px', background: b.owner_approved ? 'rgba(76,175,80,0.08)' : 'rgba(255,152,0,0.08)', border: b.owner_approved ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(255,152,0,0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: b.owner_approved ? '#4CAF50' : '#FF9800', fontSize: '11px', fontWeight: '600' }}>{b.owner_approved ? String.fromCodePoint(0x2705) + ' Owner Approved - Machine Dispatched' : String.fromCodePoint(0x23F3) + ' Awaiting Owner Approval'}</span>
                          {b.owner_approved && b.owner_approved_at && <span style={{ color: '#8896a8', fontSize: '10px' }}>{new Date(b.owner_approved_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
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


const AdminDashboard = () => {
  const navigate = useNavigate();
  useSessionTimeout();
  const { t } = useLanguage(); // eslint-disable-line
  const { isMobile, isTablet } = useWindowSize();
  const [activeTab, setActiveTab] = useState('overview');

  const [machineData, setMachineData] = useState([]);
  const [bookingData, setBookingData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [transactionData, setTransactionData] = useState([]);
  const [issueData, setIssueData] = useState([]);
  const [dlqData, setDlqData] = useState([]);
  const [dlqCounters, setDlqCounters] = useState({});
  const [dlqQueueFilter, setDlqQueueFilter] = useState('');
  const [dlqStatusFilter, setDlqStatusFilter] = useState('');
  const [dlqCursor, setDlqCursor] = useState(null);
  const [dlqHasMore, setDlqHasMore] = useState(false);
  const [dlqLoadingMore, setDlqLoadingMore] = useState(false);
  const [dlqStats, setDlqStats] = useState({ totalLast24h: 0, failedLast24h: 0, retriedLast24h: 0, queueCounts: {}, hourly: [] });
  const [dlqMessage, setDlqMessage] = useState('');
  const [auditMessage, setAuditMessage] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [auditMetaFilter, setAuditMetaFilter] = useState('');
  const [auditCursor, setAuditCursor] = useState(null);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditLoadingMore, setAuditLoadingMore] = useState(false);
  const [selectedDlqItem, setSelectedDlqItem] = useState(null);
  const [dlqRetryReason, setDlqRetryReason] = useState('');
  const [expandedAuditRows, setExpandedAuditRows] = useState({});
  const [csvColumns, setCsvColumns] = useState({
    created_at: true,
    action: true,
    actor_id: true,
    actor_role: true,
    entity_type: true,
    entity_id: true,
  });
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [rateTelemetry, setRateTelemetry] = useState({ allowed: 0, blocked: 0, byRoute: [], activeBuckets: 0 });
  const [securitySignals, setSecuritySignals] = useState([]);
  const [securityRefreshing, setSecurityRefreshing] = useState(false);
  const [securitySeverityFilter, setSecuritySeverityFilter] = useState('ALL');
  const [acknowledgedSignalIds, setAcknowledgedSignalIds] = useState({});
  const [securityLastRefreshedAt, setSecurityLastRefreshedAt] = useState(null);
  const [securityNow, setSecurityNow] = useState(Date.now());
  const [securityPanelMessage, setSecurityPanelMessage] = useState('');
  const getCurrentAdminId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('machineos_user') || '{}');
      return user?.id || user?.email || 'current_admin';
    } catch (_err) {
      return 'current_admin';
    }
  };
  const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const fetchSecurityDataWithRetry = useCallback(async (maxAttempts = 3) => {
    let telemetry = null;
    let secLogs = null;
    let ackLogs = null;
    let lastError = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      telemetry = await getRateLimitTelemetry();
      secLogs = await getAuditLogs({ action: 'security.admin_', limit: 12 });
      ackLogs = await getAuditLogs({ action: 'security.signal_acknowledged', limit: 100 });
      const hasError = telemetry?.error || secLogs?.error || ackLogs?.error;
      if (!hasError) {
        return { telemetry, secLogs, ackLogs, error: '' };
      }
      lastError = telemetry?.error || secLogs?.error || ackLogs?.error || 'security panel fetch failed';
      if (attempt < maxAttempts) {
        await waitMs(250 * (2 ** (attempt - 1)));
      }
    }
    return { telemetry, secLogs, ackLogs, error: lastError };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const [machines, bookings, users, transactions, issues, dlq] = await Promise.all([
        getMachines(),
        getAllBookings(),
        getAllUsers(),
        getAllTransactions(),
        getAllIssues(),
        getDlqItems({ limit: 100 }),
      ]);
      setMachineData(machines);
      setBookingData(bookings);
      setUserData(users);
      setTransactionData(transactions);
      setIssueData(issues);
      setDlqData(dlq.items || []);
      setDlqCounters(dlq.counters || {});
      setDlqCursor(dlq.nextCursor || null);
      setDlqHasMore(Boolean(dlq.hasMore));
      setDlqStats(await getDlqStats());
      const securityData = await fetchSecurityDataWithRetry(3);
      setRateTelemetry(securityData.telemetry || { allowed: 0, blocked: 0, byRoute: [], activeBuckets: 0 });
      setSecuritySignals(securityData.secLogs?.items || []);
      const ackMap = {};
      (securityData.ackLogs?.items || []).forEach((x) => {
        const sid = x?.metadata?.signalId;
        if (sid) {
          ackMap[sid] = {
            acknowledged: true,
            actorId: x.actor_id || '-',
            acknowledgedAt: x.created_at || null,
          };
        }
      });
      setAcknowledgedSignalIds(ackMap);
      setSecurityLastRefreshedAt(new Date().toISOString());
      setSecurityPanelMessage(securityData.error ? `Security panel retry exhausted: ${securityData.error.slice(0, 120)}` : '');
      setLoading(false);
      const pending = await getPendingUsers();
      setPendingUsers(pending);
    };
    loadData();
  }, [fetchSecurityDataWithRetry]);
  const refreshSecurityPanel = useCallback(async () => {
    setSecurityRefreshing(true);
    const securityData = await fetchSecurityDataWithRetry(3);
    setRateTelemetry(securityData.telemetry || { allowed: 0, blocked: 0, byRoute: [], activeBuckets: 0 });
    setSecuritySignals(securityData.secLogs?.items || []);
    const ackMap = {};
    (securityData.ackLogs?.items || []).forEach((x) => {
      const sid = x?.metadata?.signalId;
      if (sid) {
        ackMap[sid] = {
          acknowledged: true,
          actorId: x.actor_id || '-',
          acknowledgedAt: x.created_at || null,
        };
      }
    });
    setAcknowledgedSignalIds(ackMap);
    setSecurityLastRefreshedAt(new Date().toISOString());
    setSecurityPanelMessage(securityData.error ? `Security panel retry exhausted: ${securityData.error.slice(0, 120)}` : '');
    setSecurityRefreshing(false);
  }, [fetchSecurityDataWithRetry]);
  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      refreshSecurityPanel();
    }, 30000);
    return () => clearInterval(timer);
  }, [loading, refreshSecurityPanel]);
  useEffect(() => {
    const timer = setInterval(() => setSecurityNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading || activeTab !== 'dlq') return;
    Promise.all([
      getDlqItems({ queue: dlqQueueFilter, status: dlqStatusFilter, limit: 100 }),
      getDlqStats(),
    ]).then(([data, stats]) => {
      setDlqData(data.items || []);
      setDlqCounters(data.counters || {});
      setDlqCursor(data.nextCursor || null);
      setDlqHasMore(Boolean(data.hasMore));
      setDlqStats(stats);
      if (data.error) {
        setDlqMessage(`DLQ fetch error: ${data.error.slice(0, 120)}`);
      } else {
        setDlqMessage('');
      }
    });
  }, [activeTab, dlqQueueFilter, dlqStatusFilter, loading]);
  const loadMoreDlq = async () => {
    if (!dlqHasMore || !dlqCursor || dlqLoadingMore) return;
    setDlqLoadingMore(true);
    const result = await getDlqItems({
      queue: dlqQueueFilter,
      status: dlqStatusFilter,
      cursor: dlqCursor,
      limit: 100,
    });
    setDlqData((prev) => [...prev, ...(result.items || [])]);
    setDlqCursor(result.nextCursor || null);
    setDlqHasMore(Boolean(result.hasMore));
    setDlqLoadingMore(false);
  };

  useEffect(() => {
    if (loading || activeTab !== 'audit') return;
    const fromIso = auditFrom ? new Date(auditFrom).toISOString() : '';
    const toIso = auditTo ? new Date(auditTo).toISOString() : '';
    setExpandedAuditRows({});
    getAuditLogs({
      action: auditActionFilter,
      actorId: auditActorFilter,
      actorRole: auditRoleFilter,
      entityType: auditEntityFilter,
      metadata: auditMetaFilter,
      from: fromIso,
      to: toIso,
      limit: 120,
    }).then((result) => {
      setAuditLogs(result.items || []);
      setAuditCursor(result.nextCursor || null);
      setAuditHasMore(Boolean(result.hasMore));
      if (result.error) {
        setAuditMessage(`Audit fetch error: ${result.error.slice(0, 120)}`);
      } else {
        setAuditMessage('');
      }
    });
  }, [activeTab, auditActionFilter, auditActorFilter, auditRoleFilter, auditEntityFilter, auditMetaFilter, auditFrom, auditTo, loading]);

  const setAuditPreset = (preset) => {
    const now = new Date();
    if (preset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setAuditFrom(start.toISOString().slice(0, 16));
      setAuditTo(now.toISOString().slice(0, 16));
    } else if (preset === '24h') {
      setAuditFrom(new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString().slice(0, 16));
      setAuditTo(now.toISOString().slice(0, 16));
    } else if (preset === '7d') {
      setAuditFrom(new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 16));
      setAuditTo(now.toISOString().slice(0, 16));
    } else {
      setAuditFrom('');
      setAuditTo('');
    }
  };

  const exportAuditCsv = () => {
    if (visibleAuditLogs.length === 0) return;
    const header = Object.entries(csvColumns).filter(([, enabled]) => enabled).map(([key]) => key);
    if (header.length === 0) return;
    const rows = visibleAuditLogs.map((r) => header.map((key) => r[key])
      .map((v) => `"${String(v || '').replace(/"/g, '""')}"`)
      .join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => navigate('/');
  const clearAuditField = (field) => {
    if (field === 'action') setAuditActionFilter('');
    if (field === 'actor') setAuditActorFilter('');
    if (field === 'role') setAuditRoleFilter('');
    if (field === 'entity') setAuditEntityFilter('');
    if (field === 'meta') setAuditMetaFilter('');
    if (field === 'from') setAuditFrom('');
    if (field === 'to') setAuditTo('');
  };
  const clearAllAuditFilters = () => {
    setAuditActionFilter('');
    setAuditActorFilter('');
    setAuditRoleFilter('');
    setAuditEntityFilter('');
    setAuditMetaFilter('');
    setAuditFrom('');
    setAuditTo('');
  };

  // Derived data from Supabase
  const clientUsers = userData.filter(u => u.role === 'client');
  const ownerUsers = userData.filter(u => u.role === 'owner');
  const operatorUsers = userData.filter(u => u.role === 'operator');
  const activeBookings = bookingData.filter(b => b.status === 'Active');
  const totalRevenue = bookingData.reduce((a, b) => a + (b.base_amount || 0), 0);
  const commission = Math.round(totalRevenue * 0.15);
  const lowFuelMachines = machineData.filter(m => (m.fuel_level || 0) < 30);
  const visibleAuditLogs = auditLogs;
  const expandedAuditCount = Object.values(expandedAuditRows).filter(Boolean).length;
  const auditVirtual = useMemo(() => {
    const rowHeight = 44;
    const viewportHeight = 430;
    const overscan = 8;
    const total = visibleAuditLogs.length;
    if (expandedAuditCount > 0) {
      return {
        useVirtual: false,
        topPad: 0,
        bottomPad: 0,
        items: visibleAuditLogs,
        viewportHeight,
      };
    }
    const useVirtual = total > 120;
    if (!useVirtual) {
      return {
        useVirtual: false,
        topPad: 0,
        bottomPad: 0,
        items: visibleAuditLogs,
        viewportHeight,
      };
    }
    const scrollTop = 0;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + (overscan * 2);
    const end = Math.min(total, start + visibleCount);
    return {
      useVirtual: true,
      topPad: start * rowHeight,
      bottomPad: Math.max(0, (total - end) * rowHeight),
      items: visibleAuditLogs.slice(start, end),
      viewportHeight,
      rowHeight,
    };
  }, [visibleAuditLogs, expandedAuditCount]);
  const [auditScrollTop, setAuditScrollTop] = useState(0);
  useEffect(() => {
    setAuditScrollTop(0);
  }, [activeTab, auditActionFilter, auditActorFilter, auditRoleFilter, auditEntityFilter, auditFrom, auditTo, auditMetaFilter]);
  const auditVirtualWindow = useMemo(() => {
    if (!auditVirtual.useVirtual) return auditVirtual;
    const overscan = 8;
    const total = visibleAuditLogs.length;
    const start = Math.max(0, Math.floor(auditScrollTop / auditVirtual.rowHeight) - overscan);
    const visibleCount = Math.ceil(auditVirtual.viewportHeight / auditVirtual.rowHeight) + (overscan * 2);
    const end = Math.min(total, start + visibleCount);
    return {
      ...auditVirtual,
      topPad: start * auditVirtual.rowHeight,
      bottomPad: Math.max(0, (total - end) * auditVirtual.rowHeight),
      items: visibleAuditLogs.slice(start, end),
    };
  }, [auditVirtual, auditScrollTop, visibleAuditLogs]);
  const loadMoreAuditLogs = async () => {
    if (!auditHasMore || !auditCursor || auditLoadingMore) return;
    const fromIso = auditFrom ? new Date(auditFrom).toISOString() : '';
    const toIso = auditTo ? new Date(auditTo).toISOString() : '';
    setAuditLoadingMore(true);
    const result = await getAuditLogs({
      action: auditActionFilter,
      actorId: auditActorFilter,
      actorRole: auditRoleFilter,
      entityType: auditEntityFilter,
      metadata: auditMetaFilter,
      from: fromIso,
      to: toIso,
      cursor: auditCursor,
      limit: 120,
    });
    setAuditLogs((prev) => [...prev, ...(result.items || [])]);
    setAuditCursor(result.nextCursor || null);
    setAuditHasMore(Boolean(result.hasMore));
    if (result.error) {
      setAuditMessage(`Audit fetch error: ${result.error.slice(0, 120)}`);
    } else if (!result.items || result.items.length === 0) {
      setAuditMessage('No more audit logs found for current filters.');
      setTimeout(() => setAuditMessage(''), 2500);
    } else {
      setAuditMessage('');
    }
    setAuditLoadingMore(false);
  };

  

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
  const visibleSecuritySignals = securitySignals.filter((row) => {
    if (securitySeverityFilter === 'ALL') return true;
    const severity = row?.metadata?.severity || (row.action?.includes('retry_burst') ? 'HIGH' : 'MEDIUM');
    return severity === securitySeverityFilter;
  });
  const highCount = visibleSecuritySignals.filter((x) => (x?.metadata?.severity || (x.action?.includes('retry_burst') ? 'HIGH' : 'MEDIUM')) === 'HIGH').length;
  const mediumCount = visibleSecuritySignals.filter((x) => (x?.metadata?.severity || (x.action?.includes('retry_burst') ? 'HIGH' : 'MEDIUM')) === 'MEDIUM').length;
  const severityMax = Math.max(1, highCount, mediumCount);
  const isSecurityStale = securityLastRefreshedAt ? (securityNow - new Date(securityLastRefreshedAt).getTime()) > 65000 : true;
  const blockedRate = (rateTelemetry.allowed + rateTelemetry.blocked) > 0
    ? Math.round((rateTelemetry.blocked / (rateTelemetry.allowed + rateTelemetry.blocked)) * 100)
    : 0;
  const exportSecuritySignalsCsv = () => {
    if (visibleSecuritySignals.length === 0) return;
    const header = ['signal_id', 'action', 'severity', 'created_at', 'acknowledged', 'acknowledged_by', 'acknowledged_at'];
    const rows = visibleSecuritySignals.map((row) => {
      const severity = row?.metadata?.severity || (row.action?.includes('retry_burst') ? 'HIGH' : 'MEDIUM');
      const ackInfo = acknowledgedSignalIds[row.id];
      return [
        row.id,
        row.action || '',
        severity,
        row.created_at || '',
        ackInfo?.acknowledged ? 'yes' : 'no',
        ackInfo?.actorId || '',
        ackInfo?.acknowledgedAt || '',
      ];
    });
    const csv = [header, ...rows]
      .map((cols) => cols.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-signals-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        <div style={{ ...s.header, flexDirection: isSmall ? 'column' : 'row', gap: isSmall ? '10px' : '0', alignItems: 'flex-start' }}>
          <div>
            <button style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', color:'#c9a84c', borderRadius:'20px', padding:'5px 12px 5px 8px', fontSize:'12px', cursor:'pointer', fontWeight:'600', marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px', width:'fit-content' }} onClick={() => { const tabs=['overview','machines','bookings','clients','operators','wallet','approvals','dlq','audit','reports']; const i=tabs.indexOf(activeTab); if(i>0) setActiveTab(tabs[i-1]); }}>&#8592;</button>
            <h2 style={{ ...s.pageTitle, fontSize: isSmall ? '16px' : '22px' }}>
              {NAV.find(n => n.id === activeTab)?.icon}{' '}
              {NAV.find(n => n.id === activeTab)?.label}
            </h2>
            <p style={s.pageDate}>📅 {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · Karad, Satara</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
            <div style={{ ...s.bottomRow, gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr', marginTop: '20px' }}>
              <div style={s.bottomCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ ...s.bottomTitle, margin: 0 }}>🛡️ Security Signals</h3>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {['ALL', 'HIGH', 'MEDIUM'].map((level) => (
                      <button
                        key={level}
                        style={{
                          background: securitySeverityFilter === level ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.08)',
                          border: securitySeverityFilter === level ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(201,168,76,0.28)',
                          color: '#c9a84c',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSecuritySeverityFilter(level)}
                      >
                        {level}
                      </button>
                    ))}
                    <button
                      style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: securityRefreshing ? 'wait' : 'pointer', opacity: securityRefreshing ? 0.7 : 1 }}
                      onClick={refreshSecurityPanel}
                      disabled={securityRefreshing}
                    >
                      {securityRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                      style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                      onClick={exportSecuritySignalsCsv}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
                <p style={{ color: isSecurityStale ? '#ff9aa8' : '#8896a8', fontSize: '10px', margin: '0 0 8px' }}>
                  Last refreshed: {securityLastRefreshedAt ? new Date(securityLastRefreshedAt).toLocaleTimeString('en-IN') : 'never'} {isSecurityStale ? '(stale)' : '(live)'}
                </p>
                {securityPanelMessage && (
                  <p style={{ color: '#ff9aa8', fontSize: '10px', margin: '0 0 8px' }}>{securityPanelMessage}</p>
                )}
                {visibleSecuritySignals.length === 0 ? (
                  <p style={{ color: '#8896a8', fontSize: '12px', margin: 0 }}>No recent suspicious signals.</p>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '8px' }}>
                        <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 4px' }}>HIGH Trend</p>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                          <div style={{ width: `${Math.round((highCount / severityMax) * 100)}%`, height: '100%', background: '#e94560', borderRadius: '4px' }} />
                        </div>
                        <p style={{ color: '#ff9aa8', fontSize: '10px', margin: '4px 0 0' }}>{highCount}</p>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '8px' }}>
                        <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 4px' }}>MEDIUM Trend</p>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                          <div style={{ width: `${Math.round((mediumCount / severityMax) * 100)}%`, height: '100%', background: '#FFB74D', borderRadius: '4px' }} />
                        </div>
                        <p style={{ color: '#FFB74D', fontSize: '10px', margin: '4px 0 0' }}>{mediumCount}</p>
                      </div>
                    </div>
                  {visibleSecuritySignals.map((row) => {
                    const severity = row?.metadata?.severity || (row.action?.includes('retry_burst') ? 'HIGH' : 'MEDIUM');
                    const ackInfo = acknowledgedSignalIds[row.id];
                    const isAcked = Boolean(ackInfo?.acknowledged);
                    return (
                    <div key={row.id} style={s.alertRow}>
                      <p style={s.alertMsg}>
                        {row.action}
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          border: severity === 'HIGH' ? '1px solid rgba(233,69,96,0.45)' : '1px solid rgba(255,152,0,0.45)',
                          color: severity === 'HIGH' ? '#ff9aa8' : '#FFB74D',
                          background: severity === 'HIGH' ? 'rgba(233,69,96,0.14)' : 'rgba(255,152,0,0.14)',
                        }}>
                          {severity}
                        </span>
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <p style={s.alertTime}>
                          {row.created_at ? new Date(row.created_at).toLocaleString('en-IN') : '-'}
                          {isAcked ? ` | Ack: ${ackInfo?.actorId || '-'} @ ${ackInfo?.acknowledgedAt ? new Date(ackInfo.acknowledgedAt).toLocaleString('en-IN') : '-'}` : ''}
                        </p>
                        <button
                          style={{ background: isAcked ? 'rgba(76,175,80,0.18)' : 'rgba(201,168,76,0.12)', border: isAcked ? '1px solid rgba(76,175,80,0.45)' : '1px solid rgba(201,168,76,0.35)', color: isAcked ? '#4CAF50' : '#c9a84c', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', cursor: isAcked ? 'default' : 'pointer' }}
                          disabled={isAcked}
                          onClick={async () => {
                            const ackResult = await acknowledgeSecuritySignal(row.id);
                            if (ackResult.ok) {
                              setAcknowledgedSignalIds((prev) => ({
                                ...prev,
                                [row.id]: {
                                  acknowledged: true,
                                  actorId: ackResult.acknowledgedBy || getCurrentAdminId(),
                                  acknowledgedAt: ackResult.acknowledgedAt || new Date().toISOString(),
                                },
                              }));
                              refreshSecurityPanel();
                            }
                          }}
                        >
                          {isAcked ? 'Acknowledged' : 'Acknowledge'}
                        </button>
                      </div>
                    </div>
                    );
                  })}
                  </div>
                )}
              </div>
              <div style={s.bottomCard}>
                <h3 style={s.bottomTitle}>📈 Rate Limit Telemetry</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 3px' }}>Allowed</p>
                    <p style={{ color: '#4CAF50', margin: 0, fontWeight: '700' }}>{rateTelemetry.allowed || 0}</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 3px' }}>Blocked</p>
                    <p style={{ color: '#e94560', margin: 0, fontWeight: '700' }}>{rateTelemetry.blocked || 0}</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 3px' }}>Active Buckets</p>
                    <p style={{ color: '#c9a84c', margin: 0, fontWeight: '700' }}>{rateTelemetry.activeBuckets || 0}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>Blocked Rate: {blockedRate}%</p>
                  <span style={{
                    border: blockedRate >= 15 ? '1px solid rgba(233,69,96,0.45)' : '1px solid rgba(76,175,80,0.45)',
                    color: blockedRate >= 15 ? '#ff9aa8' : '#4CAF50',
                    background: blockedRate >= 15 ? 'rgba(233,69,96,0.14)' : 'rgba(76,175,80,0.14)',
                    borderRadius: '10px',
                    padding: '2px 8px',
                    fontSize: '10px',
                  }}>
                    {blockedRate >= 15 ? 'ALERT' : 'NORMAL'}
                  </span>
                </div>
                {(rateTelemetry.byRoute || []).slice(0, 5).map((x) => (
                  <div key={x.route} style={s.alertRow}>
                    <p style={s.alertMsg}>{x.route}</p>
                    <p style={s.alertTime}>hits: {x.count}</p>
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

                {/* BOOKINGS TAB */}
        {!loading && activeTab === 'bookings' && (
          <div>
            {/* Stats */}
            <div style={{ ...s.cardRow, gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', marginBottom: '20px' }}>
              {[
                { icon: String.fromCodePoint(0x1F4CB), val: bookingData.length.toString(), label: 'Total Bookings' },
                { icon: String.fromCodePoint(0x2705), val: activeBookings.length.toString(), label: 'Active Now' },
                { icon: String.fromCodePoint(0x1F4B0), val: 'Rs.' + totalRevenue.toLocaleString('en-IN'), label: 'Total Revenue' },
                { icon: String.fromCodePoint(0x1F4C5), val: bookingData.filter(b => b.start_date === new Date().toISOString().split('T')[0]).length.toString(), label: 'Today' },
              ].map((c, i) => (
                <div key={i} style={s.card}><p style={s.cardIcon}>{c.icon}</p><h2 style={s.cardNumber}>{c.val}</h2><p style={s.cardLabel}>{c.label}</p></div>
              ))}
            </div>
            {/* Group by Month */}
            {(() => {
              const grouped = {};
              bookingData.forEach(b => {
                const d = new Date(b.created_at || b.start_date);
                const key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                const day = d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' });
                if (!grouped[key]) grouped[key] = {};
                if (!grouped[key][day]) grouped[key][day] = [];
                grouped[key][day].push(b);
              });
              return Object.entries(grouped).map(([month, days]) => (
                <MonthAccordion key={month} month={month} days={days} userData={userData} s={s} isSmall={isSmall} />
              ));
            })()}
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
                        <td style={s.td}><span style={{ ...s.statusBadge, background: c.status === 'active' ? 'rgba(76,175,80,0.15)' : c.status === 'pending' ? 'rgba(255,152,0,0.15)' : 'rgba(233,69,96,0.15)', border: c.status === 'active' ? '1px solid #4CAF50' : c.status === 'pending' ? '1px solid #FF9800' : '1px solid #e94560', color: c.status === 'active' ? '#4CAF50' : c.status === 'pending' ? '#FF9800' : '#e94560' }}>{c.status === 'active' ? 'Active' : c.status === 'pending' ? 'Pending' : 'Rejected'}</span></td>
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
                        <td style={s.td}><span style={{ color: '#4CAF50', fontWeight: '700' }}>Rs.{(c.wallet_balance || 0).toLocaleString('en-IN')}</span></td>
                        <td style={s.td}><span style={{ background: c.status === 'active' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)', border: c.status === 'active' ? '1px solid #4CAF50' : '1px solid #FF9800', color: c.status === 'active' ? '#4CAF50' : '#FF9800', padding: '3px 8px', borderRadius: '20px', fontSize: '11px' }}>{c.status === 'active' ? 'Active' : 'Pending'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

                {/* APPROVALS TAB */}
        {!loading && activeTab === 'approvals' && (
          <div style={s.tableCard}>
            <h3 style={s.tableTitle}>Pending Client Approvals ({pendingUsers.length})</h3>
            {pendingUsers.length === 0 ? (
              <p style={{ color: '#8896a8', textAlign: 'center', padding: '20px' }}>No pending approvals!</p>
            ) : (
              <table style={s.table}>
                <thead><tr>{['Name','Company','Email','Phone','GSTIN','Date','Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {pendingUsers.map((u, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}>{u.name}</td>
                      <td style={s.td}>{u.company || '-'}</td>
                      <td style={s.td}>{u.email}</td>
                      <td style={s.td}>{u.phone}</td>
                      <td style={s.td}>{u.gstin || '-'}</td>
                      <td style={s.td}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid #4CAF50', color: '#4CAF50', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }} onClick={async () => { await approveUser(u.id); setPendingUsers(prev => prev.filter(p => p.id !== u.id)); alert('Approved!'); }}>Approve</button>
                          <button style={{ background: 'rgba(233,69,96,0.1)', border: '1px solid #e94560', color: '#e94560', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }} onClick={async () => { await rejectUser(u.id); setPendingUsers(prev => prev.filter(p => p.id !== u.id)); alert('Rejected!'); }}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loading && activeTab === 'dlq' && (
          <div style={s.tableCard}>
            <h3 style={s.tableTitle}>DLQ Items ({dlqData.length})</h3>
            {dlqMessage && (
              <div style={{ background: dlqMessage.toLowerCase().includes('error') ? 'rgba(233,69,96,0.14)' : 'rgba(76,175,80,0.12)', border: dlqMessage.toLowerCase().includes('error') ? '1px solid rgba(233,69,96,0.45)' : '1px solid rgba(76,175,80,0.4)', color: dlqMessage.toLowerCase().includes('error') ? '#ff9aa8' : '#4CAF50', borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', fontSize: '12px' }}>
                {dlqMessage}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: isSmall ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: '24h Total', val: dlqStats.totalLast24h || 0 },
                { label: '24h Failed', val: dlqStats.failedLast24h || 0 },
                { label: '24h Retried', val: dlqStats.retriedLast24h || 0 },
                { label: '24h Peak/Hour', val: Math.max(0, ...(dlqStats.hourly || []).map((x) => x.count || 0)) },
              ].map((item) => (
                <div key={item.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ color: '#c9a84c', fontWeight: '700', margin: 0 }}>{item.val}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isSmall ? 'repeat(2,1fr)' : 'repeat(6,1fr)', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'Total', val: dlqCounters.total || 0 },
                { label: 'Failed', val: dlqCounters.failed || 0 },
                { label: 'Retried', val: dlqCounters.retried || 0 },
                { label: 'WhatsApp', val: dlqCounters.whatsapp || 0 },
                { label: 'Email', val: dlqCounters.email || 0 },
                { label: 'Alert', val: dlqCounters.alert || 0 },
              ].map((item) => (
                <div key={item.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ color: '#c9a84c', fontWeight: '700', margin: 0 }}>{item.val}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <select value={dlqQueueFilter} onChange={(e) => setDlqQueueFilter(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', color: '#e8e0d0', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '6px 8px' }}>
                <option value="">All Queues</option>
                <option value="whatsapp">whatsapp</option>
                <option value="email">email</option>
                <option value="alert">alert</option>
                <option value="pdf">pdf</option>
              </select>
              <select value={dlqStatusFilter} onChange={(e) => setDlqStatusFilter(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', color: '#e8e0d0', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '6px 8px' }}>
                <option value="">All Status</option>
                <option value="failed">failed</option>
                <option value="retried">retried</option>
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ color: '#8896a8', fontSize: '11px', margin: '0 0 6px' }}>Last 24h Queue Volume</p>
              <div style={{ display: 'grid', gridTemplateColumns: isSmall ? 'repeat(2,1fr)' : 'repeat(5,1fr)', gap: '8px' }}>
                {Object.entries(dlqStats.queueCounts || {}).map(([queueName, count]) => (
                  <div key={queueName} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <p style={{ color: '#8896a8', fontSize: '10px', margin: '0 0 2px' }}>{queueName}</p>
                    <p style={{ color: '#c9a84c', fontWeight: '700', margin: 0 }}>{count}</p>
                  </div>
                ))}
              </div>
            </div>
            {dlqData.length === 0 ? (
              <p style={{ color: '#8896a8', textAlign: 'center', padding: '20px' }}>No DLQ items</p>
            ) : (
              <div>
                <table style={s.table}>
                  <thead><tr>{['Queue', 'Job', 'Error', 'Created', 'Retried By', 'Retried At', 'Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {dlqData.map((item) => (
                      <tr key={item.id} style={s.tr}>
                        <td style={s.td}>{item.queue_name}</td>
                        <td style={s.td}>{item.job_name}</td>
                        <td style={{ ...s.td, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.error || '-'}</td>
                        <td style={s.td}>{item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : '-'}</td>
                        <td style={s.td}>{item.retried_by || '-'}</td>
                        <td style={s.td}>{item.retried_at ? new Date(item.retried_at).toLocaleString('en-IN') : '-'}</td>
                        <td style={s.td}>
                          <button
                            style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid #4CAF50', color: '#4CAF50', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                            onClick={async () => {
                              setSelectedDlqItem(item);
                              setDlqRetryReason('');
                            }}
                          >
                            Retry
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dlqHasMore && (
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '8px', padding: '8px 14px', cursor: dlqLoadingMore ? 'wait' : 'pointer', opacity: dlqLoadingMore ? 0.7 : 1 }}
                      disabled={dlqLoadingMore}
                      onClick={loadMoreDlq}
                    >
                      {dlqLoadingMore ? 'Loading...' : 'Load More DLQ'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedDlqItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div style={{ width: isSmall ? '92%' : '420px', background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ color: '#c9a84c', marginTop: 0 }}>Retry DLQ Item #{selectedDlqItem.id}</h3>
              <p style={{ color: '#8896a8', fontSize: '12px' }}>Queue: {selectedDlqItem.queue_name} | Job: {selectedDlqItem.job_name}</p>
              <textarea
                value={dlqRetryReason}
                onChange={(e) => setDlqRetryReason(e.target.value)}
                placeholder="Retry reason (for audit)"
                style={{ width: '100%', minHeight: '88px', background: 'rgba(0,0,0,0.3)', color: '#e8e0d0', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '8px', padding: '8px', boxSizing: 'border-box' }}
              />
              <p style={{ color: '#8896a8', fontSize: '11px', margin: '6px 0 0' }}>Minimum 8 characters required.</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#8896a8', borderRadius: '8px', padding: '8px', cursor: 'pointer' }} onClick={() => setSelectedDlqItem(null)}>Cancel</button>
                <button
                  style={{ flex: 1, background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50', borderRadius: '8px', padding: '8px', cursor: dlqRetryReason.trim().length >= 8 ? 'pointer' : 'not-allowed', opacity: dlqRetryReason.trim().length >= 8 ? 1 : 0.6 }}
                  disabled={dlqRetryReason.trim().length < 8}
                  onClick={async () => {
                    const previous = [...dlqData];
                    const itemId = selectedDlqItem.id;
                    setDlqData((prev) => prev.filter((x) => x.id !== itemId));
                    setSelectedDlqItem(null);
                    const ok = await retryDlqItem(itemId, dlqRetryReason);
                    if (ok) {
                      setDlqMessage(`DLQ item ${itemId} retried successfully.`);
                    } else {
                      setDlqData(previous);
                      setDlqMessage(`Retry failed for DLQ item ${itemId}.`);
                    }
                    setTimeout(() => setDlqMessage(''), 3000);
                  }}
                >
                  Confirm Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'audit' && (
          <div style={s.tableCard}>
            <h3 style={s.tableTitle}>Audit Logs ({visibleAuditLogs.length})</h3>
            {auditMessage && (
              <div style={{ background: auditMessage.toLowerCase().includes('error') ? 'rgba(233,69,96,0.14)' : 'rgba(76,175,80,0.12)', border: auditMessage.toLowerCase().includes('error') ? '1px solid rgba(233,69,96,0.45)' : '1px solid rgba(76,175,80,0.4)', color: auditMessage.toLowerCase().includes('error') ? '#ff9aa8' : '#4CAF50', borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', fontSize: '12px' }}>
                {auditMessage}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                placeholder="Filter action (e.g. dlq_retry)"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#e8e0d0', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '6px 8px' }}
              />
              <input
                value={auditActorFilter}
                onChange={(e) => setAuditActorFilter(e.target.value)}
                placeholder="Filter actorId"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#e8e0d0', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '6px 8px' }}
              />
              <select value={auditRoleFilter} onChange={(e) => setAuditRoleFilter(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', color: '#e8e0d0', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '6px 8px' }}>
                <option value="">All Roles</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
                <option value="client">client</option>
                <option value="operator">operator</option>
              </select>
              <input
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
                placeholder="Entity type (e.g. dead_letter_queue)"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#e8e0d0', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '6px 8px' }}
              />
              <input
                value={auditMetaFilter}
                onChange={(e) => setAuditMetaFilter(e.target.value)}
                placeholder="Search metadata JSON"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#e8e0d0', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '6px 8px' }}
              />
              <input
                type="datetime-local"
                value={auditFrom}
                onChange={(e) => setAuditFrom(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.3)', color: '#e8e0d0', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '6px 8px' }}
              />
              <input
                type="datetime-local"
                value={auditTo}
                onChange={(e) => setAuditTo(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.3)', color: '#e8e0d0', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '6px 8px' }}
              />
              <button style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }} onClick={() => setAuditPreset('today')}>Today</button>
              <button style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }} onClick={() => setAuditPreset('24h')}>24h</button>
              <button style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }} onClick={() => setAuditPreset('7d')}>7d</button>
              <button style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }} onClick={() => setAuditPreset('')}>Reset</button>
              <button style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', color: '#4CAF50', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }} onClick={exportAuditCsv}>Export CSV</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: '#8896a8', fontSize: '11px' }}>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone} (local)</span>
              <button style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '16px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }} onClick={clearAllAuditFilters}>Clear All</button>
              {auditActionFilter && <button style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '16px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }} onClick={() => clearAuditField('action')}>action x</button>}
              {auditActorFilter && <button style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '16px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }} onClick={() => clearAuditField('actor')}>actor x</button>}
              {auditRoleFilter && <button style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '16px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }} onClick={() => clearAuditField('role')}>role x</button>}
              {auditEntityFilter && <button style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '16px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }} onClick={() => clearAuditField('entity')}>entity x</button>}
              {auditMetaFilter && <button style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '16px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }} onClick={() => clearAuditField('meta')}>meta x</button>}
              {auditFrom && <button style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '16px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }} onClick={() => clearAuditField('from')}>from x</button>}
              {auditTo && <button style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '16px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }} onClick={() => clearAuditField('to')}>to x</button>}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {Object.keys(csvColumns).map((key) => (
                <label key={key} style={{ color: '#8896a8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="checkbox"
                    checked={csvColumns[key]}
                    onChange={(e) => setCsvColumns((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  {key}
                </label>
              ))}
            </div>
            {visibleAuditLogs.length === 0 ? (
              <p style={{ color: '#8896a8', textAlign: 'center', padding: '20px' }}>No audit logs</p>
            ) : (
              <div>
                <table style={s.table}>
                  <thead><tr>{['When', 'Action', 'Actor', 'Role', 'Entity', 'Entity ID', 'Meta'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                </table>
                <div
                  style={{ maxHeight: '430px', overflowY: 'auto', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '8px' }}
                  onScroll={(e) => setAuditScrollTop(e.target.scrollTop)}
                >
                  <table style={{ ...s.table, minWidth: '100%' }}>
                    <tbody>
                      {auditVirtualWindow.useVirtual && auditVirtualWindow.topPad > 0 && (
                        <tr><td colSpan={7} style={{ padding: 0, height: `${auditVirtualWindow.topPad}px` }} /></tr>
                      )}
                      {auditVirtualWindow.items.map((row) => (
                        <React.Fragment key={row.id}>
                          <tr style={s.tr}>
                            <td style={s.td}>{row.created_at ? new Date(row.created_at).toLocaleString('en-IN') : '-'}</td>
                            <td style={s.td}>{row.action}</td>
                            <td style={s.td}>{row.actor_id || '-'}</td>
                            <td style={s.td}>{row.actor_role || '-'}</td>
                            <td style={s.td}>{row.entity_type || '-'}</td>
                            <td style={s.td}>{row.entity_id || '-'}</td>
                            <td style={s.td}>
                              <button
                                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                                onClick={() => setExpandedAuditRows((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                              >
                                {expandedAuditRows[row.id] ? 'Hide' : 'View'}
                              </button>
                            </td>
                          </tr>
                          {expandedAuditRows[row.id] && (
                            <tr style={s.tr}>
                              <td style={s.td} colSpan={7}>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#8896a8', fontSize: '11px' }}>
                                  {JSON.stringify(row.metadata || {}, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {auditVirtualWindow.useVirtual && auditVirtualWindow.bottomPad > 0 && (
                        <tr><td colSpan={7} style={{ padding: 0, height: `${auditVirtualWindow.bottomPad}px` }} /></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {auditHasMore && (
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '8px', padding: '8px 14px', cursor: auditLoadingMore ? 'wait' : 'pointer', opacity: auditLoadingMore ? 0.7 : 1 }}
                      disabled={auditLoadingMore}
                      onClick={loadMoreAuditLogs}
                    >
                      {auditLoadingMore ? 'Loading...' : 'Load More Logs'}
                    </button>
                  </div>
                )}
              </div>
            )}
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
