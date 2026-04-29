import { supabase } from '../supabaseClient';
// import { requestNotificationPermission } from '../firebase';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Email aani Password taka'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('role', role)
        .single();

      if (dbError || !data) {
        setError('Invalid Email, Password kiva Role!');
        setLoading(false);
        return;
      }
      localStorage.setItem('machineos_user', JSON.stringify(data));
      
      navigate('/' + role);
    } catch (err) {
      setError('Login failed — please try again');
    }
    setLoading(false);
  };

  const ROLES = [
    { id: 'admin', icon: '👑', label: 'Admin', sub: 'Om Chavan — MD' },
    { id: 'client', icon: '👷', label: 'Client', sub: 'Book Machinery' },
    { id: 'owner', icon: '🏗️', label: 'Owner', sub: 'Machine Owner' },
    { id: 'operator', icon: '🔧', label: 'Operator', sub: 'Machine Operator' },
  ];

  return (
    <div style={s.page}>
      <div style={s.bgGrid}></div>
      <div style={s.bgGlow1}></div>
      <div style={s.bgGlow2}></div>

      <div style={s.wrapper}>
        <div style={s.logoSection}>
          <div style={s.logoCircle}>
            <span style={s.logoText}>DE</span>
          </div>
          <div>
            <h1 style={s.companyName}>DEVELOPMENT EXPRESS</h1>
            <p style={s.tagline}>THE GOLD STANDARD OF INFRASTRUCTURE</p>
            <p style={s.since}>Est. 2011 - Karad, Satara - Maharashtra</p>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <h2 style={s.cardTitle}>MachineOS Login</h2>
            <p style={s.cardSub}>Construction Machinery Management Platform</p>
          </div>

          <p style={s.label}>Select Your Role:</p>
          <div style={s.roleGrid}>
            {ROLES.map(r => (
              <button key={r.id}
                style={{ ...s.roleBtn, ...(role === r.id ? s.roleBtnActive : {}) }}
                onClick={() => { setRole(r.id); setError(''); }}>
                <span style={s.roleIcon}>{r.icon}</span>
                <span style={{ ...s.roleLabel, color: role === r.id ? '#c9a84c' : '#e8e0d0' }}>{r.label}</span>
                <span style={s.roleSub}>{r.sub}</span>
              </button>
            ))}
          </div>

          <div style={s.selectedBadge}>
            <span style={s.selectedDot}></span>
            <span style={s.selectedText}>
              Logging in as: <strong style={{ color: '#c9a84c' }}>{ROLES.find(r => r.id === role)?.label}</strong>
            </span>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Email Address</label>
            <input
              style={s.input}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="email"
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              placeholder="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={s.errorBox}>
              <span>{error}</span>
            </div>
          )}

          <button style={{ ...s.loginBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleLogin}
            disabled={loading}>
            {loading ? 'Logging in...' : 'Login to MachineOS'}
          </button>

          <div style={s.demoBox}>
            <p style={s.demoTitle}>Demo Credentials:</p>
            <div style={s.demoGrid}>
              {[
                { role: 'Admin', email: 'om.chavan2026@zohomail.in', pass: 'admin1234' },
                { role: 'Client', email: 'billing@patilbuilders.com', pass: 'client1234' },
                { role: 'Owner', email: 'rajesh.patil@gmail.com', pass: 'owner1234' },
                { role: 'Operator', email: 'ramesh.kadam@gmail.com', pass: 'operator1234' },
              ].map((d, i) => (
                <button key={i} style={s.demoBtn}
                  onClick={() => { setRole(d.role.toLowerCase()); setEmail(d.email); setPassword(d.pass); setError(''); }}>
                  <span style={{ color: '#c9a84c', fontWeight: '700', fontSize: '11px' }}>{d.role}</span>
                  <span style={{ color: '#8896a8', fontSize: '9px', display: 'block' }}>{d.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={s.cardFooter}>
            <p style={s.footerText}>Secured - Wallet-Only Policy - GST Compliant</p>
            <p style={s.footerSub}>+91-9766926636 - machineos@developmentexpress.in</p>
          </div>
        </div>

        <p style={s.bottomText}>2026 Development Express - All Rights Reserved - GSTIN: 27ABCDE1234F1Z5</p>
      </div>
    </div>
  );
};

const s = {
  page: { minHeight: '100vh', background: '#050d1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden', padding: '20px' },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' },
  bgGlow1: { position: 'fixed', top: '-20%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' },
  bgGlow2: { position: 'fixed', bottom: '-20%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(10,22,40,0.9) 0%, transparent 70%)', pointerEvents: 'none' },
  wrapper: { width: '100%', maxWidth: '520px', position: 'relative', zIndex: 1 },
  logoSection: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', justifyContent: 'center' },
  logoCircle: { width: '56px', height: '56px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 30px rgba(201,168,76,0.4)' },
  logoText: { color: '#0a1628', fontWeight: '900', fontSize: '18px' },
  companyName: { color: '#c9a84c', fontSize: '18px', fontWeight: '900', margin: '0 0 3px', letterSpacing: '2px' },
  tagline: { color: 'rgba(201,168,76,0.6)', fontSize: '9px', margin: '0 0 2px', letterSpacing: '2px' },
  since: { color: '#8896a8', fontSize: '10px', margin: 0 },
  card: { background: 'linear-gradient(135deg, #0f2040 0%, #0a1628 100%)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '30px', boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.1)' },
  cardHeader: { textAlign: 'center', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(201,168,76,0.1)' },
  cardTitle: { color: '#c9a84c', fontSize: '20px', fontWeight: '700', margin: '0 0 6px' },
  cardSub: { color: '#8896a8', fontSize: '12px', margin: 0 },
  label: { color: '#8896a8', fontSize: '11px', marginBottom: '8px', letterSpacing: '1px', display: 'block' },
  roleGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' },
  roleBtn: { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '10px', padding: '10px 6px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' },
  roleBtnActive: { background: 'rgba(201,168,76,0.12)', border: '2px solid #c9a84c', boxShadow: '0 0 15px rgba(201,168,76,0.2)' },
  roleIcon: { fontSize: '22px', display: 'block', marginBottom: '4px' },
  roleLabel: { fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '2px' },
  roleSub: { color: '#8896a8', fontSize: '9px', display: 'block' },
  selectedBadge: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '8px 12px', marginBottom: '18px' },
  selectedDot: { width: '6px', height: '6px', background: '#4CAF50', borderRadius: '50%', flexShrink: 0 },
  selectedText: { color: '#8896a8', fontSize: '12px' },
  fieldGroup: { marginBottom: '14px' },
  input: { width: '100%', padding: '12px 14px', background: 'rgba(5,13,26,0.8)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', outline: 'none' },
  errorBox: { background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', color: '#e94560', fontSize: '12px' },
  loginBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #a07830 0%, #e2c97e 50%, #a07830 100%)', color: '#0a1628', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', letterSpacing: '1px', boxShadow: '0 8px 25px rgba(201,168,76,0.3)', marginBottom: '18px' },
  demoBox: { background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '18px' },
  demoTitle: { color: '#8896a8', fontSize: '10px', letterSpacing: '1px', margin: '0 0 10px' },
  demoGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' },
  demoBtn: { background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '8px', cursor: 'pointer', textAlign: 'left' },
  cardFooter: { textAlign: 'center', paddingTop: '16px', borderTop: '1px solid rgba(201,168,76,0.1)' },
  footerText: { color: '#4CAF50', fontSize: '11px', margin: '0 0 4px' },
  footerSub: { color: '#8896a8', fontSize: '10px', margin: 0 },
  bottomText: { color: 'rgba(201,168,76,0.3)', fontSize: '10px', textAlign: 'center', marginTop: '16px', letterSpacing: '0.5px' },
};

export default Login;


