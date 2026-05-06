// import { requestNotificationPermission } from '../firebase';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';

const DEFAULT_SIGNUP = {
  name: '',
  company: '',
  email: '',
  phone: '',
  gstin: '',
  password: '',
  confirmPassword: '',
};

const Login = () => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [role, setRole] = useState('admin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signup, setSignup] = useState(DEFAULT_SIGNUP);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const loginUsesPhone = role !== 'admin';

  const normalizePhone = (value) => value.replace(/\D/g, '').slice(-10);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError(loginUsesPhone ? `${t('mobileNumber')} + ${t('password')}` : `${t('emailAddressLabel')} + ${t('password')}`);
      return;
    }
    if (loginUsesPhone && normalizePhone(identifier).length !== 10) {
      setError(`Valid ${t('mobileNumber')}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = { password, role };
      if (loginUsesPhone) {
        payload.phone = normalizePhone(identifier);
      } else {
        payload.email = identifier.trim().toLowerCase();
      }
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result?.user || !result?.token || !result?.refreshToken) {
        setError(result?.error || `Invalid ${loginUsesPhone ? 'Mobile Number' : 'Email'}, Password kiva Role!`);
        setLoading(false);
        return;
      }
      localStorage.setItem('machineos_user', JSON.stringify(result.user));
      localStorage.setItem('machineos_token', result.token);
      localStorage.setItem('machineos_refresh_token', result.refreshToken);
      navigate('/' + role);
    } catch (err) {
      setError(t('loginFailedGeneric'));
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    const cleanPhone = normalizePhone(signup.phone);
    const cleanEmail = signup.email.trim().toLowerCase();
    const cleanGstin = signup.gstin.trim().toUpperCase();

    if (!signup.name.trim() || !signup.company.trim() || !cleanEmail || !cleanPhone || !signup.password) {
      setSignupError('Please fill all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setSignupError('Please enter a valid email address.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setSignupError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (cleanGstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d$/.test(cleanGstin)) {
      setSignupError('Please enter a valid GSTIN or leave it blank.');
      return;
    }
    if (signup.password.length < 8) {
      setSignupError('Password must be at least 8 characters long.');
      return;
    }
    if (signup.password !== signup.confirmPassword) {
      setSignupError('Password and confirm password must match.');
      return;
    }

    setSignupLoading(true);
    setSignupError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signup.name.trim(),
          company: signup.company.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          gstin: cleanGstin,
          password: signup.password,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSignupError(result?.error || 'Registration failed. Please try again.');
        return;
      }
      setSignupSuccess(true);
      setSignup(DEFAULT_SIGNUP);
    } catch (_err) {
      setSignupError('Registration failed. Please try again.');
    } finally {
      setSignupLoading(false);
    }
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
            <h1 style={s.companyName}>{t('appName')}</h1>
            <p style={s.tagline}>{t('tagline')}</p>
            <p style={s.since}>Est. 2011 - Karad, Satara - Maharashtra</p>
          </div>
        </div>

        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Link to="/" style={{ color: '#8896a8', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
              ← {t('marketingBackHome')}
            </Link>
            <LanguageSelector compact={true} />
          </div>
          <div style={s.cardHeader}>
            <h2 style={s.cardTitle}>{t('signIn')}</h2>
            <p style={s.cardSub}>{t('platform')}</p>
          </div>

          <p style={s.label}>{t('selectRole')}:</p>
          <div style={s.roleGrid}>
            {ROLES.map(r => (
              <button key={r.id}
                style={{ ...s.roleBtn, ...(role === r.id ? s.roleBtnActive : {}) }}
                onClick={() => { setRole(r.id); setError(''); setIdentifier(''); }}>
                <span style={s.roleIcon}>{r.icon}</span>
                <span style={{ ...s.roleLabel, color: role === r.id ? '#c9a84c' : '#e8e0d0' }}>{r.label}</span>
                <span style={s.roleSub}>{r.sub}</span>
              </button>
            ))}
          </div>

          <div style={s.selectedBadge}>
            <span style={s.selectedDot}></span>
            <span style={s.selectedText}>
              {t('loginAs')}: <strong style={{ color: '#c9a84c' }}>{ROLES.find(r => r.id === role)?.label}</strong>
            </span>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>{loginUsesPhone ? t('mobileNumber') : t('emailAddressLabel')}</label>
            <input
              style={s.input}
              type={loginUsesPhone ? 'tel' : 'email'}
              inputMode={loginUsesPhone ? 'numeric' : 'email'}
              placeholder={loginUsesPhone ? '9876543210' : 'your@email.com'}
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete={loginUsesPhone ? 'tel' : 'email'}
            />
            <p style={s.helperText}>
              {loginUsesPhone ? t('loginPhoneHint') : t('loginEmailHint')}
            </p>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Password</label>
            <div style={s.passwordWrap}>
              <input
                style={{ ...s.input, paddingRight: '74px' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
              />
              <button type="button" style={s.passwordToggle} onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? t('hide') : t('show')}
              </button>
            </div>
          </div>

          {error && (
            <div style={s.errorBox}>
              <span>{error}</span>
            </div>
          )}

          <button style={{ ...s.loginBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleLogin}
            disabled={loading}>
            {loading ? t('signingIn') : t('signIn')}
          </button>

          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <button style={{ background: 'transparent', border: 'none', color: '#c9a84c', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }} onClick={() => setShowSignup(true)}>{t('newClientRegister')}</button>
          </div>
          <div style={s.demoBox}>
            <p style={s.demoTitle}>Security Notice:</p>
            <p style={{ color: '#8896a8', fontSize: '11px', margin: 0 }}>
              Demo shortcuts are disabled in hardened mode. Use authorized credentials only.
            </p>
          </div>

          <div style={s.cardFooter}>
            <p style={s.footerText}>Secured - Wallet-Only Policy - GST Compliant</p>
            <p style={s.footerSub}>+91-9766926636 - machineos@developmentexpress.in</p>
          </div>
        </div>

        <p style={s.bottomText}>2026 Development Express - All Rights Reserved - GSTIN: 27ABCDE1234F1Z5</p>
      </div>

      {showSignup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #0f2040, #0a1628)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px' }}>
            {signupSuccess ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '48px', margin: '0 0 12px' }}>{String.fromCodePoint(0x2705)}</p>
                <h3 style={{ color: '#4CAF50', marginBottom: '8px' }}>{t('registrationSuccess')}</h3>
                <p style={{ color: '#8896a8', fontSize: '13px', marginBottom: '20px' }}>{t('registrationPending')}</p>
                <button style={{ background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', padding: '11px 28px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }} onClick={() => { setShowSignup(false); setSignupSuccess(false); setSignup(DEFAULT_SIGNUP); setSignupError(''); }}>{t('backToLogin')}</button>
              </div>
            ) : (
              <div>
                <h3 style={{ color: '#c9a84c', textAlign: 'center', margin: '0 0 20px' }}>{t('newClientRegistration')}</h3>
                <p style={s.signupIntro}>Form आता production-ready केला आहे: basic validation, clean field guidance, आणि admin approval flow.</p>
                {[
                  { key: 'name', label: 'Contact Name *', placeholder: 'Your name', type: 'text' },
                  { key: 'company', label: 'Company Name *', placeholder: 'Patil Builders Pvt. Ltd.', type: 'text' },
                  { key: 'email', label: 'Email *', placeholder: 'billing@company.com', type: 'email' },
                  { key: 'phone', label: 'Mobile Number *', placeholder: '9876543210', type: 'tel' },
                  { key: 'gstin', label: 'GSTIN (optional)', placeholder: '27AABCP1234A1Z5', type: 'text' },
                  { key: 'password', label: 'Password *', placeholder: 'Create password', type: 'password' },
                  { key: 'confirmPassword', label: 'Confirm Password *', placeholder: 'Re-enter password', type: 'password' },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#8896a8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>{field.label}</label>
                    {(field.key === 'password' || field.key === 'confirmPassword') ? (
                      <div style={s.passwordWrap}>
                        <input
                          type={field.key === 'password' ? (showSignupPassword ? 'text' : 'password') : (showSignupConfirmPassword ? 'text' : 'password')}
                          style={{ ...s.modalInput, paddingRight: '74px' }}
                          placeholder={field.placeholder}
                          value={signup[field.key]}
                          onChange={e => setSignup(prev => ({ ...prev, [field.key]: e.target.value }))}
                        />
                        <button
                          type="button"
                          style={s.passwordToggle}
                          onClick={() => field.key === 'password' ? setShowSignupPassword((prev) => !prev) : setShowSignupConfirmPassword((prev) => !prev)}
                        >
                          {(field.key === 'password' ? showSignupPassword : showSignupConfirmPassword) ? t('hide') : t('show')}
                        </button>
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        inputMode={field.key === 'phone' ? 'numeric' : undefined}
                        style={s.modalInput}
                        placeholder={field.placeholder}
                        value={signup[field.key]}
                        onChange={e => setSignup(prev => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    )}
                    {field.key === 'phone' && <p style={s.fieldHint}>हेच mobile number पुढे client login साठी वापरला जाईल.</p>}
                    {field.key === 'password' && <p style={s.fieldHint}>Minimum 8 characters ठेवा.</p>}
                  </div>
                ))}
                {signupError && <p style={{ color: '#e94560', fontSize: '12px', marginBottom: '10px' }}>{signupError}</p>}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#8896a8', borderRadius: '8px', cursor: 'pointer' }} onClick={() => { setShowSignup(false); setSignupError(''); setSignup(DEFAULT_SIGNUP); }}>{t('cancelAction')}</button>
                  <button style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', color: '#0a1628', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', opacity: signupLoading ? 0.7 : 1 }} onClick={handleSignup} disabled={signupLoading}>{signupLoading ? t('registering') : t('registerAction')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
  modalInput: { width: '100%', padding: '10px 12px', background: 'rgba(5,13,26,0.8)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', outline: 'none' },
  helperText: { color: '#8896a8', fontSize: '11px', margin: '6px 0 0' },
  fieldHint: { color: '#8896a8', fontSize: '11px', margin: '6px 0 0' },
  signupIntro: { color: '#8896a8', fontSize: '12px', textAlign: 'center', margin: '0 0 16px' },
  passwordWrap: { position: 'relative' },
  passwordToggle: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#c9a84c', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
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



