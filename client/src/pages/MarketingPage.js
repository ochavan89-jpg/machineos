import React from 'react';
import { Link } from 'react-router-dom';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';

const WHATSAPP = 'https://wa.me/919766926636';

const MarketingPage = () => {
  const { t } = useLanguage();

  return (
    <div style={s.page}>
      <div style={s.bgGrid} />
      <div style={s.bgGlow1} />
      <div style={s.bgGlow2} />

      <nav style={s.nav}>
        <div style={s.navBrand}>
          <div style={s.logoCircle}>
            <span style={s.logoText}>DE</span>
          </div>
          <div>
            <div style={s.navName}>DEVELOPMENT EXPRESS</div>
            <div style={s.navSub}>{t('tagline')}</div>
          </div>
        </div>
        <div style={s.navLinks}>
          <a href="#services" style={s.navLink}>{t('marketingNavServices')}</a>
          <a href="#technology" style={s.navLink}>{t('marketingNavTech')}</a>
          <a href="#contact" style={s.navLink}>{t('marketingNavContact')}</a>
          <LanguageSelector compact />
          <Link to="/login" style={s.navCta}>{t('marketingNavLogin')}</Link>
        </div>
      </nav>

      <main style={s.main}>
        <section style={s.hero}>
          <div style={s.badge}>
            <span style={s.badgeDot} />
            {t('marketingBadge')}
          </div>
          <h1 style={s.h1}>{t('marketingHeadline')}</h1>
          <p style={s.lead}>{t('marketingLead')}</p>
          <div style={s.heroBtns}>
            <Link to="/login" style={s.btnPrimary}>{t('marketingCtaLogin')}</Link>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={s.btnSecondary}>
              {t('marketingCtaWhatsApp')}
            </a>
          </div>
          <div style={s.stats}>
            <div style={s.stat}>
              <div style={s.statNum}>15+</div>
              <div style={s.statLbl}>{t('marketingStatYears')}</div>
            </div>
            <div style={s.stat}>
              <div style={s.statNum}>5</div>
              <div style={s.statLbl}>{t('marketingStatFleet')}</div>
            </div>
            <div style={s.stat}>
              <div style={s.statNum}>100%</div>
              <div style={s.statLbl}>{t('marketingStatDigital')}</div>
            </div>
          </div>
        </section>

        <section id="services" style={s.section}>
          <h2 style={s.h2}>{t('marketingServicesTitle')}</h2>
          <div style={s.cards}>
            <div style={s.card}>
              <div style={s.cardIcon}>📍</div>
              <h3 style={s.cardTitle}>{t('marketingSvcTrack')}</h3>
              <p style={s.cardSub}>{t('marketingSvcTrackSub')}</p>
            </div>
            <div style={s.card}>
              <div style={s.cardIcon}>💳</div>
              <h3 style={s.cardTitle}>{t('marketingSvcPay')}</h3>
              <p style={s.cardSub}>{t('marketingSvcPaySub')}</p>
            </div>
            <div style={s.card}>
              <div style={s.cardIcon}>🏗️</div>
              <h3 style={s.cardTitle}>{t('marketingSvcOps')}</h3>
              <p style={s.cardSub}>{t('marketingSvcOpsSub')}</p>
            </div>
          </div>
        </section>

        <section id="technology" style={s.sectionMuted}>
          <h2 style={s.h2}>{t('marketingNavTech')}</h2>
          <p style={s.mutedLead}>{t('marketingTechLead')}</p>
          <Link to="/login" style={s.btnPrimaryInline}>{t('marketingCtaBook')}</Link>
        </section>

        <section id="contact" style={s.section}>
          <h2 style={s.h2}>{t('marketingNavContact')}</h2>
          <p style={s.contactLine}>
            <a href="mailto:machineos@developmentexpress.in" style={s.mail}>machineos@developmentexpress.in</a>
            {' · '}
            <a href="tel:+919766926636" style={s.mail}>+91 97669 26636</a>
          </p>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={s.btnSecondary}>
            {t('marketingCtaWhatsApp')}
          </a>
        </section>
      </main>

      <footer style={s.footer}>
        <p style={s.footerText}>{t('marketingFooterRights')}</p>
      </footer>
    </div>
  );
};

const s = {
  page: {
    minHeight: '100vh',
    background: '#050d1a',
    fontFamily: 'Arial, sans-serif',
    color: '#e8e0d0',
    position: 'relative',
    overflowX: 'hidden',
  },
  bgGrid: {
    position: 'fixed',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)',
    backgroundSize: '50px 50px',
    pointerEvents: 'none',
  },
  bgGlow1: {
    position: 'fixed',
    top: '-15%',
    right: '-10%',
    width: '560px',
    height: '560px',
    background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgGlow2: {
    position: 'fixed',
    bottom: '-20%',
    left: '-10%',
    width: '480px',
    height: '480px',
    background: 'radial-gradient(circle, rgba(10,22,40,0.95) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '16px 24px',
    background: 'rgba(5,13,26,0.92)',
    borderBottom: '1px solid rgba(201,168,76,0.15)',
    backdropFilter: 'blur(12px)',
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoCircle: {
    width: '44px',
    height: '44px',
    background: 'linear-gradient(135deg, #a07830, #e2c97e)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 24px rgba(201,168,76,0.35)',
  },
  logoText: { color: '#0a1628', fontWeight: '900', fontSize: '14px' },
  navName: { color: '#c9a84c', fontWeight: '800', fontSize: '12px', letterSpacing: '2px' },
  navSub: { color: 'rgba(201,168,76,0.55)', fontSize: '9px', letterSpacing: '1px', marginTop: '2px' },
  navLinks: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  navLink: { color: '#8896a8', textDecoration: 'none', fontSize: '12px', fontWeight: '600' },
  navCta: {
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #a07830, #e2c97e)',
    color: '#0a1628',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '800',
    textDecoration: 'none',
    letterSpacing: '0.5px',
  },
  main: { position: 'relative', zIndex: 1, maxWidth: '960px', margin: '0 auto', padding: '32px 24px 48px' },
  hero: { textAlign: 'center', paddingBottom: '48px' },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#8896a8',
    fontSize: '11px',
    letterSpacing: '1px',
    marginBottom: '20px',
  },
  badgeDot: { width: '8px', height: '8px', background: '#4CAF50', borderRadius: '50%' },
  h1: {
    color: '#f5efe0',
    fontSize: 'clamp(26px, 5vw, 40px)',
    fontWeight: '800',
    lineHeight: 1.15,
    margin: '0 0 16px',
  },
  lead: {
    color: '#8896a8',
    fontSize: 'clamp(14px, 2.5vw, 17px)',
    lineHeight: 1.6,
    maxWidth: '640px',
    margin: '0 auto 28px',
  },
  heroBtns: { display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '40px' },
  btnPrimary: {
    padding: '14px 26px',
    background: 'linear-gradient(135deg, #a07830 0%, #e2c97e 50%, #a07830 100%)',
    color: '#0a1628',
    borderRadius: '12px',
    fontWeight: '800',
    textDecoration: 'none',
    fontSize: '14px',
    boxShadow: '0 8px 28px rgba(201,168,76,0.28)',
  },
  btnPrimaryInline: {
    display: 'inline-block',
    marginTop: '12px',
    padding: '12px 22px',
    background: 'linear-gradient(135deg, #a07830, #e2c97e)',
    color: '#0a1628',
    borderRadius: '10px',
    fontWeight: '800',
    textDecoration: 'none',
    fontSize: '13px',
  },
  btnSecondary: {
    padding: '14px 22px',
    border: '1px solid rgba(201,168,76,0.35)',
    color: '#c9a84c',
    borderRadius: '12px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '700',
    background: 'rgba(0,0,0,0.25)',
  },
  stats: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
    justifyContent: 'center',
    borderTop: '1px solid rgba(201,168,76,0.12)',
    paddingTop: '32px',
  },
  stat: { textAlign: 'center', minWidth: '100px' },
  statNum: { color: '#c9a84c', fontSize: '28px', fontWeight: '800' },
  statLbl: { color: '#8896a8', fontSize: '10px', letterSpacing: '1px', marginTop: '6px' },
  section: { padding: '40px 0', borderTop: '1px solid rgba(201,168,76,0.08)' },
  sectionMuted: {
    padding: '40px 0',
    borderTop: '1px solid rgba(201,168,76,0.08)',
    textAlign: 'center',
    background: 'rgba(201,168,76,0.04)',
    borderRadius: '16px',
    paddingLeft: '24px',
    paddingRight: '24px',
    margin: '16px 0',
  },
  h2: { color: '#c9a84c', fontSize: '22px', margin: '0 0 20px', textAlign: 'center' },
  mutedLead: { color: '#8896a8', fontSize: '14px', lineHeight: 1.65, maxWidth: '560px', margin: '0 auto' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' },
  card: {
    background: 'linear-gradient(145deg, #0f2040, #0a1628)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '16px',
    padding: '22px',
  },
  cardIcon: { fontSize: '28px', marginBottom: '10px' },
  cardTitle: { color: '#f5efe0', fontSize: '16px', margin: '0 0 8px' },
  cardSub: { color: '#8896a8', fontSize: '13px', lineHeight: 1.5, margin: 0 },
  contactLine: { textAlign: 'center', marginBottom: '20px', color: '#8896a8', fontSize: '14px' },
  mail: { color: '#c9a84c', textDecoration: 'none' },
  footer: { textAlign: 'center', padding: '24px', borderTop: '1px solid rgba(201,168,76,0.1)' },
  footerText: { color: 'rgba(201,168,76,0.35)', fontSize: '11px', margin: 0 },
};

export default MarketingPage;
