import { useState, useEffect } from "react";

const MOCK = {
  tenant: { الاسم: "شركة تقنية مصر", الخطة: "احترافي", الإحصائيات: { قوائم_الحجب_النشطة: 3, إجمالي_القواعد_النشطة: 114582, إجمالي_سجلات_الانحراف: 284710, محجوب_في_آخر_24_ساعة: 12483, آخر_مزامنة: new Date(Date.now() - 45*60*1000).toISOString() } },
  stats: { إجماليات: { إجمالي_الطلبات: 48271, طلبات_محجوبة: 12483, طلبات_مُحوَّلة: 847, طلبات_مسموح_بها: 34941, معدل_الحجب_بالمئة: 27.4 }, توفير_الموارد: { إجمالي_النطاق_الترددي_المحفوظ_MB: 284.7, تقدير_وقت_التحميل_المحفوظ_ثانية: 142.3, تتبعات_موقوفة: 3847 }, تصنيف_التهديدات: { إعلانات: 8234, تتبع_المستخدم: 2847, شبكات_إعلانية: 892, بصمات_رقمية: 312, تعدين_عملات: 134, تصيد_احتيالي: 64 }, أكثر_النطاقات_محجوبة: [ { النطاق: "doubleclick.net", العدد: 3241 }, { النطاق: "googlesyndication.com", العدد: 2187 }, { النطاق: "taboola.com", العدد: 1834 }, { النطاق: "facebook.com/tr", العدد: 1421 }, { النطاق: "mc.yandex.ru", العدد: 987 }, { النطاق: "propellerads.com", العدد: 743 }, { النطاق: "coinhive.com", العدد: 134 }, { النطاق: "fingerprintjs.com", العدد: 89 } ], أداء_محرك_الحجب: { متوسط_وقت_معالجة_مكرو: 2.8, الحد_الأقصى_مكرو: 87.4, إجمالي_الطلبات_في_الثانية: 14.2 } },
  blocklists: [ { معرف: "1", الاسم: "EasyList الرئيسية", النوع: "EasyList", الحالة: "نشطة", عدد_القواعد: 86423, آخر_مزامنة: new Date(Date.now()-2*3600*1000).toISOString(), حجم_KB: 3140 }, { معرف: "2", الاسم: "EasyPrivacy - الخصوصية", النوع: "EasyPrivacy", الحالة: "نشطة", عدد_القواعد: 23847, آخر_مزامنة: new Date(Date.now()-3600*1000).toISOString(), حجم_KB: 964 }, { معرف: "3", الاسم: "EasyList Arabic - قائمة عربية", النوع: "EasyListArabic", الحالة: "نشطة", عدد_القواعد: 4312, آخر_مزامنة: new Date(Date.now()-30*60*1000).toISOString(), حجم_KB: 183 } ],
  performance: { تصنيف_الأداء: "ممتاز", إحصائيات_الوقت: { متوسط_وقت_قاعدة_مكرو: 2.8, أسرع_قاعدة_مكرو: 0.3, أبطأ_قاعدة_مكرو: 87.4, انحراف_معياري: 5.1 }, إحصائيات_القواعد: { إجمالي_القواعد_المُعالجة: 114582, قواعد_شبكة_ناجحة: 98421, قواعد_تجميل_ناجحة: 14821, قواعد_مرفوضة: 1340, نسبة_نجاح_التجميع: 98.83 }, كفاءة_الذاكرة: { نسبة_ضغط_القواعد: 0.88, تقليل_الحجم_بالمئة: 12 } },
  syncLogs: [ { الاسم: "EasyList الرئيسية", الحالة: "مكتملة", مضافة: 1312, محذوفة: 89, وقت: 4125, الوقت_نسبي: "منذ ساعتين" }, { الاسم: "EasyPrivacy", الحالة: "مكتملة", مضافة: 712, محذوفة: 65, وقت: 1323, الوقت_نسبي: "منذ ساعة" }, { الاسم: "EasyList Arabic", الحالة: "مكتملة", مضافة: 234, محذوفة: 22, وقت: 499, الوقت_نسبي: "منذ 30 دقيقة" }, { الاسم: "EasyList الرئيسية", الحالة: "فاشلة", مضافة: 0, محذوفة: 0, وقت: 0, الوقت_نسبي: "منذ 6 ساعات", خطأ: "انتهت مهلة الاتصال" } ],
  recentDeflections: [ { النطاق: "doubleclick.net", الإجراء: "محجوب", الفئة: "إعلانات", الوقت: "3 μs" }, { النطاق: "mc.yandex.ru", الإجراء: "محجوب", الفئة: "تتبع_المستخدم", الوقت: "1 μs" }, { النطاق: "fonts.googleapis.com", الإجراء: "مسموح_به", الفئة: null, الوقت: "0.4 μs" }, { النطاق: "taboola.com", الإجراء: "محجوب", الفئة: "إعلانات", الوقت: "2 μs" }, { النطاق: "coinhive.com", الإجراء: "محجوب", الفئة: "تعدين_عملات", الوقت: "4 μs" }, { النطاق: "cdn.example.com", الإجراء: "مسموح_به", الفئة: null, الوقت: "0.6 μs" } ],
};

const TC = { إعلانات:"#6366f1", تتبع_المستخدم:"#f59e0b", شبكات_إعلانية:"#8b5cf6", بصمات_رقمية:"#ec4899", تعدين_عملات:"#ef4444", تصيد_احتيالي:"#dc2626" };
const LB = { EasyList:{bg:"#1e3a5f",color:"#60a5fa",label:"EasyList"}, EasyPrivacy:{bg:"#1a3a2a",color:"#34d399",label:"خصوصية"}, EasyListArabic:{bg:"#3b2a1a",color:"#f97316",label:"عربي"} };

function fmt(n){if(n>=1e6)return(n/1e6).toFixed(1)+"م";if(n>=1e3)return(n/1e3).toFixed(1)+"ك";return n.toLocaleString("ar-EG");}
function ago(iso){const m=Math.floor((Date.now()-new Date(iso).getTime())/60000);if(m<1)return"الآن";if(m<60)return`منذ ${m} د`;const h=Math.floor(m/60);if(h<24)return`منذ ${h} س`;return`منذ ${Math.floor(h/24)} يوم`;}

function Pulse(){return(<span style={{position:"relative",display:"inline-flex",width:10,height:10}}><span style={{position:"absolute",inset:0,borderRadius:"50%",background:"#22c55e",opacity:0.4,animation:"ping 1.5s ease-in-out infinite"}}/><span style={{width:10,height:10,borderRadius:"50%",background:"#22c55e",display:"block"}}/></span>);}

function Card({title,val,sub,clr,icon}){return(<div style={{background:"linear-gradient(135deg,#0f1923,#111d2b)",border:`1px solid ${clr}22`,borderRadius:14,padding:"20px 22px",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:-20,left:-20,width:80,height:80,borderRadius:"50%",background:`${clr}10`}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{color:"#64748b",fontSize:12,fontWeight:600,marginBottom:8}}>{title}</div><div style={{color:"#f1f5f9",fontSize:28,fontWeight:800,lineHeight:1}}>{val}</div>{sub&&<div style={{color:"#94a3b8",fontSize:12,marginTop:6}}>{sub}</div>}</div><div style={{width:42,height:42,borderRadius:12,background:`${clr}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{icon}</div></div></div>);}

function Sidebar({active,onNav}){const items=[{id:"لوحة",icon:"⬡",label:"لوحة التحكم"},{id:"قوائم",icon:"▦",label:"قوائم الحجب"},{id:"سجلات",icon:"◈",label:"سجلات الانحراف"},{id:"أداء",icon:"◉",label:"مقاييس الأداء"},{id:"مزامنة",icon:"⟳",label:"المزامنة"},{id:"قواعد",icon:"⊞",label:"محرر القواعد"}];return(<div style={{width:220,background:"#080d14",borderLeft:"1px solid #1e2d3d",display:"flex",flexDirection:"column",padding:"0 0 20px 0",flexShrink:0}}><div style={{padding:"24px 20px 20px",borderBottom:"1px solid #1e2d3d"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#3b82f6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#fff"}}>⛉</div><div><div style={{color:"#f1f5f9",fontWeight:800,fontSize:14,lineHeight:1.2}}>حاجب</div><div style={{color:"#475569",fontSize:10,fontWeight:500}}>AdBlock Engine</div></div></div></div><nav style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:2}}>{items.map(item=>(<button key={item.id} onClick={()=>onNav(item.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"none",cursor:"pointer",textAlign:"right",background:active===item.id?"linear-gradient(90deg,#1e3a5f,#1e2d3d)":"transparent",borderRight:active===item.id?"3px solid #3b82f6":"3px solid transparent",color:active===item.id?"#60a5fa":"#64748b",fontFamily:"Tajawal,sans-serif",fontWeight:active===item.id?700:500,fontSize:13,transition:"all 0.15s"}}><span style={{fontSize:15,opacity:active===item.id?1:0.6}}>{item.icon}</span>{item.label}</button>))}</nav><div style={{margin:"0 10px",padding:"12px 14px",background:"#0d1829",borderRadius:12,border:"1px solid #1e2d3d"}}><div style={{color:"#94a3b8",fontSize:10,fontWeight:600,marginBottom:4}}>المستأجر الحالي</div><div style={{color:"#e2e8f0",fontSize:12,fontWeight:700,marginBottom:6}}>{MOCK.tenant.الاسم}</div><div style={{display:"inline-block",padding:"2px 8px",borderRadius:6,background:"#1a2d4a",color:"#60a5fa",fontSize:10,fontWeight:700}}>خطة {MOCK.tenant.الخطة}</div></div></div>);}

function DashboardTab(){
  const [liveCount,setLiveCount]=useState(MOCK.stats.إجماليات.طلبات_محجوبة);
  const [deflections,setDeflections]=useState([...MOCK.recentDeflections]);
  const [animNew,setAnimNew]=useState(null);
  useEffect(()=>{const iv=setInterval(()=>{const blocked=Math.random()>0.35;const domains=["ads.zain.com","tracker.snap.com","pixel.twitter.com","cdn.criteo.com","ev.ad.microsoft.com","fonts.googleapis.com","static.cdn.net"];const cats=["إعلانات","تتبع_المستخدم","شبكات_إعلانية","بصمات_رقمية"];const d=domains[Math.floor(Math.random()*domains.length)];const cat=blocked?cats[Math.floor(Math.random()*cats.length)]:null;const e={النطاق:d,الإجراء:blocked?"محجوب":"مسموح_به",الفئة:cat,الوقت:`${(Math.random()*8+0.3).toFixed(1)} μs`};if(blocked)setLiveCount(c=>c+1);setAnimNew(d);setDeflections(prev=>[e,...prev.slice(0,7)]);setTimeout(()=>setAnimNew(null),600);},2200);return()=>clearInterval(iv);},[]);
  const threats=Object.entries(MOCK.stats.تصنيف_التهديدات);const maxT=Math.max(...threats.map(([,v])=>v));
  return(<div style={{display:"flex",flexDirection:"column",gap:20}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
      <Card title="محجوب في آخر 24 ساعة" val={fmt(liveCount)} sub={`${MOCK.stats.إجماليات.معدل_الحجب_بالمئة}% من الكل`} clr="#3b82f6" icon="⛔"/>
      <Card title="النطاق الترددي المحفوظ" val={`${MOCK.stats.توفير_الموارد.إجمالي_النطاق_الترددي_المحفوظ_MB} MB`} sub="في آخر 24 ساعة" clr="#22c55e" icon="💾"/>
      <Card title="التتبعات الموقوفة" val={fmt(MOCK.stats.توفير_الموارد.تتبعات_موقوفة)} sub="محاولة تتبع" clr="#f59e0b" icon="👁"/>
      <Card title="إجمالي القواعد النشطة" val={fmt(MOCK.tenant.الإحصائيات.إجمالي_القواعد_النشطة)} sub={`${MOCK.tenant.الإحصائيات.قوائم_الحجب_النشطة} قوائم نشطة`} clr="#6366f1" icon="⚡"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{background:"#0a1520",border:"1px solid #1e2d3d",borderRadius:14,overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #1e2d3d",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{color:"#f1f5f9",fontWeight:700,fontSize:14}}>سجل الانحراف الحي</div><div style={{display:"flex",alignItems:"center",gap:6}}><Pulse/><span style={{color:"#64748b",fontSize:11}}>مباشر</span></div></div>
        <div style={{padding:"8px 0"}}>{deflections.slice(0,7).map((d,i)=>(<div key={i} style={{padding:"9px 20px",background:animNew===d.النطاق&&i===0?"#1e3a5f20":"transparent",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:i<6?"1px solid #1e2d3d08":"none",transition:"background 0.4s"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:d.الإجراء==="محجوب"?"#ef4444":"#22c55e"}}/><span style={{color:"#cbd5e1",fontSize:12,fontFamily:"monospace"}}>{d.النطاق}</span></div><div style={{display:"flex",alignItems:"center",gap:8}}>{d.الفئة&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:5,fontWeight:600,background:`${TC[d.الفئة]||"#94a3b8"}18`,color:TC[d.الفئة]||"#94a3b8",border:`1px solid ${TC[d.الفئة]||"#334155"}30`}}>{d.الفئة.replace("_"," ")}</span>}<span style={{color:"#475569",fontSize:10}}>{d.الوقت}</span></div></div>))}</div>
      </div>
      <div style={{background:"#0a1520",border:"1px solid #1e2d3d",borderRadius:14,overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #1e2d3d"}}><div style={{color:"#f1f5f9",fontWeight:700,fontSize:14}}>تصنيف التهديدات المحجوبة</div></div>
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>{threats.map(([f,n])=>(<div key={f}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:"#94a3b8",fontSize:12}}>{f.replace("_"," ")}</span><span style={{color:TC[f]||"#94a3b8",fontSize:12,fontWeight:700}}>{fmt(n)}</span></div><div style={{height:6,background:"#1e2d3d",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:TC[f]||"#64748b",width:`${(n/maxT)*100}%`,transition:"width 0.8s ease"}}/></div></div>))}</div>
      </div>
    </div>
    <div style={{background:"#0a1520",border:"1px solid #1e2d3d",borderRadius:14,overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #1e2d3d"}}><div style={{color:"#f1f5f9",fontWeight:700,fontSize:14}}>أكثر النطاقات محجوبة</div></div>
      <div style={{padding:"12px 20px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>{MOCK.stats.أكثر_النطاقات_محجوبة.map((n,i)=>(<div key={i} style={{padding:"10px 14px",background:"#0d1829",borderRadius:10,border:"1px solid #1e2d3d"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{color:"#475569",fontSize:10}}>#{i+1}</span><span style={{color:"#ef4444",fontSize:11,fontWeight:700}}>{fmt(n.العدد)}</span></div><div style={{color:"#cbd5e1",fontSize:11,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.النطاق}</div></div>))}</div>
    </div>
  </div>);
}

function BlocklistsTab(){
  const [syncing,setSyncing]=useState(null);
  const sync=(id)=>{setSyncing(id);setTimeout(()=>setSyncing(null),2800);};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{color:"#94a3b8",fontSize:13}}>{MOCK.blocklists.length} قائمة نشطة · {fmt(MOCK.tenant.الإحصائيات.إجمالي_القواعد_النشطة)} قاعدة إجمالاً</div><button style={{padding:"8px 16px",borderRadius:10,background:"linear-gradient(135deg,#1d4ed8,#4f46e5)",color:"#fff",border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",fontWeight:700,fontSize:13}}>+ إضافة قائمة</button></div>
    {MOCK.blocklists.map(list=>{const badge=LB[list.النوع]||{bg:"#1e2d3d",color:"#94a3b8",label:"مخصص"};const isSyncing=syncing===list.معرف;return(<div key={list.معرف} style={{background:"#0a1520",border:"1px solid #1e2d3d",borderRadius:14,padding:"18px 22px",display:"grid",gridTemplateColumns:"1fr auto auto",gap:20,alignItems:"center"}}>
      <div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:badge.bg,color:badge.color}}>{badge.label}</span><span style={{color:"#f1f5f9",fontWeight:700,fontSize:15}}>{list.الاسم}</span><span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/></div><div style={{display:"flex",gap:20}}><span style={{color:"#64748b",fontSize:12}}><span style={{color:"#60a5fa",fontWeight:700}}>{fmt(list.عدد_القواعد)}</span> قاعدة</span><span style={{color:"#64748b",fontSize:12}}>{list.حجم_KB} KB</span><span style={{color:"#64748b",fontSize:12}}>آخر مزامنة: <span style={{color:"#94a3b8"}}>{ago(list.آخر_مزامنة)}</span></span></div></div>
      <div style={{textAlign:"center"}}><div style={{color:"#94a3b8",fontSize:10,marginBottom:3}}>الحالة</div><div style={{padding:"4px 12px",borderRadius:8,background:"#1a3a2a",color:"#34d399",fontSize:12,fontWeight:700}}>{list.الحالة}</div></div>
      <button onClick={()=>sync(list.معرف)} style={{padding:"9px 18px",borderRadius:10,background:isSyncing?"#1e2d3d":"#1e3a5f",color:isSyncing?"#475569":"#60a5fa",border:`1px solid ${isSyncing?"#334155":"#3b82f630"}`,cursor:isSyncing?"not-allowed":"pointer",fontFamily:"Tajawal,sans-serif",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:6}}><span style={{display:"inline-block",animation:isSyncing?"spin 1s linear infinite":"none"}}>⟳</span>{isSyncing?"جارٍ...":"مزامنة"}</button>
    </div>);})}
  </div>);
}

function PerformanceTab(){
  const p=MOCK.performance;const rc={ممتاز:"#22c55e",جيد:"#3b82f6",متوسط:"#f59e0b",ضعيف:"#ef4444"};const clr=rc[p.تصنيف_الأداء];
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{background:`linear-gradient(135deg,${clr}12,${clr}06)`,border:`1px solid ${clr}30`,borderRadius:14,padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:"#94a3b8",fontSize:12,marginBottom:6}}>تصنيف أداء محرك التجميع</div><div style={{color:clr,fontSize:32,fontWeight:900}}>{p.تصنيف_الأداء}</div><div style={{color:"#64748b",fontSize:12,marginTop:4}}>متوسط {p.إحصائيات_الوقت.متوسط_وقت_قاعدة_مكرو} μs لكل قاعدة · نسبة نجاح {p.إحصائيات_القواعد.نسبة_نجاح_التجميع}%</div></div><div style={{fontSize:60,opacity:0.4}}>⚡</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
      <div style={{background:"#0a1520",border:"1px solid #1e2d3d",borderRadius:14,padding:"18px 20px"}}>
        <div style={{color:"#64748b",fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:"0.08em"}}>◈ إحصائيات الوقت</div>
        {[{t:"متوسط وقت القاعدة",v:`${p.إحصائيات_الوقت.متوسط_وقت_قاعدة_مكرو} μs`},{t:"أسرع قاعدة",v:`${p.إحصائيات_الوقت.أسرع_قاعدة_مكرو} μs`},{t:"أبطأ قاعدة",v:`${p.إحصائيات_الوقت.أبطأ_قاعدة_مكرو} μs`},{t:"الانحراف المعياري",v:`${p.إحصائيات_الوقت.انحراف_معياري} μs`}].map(r=>(<div key={r.t} style={{display:"flex",justifyContent:"space-between",paddingBottom:10,marginBottom:10,borderBottom:"1px solid #1e2d3d"}}><span style={{color:"#64748b",fontSize:12}}>{r.t}</span><span style={{color:"#e2e8f0",fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{r.v}</span></div>))}
      </div>
      <div style={{background:"#0a1520",border:"1px solid #1e2d3d",borderRadius:14,padding:"18px 20px"}}>
        <div style={{color:"#64748b",fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:"0.08em"}}>⊞ إحصائيات القواعد</div>
        {[{t:"إجمالي المُعالجة",v:fmt(p.إحصائيات_القواعد.إجمالي_القواعد_المُعالجة),c:"#60a5fa"},{t:"قواعد شبكة ناجحة",v:fmt(p.إحصائيات_القواعد.قواعد_شبكة_ناجحة),c:"#34d399"},{t:"قواعد تجميل ناجحة",v:fmt(p.إحصائيات_القواعد.قواعد_تجميل_ناجحة),c:"#a78bfa"},{t:"قواعد مرفوضة",v:fmt(p.إحصائيات_القواعد.قواعد_مرفوضة),c:"#f87171"}].map(r=>(<div key={r.t} style={{display:"flex",justifyContent:"space-between",paddingBottom:10,marginBottom:10,borderBottom:"1px solid #1e2d3d"}}><span style={{color:"#64748b",fontSize:12}}>{r.t}</span><span style={{color:r.c,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{r.v}</span></div>))}
      </div>
      <div style={{background:"#0a1520",border:"1px solid #1e2d3d",borderRadius:14,padding:"18px 20px"}}>
        <div style={{color:"#64748b",fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:"0.08em"}}>◉ كفاءة الذاكرة</div>
        {[{t:"نسبة ضغط القواعد",v:p.كفاءة_الذاكرة.نسبة_ضغط_القواعد,c:"#22c55e"},{t:"نسبة نجاح التجميع",v:p.إحصائيات_القواعد.نسبة_نجاح_التجميع/100,c:"#3b82f6"}].map(r=>(<div key={r.t} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:"#64748b",fontSize:12}}>{r.t}</span><span style={{color:r.c,fontWeight:700,fontSize:12}}>{(r.v*100).toFixed(1)}%</span></div><div style={{height:8,background:"#1e2d3d",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${r.v*100}%`,background:r.c,borderRadius:4}}/></div></div>))}
        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#64748b",fontSize:12}}>تقليص الحجم</span><span style={{color:"#f59e0b",fontWeight:700,fontSize:12}}>-{p.كفاءة_الذاكرة.تقليل_الحجم_بالمئة}%</span></div>
      </div>
    </div>
  </div>);
}

function SyncTab(){return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{color:"#94a3b8",fontSize:13}}>آخر {MOCK.syncLogs.length} عمليات مزامنة</div><button style={{padding:"8px 18px",borderRadius:10,background:"linear-gradient(135deg,#1d4ed8,#4f46e5)",color:"#fff",border:"none",cursor:"pointer",fontFamily:"Tajawal,sans-serif",fontWeight:700,fontSize:13}}>⟳ مزامنة الكل الآن</button></div>
  {MOCK.syncLogs.map((log,i)=>(<div key={i} style={{background:"#0a1520",border:`1px solid ${log.الحالة==="فاشلة"?"#ef444430":"#1e2d3d"}`,borderRadius:14,padding:"16px 22px",display:"grid",gridTemplateColumns:"auto 1fr auto",gap:16,alignItems:"center"}}>
    <div style={{width:40,height:40,borderRadius:12,background:log.الحالة==="مكتملة"?"#1a3a2a":"#3a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{log.الحالة==="مكتملة"?"✓":"✕"}</div>
    <div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><span style={{color:"#f1f5f9",fontWeight:700,fontSize:14}}>{log.الاسم}</span><span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:log.الحالة==="مكتملة"?"#1a3a2a":"#3a1a1a",color:log.الحالة==="مكتملة"?"#34d399":"#f87171"}}>{log.الحالة}</span></div>{log.الحالة==="مكتملة"?<div style={{display:"flex",gap:18}}><span style={{color:"#64748b",fontSize:12}}>+<span style={{color:"#34d399"}}>{fmt(log.مضافة)}</span> مضافة</span><span style={{color:"#64748b",fontSize:12}}>-<span style={{color:"#f87171"}}>{fmt(log.محذوفة)}</span> محذوفة</span><span style={{color:"#64748b",fontSize:12}}><span style={{color:"#60a5fa"}}>{log.وقت}ms</span> إجمالي</span></div>:<div style={{color:"#f87171",fontSize:12}}>{log.خطأ}</div>}</div>
    <div style={{color:"#475569",fontSize:11,textAlign:"left"}}>{log.الوقت_نسبي}</div>
  </div>))}
</div>);}

function RulesTab(){
  const [q,setQ]=useState("");
  const rules=[{p:"||doubleclick.net^",t:"حجب_شبكة",n:3241,s:"EasyList"},{p:"||googlesyndication.com^$third-party",t:"حجب_شبكة",n:2187,s:"EasyList"},{p:"@@||fonts.googleapis.com^$stylesheet",t:"استثناء",n:8934,s:"EasyList"},{p:"||tracking.pixel.com^$image,third-party",t:"حجب_شبكة",n:1243,s:"EasyPrivacy"},{p:"example.com##.advertisement",t:"حجب_عنصر_صفحة",n:892,s:"EasyList"},{p:"||adnow.com^",t:"حجب_شبكة",n:743,s:"EasyListArabic"},{p:"||coinhive.com^$script",t:"حجب_شبكة",n:134,s:"EasyPrivacy"}];
  const tc2={حجب_شبكة:"#ef4444",استثناء:"#22c55e",حجب_عنصر_صفحة:"#f59e0b"};
  const filtered=rules.filter(r=>!q||r.p.includes(q)||r.t.includes(q)||r.s.includes(q));
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",gap:10}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث في القواعد..." style={{flex:1,padding:"10px 16px",background:"#0a1520",border:"1px solid #1e2d3d",borderRadius:10,color:"#e2e8f0",fontFamily:"Tajawal,monospace",fontSize:13,outline:"none"}}/><button style={{padding:"10px 18px",borderRadius:10,background:"#1e3a5f",color:"#60a5fa",border:"1px solid #3b82f630",cursor:"pointer",fontFamily:"Tajawal,sans-serif",fontWeight:700,fontSize:13}}>⬇ تصدير DNR</button></div>
    <div style={{background:"#0a1520",border:"1px solid #1e2d3d",borderRadius:14,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",padding:"10px 20px",borderBottom:"1px solid #1e2d3d",color:"#475569",fontSize:11,fontWeight:600,letterSpacing:"0.05em",gap:16}}><span>النمط</span><span>النوع</span><span>التطابقات</span><span>المصدر</span></div>
      {filtered.map((r,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",padding:"12px 20px",gap:16,alignItems:"center",borderBottom:i<filtered.length-1?"1px solid #1e2d3d08":"none"}}><span style={{color:"#cbd5e1",fontSize:12,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.p}</span><span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,whiteSpace:"nowrap",background:`${tc2[r.t]||"#64748b"}18`,color:tc2[r.t]||"#94a3b8",border:`1px solid ${tc2[r.t]||"#64748b"}30`}}>{r.t.replace("_"," ")}</span><span style={{color:"#60a5fa",fontSize:12,fontWeight:700}}>{fmt(r.n)}</span><span style={{color:"#475569",fontSize:11}}>{r.s}</span></div>))}
      {filtered.length===0&&<div style={{padding:"30px 20px",textAlign:"center",color:"#475569",fontSize:13}}>لا توجد قواعد تطابق البحث</div>}
    </div>
  </div>);
}

function LogsTab(){
  return(<div style={{background:"#0a1520",border:"1px solid #1e2d3d",borderRadius:14,padding:"20px 24px"}}>
    <div style={{color:"#94a3b8",marginBottom:12,fontSize:13}}>سجلات الانحراف الشبكي — آخر 24 ساعة</div>
    {MOCK.recentDeflections.map((d,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"10px 1fr auto auto auto",gap:14,alignItems:"center",padding:"10px 0",borderBottom:i<MOCK.recentDeflections.length-1?"1px solid #1e2d3d":"none"}}>
      <span style={{width:8,height:8,borderRadius:"50%",background:d.الإجراء==="محجوب"?"#ef4444":"#22c55e",display:"block"}}/>
      <span style={{color:"#cbd5e1",fontSize:12,fontFamily:"monospace"}}>{d.النطاق}</span>
      <span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:d.الإجراء==="محجوب"?"#ef444415":"#22c55e15",color:d.الإجراء==="محجوب"?"#f87171":"#4ade80"}}>{d.الإجراء==="محجوب"?"تم الحجب":"مسموح بالمرور"}</span>
      {d.الفئة?<span style={{color:TC[d.الفئة]||"#94a3b8",fontSize:11}}>{d.الفئة.replace("_"," ")}</span>:<span/>}
      <span style={{color:"#475569",fontSize:11}}>{d.الوقت}</span>
    </div>))}
  </div>);
}

export default function App(){
  const [tab,setTab]=useState("لوحة");
  const titles={لوحة:"لوحة التحكم الرئيسية",قوائم:"إدارة قوائم الحجب",سجلات:"سجلات انحراف الطلبات الشبكية",أداء:"مقاييس أداء محرك التجميع",مزامنة:"سجل المزامنة التلقائية",قواعد:"مستعرض قواعد DNR المُجمَّعة"};
  return(<div style={{fontFamily:"Tajawal,Cairo,'Segoe UI',sans-serif",direction:"rtl",background:"#060d18",minHeight:"100vh",display:"flex",flexDirection:"column",color:"#e2e8f0"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a1520}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px}@keyframes ping{0%,100%{transform:scale(1);opacity:0.4}50%{transform:scale(2);opacity:0}}@keyframes spin{to{transform:rotate(360deg)}}input::placeholder{color:#334155}button:hover{filter:brightness(1.1)}`}</style>
    <header style={{height:54,background:"#080d14",borderBottom:"1px solid #1e2d3d",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><Pulse/><span style={{color:"#475569",fontSize:12}}>النظام يعمل</span><span style={{color:"#1e2d3d",margin:"0 4px"}}>·</span><span style={{color:"#475569",fontSize:12}}>آخر مزامنة: <span style={{color:"#94a3b8"}}>{ago(MOCK.tenant.الإحصائيات.آخر_مزامنة)}</span></span></div>
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:"#334155",fontSize:11,fontFamily:"monospace"}}>adb_pro_test_key_0002...</span><div style={{padding:"3px 10px",background:"#1e3a5f",color:"#60a5fa",borderRadius:6,fontSize:11,fontWeight:700}}>API متصل</div></div>
    </header>
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      <Sidebar active={tab} onNav={setTab}/>
      <main style={{flex:1,overflow:"auto",padding:24,display:"flex",flexDirection:"column",gap:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><h1 style={{color:"#f1f5f9",fontSize:20,fontWeight:800,marginBottom:2}}>{titles[tab]}</h1><p style={{color:"#475569",fontSize:12}}>محرك حجب الإعلانات العربي · Arabic AdBlock Engine v1.0</p></div>
          {tab==="لوحة"&&<div style={{display:"flex",gap:10}}>{["24 س","7 أيام","30 يوم"].map((t,i)=>(<button key={t} style={{padding:"6px 12px",borderRadius:8,fontSize:12,background:i===0?"#1e3a5f":"transparent",color:i===0?"#60a5fa":"#475569",border:`1px solid ${i===0?"#3b82f630":"#1e2d3d"}`,cursor:"pointer",fontFamily:"Tajawal,sans-serif",fontWeight:600}}>{t}</button>))}</div>}
        </div>
        {tab==="لوحة"&&<DashboardTab/>}
        {tab==="قوائم"&&<BlocklistsTab/>}
        {tab==="أداء"&&<PerformanceTab/>}
        {tab==="مزامنة"&&<SyncTab/>}
        {tab==="قواعد"&&<RulesTab/>}
        {tab==="سجلات"&&<LogsTab/>}
      </main>
    </div>
  </div>);
}
