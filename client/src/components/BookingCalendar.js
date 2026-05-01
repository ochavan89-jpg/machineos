import React, { useState } from 'react';
const BOOKED=['2026-05-03','2026-05-04','2026-05-05','2026-05-12','2026-05-13'];
const toKey=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const DAYS=['Su','Mo','Tu','We','Th','Fr','Sa'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];

function SingleCal({year,month,onPrev,onNext,startDate,endDate,hover,onDay,onHover,onLeave}){
  const today=new Date();
  const todayKey=toKey(today.getFullYear(),today.getMonth(),today.getDate());
  const total=new Date(year,month+1,0).getDate();
  const first=new Date(year,month,1).getDay();
  const isBooked=k=>BOOKED.includes(k);
  const isPast=k=>k<todayKey;
  const isRange=k=>{if(!startDate)return false;const end=endDate||hover;if(!end)return false;return k>Math.min(startDate,end)&&k<Math.max(startDate,end);};
  return(
    <div style={{flex:1,background:'linear-gradient(145deg,#0d1f3c,#091528)',border:'1px solid rgba(201,168,76,0.3)',borderRadius:'16px',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.5)',minWidth:0}}>
      <div style={{background:'linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.05))',borderBottom:'1px solid rgba(201,168,76,0.2)',padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={onPrev} style={{width:'28px',height:'28px',background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.3)',borderRadius:'8px',color:'#c9a84c',cursor:'pointer',fontSize:'14px'}}>&#8249;</button>
        <div style={{textAlign:'center'}}>
          <p style={{color:'#c9a84c',fontWeight:'800',fontSize:'13px',margin:'0 0 1px'}}>{MONTHS[month]}</p>
          <p style={{color:'rgba(201,168,76,0.5)',fontSize:'10px',margin:0,letterSpacing:'2px'}}>{year}</p>
        </div>
        <button onClick={onNext} style={{width:'28px',height:'28px',background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.3)',borderRadius:'8px',color:'#c9a84c',cursor:'pointer',fontSize:'14px'}}>&#8250;</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',padding:'10px 8px 4px',gap:'2px'}}>
        {DAYS.map((d,i)=><div key={i} style={{textAlign:'center',color:i===0||i===6?'rgba(233,69,96,0.5)':'rgba(201,168,76,0.4)',fontSize:'9px',fontWeight:'700',padding:'3px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'3px',padding:'4px 8px 12px'}}>
        {Array(first).fill(null).map((_,i)=><div key={'e'+i}/>)}
        {Array(total).fill(null).map((_,i)=>{
          const d=i+1,k=toKey(year,month,d);
          const booked=isBooked(k),past=isPast(k);
          const sel=k===startDate||k===endDate;
          const inR=isRange(k);
          const isT=k===todayKey;
          const dis=booked||past;
          const isWknd=new Date(year,month,d).getDay()===0||new Date(year,month,d).getDay()===6;
          return(
            <div key={k} onClick={()=>!dis&&onDay(k)} onMouseEnter={()=>!dis&&onHover(k)} onMouseLeave={onLeave}
              style={{aspectRatio:'1',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',cursor:dis?'not-allowed':'pointer',fontSize:'11px',fontWeight:sel?'800':'500',transition:'all 0.15s ease',position:'relative',
                background:sel?'linear-gradient(135deg,#c9a84c,#e2c97e)':inR?'rgba(201,168,76,0.12)':booked?'rgba(233,69,96,0.06)':'transparent',
                border:sel?'1px solid rgba(201,168,76,0.8)':inR?'1px solid rgba(201,168,76,0.2)':booked?'1px solid rgba(233,69,96,0.2)':isT?'1px solid rgba(201,168,76,0.5)':'1px solid transparent',
                color:sel?'#0a1628':booked?'rgba(233,69,96,0.4)':past?'rgba(255,255,255,0.1)':inR?'#e2c97e':isT?'#c9a84c':isWknd?'rgba(255,120,120,0.7)':'rgba(255,255,255,0.7)',
                boxShadow:sel?'0 4px 15px rgba(201,168,76,0.4)':'none',
                transform:sel?'scale(1.1)':'scale(1)',
              }}>
              {isT&&!sel&&<div style={{position:'absolute',bottom:'2px',left:'50%',transform:'translateX(-50%)',width:'3px',height:'3px',borderRadius:'50%',background:'#c9a84c'}}/>}
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
    else{if(k<=start){setStart(k);setEnd(null);return;}setEnd(k);onRangeSelect&&onRangeSelect(start,k);}
  };
  const nights=start&&end?Math.round((new Date(end)-new Date(start))/86400000):0;
  const fmt=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'--';
  return(
    <div style={{marginBottom:'16px',background:'linear-gradient(145deg,#060e1c,#0a1628)',border:'1px solid rgba(201,168,76,0.2)',borderRadius:'20px',padding:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.6)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'linear-gradient(135deg,#c9a84c,#e2c97e)',boxShadow:'0 0 8px rgba(201,168,76,0.6)'}}/>
          <span style={{color:'#c9a84c',fontSize:'12px',fontWeight:'700',letterSpacing:'1px'}}>BOOKING CALENDAR</span>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          {nights>0&&<span style={{background:'rgba(201,168,76,0.15)',border:'1px solid rgba(201,168,76,0.4)',color:'#e2c97e',fontSize:'11px',padding:'3px 12px',borderRadius:'20px',fontWeight:'700'}}>{nights} Day{nights>1?'s':''}</span>}
          {(start||end)&&<button onClick={()=>{setStart(null);setEnd(null);}} style={{background:'rgba(233,69,96,0.1)',border:'1px solid rgba(233,69,96,0.3)',color:'#e94560',cursor:'pointer',fontSize:'10px',padding:'3px 10px',borderRadius:'20px',fontWeight:'600'}}>Clear</button>}
        </div>
      </div>
      <div style={{display:'flex',gap:'10px'}}>
        <SingleCal year={sY} month={sM} onPrev={()=>setS(([y,m])=>{const[ny,nm2]=pm(y,m);return[ny,nm2];})} onNext={()=>setS(([y,m])=>{const[ny,nm2]=nm(y,m);return[ny,nm2];})} startDate={start} endDate={end} hover={hover} onDay={click} onHover={setHover} onLeave={()=>setHover(null)}/>
        <SingleCal year={eY} month={eM} onPrev={()=>setE(([y,m])=>{const[ny,nm2]=pm(y,m);return[ny,nm2];})} onNext={()=>setE(([y,m])=>{const[ny,nm2]=nm(y,m);return[ny,nm2];})} startDate={start} endDate={end} hover={hover} onDay={click} onHover={setHover} onLeave={()=>setHover(null)}/>
      </div>
      <div style={{marginTop:'12px',display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:'10px',background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.2)',borderRadius:'14px',padding:'12px 16px'}}>
        <div>
          <p style={{color:'rgba(201,168,76,0.5)',fontSize:'8px',letterSpacing:'2px',margin:'0 0 4px',fontWeight:'700'}}>CHECK-IN</p>
          <p style={{color:start?'#e2c97e':'rgba(255,255,255,0.2)',fontSize:'12px',fontWeight:start?'700':'400',margin:0}}>{fmt(start)}</p>
        </div>
        <div style={{textAlign:'center'}}>
          <span style={{color:nights>0?'#c9a84c':'rgba(255,255,255,0.15)',fontSize:'10px',fontWeight:'700'}}>{nights>0?nights+'d':'to'}</span>
        </div>
        <div style={{textAlign:'right'}}>
          <p style={{color:'rgba(201,168,76,0.5)',fontSize:'8px',letterSpacing:'2px',margin:'0 0 4px',fontWeight:'700'}}>CHECK-OUT</p>
          <p style={{color:end?'#e2c97e':'rgba(255,255,255,0.2)',fontSize:'12px',fontWeight:end?'700':'400',margin:0}}>{fmt(end)}</p>
        </div>
      </div>
      <div style={{display:'flex',gap:'14px',marginTop:'10px',justifyContent:'center'}}>
        {[['linear-gradient(135deg,#c9a84c,#e2c97e)','Selected'],['rgba(201,168,76,0.12)','In Range'],['rgba(233,69,96,0.06)','Booked']].map(([bg,l],i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'5px'}}>
            <div style={{width:'10px',height:'10px',borderRadius:'4px',background:bg}}/>
            <span style={{color:'rgba(255,255,255,0.35)',fontSize:'9px'}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}