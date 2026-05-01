import React, { useState } from 'react';

const BOOKED = ['2026-05-03','2026-05-04','2026-05-05','2026-05-12','2026-05-13','2026-05-20'];

const MiniCal = ({ year, month, startDate, endDate, hoverDate, onDayClick, onHover, onLeave, side }) => {
  const today = new Date();
  const toKey = (y,m,d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const days = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month).toLocaleDateString('en-IN',{month:'short', year:'numeric'});
  const isBooked = k => BOOKED.includes(k);
  const isPast = (y,m,d) => new Date(y,m,d) < new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const isInRange = k => {
    if (!startDate) return false;
    const end = endDate || hoverDate;
    if (!end) return false;
    const s=new Date(startDate),e=new Date(end),kd=new Date(k);
    return kd>Math.min(s,e) && kd<Math.max(s,e);
  };
  return (
    <div style={{flex:1,minWidth:0}}>
      <p style={{color:'rgba(201,168,76,0.6)',fontSize:'9px',letterSpacing:'1.5px',margin:'0 0 6px',textAlign:'center',fontWeight:'700'}}>
        {side==='start'?'CHECK-IN':'CHECK-OUT'}
      </p>
      <div style={{background:'linear-gradient(145deg,#0d1f3c,#080f1e)',border:'1px solid rgba(201,168,76,0.2)',borderRadius:'10px',overflow:'hidden'}}>
        <div style={{background:'rgba(201,168,76,0.06)',padding:'6px 8px',textAlign:'center',borderBottom:'1px solid rgba(201,168,76,0.1)'}}>
          <p style={{color:'#c9a84c',fontSize:'11px',fontWeight:'700',margin:0}}>{monthName}</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',padding:'5px 4px 2px'}}>
          {['S','M','T','W','T','F','S'].map((d,i)=>(
            <div key={i} style={{textAlign:'center',color:'rgba(201,168,76,0.35)',fontSize:'8px',fontWeight:'700',padding:'2px 0'}}>{d}</div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'1px',padding:'2px 4px 6px'}}>
          {Array(firstDay).fill(null).map((_,i)=><div key={'e'+i}/>)}
          {Array(days).fill(null).map((_,i)=>{
            const d=i+1, key=toKey(year,month,d);
            const booked=isBooked(key), past=isPast(year,month,d);
            const isStart=key===startDate, isEnd=key===endDate;
            const inRange=isInRange(key);
            const isToday=key===toKey(today.getFullYear(),today.getMonth(),today.getDate());
            const disabled=booked||past;
            let bg='transparent',border='1px solid transparent',color=disabled?'rgba(255,255,255,0.15)':'#8896a8',fw='400',shadow='none';
            if(isStart||isEnd){bg='linear-gradient(135deg,#c9a84c,#e2c97e)';border='1px solid #c9a84c';color='#0a1628';fw='800';shadow='0 2px 6px rgba(201,168,76,0.4)';}
            else if(inRange){bg='rgba(201,168,76,0.12)';border='1px solid rgba(201,168,76,0.15)';color='#c9a84c';fw='600';}
            else if(booked){bg='rgba(233,69,96,0.08)';border='1px solid rgba(233,69,96,0.2)';color='#e94560';}
            else if(isToday){border='1px solid rgba(201,168,76,0.4)';color='#c9a84c';fw='700';}
            return (
              <div key={key} style={{position:'relative',aspectRatio:'1',borderRadius:'5px',display:'flex',alignItems:'center',justifyContent:'center',cursor:disabled?'not-allowed':'pointer',background:bg,border,color,fontWeight:fw,fontSize:'10px',boxShadow:shadow,transition:'all 0.1s',flexDirection:'column'}}
                onClick={()=>!disabled&&onDayClick(key)}
                onMouseEnter={()=>!disabled&&onHover(key)}
                onMouseLeave={onLeave}
              >
                {d}
                {booked&&<span style={{position:'absolute',bottom:'1px',width:'3px',height:'3px',borderRadius:'50%',background:'#e94560'}}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const BookingCalendar = ({ onRangeSelect }) => {
  const today = new Date();
  const [sY,setSY]=useState(today.getFullYear());
  const [sM,setSM]=useState(today.getMonth());
  const [eY,setEY]=useState(today.getMonth()===11?today.getFullYear()+1:today.getFullYear());
  const [eM,setEM]=useState(today.getMonth()===11?0:today.getMonth()+1);
  const [startDate,setStartDate]=useState(null);
  const [endDate,setEndDate]=useState(null);
  const [hoverDate,setHoverDate]=useState(null);

  const handleDayClick = key => {
    if(!startDate||(startDate&&endDate)){setStartDate(key);setEndDate(null);}
    else{
      if(key<=startDate){setStartDate(key);setEndDate(null);return;}
      setEndDate(key);
      onRangeSelect&&onRangeSelect(startDate,key);
    }
  };

  const nights=startDate&&endDate?Math.round((new Date(endDate)-new Date(startDate))/86400000):0;
  const nb=(fn,lbl)=><button onClick={fn} style={{width:'20px',height:'20px',background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.2)',borderRadius:'5px',color:'#c9a84c',cursor:'pointer',fontSize:'11px',display:'flex',alignItems:'center',justifyContent:'center'}}>{lbl}</button>;

  const pS=()=>{if(sM===0){setSM(11);setSY(y=>y-1);}else setSM(m=>m-1);};
  const nS=()=>{if(sM===11){setSM(0);setSY(y=>y+1);}else setSM(m=>m+1);};
  const pE=()=>{if(eM===0){setEM(11);setEY(y=>y-1);}else setEM(m=>m-1);};
  const nE=()=>{if(eM===11){setEM(0);setEY(y=>y+1);}else setEM(m=>m+1);};

  return (
    <div style={{marginBottom:'12px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
        <p style={{color:'#8896a8',fontSize:'11px',margin:0,fontWeight:'600'}}>Select Booking Dates</p>
        {nights>0&&<span style={{background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.25)',color:'#c9a84c',fontSize:'10px',padding:'2px 8px',borderRadius:'20px',fontWeight:'700'}}>{nights}d</span>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
        <div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>{nb(pS,'‹')}<div/>{nb(nS,'›')}</div>
          <MiniCal year={sY} month={sM} startDate={startDate} endDate={endDate} hoverDate={hoverDate} onDayClick={handleDayClick} onHover={setHoverDate} onLeave={()=>setHoverDate(null)} side="start"/>
        </div>
        <div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>{nb(pE,'‹')}<div/>{nb(nE,'›')}</div>
          <MiniCal year={eY} month={eM} startDate={startDate} endDate={endDate} hoverDate={hoverDate} onDayClick={handleDayClick} onHover={setHoverDate} onLeave={()=>setHoverDate(null)} side="end"/>
        </div>
      </div>
      <div style={{marginTop:'8px',background:'rgba(201,168,76,0.05)',border:'1px solid rgba(201,168,76,0.15)',borderRadius:'8px',padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{textAlign:'center'}}>
          <p style={{color:'rgba(201,168,76,0.5)',fontSize:'8px',letterSpacing:'1px',margin:'0 0 2px'}}>CHECK-IN</p>
          <p style={{color:startDate?'#c9a84c':'#556070',fontSize:'12px',fontWeight:'700',margin:0}}>{startDate?new Date(startDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'-- ---'}</p>
        </div>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:'6px',justifyContent:'center',padding:'0 8px'}}>
          <div style={{flex:1,height:'1px',background:'rgba(201,168,76,0.2)'}}/> 
          <span style={{color:nights>0?'#c9a84c':'#556070',fontSize:'9px',fontWeight:'700',background:'rgba(201,168,76,0.08)',padding:'2px 6px',borderRadius:'20px',border:'1px solid rgba(201,168,76,0.15)'}}>{nights>0?nights+'d':'→'}</span>
          <div style={{flex:1,height:'1px',background:'rgba(201,168,76,0.2)'}}/>
        </div>
        <div style={{textAlign:'center'}}>
          <p style={{color:'rgba(201,168,76,0.5)',fontSize:'8px',letterSpacing:'1px',margin:'0 0 2px'}}>CHECK-OUT</p>
          <p style={{color:endDate?'#c9a84c':'#556070',fontSize:'12px',fontWeight:'700',margin:0}}>{endDate?new Date(endDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'-- ---'}</p>
        </div>
      </div>
      <div style={{display:'flex',gap:'10px',marginTop:'5px',justifyContent:'center'}}>
        {[['#c9a84c','Selected'],['rgba(201,168,76,0.2)','Range'],['#e94560','Booked']].map(([c,l],i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'3px'}}>
            <div style={{width:'7px',height:'7px',borderRadius:'2px',background:c}}/>
            <span style={{color:'#556070',fontSize:'8px'}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingCalendar;