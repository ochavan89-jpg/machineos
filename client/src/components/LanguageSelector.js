import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSelector = ({ compact = false }) => {
  const { lang, setLang, LANGUAGES } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang);

  return (
    <div style={{ position: 'relative', zIndex: 1000 }}>
      <button
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)',
          borderRadius: '10px', padding: compact ? '6px 12px' : '8px 16px',
          color: '#c9a84c', cursor: 'pointer', fontSize: compact ? '11px' : '13px',
          fontWeight: '600', transition: 'all 0.2s',
        }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontSize: '16px' }}>🌐</span>
        <span>{current?.native}</span>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0,
          background: 'linear-gradient(180deg, #0f2040, #0a1628)',
          border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px',
          padding: '8px', width: '300px', maxHeight: '400px', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}>
          <p style={{ color: 'rgba(201,168,76,0.6)', fontSize: '10px', letterSpacing: '1px', margin: '4px 8px 8px', textAlign: 'center' }}>
            🇮🇳 SELECT YOUR LANGUAGE / भाषा चुनें
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                style={{
                  padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                  border: lang === l.code ? '1px solid #c9a84c' : '1px solid transparent',
                  background: lang === l.code ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
                onClick={() => { setLang(l.code); setOpen(false); }}
              >
                <p style={{ color: lang === l.code ? '#c9a84c' : '#e8e0d0', fontWeight: '700', fontSize: '13px', margin: '0 0 2px' }}>
                  {l.native}
                </p>
                <p style={{ color: '#8896a8', fontSize: '9px', margin: '0 0 1px' }}>{l.state}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;