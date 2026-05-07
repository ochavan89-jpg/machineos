import { supabase } from './supabaseClient';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

async function secureFetch(path, options = {}) {
  let token = localStorage.getItem('machineos_token');
  const execute = async (activeToken) => fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeToken || ''}`,
      ...(options.headers || {}),
    },
  });

  let response = await execute(token);
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('machineos_refresh_token');
    if (refreshToken) {
      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshResponse.ok) {
        const refreshPayload = await refreshResponse.json().catch(() => ({}));
        if (refreshPayload?.token) {
          localStorage.setItem('machineos_token', refreshPayload.token);
          token = refreshPayload.token;
          response = await execute(token);
        }
      }
    }
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload;
}

async function fetchAdminPage(endpoint, { limit = 250, offset = 0 } = {}) {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const result = await secureFetch(`${endpoint}?${params.toString()}`);
    return {
      items: result.items || [],
      hasMore: Boolean(result.hasMore),
      nextOffset: typeof result.nextOffset === 'number' ? result.nextOffset : null,
      error: '',
    };
  } catch (error) {
    console.error(error);
    return { items: [], hasMore: false, nextOffset: null, error: error?.message || `Failed to fetch ${endpoint}` };
  }
}

// ─── MACHINES ───
export const getMachines = async () => {
  try {
    const token = localStorage.getItem('machineos_token');
    const user = JSON.parse(localStorage.getItem('machineos_user') || '{}');
    if (token && user?.role === 'admin') {
      const result = await secureFetch('/api/admin/machines');
      return result.items || [];
    }
  } catch (error) {
    console.error(error);
  }
  const { data, error } = await supabase.from('machines').select('*').order('machine_id');
  if (error) { console.error(error); return []; }
  return data;
};

export const getMachinesPage = async (options = {}) => fetchAdminPage('/api/admin/machines', options);

// ─── BOOKINGS ───
export const createBooking = async (booking) => {
  try {
    const result = await secureFetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        machineId: booking.machine_id,
        bookingType: booking.booking_type,
        quantity: booking.quantity,
        baseAmount: booking.base_amount,
        gstAmount: booking.gst_amount,
        totalAmount: booking.total_amount,
        advancePaid: booking.advance_paid,
        location: booking.location,
        startDate: booking.start_date,
        endDate: booking.end_date || null,
      }),
    });
    return result.booking || null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getBookingsByClient = async (clientId) => {
  try {
    const result = await secureFetch('/api/bookings/me');
    return (result.items || []).filter((item) => item.client_id === clientId);
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getMyBookingsPage = async ({ limit = 100, offset = 0 } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const result = await secureFetch(`/api/bookings/me?${params.toString()}`);
    return {
      items: result.items || [],
      hasMore: Boolean(result.hasMore),
      nextOffset: typeof result.nextOffset === 'number' ? result.nextOffset : null,
      error: '',
    };
  } catch (error) {
    console.error(error);
    return { items: [], hasMore: false, nextOffset: null, error: error?.message || 'Failed to fetch bookings' };
  }
};

export const getAllBookings = async () => {
  try {
    const result = await secureFetch('/api/admin/bookings');
    return result.items || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getAllBookingsPage = async (options = {}) => fetchAdminPage('/api/admin/bookings', options);

// ─── WALLET ───
export const getWalletBalance = async (userId) => {
  try {
    const result = await secureFetch(`/api/wallet/${userId}/balance`);
    return result?.balance || 0;
  } catch (error) {
    console.error(error);
    return 0;
  }
};

export const updateWalletBalance = async (userId, amount) => {
  console.warn('updateWalletBalance is deprecated on client. Use backend wallet APIs.');
  return false;
};

// ─── TRANSACTIONS ───
export const addTransaction = async (transaction) => {
  console.warn('addTransaction is deprecated on client. Use backend transactional APIs.');
  return false;
};

export const getTransactionsByUser = async (userId) => {
  try {
    const result = await secureFetch('/api/bookings/me/transactions');
    return (result.items || []).filter((item) => item.user_id === userId);
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getMyTransactionsPage = async ({ limit = 50, offset = 0 } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const result = await secureFetch(`/api/bookings/me/transactions?${params.toString()}`);
    return {
      items: result.items || [],
      hasMore: Boolean(result.hasMore),
      nextOffset: typeof result.nextOffset === 'number' ? result.nextOffset : null,
      error: '',
    };
  } catch (error) {
    console.error(error);
    return { items: [], hasMore: false, nextOffset: null, error: error?.message || 'Failed to fetch transactions' };
  }
};

export const getAllTransactions = async () => {
  try {
    const result = await secureFetch('/api/admin/transactions');
    return result.items || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getAllTransactionsPage = async (options = {}) => fetchAdminPage('/api/admin/transactions', options);

// ─── USERS ───
export const getAllUsers = async () => {
  try {
    const result = await secureFetch('/api/admin/users');
    return result.items || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getAllUsersPage = async (options = {}) => fetchAdminPage('/api/admin/users', options);
export const getAllClients = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'client');
  if (error) { console.error(error); return []; }
  return data;
};

export const getAllOwners = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'owner');
  if (error) { console.error(error); return []; }
  return data;
};

export const getAllOperators = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'operator');
  if (error) { console.error(error); return []; }
  return data;
};

// ─── FUEL LOGS ───
export const addFuelLog = async (log) => {
  try {
    await secureFetch('/api/operator/fuel-log', {
      method: 'POST',
      body: JSON.stringify({
        fuelLevel: Number(log.fuel_level),
        note: log.note,
      }),
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const getFuelLogs = async (machineId) => {
  try {
    const result = await secureFetch('/api/operator/fuel-logs');
    return result.items || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getFuelLogsPage = async ({ limit = 50, offset = 0 } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const result = await secureFetch(`/api/operator/fuel-logs?${params.toString()}`);
    return {
      items: result.items || [],
      hasMore: Boolean(result.hasMore),
      nextOffset: typeof result.nextOffset === 'number' ? result.nextOffset : null,
      error: '',
    };
  } catch (error) {
    console.error(error);
    return { items: [], hasMore: false, nextOffset: null, error: error?.message || 'Failed to fetch fuel logs' };
  }
};

// ─── ATTENDANCE ───
export const markAttendance = async (attendance) => {
  try {
    await secureFetch('/api/operator/attendance', {
      method: 'POST',
      body: JSON.stringify({
        status: attendance.status,
        checkIn: attendance.check_in,
        date: attendance.date,
      }),
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const getAttendanceByOperator = async (operatorId) => {
  try {
    const result = await secureFetch('/api/operator/attendance');
    return result.items || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getAttendancePage = async ({ limit = 30, offset = 0 } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const result = await secureFetch(`/api/operator/attendance?${params.toString()}`);
    return {
      items: result.items || [],
      hasMore: Boolean(result.hasMore),
      nextOffset: typeof result.nextOffset === 'number' ? result.nextOffset : null,
      error: '',
    };
  } catch (error) {
    console.error(error);
    return { items: [], hasMore: false, nextOffset: null, error: error?.message || 'Failed to fetch attendance' };
  }
};

// ─── ISSUES ───
export const reportIssue = async (issue) => {
  try {
    await secureFetch('/api/operator/issues', {
      method: 'POST',
      body: JSON.stringify({
        issueType: issue.issue_type,
        description: issue.description,
      }),
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const getAllIssues = async () => {
  try {
    const result = await secureFetch('/api/admin/issues');
    return result.items || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getAllIssuesPage = async (options = {}) => fetchAdminPage('/api/admin/issues', options);

// ─── MACHINE STATUS UPDATE ───
export const updateMachineStatus = async (machineId, status, fuelLevel) => {
  const { error } = await supabase
    .from('machines')
    .update({ status, fuel_level: fuelLevel })
    .eq('machine_id', machineId);
  if (error) { console.error(error); return false; }
  return true;
};

export const updateMachineFuel = async (machineId, fuelLevel) => {
  const { error } = await supabase
    .from('machines')
    .update({ fuel_level: fuelLevel })
    .eq('machine_id', machineId);
  if (error) { console.error(error); return false; }
  return true;
};
export const getPendingUsers = async () => {
  try {
    const result = await secureFetch('/api/admin/users/pending');
    return result.items || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const approveUser = async (userId) => {
  try {
    await secureFetch(`/api/admin/users/${userId}/approve`, { method: 'PATCH' });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const rejectUser = async (userId) => {
  try {
    await secureFetch(`/api/admin/users/${userId}/reject`, { method: 'PATCH' });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const getOwnerBookings = async () => {
  try {
    const result = await secureFetch('/api/owner/bookings');
    return result.items || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getOwnerBookingsPage = async ({ limit = 100, offset = 0 } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const result = await secureFetch(`/api/owner/bookings?${params.toString()}`);
    return {
      items: result.items || [],
      hasMore: Boolean(result.hasMore),
      nextOffset: typeof result.nextOffset === 'number' ? result.nextOffset : null,
      error: '',
    };
  } catch (error) {
    console.error(error);
    return { items: [], hasMore: false, nextOffset: null, error: error?.message || 'Failed to fetch owner bookings' };
  }
};

export const approveBooking = async (bookingId) => {
  try {
    await secureFetch(`/api/owner/bookings/${bookingId}/approve`, { method: 'PATCH' });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const getDlqItems = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.queue) params.set('queue', filters.queue);
    if (filters.status) params.set('status', filters.status);
    if (filters.cursor) params.set('cursor', filters.cursor);
    if (filters.limit) params.set('limit', String(filters.limit));
    const query = params.toString();
    const result = await secureFetch(`/api/admin/dlq${query ? `?${query}` : ''}`);
    return {
      items: result.items || [],
      counters: result.counters || {},
      nextCursor: result.nextCursor || null,
      hasMore: Boolean(result.hasMore),
      error: '',
    };
  } catch (error) {
    console.error(error);
    return { items: [], counters: {}, nextCursor: null, hasMore: false, error: error?.message || 'Failed to fetch DLQ items' };
  }
};

export const retryDlqItem = async (id, reason = '') => {
  try {
    await secureFetch(`/api/admin/dlq/${id}/retry`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const getDlqStats = async () => {
  try {
    return await secureFetch('/api/admin/dlq/stats');
  } catch (error) {
    console.error(error);
    return { totalLast24h: 0, failedLast24h: 0, retriedLast24h: 0, queueCounts: {}, hourly: [] };
  }
};

export const getRateLimitTelemetry = async () => {
  try {
    return await secureFetch('/api/admin/telemetry/rate-limit');
  } catch (error) {
    console.error(error);
    return { allowed: 0, blocked: 0, byRoute: [], activeBuckets: 0, error: error?.message || 'Failed to fetch telemetry' };
  }
};

export const getApiHealthTelemetry = async () => {
  // Temporarily disabled in production due to endpoint-specific auth mismatch.
  return {
    windowMs: 0,
    totalRequests: 0,
    errors5xx: 0,
    errorRatePct: 0,
    p95Ms: 0,
    p99Ms: 0,
    slo: { p95MsThreshold: 0, errorRatePctThreshold: 0, p95Healthy: true, errorRateHealthy: true },
    byRoute: [],
    error: '',
    unavailableReason: 'disabled',
  };
};

export const acknowledgeSecuritySignal = async (signalId) => {
  try {
    const result = await secureFetch(`/api/admin/security-signals/${signalId}/ack`, { method: 'POST' });
    return {
      ok: true,
      alreadyAcknowledged: Boolean(result?.alreadyAcknowledged),
      acknowledgedBy: result?.acknowledgedBy || null,
      acknowledgedAt: result?.acknowledgedAt || null,
    };
  } catch (error) {
    console.error(error);
    return { ok: false, alreadyAcknowledged: false, acknowledgedBy: null, acknowledgedAt: null };
  }
};

export const getAuditLogs = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.action) params.set('action', filters.action);
    if (filters.actorId) params.set('actorId', filters.actorId);
    if (filters.actorRole) params.set('actorRole', filters.actorRole);
    if (filters.entityType) params.set('entityType', filters.entityType);
    if (filters.metadata) params.set('metadata', filters.metadata);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.cursor) params.set('cursor', filters.cursor);
    if (filters.limit) params.set('limit', String(filters.limit));
    const query = params.toString();
    const result = await secureFetch(`/api/admin/audit-logs${query ? `?${query}` : ''}`);
    return {
      items: result.items || [],
      nextCursor: result.nextCursor || null,
      hasMore: Boolean(result.hasMore),
      error: '',
    };
  } catch (error) {
    console.error(error);
    return { items: [], nextCursor: null, hasMore: false, error: error?.message || 'Failed to fetch audit logs' };
  }
};


