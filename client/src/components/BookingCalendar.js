import React, { useState } from 'react';
const BOOKED=['2026-05-03','2026-05-04','2026-05-05','2026-05-12','2026-05-13'];
const toKey=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const DAYS=['S','M','T','W','T','F','S'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];

function SingleCal({year,month,onPrev,onNext,startDate,endDate,hover,onDay,onHover,onLeave,label}){
  const today=new Date();
  const todayKey=toKey(today.getFullYear(),today.getMonth(),today.getDate());
  const total=new Date(year,month+1,0).getDate();
  const first=new Date(year,month,1).getDay();
  const isBooked=k=>BOOKED.includes(k);
  const isPast=k=>k<todayKey;
  const isRange=k=>{
    if(!startDate)return false;
    const end=endDate||hover;
    if(!end)return false;
    return k>Math.min(startDate,end)&&k<Math.max(startDate,end);
  };
  return(
    <div style={{flex:1,background:'#0a1628',border:'1px solid rgba(201,168,76,0.2)',borderRadius:'12px',overflow:'hidden',minWidth:0}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid rgba(201,168,76,0.1)',background:'rgba(201,168,76,0.04)'}}>
        <button onClick={onPrev} style={{width:'24px',height:'24px',background:'transparent',border:'1px solid rgba(201,168,76,0.2)',borderRadius:'6px',color:'#c9a84c',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center'}}>&#8249;</button>
        <div style={{textAlign:'center'}}>
        <button onClick={onNext} style={{width:'24px',height:'24px',background:'transparent',border:'1px solid rgba(201,168,76,0.2)',borderRadius:'6px',color:'#c9a84c',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center'}}>&#8250;</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',padding:'8px 8px 2px'}}>
        {DAYS.map((d,i)=><div key={i} style={{textAlign:'center',color:'rgba(201,168,76,0.3)',fontSize:'9px',fontWeight:'700',padding:'2px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',padding:'2px 8px 10px'}}>
        {Array(first).fill(null).map((_,i)=><div key={'e'+i}/>)}
        {Array(total).fill(null).map((_,i)=>{
          const d=i+1,k=toKey(year,month,d);
          const booked=isBooked(k),past=isPast(k);
          const sel=k===startDate||k===endDate;
          const inR=isRange(k);
          const isT=k===todayKey;
          const dis=booked||past;
          return(
            <div key={k} onClick={()=>!dis&&onDay(k)} onMouseEnter={()=>!dis&&onHover(k)} onMouseLeave={onLeave}
              style={{aspectRatio:'1',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',cursor:dis?'not-allowed':'pointer',transition:'all 0.1s',fontSize:'10px',fontWeight:sel?'800':isT?'700':'400',
                background:sel?'linear-gradient(135deg,#b8883c,#e2c97e)':inR?'rgba(201,168,76,0.1)':booked?'rgba(233,69,96,0.08)':'transparent',
                border:sel?'none':inR?'1px solid rgba(201,168,76,0.12)':booked?'1px solid rgba(233,69,96,0.15)':isT?'1px solid rgba(201,168,76,0.35)':'1px solid transparent',
                color:sel?'#0a1628':booked?'rgba(233,69,96,0.6)':past?'rgba(255,255,255,0.12)':inR?'#c9a84c':isT?'#c9a84c':'rgba(255,255,255,0.55)',
                boxShadow:sel?'0 2px 8px rgba(201,168,76,0.35)':'none',transform:sel?'scale(1.06)':'scale(1)',
              }}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BookingCalendar({onRangeSelect}){
  const today=new Date();
  const nm=(y,m)=>m===11?[y+1,0]:[y,m+1];
  const pm=(y,m)=>m===0?[y-1,11]:[y,m-1];
  const [[sY,sM],setS]=useState([today.getFullYear(),today.getMonth()]);
  const [[eY,eM],setE]=useState(()=>{const[y,m]=nm(today.getFullYear(),today.getMonth());return[y,m];});
  const [start,setStart]=useState(null);
  const [end,setEnd]=useState(null);
  const [hover,setHover]=useState(null);

  const click=k=>{
    if(!start||(start&&end)){setStart(k);setEnd(null);}
    else{
      if(k<=start){setStart(k);setEnd(null);return;}
      setEnd(k);onRangeSelect&&onRangeSelect(start,k);
    }
  };
  const nights=start&&end?Math.round((new Date(end)-new Date(start))/86400000):0;

  const fmt=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';

  return(
    <div style={{marginBottom:'14px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
        <span style={{color:'#8896a8',fontSize:'11px',fontWeight:'600',letterSpacing:'0.3px'}}>Select Dates</span>
        <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
          {nights>0&&<span style={{background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.2)',color:'#c9a84c',fontSize:'10px',padding:'2px 10px',borderRadius:'20px',fontWeight:'700'}}>{nights} day{nights>1?'s':''}</span>}
          {(start||end)&&<button onClick={()=>{setStart(null);setEnd(null);}} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',fontSize:'11px',padding:'2px 6px'}}>reset</button>}
        </div>
      </div>

      <div style={{display:'flex',gap:'8px'}}>
        <SingleCal year={sY} month={sM} label="CHECK-IN"
          onPrev={()=>setS(([y,m])=>{const[ny,nm2]=pm(y,m);return[ny,nm2];})}
          onNext={()=>setS(([y,m])=>{const[ny,nm2]=nm(y,m);return[ny,nm2];})}
          startDate={start} endDate={end} hover={hover} onDay={click} onHover={setHover} onLeave={()=>setHover(null)}/>
        <SingleCal year={eY} month={eM} label="CHECK-OUT"
          onPrev={()=>setE(([y,m])=>{const[ny,nm2]=pm(y,m);return[ny,nm2];})}
          onNext={()=>setE(([y,m])=>{const[ny,nm2]=nm(y,m);return[ny,nm2];})}
          startDate={start} endDate={end} hover={hover} onDay={click} onHover={setHover} onLeave={()=>setHover(null)}/>
      </div>

      <div style={{marginTop:'8px',display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:'8px',background:'rgba(201,168,76,0.04)',border:'1px solid rgba(201,168,76,0.12)',borderRadius:'10px',padding:'10px 14px'}}>
        <div>
          <p style={{color:'rgba(201,168,76,0.45)',fontSize:'8px',letterSpacing:'1.5px',margin:'0 0 3px',fontWeight:'700'}}>CHECK-IN</p>
          <p style={{color:start?'#c9a84c':'rgba(255,255,255,0.25)',fontSize:'12px',fontWeight:start?'700':'400',margin:0}}>{fmt(start)}</p>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{width:'28px',height:'1px',background:'rgba(201,168,76,0.2)',margin:'0 auto 4px'}}/>
          <span style={{color:nights>0?'#c9a84c':'rgba(255,255,255,0.2)',fontSize:'9px',fontWeight:'700'}}>{nights>0?`${nights}d`:'→'}</span>
          <div style={{width:'28px',height:'1px',background:'rgba(201,168,76,0.2)',margin:'4px auto 0'}}/>
        </div>
        <div style={{textAlign:'right'}}>
          <p style={{color:'rgba(201,168,76,0.45)',fontSize:'8px',letterSpacing:'1.5px',margin:'0 0 3px',fontWeight:'700'}}>CHECK-OUT</p>
          <p style={{color:end?'#c9a84c':'rgba(255,255,255,0.25)',fontSize:'12px',fontWeight:end?'700':'400',margin:0}}>{fmt(end)}</p>
        </div>
      </div>

      <div style={{display:'flex',gap:'12px',marginTop:'6px',justifyContent:'center',alignItems:'center'}}>
        {[['linear-gradient(135deg,#b8883c,#e2c97e)','Selected'],['rgba(201,168,76,0.1)','Range'],['rgba(233,69,96,0.08)','Booked']].map(([bg,l],i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'4px'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'3px',background:bg,border:i===1?'1px solid rgba(201,168,76,0.12)':i===2?'1px solid rgba(233,69,96,0.15)':'none'}}/>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:'9px'}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
