import React, { useState } from 'react';

const MobileNav = ({ navItems, activeTab, setActiveTab, topContent, bottomContent, title, subtitle }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* ═══ MOBILE TOPBAR ═══ */}
      <div style={ms.topbar}>
        <div style={ms.topbarLeft}>
          <div style={ms.logoCircle}>DE</div>
          <div>
            <p style={ms.topTitle}>{title || 'Development Express'}</p>
            <p style={ms.topSub}>{subtitle || 'Portal'}</p>
          </div>
        </div>
        <button style={ms.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* ═══ SLIDE-IN DRAWER ═══ */}
      {menuOpen && (
        <div style={ms.overlay} onClick={() => setMenuOpen(false)}>
          <div style={ms.drawer} onClick={e => e.stopPropagation()}>
            {/* Drawer Header */}
            <div style={ms.drawerHeader}>
              <div style={ms.logoCircleLg}>DE</div>
              <div>
                <p style={ms.drawerTitle}>Development Express</p>
                <p style={ms.drawerSub}>{subtitle || 'Portal'}</p>
              </div>
              <button style={ms.closeBtn} onClick={() => setMenuOpen(false)}>✕</button>
            </div>

            {/* Top Content (Profile etc.) */}
            {topContent && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
                {topContent}
              </div>
            )}

            <div style={{ height: '1px', background: 'rgba(201,168,76,0.15)', margin: '8px 0' }} />

            {/* Nav Items */}
            <div style={{ padding: '8px' }}>
              {(navItems || []).map(item => (
                <button key={item.id}
                  style={activeTab === item.id ? ms.navActive : ms.nav}
                  onClick={() => { setActiveTab(item.id); setMenuOpen(false); }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && <span style={ms.badge}>{item.badge}</span>}
                </button>
              ))}
            </div>

            {/* Bottom Content (Wallet, Logout etc.) */}
            {bottomContent && (
              <div style={{ padding: '12px 16px', marginTop: 'auto', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
                {bottomContent}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ BOTTOM NAV BAR (Quick Access) ═══ */}
      <div style={ms.bottomBar}>
        {(navItems || []).slice(0, 5).map(item => (
          <button key={item.id}
            style={{ ...ms.bottomItem, color: activeTab === item.id ? '#c9a84c' : '#8896a8' }}
            onClick={() => setActiveTab(item.id)}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '9px', marginTop: '2px' }}>{item.label.slice(0, 8)}</span>
          </button>
        ))}
      </div>
    </>
  );
};

const ms = {
  topbar: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(135deg, #0f2040, #0a1628)', borderBottom: '1px solid rgba(201,168,76,0.3)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '56px', boxSizing: 'border-box' },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoCircle: { width: '32px', height: '32px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0a1628', fontSize: '11px', flexShrink: 0 },
  topTitle: { color: '#c9a84c', fontWeight: '700', fontSize: '12px', margin: 0 },
  topSub: { color: '#8896a8', fontSize: '9px', margin: 0 },
  hamburger: { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', borderRadius: '8px', padding: '6px 12px', fontSize: '18px', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex' },
  drawer: { width: '280px', background: 'linear-gradient(180deg, #0f2040, #0a1628)', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '4px 0 20px rgba(0,0,0,0.5)' },
  drawerHeader: { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderBottom: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.05)' },
  logoCircleLg: { width: '40px', height: '40px', background: 'linear-gradient(135deg, #a07830, #e2c97e)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0a1628', fontSize: '14px', flexShrink: 0 },
  drawerTitle: { color: '#c9a84c', fontWeight: '700', fontSize: '13px', margin: 0 },
  drawerSub: { color: '#8896a8', fontSize: '10px', margin: 0 },
  closeBtn: { marginLeft: 'auto', background: 'transparent', border: 'none', color: '#8896a8', fontSize: '18px', cursor: 'pointer', padding: '4px' },
  nav: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#8896a8', cursor: 'pointer', fontSize: '14px', width: '100%', textAlign: 'left', marginBottom: '2px' },
  navActive: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.1)', color: '#c9a84c', cursor: 'pointer', fontSize: '14px', width: '100%', textAlign: 'left', fontWeight: '700', marginBottom: '2px' },
  badge: { marginLeft: 'auto', background: '#e94560', color: '#fff', fontSize: '10px', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' },
  bottomBar: { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(135deg, #0f2040, #0a1628)', borderTop: '1px solid rgba(201,168,76,0.3)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 0', height: '58px' },
  bottomItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', minWidth: '50px' },
};

export default MobileNav;