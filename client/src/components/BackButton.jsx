import React from 'react';

const BackButton = ({ onClick, sidebarStyle }) => (
  <button onClick={onClick} style={sidebarStyle ? {display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'8px',border:'none',background:'transparent',color:'#c9a84c',cursor:'pointer',fontSize:'16px',width:'100%',textAlign:'left',fontWeight:'700'} : {position:'absolute',top:'16px',left:'16px',background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.25)',color:'#c9a84c',borderRadius:'8px',width:'36px',height:'36px',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10}}>
    &larr;
  </button>
);

export default BackButton;