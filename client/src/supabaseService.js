import { supabase } from './supabaseClient';

// ─── MACHINES ───
export const getMachines = async () => {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .order('machine_id');
  if (error) { console.error(error); return []; }
  return data;
};

// ─── BOOKINGS ───
export const createBooking = async (booking) => {
  const { data, error } = await supabase
    .from('bookings')
    .insert([booking])
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
};

export const getBookingsByClient = async (clientId) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, machines(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
};

export const getAllBookings = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
};

// ─── WALLET ───
export const getWalletBalance = async (userId) => {
  const { data, error } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single();
  if (error) { console.error(error); return 0; }
  return data?.balance || 0;
};

export const updateWalletBalance = async (userId, amount) => {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single();
  const newBalance = (wallet?.balance || 0) + amount;
  const { error } = await supabase
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) { console.error(error); return false; }
  return true;
};

// ─── TRANSACTIONS ───
export const addTransaction = async (transaction) => {
  const { error } = await supabase
    .from('transactions')
    .insert([transaction]);
  if (error) { console.error(error); return false; }
  return true;
};

export const getTransactionsByUser = async (userId) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) { console.error(error); return []; }
  return data;
};

export const getAllTransactions = async () => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error(error); return []; }
  return data;
};

// ─── USERS ───
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
};

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
  const { error } = await supabase
    .from('fuel_logs')
    .insert([log]);
  if (error) { console.error(error); return false; }
  return true;
};

export const getFuelLogs = async (machineId) => {
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('*')
    .eq('machine_id', machineId)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
};

// ─── ATTENDANCE ───
export const markAttendance = async (attendance) => {
  const { error } = await supabase
    .from('attendance')
    .insert([attendance]);
  if (error) { console.error(error); return false; }
  return true;
};

export const getAttendanceByOperator = async (operatorId) => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('operator_id', operatorId)
    .order('date', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
};

// ─── ISSUES ───
export const reportIssue = async (issue) => {
  const { error } = await supabase
    .from('issues')
    .insert([issue]);
  if (error) { console.error(error); return false; }
  return true;
};

export const getAllIssues = async () => {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
};

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
  const { data, error } = await supabase.from('users').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
};

export const approveUser = async (userId) => {
  const { error } = await supabase.from('users').update({ status: 'active' }).eq('id', userId);
  if (error) { console.error(error); return false; }
  await supabase.from('wallets').upsert({ user_id: userId, balance: 0 });
  return true;
};

export const rejectUser = async (userId) => {
  const { error } = await supabase.from('users').update({ status: 'rejected' }).eq('id', userId);
  if (error) { console.error(error); return false; }
  return true;
};

export const getOwnerBookings = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, users!bookings_client_id_fkey(name, phone), machines!bookings_machine_id_fkey(machine_id, name)')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
};

export const approveBooking = async (bookingId) => {
  const { error } = await supabase
    .from('bookings')
    .update({ owner_approved: true, owner_approved_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) { console.error(error); return false; }
  return true;
};


