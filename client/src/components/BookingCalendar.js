import React, { useState, useEffect } from 'react';

const BOOKED_DATES = ['2026-05-03', '2026-05-04', '2026-05-05', '2026-05-12', '2026-05-13', '2026-05-20'];

const BookingCalendar = ({ onRangeSelect, bookingType, quantity }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(true);
  }, [viewMonth]);

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => new Date(y, m, 1).getDay();

  const toKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const isBooked = (key) => BOOKED_DATES.includes(key);
  const isPast = (y, m, d) => new Date(y, m, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const isInRange = (key) => {
    if (!startDate) return false;
    const end = endDate || hoverDate;
    if (!end) return false;
    const s = new Date(startDate), e = new Date(end), k = new Date(key);
    return k >= Math.min(s, e) && k <= Math.max(s, e);
  };

  const handleDayClick = (key) => {
    if (isBooked(key) || isPast(...key.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v)))) return;
    if (!startDate || (startDate && endDate)) {
      setStartDate(key);
      setEndDate(null);
    } else {
      if (key < startDate) { setStartDate(key); setEndDate(null); return; }
      setEndDate(key);
      onRangeSelect && onRangeSelect(startDate, key);
    }
  };

  const prevMonth = () => {
    setAnimated(false);
    setTimeout(() => {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
      else setViewMonth(m => m - 1);
    }, 50);
  };

  const nextMonth = () => {
    setAnimated(false);
    setTimeout(() => {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
      else setViewMonth(m => m + 1);
    }, 50);
  };

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const getNights = () => {
    if (!startDate || !endDate) return 0;
    return Math.round((new Date(endDate) - new Date(startDate)) / 86400000);
  };

  const nights = getNights();

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerGlow} />
        <div style={styles.headerInner}>
          <div>
            <p style={styles.headerLabel}>AVAILABILITY CALENDAR</p>
            <h3 style={styles.headerTitle}>{monthName}</h3>
          </div>
          <div style={styles.navBtns}>
            <button style={styles.navBtn} onClick={prevMonth}>&#8592;</button>
            <button style={styles.navBtn} onClick={nextMonth}>&#8594;</button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {[
          { color: '#c9a84c', label: 'Selected' },
          { color: 'rgba(201,168,76,0.15)', label: 'Range' },
          { color: '#e94560', label: 'Booked' },
          { color: 'rgba(255,255,255,0.05)', label: 'Available' },
        ].map((l, i) => (
          <div key={i} style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: l.color, border: l.color === 'rgba(255,255,255,0.05)' ? '1px solid rgba(255,255,255,0.12)' : 'none' }} />
            <span style={styles.legendText}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Day Headers */}
      <div style={styles.dayHeaders}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={styles.dayHeader}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ ...styles.grid, opacity: animated ? 1 : 0, transition: 'opacity 0.2s' }}>
        {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
        {Array(days).fill(null).map((_, i) => {
          const d = i + 1;
          const key = toKey(viewYear, viewMonth, d);
          const booked = isBooked(key);
          const past = isPast(viewYear, viewMonth, d);
          const isStart = key === startDate;
          const isEnd = key === endDate;
          const inRange = isInRange(key);
          const isToday = key === toKey(today.getFullYear(), today.getMonth(), today.getDate());
          const disabled = booked || past;

          return (
            <div
              key={key}
              style={{
                ...styles.day,
                ...(disabled ? styles.dayDisabled : styles.dayAvail),
                ...(isStart || isEnd ? styles.daySelected : {}),
                ...(inRange && !isStart && !isEnd ? styles.dayRange : {}),
                ...(isToday && !isStart && !isEnd ? styles.dayToday : {}),
                ...(booked ? styles.dayBooked : {}),
              }}
              onClick={() => handleDayClick(key)}
              onMouseEnter={() => !endDate && startDate && setHoverDate(key)}
              onMouseLeave={() => setHoverDate(null)}
            >
              <span style={{
                ...styles.dayNum,
                color: isStart || isEnd ? '#0a1628' : booked ? '#e94560' : past ? 'rgba(255,255,255,0.2)' : '#e8e0d0',
                fontWeight: isStart || isEnd || isToday ? '800' : '400',
              }}>{d}</span>
              {booked && <span style={styles.bookedDot} />}
              {isStart && <span style={styles.badge}>S</span>}
              {isEnd && <span style={styles.badge}>E</span>}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        {startDate && endDate ? (
          <div style={styles.summaryActive}>
            <div style={styles.summaryGlow} />
            <div style={styles.summaryRow}>
              <div style={styles.summaryItem}>
                <p style={styles.summaryLabel}>CHECK-IN</p>
                <p style={styles.summaryVal}>{new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
              </div>
              <div style={styles.summaryArrow}>
                <div style={styles.summaryLine} />
                <span style={styles.summaryNights}>{nights}d</span>
                <div style={styles.summaryLine} />
              </div>
              <div style={styles.summaryItem}>
                <p style={styles.summaryLabel}>CHECK-OUT</p>
                <p style={styles.summaryVal}>{new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
              </div>
            </div>
          </div>
        ) : startDate ? (
          <div style={styles.summaryPending}>
            <span style={styles.pulseIcon}>&#128197;</span>
            <p style={styles.summaryHint}>Now select your <strong style={{ color: '#c9a84c' }}>end date</strong></p>
          </div>
        ) : (
          <div style={styles.summaryEmpty}>
            <span style={{ fontSize: '20px' }}>&#128197;</span>
            <p style={styles.summaryHint}>Select <strong style={{ color: '#c9a84c' }}>start date</strong> to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    background: 'linear-gradient(145deg, #0d1f3c, #080f1e)',
    border: '1px solid rgba(201,168,76,0.25)',
    borderRadius: '16px',
    overflow: 'hidden',
    marginBottom: '15px',
  },
  header: {
    position: 'relative',
    padding: '16px 18px 12px',
    borderBottom: '1px solid rgba(201,168,76,0.1)',
  },
  headerGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
    background: 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, transparent 100%)',
    pointerEvents: 'none',
  },
  headerInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
  headerLabel: { color: 'rgba(201,168,76,0.5)', fontSize: '9px', letterSpacing: '2px', margin: '0 0 2px' },
  headerTitle: { color: '#c9a84c', fontSize: '15px', fontWeight: '700', margin: 0, letterSpacing: '0.5px' },
  navBtns: { display: 'flex', gap: '6px' },
  navBtn: {
    width: '30px', height: '30px', background: 'rgba(201,168,76,0.1)',
    border: '1px solid rgba(201,168,76,0.25)', borderRadius: '8px',
    color: '#c9a84c', cursor: 'pointer', fontSize: '14px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  legend: { display: 'flex', gap: '14px', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '5px' },
  legendDot: { width: '10px', height: '10px', borderRadius: '3px' },
  legendText: { color: '#556070', fontSize: '9px', letterSpacing: '0.5px' },
  dayHeaders: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 12px 4px' },
  dayHeader: { textAlign: 'center', color: 'rgba(201,168,76,0.4)', fontSize: '10px', letterSpacing: '1px', fontWeight: '600', padding: '4px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', padding: '4px 12px 12px' },
  day: {
    position: 'relative', aspectRatio: '1', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.15s', flexDirection: 'column', gap: '1px',
  },
  dayAvail: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' },
  dayDisabled: { cursor: 'not-allowed', background: 'transparent', border: '1px solid transparent' },
  daySelected: {
    background: 'linear-gradient(135deg, #c9a84c, #e2c97e)',
    border: '1px solid #c9a84c',
    boxShadow: '0 0 12px rgba(201,168,76,0.4)',
    transform: 'scale(1.05)',
  },
  dayRange: { background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)' },
  dayToday: { border: '1px solid rgba(201,168,76,0.5)', background: 'rgba(201,168,76,0.06)' },
  dayBooked: { background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.2)' },
  dayNum: { fontSize: '12px', lineHeight: 1 },
  bookedDot: { width: '4px', height: '4px', borderRadius: '50%', background: '#e94560' },
  badge: {
    position: 'absolute', top: '2px', right: '3px',
    fontSize: '7px', color: '#0a1628', fontWeight: '900', letterSpacing: '0.5px',
  },
  summary: { borderTop: '1px solid rgba(201,168,76,0.1)', padding: '14px 18px' },
  summaryActive: { position: 'relative', background: 'rgba(201,168,76,0.06)', borderRadius: '10px', padding: '12px 16px', border: '1px solid rgba(201,168,76,0.2)' },
  summaryGlow: { position: 'absolute', inset: 0, borderRadius: '10px', background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.04) 0%, transparent 70%)', pointerEvents: 'none' },
  summaryRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  summaryItem: { textAlign: 'center' },
  summaryLabel: { color: 'rgba(201,168,76,0.5)', fontSize: '9px', letterSpacing: '1.5px', margin: '0 0 4px' },
  summaryVal: { color: '#c9a84c', fontSize: '16px', fontWeight: '800', margin: 0 },
  summaryArrow: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' },
  summaryLine: { flex: 1, height: '1px', background: 'rgba(201,168,76,0.3)' },
  summaryNights: { color: '#c9a84c', fontSize: '11px', fontWeight: '700', background: 'rgba(201,168,76,0.1)', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.2)' },
  summaryPending: { display: 'flex', alignItems: 'center', gap: '10px' },
  summaryEmpty: { display: 'flex', alignItems: 'center', gap: '10px' },
  summaryHint: { color: '#556070', fontSize: '12px', margin: 0 },
  pulseIcon: { fontSize: '20px', animation: 'pulse 1.5s infinite' },
};

export default BookingCalendar;
