// import { requestNotificationPermission } from '../firebase';
import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';
import adminRoleImage360 from '../assets/roles/admin-card-360.jpg';
import adminRoleImage720 from '../assets/roles/admin-card-720.jpg';
import clientRoleImage360 from '../assets/roles/client-card-360.jpg';
import clientRoleImage720 from '../assets/roles/client-card-720.jpg';
import ownerRoleImage360 from '../assets/roles/owner-card-360.jpg';
import ownerRoleImage720 from '../assets/roles/owner-card-720.jpg';
import operatorRoleImage360 from '../assets/roles/operator-card-360.jpg';
import operatorRoleImage720 from '../assets/roles/operator-card-720.jpg';

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
  const [hoveredRole, setHoveredRole] = useState(null);
  const [roleTilt, setRoleTilt] = useState({});
  const [roleLight, setRoleLight] = useState({});
  const moveRafRef = useRef(null);
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
    {
      id: 'admin',
      label: 'Admin',
      sub: 'Construction Development',
      image: {
        src: adminRoleImage360,
        srcSet: `${adminRoleImage360} 360w, ${adminRoleImage720} 720w`,
      },
      fallback: 'A',
    },
    {
      id: 'client',
      label: 'Client',
      sub: 'Project Stakeholder',
      image: {
        src: clientRoleImage360,
        srcSet: `${clientRoleImage360} 360w, ${clientRoleImage720} 720w`,
      },
      fallback: 'C',
    },
    {
      id: 'owner',
      label: 'Owner',
      sub: 'Machine Owner',
      image: {
        src: ownerRoleImage360,
        srcSet: `${ownerRoleImage360} 360w, ${ownerRoleImage720} 720w`,
      },
      fallback: 'O',
    },
    {
      id: 'operator',
      label: 'Operator',
      sub: 'Machine Operator',
      image: {
        src: operatorRoleImage360,
        srcSet: `${operatorRoleImage360} 360w, ${operatorRoleImage720} 720w`,
      },
      fallback: 'P',
    },
  ];

  const handleRoleMove = (id, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 8;
    const rotateX = (0.5 - y) * 8;
    const lightX = Math.max(0, Math.min(100, x * 100));
    const lightY = Math.max(0, Math.min(100, y * 100));
    if (moveRafRef.current) {
      cancelAnimationFrame(moveRafRef.current);
    }
    moveRafRef.current = requestAnimationFrame(() => {
      setRoleTilt(prev => ({ ...prev, [id]: { rotateX, rotateY } }));
      setRoleLight(prev => ({ ...prev, [id]: { lightX, lightY } }));
    });
  };

  const resetRoleTilt = (id) => {
    setRoleTilt(prev => ({ ...prev, [id]: { rotateX: 0, rotateY: 0 } }));
    setRoleLight(prev => ({ ...prev, [id]: { lightX: 50, lightY: 12 } }));
  };

  return (
    <div style={s.page}>
      <style>
        {`
          .premium-role-card {
            position: relative;
            overflow: hidden;
            transform-style: preserve-3d;
            will-change: transform, box-shadow;
            animation: role-float 6s ease-in-out infinite;
            border-radius: 18px;
          }
          .premium-role-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }
          @media (max-width: 1024px) {
            .premium-role-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          @media (max-width: 620px) {
            .premium-role-grid {
              grid-template-columns: minmax(0, 1fr);
            }
          }
          .premium-role-card::before {
            content: "";
            position: absolute;
            inset: -1px;
            border-radius: 18px;
            background: conic-gradient(from 160deg, rgba(201,168,76,0), rgba(201,168,76,0.45), rgba(84,117,178,0.4), rgba(201,168,76,0));
            opacity: 0;
            transition: opacity 0.35s ease;
            pointer-events: none;
            z-index: 0;
          }
          .premium-role-card:hover::before,
          .premium-role-card-active::before {
            opacity: 0.65;
          }
          .premium-role-card::after {
            content: "";
            position: absolute;
            inset: -10% -70%;
            background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%);
            transform: translateX(-120%) rotate(4deg);
            pointer-events: none;
          }
          .premium-role-card:hover::after {
            animation: sheen 1.2s ease;
          }
          .premium-role-card-active {
            animation: role-float 6s ease-in-out infinite, role-pulse 2.2s ease-in-out infinite;
          }
          .premium-role-card:focus-visible {
            outline: 2px solid rgba(242,215,139,0.75);
            outline-offset: 3px;
          }
          .role-avatar {
            animation: avatar-drift 5.5s ease-in-out infinite;
          }
          .role-title-wrap {
            position: relative;
            z-index: 2;
            padding: 13px 14px 14px;
            background: linear-gradient(180deg, rgba(3,8,18,0.12) 0%, rgba(3,8,18,0.84) 38%, rgba(2,6,14,0.96) 100%);
            border-top: 1px solid rgba(255,255,255,0.06);
            backdrop-filter: blur(8px);
          }
          .lux-input {
            transition: border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
          }
          .lux-input:focus {
            border-color: rgba(201,168,76,0.72) !important;
            background: rgba(6,14,27,0.95) !important;
            box-shadow: 0 0 0 2px rgba(201,168,76,0.16), 0 8px 24px rgba(0,0,0,0.35);
          }
          @keyframes role-float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
          @keyframes avatar-drift {
            0%, 100% { transform: translateY(0px) scale(1.0); }
            50% { transform: translateY(-3px) scale(1.02); }
          }
          @keyframes role-pulse {
            0%, 100% { box-shadow: 0 0 0 rgba(201,168,76,0.24), 0 16px 36px rgba(5,13,26,0.58), inset 0 1px 0 rgba(255,255,255,0.12); }
            50% { box-shadow: 0 0 34px rgba(201,168,76,0.40), 0 24px 42px rgba(5,13,26,0.7), inset 0 1px 0 rgba(255,255,255,0.22); }
          }
          @keyframes sheen {
            from { transform: translateX(-120%) rotate(4deg); }
            to { transform: translateX(120%) rotate(4deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .premium-role-card,
            .premium-role-card-active,
            .role-avatar {
              animation: none !important;
            }
          }
          @media (hover: none), (pointer: coarse) {
            .premium-role-card::after,
            .premium-role-card::before {
              display: none;
            }
          }
        `}
      </style>
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

          <p style={s.roleSectionLabel}>{t('selectRole')}</p>
          <div style={s.roleGrid} className="premium-role-grid">
            {ROLES.map(r => (
              <button key={r.id}
                type="button"
                className={`premium-role-card ${role === r.id ? 'premium-role-card-active' : ''}`}
                style={{
                  ...s.roleBtn,
                  ...(role === r.id ? s.roleBtnActive : {}),
                  transform: `perspective(700px) rotateX(${roleTilt[r.id]?.rotateX || 0}deg) rotateY(${roleTilt[r.id]?.rotateY || 0}deg) scale(${hoveredRole === r.id ? 1.03 : 1})`,
                  zIndex: hoveredRole === r.id || role === r.id ? 2 : 1,
                }}
                onMouseEnter={() => setHoveredRole(r.id)}
                onMouseLeave={() => { setHoveredRole(null); resetRoleTilt(r.id); }}
                onFocus={() => setHoveredRole(r.id)}
                onBlur={() => { setHoveredRole(null); resetRoleTilt(r.id); }}
                onMouseMove={(event) => handleRoleMove(r.id, event)}
                onClick={() => { setRole(r.id); setError(''); setIdentifier(''); }}>
                <div style={s.roleImageWrap}>
                  <img
                    src={r.image.src}
                    srcSet={r.image.srcSet}
                    sizes="(max-width: 620px) 92vw, (max-width: 1024px) 44vw, 23vw"
                    alt={r.label}
                    loading={role === r.id ? 'eager' : 'lazy'}
                    fetchPriority={role === r.id ? 'high' : 'auto'}
                    decoding={role === r.id ? 'sync' : 'async'}
                    width="360"
                    height="220"
                    style={s.roleImage}
                    className="role-avatar"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                      const fallback = event.currentTarget.nextSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <span style={s.roleImageShade}></span>
                  <span style={s.roleImageFallback}>{r.fallback}</span>
                  <span style={s.roleGlow}></span>
                  <span
                    style={{
                      ...s.roleReflection,
                      background: `radial-gradient(circle at ${roleLight[r.id]?.lightX ?? 50}% ${roleLight[r.id]?.lightY ?? 12}%, rgba(255,255,255,0.42), rgba(255,255,255,0.10) 28%, transparent 62%)`,
                    }}
                  ></span>
                </div>
                <div className="role-title-wrap">
                  <span style={{ ...s.roleLabel, color: role === r.id ? '#f0cd77' : '#f2f4f8' }}>{r.label}</span>
                  <span style={s.roleSub}>{r.sub}</span>
                </div>
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
              className="lux-input"
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
                className="lux-input"
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
  wrapper: { width: '100%', maxWidth: '1160px', position: 'relative', zIndex: 1 },
  logoSection: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', justifyContent: 'center' },
  logoCircle: { width: '56px', height: '56px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 30px rgba(201,168,76,0.4)' },
  logoText: { color: '#0a1628', fontWeight: '900', fontSize: '18px' },
  companyName: { color: '#c9a84c', fontSize: '18px', fontWeight: '900', margin: '0 0 3px', letterSpacing: '2px' },
  tagline: { color: 'rgba(201,168,76,0.6)', fontSize: '9px', margin: '0 0 2px', letterSpacing: '2px' },
  since: { color: '#8896a8', fontSize: '10px', margin: 0 },
  card: { background: 'radial-gradient(circle at 16% 4%, rgba(29,54,99,0.7) 0%, rgba(10,22,43,0.94) 36%, rgba(5,12,24,0.98) 100%)', border: '1px solid rgba(201,168,76,0.34)', borderRadius: '28px', padding: '32px 34px', boxShadow: '0 34px 110px rgba(0,0,0,0.68), 0 0 76px rgba(201,168,76,0.08), inset 0 1px 0 rgba(255,255,255,0.12)' },
  cardHeader: { textAlign: 'center', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(201,168,76,0.1)' },
  cardTitle: { color: '#c9a84c', fontSize: '20px', fontWeight: '700', margin: '0 0 6px' },
  cardSub: { color: '#8896a8', fontSize: '12px', margin: 0 },
  label: { color: '#9ba8bb', fontSize: '11px', marginBottom: '8px', letterSpacing: '1px', display: 'block' },
  roleSectionLabel: { color: '#d7bc73', fontSize: '12px', marginBottom: '12px', letterSpacing: '2.2px', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' },
  roleGrid: { marginBottom: '20px' },
  roleBtn: {
    background: 'linear-gradient(165deg, rgba(19,35,66,0.68) 0%, rgba(8,16,31,0.93) 100%)',
    border: '1px solid rgba(201,168,76,0.27)',
    borderRadius: '18px',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease, background 0.28s ease',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 16px 36px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.07)',
    isolation: 'isolate',
    minHeight: '262px',
  },
  roleBtnActive: {
    background: 'linear-gradient(165deg, rgba(36,59,102,0.82) 0%, rgba(10,19,36,0.95) 100%)',
    border: '1px solid rgba(201,168,76,0.75)',
    boxShadow: '0 0 30px rgba(201,168,76,0.34), 0 20px 40px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.17)',
  },
  roleImageWrap: { position: 'relative', width: '100%', height: '176px', margin: 0, borderRadius: '18px 18px 0 0', overflow: 'hidden', borderBottom: '1px solid rgba(201,168,76,0.22)', boxShadow: 'inset 0 -38px 80px rgba(2,6,14,0.52)', zIndex: 1 },
  roleImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'saturate(1.12) contrast(1.08) brightness(0.93)' },
  roleImageShade: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,6,14,0.02) 0%, rgba(3,8,18,0.22) 52%, rgba(3,8,18,0.75) 100%)', pointerEvents: 'none' },
  roleImageFallback: { position: 'absolute', inset: 0, display: 'none', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2d436e, #0a1628)', color: '#f2d78b', fontSize: '24px', fontWeight: '800' },
  roleGlow: { position: 'absolute', inset: '-16%', background: 'radial-gradient(circle at 50% 25%, rgba(201,168,76,0.24), rgba(12,24,45,0.12) 45%, transparent 72%)', pointerEvents: 'none' },
  roleReflection: { position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'background 0.12s linear' },
  roleLabel: { fontSize: '15px', fontWeight: '800', display: 'block', marginBottom: '5px', letterSpacing: '0.3px' },
  roleSub: { color: '#aebacf', fontSize: '11px', display: 'block', letterSpacing: '0.3px' },
  selectedBadge: { display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, rgba(15,30,58,0.62), rgba(7,16,30,0.88))', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '10px', padding: '10px 12px', marginBottom: '18px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' },
  selectedDot: { width: '6px', height: '6px', background: '#4CAF50', borderRadius: '50%', flexShrink: 0 },
  selectedText: { color: '#8896a8', fontSize: '12px' },
  fieldGroup: { marginBottom: '14px' },
  input: { width: '100%', padding: '12px 14px', background: 'linear-gradient(180deg, rgba(7,16,31,0.95), rgba(4,10,20,0.95))', border: '1px solid rgba(201,168,76,0.28)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', outline: 'none', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' },
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



