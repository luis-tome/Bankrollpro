import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://opeuermurrbzpglbkmrf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZXVlcm11cnJienBnbGJrbXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjA2NTAsImV4cCI6MjA5NDU5NjY1MH0.M-VclAmrSl0gop_7IvXh7-HH7nj5DwMFLVCMIOa3Qfw";
const STRIPE_MONTHLY = "https://buy.stripe.com/00wfZg8Z0dIb5TRbiTgQE01";
const STRIPE_ANNUAL  = "https://buy.stripe.com/28E00iejkfQj0zx9aLgQE00";
const TRIAL_DAYS = 5;
const MAX_BANKROLLS = 3;
const ADMIN_EMAIL = "luistome.work@gmail.com";
const SUPPORT_EMAIL = "tome.luis.pt@gmail.com";
const AI_LIMIT_MONTHLY = 3;
const AI_LIMIT_ANNUAL = 10;

// Pricing
const PROMO_MONTHLY = 3.99;
const PROMO_ANNUAL  = 19.99;
const NORMAL_MONTHLY = 5.99;
const NORMAL_ANNUAL  = 22.99;
const PROMO_DAYS = 15; // days after launch promo lasts

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SPORTS = {
  "Geral":       { icon:"🎯", color:"#6b7280", markets:["Outros"] },
  "Ténis":       { icon:"🎾", color:"#0ea5e9", markets:["Vencedor do Jogo","Handicap Games","Total Games O/U","Set Winner","Total Sets O/U","Resultado Correto Sets","1º Set Vencedor","Total Games 1º Set","Handicap Sets","Dupla Hipótese","Tie-Break no Jogo","1º Break de Serviço","Jogo em Deuce","Total Aces O/U","Total Double Faults O/U","Outros"] },
  "Futebol":     { icon:"⚽", color:"#10b981", markets:["1X2","Dupla Hipótese","Over/Under Golos","BTTS","Handicap Asiático","Handicap Europeu","Marcador Correto","1º Marcador","Total Cantos","Total Cartões","Over/Under 1ª Parte","Resultado ao Intervalo","Outros"] },
  "Basquetebol": { icon:"🏀", color:"#f97316", markets:["1X2","Handicap","Over/Under","1º Quarto","Moneyline","Outros"] },
  "Hóquei":      { icon:"🏒", color:"#8b5cf6", markets:["1X2","Handicap","Over/Under","Resultado Final","Outros"] },
  "Baseball":    { icon:"⚾", color:"#ef4444", markets:["Moneyline","Run Line","Over/Under","1ª Entrada","Outros"] },
  "Rugby":       { icon:"🏉", color:"#eab308", markets:["1X2","Handicap","Over/Under","Primeira Tentativa","Outros"] },
  "MMA/UFC":     { icon:"🥊", color:"#ec4899", markets:["Vencedor","Método de Vitória","Round","Over/Under Rounds","Vai a Decisão","Outros"] },
  "Outros":      { icon:"🎯", color:"#6b7280", markets:["1X2","Handicap","Over/Under","Outros"] },
};
const SPORT_KEYS = Object.keys(SPORTS);

const CURRENCIES = { EUR:{ symbol:"€", flag:"🇪🇺" }, BRL:{ symbol:"R$", flag:"🇧🇷" }, USD:{ symbol:"$", flag:"🇺🇸" } };

const today = () => new Date().toISOString().slice(0,10);
const daysLeft = ts => Math.max(0, TRIAL_DAYS - Math.floor((Date.now()-new Date(ts).getTime())/86400000));
const monthLabel = d => new Date(d+"T00:00:00").toLocaleString("pt-PT",{month:"long",year:"numeric"}).replace(/^\w/,c=>c.toUpperCase());
const fmtDate = d => { const dt=new Date(d+"T00:00:00"); return dt.toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"}).replace(/^\w/,c=>c.toUpperCase()); };
const padDate = dt => { const y=dt.getFullYear(),m=String(dt.getMonth()+1).padStart(2,"0"),d=String(dt.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; };

async function getAIFeedback(bets, stats, bankroll, sport) {
  const settled = bets.filter(b=>b.result!=="PENDING");
  if(settled.length<3) return null;
  const summary = { sport, totalBets:settled.length, wins:stats.wins, losses:stats.losses, roi:stats.roi.toFixed(1), strikeRate:stats.strikeRate.toFixed(1), avgOdd:stats.avgOdd.toFixed(2), pnl:stats.pnl.toFixed(2), bankroll:bankroll.toFixed(2) };
  try {
    const res = await fetch("/api/analyze",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({summary}) });
    return await res.json();
  } catch { return null; }
}

export default function App() {
  const [screen, setScreen]       = useState("loading");
  const [authMode, setAuthMode]   = useState("register");
  const [user, setUser]           = useState(null);
  const [bankrolls, setBankrolls] = useState([]);
  const [activeBR, setActiveBR]   = useState(null);
  const [bets, setBets]           = useState([]);
  const [tab, setTab]             = useState("dashboard");
  const [currency, setCurrency]   = useState("EUR");
  const [authForm, setAuthForm]   = useState({name:"",email:"",password:""});
  const [authErr, setAuthErr]     = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNewBR, setShowNewBR] = useState(false);
  const [showEditBR, setShowEditBR] = useState(false);
  const [editBRTarget, setEditBRTarget] = useState(null);
  const [brForm, setBRForm]       = useState({name:"",sport:"Ténis",bankroll:"",unit_pct:"2",reset:false});
  const [showForm, setShowForm]   = useState(false);
  const [editBet, setEditBet]     = useState(null);
  const [formMode, setFormMode]   = useState("immediate");
  const [betType, setBetType]       = useState("single");
  const [betSport, setBetSport]     = useState("");
  const [form, setForm]           = useState({event:"",market:"Vencedor do Jogo",selection:"",odd:"",units:1,result:"WIN",notes:"",cashoutVal:""});
  const [subView, setSubView]     = useState("annual");
  const [feedback, setFeedback]   = useState(null);
  const [loadingFB, setLoadingFB] = useState(false);
  const [diaryDate, setDiaryDate] = useState(today());
  const [reportMonth, setReportMonth] = useState(today().slice(0,7));
  const [showSuccess, setShowSuccess] = useState(false);
  const touchX = useRef(null);

  const br      = bankrolls.find(b=>b.id===activeBR);
  const sc      = SPORTS[br?.sport||"Ténis"];
  const cur     = CURRENCIES[currency]||CURRENCIES.EUR;
  const fmt     = v => cur.symbol + Math.abs(v).toFixed(2).replace(".",",");
  const fmtP    = v => (v>=0?"+":"-")+cur.symbol+Math.abs(v).toFixed(2).replace(".",",");
  const fmtPct  = v => (v>=0?"+":"")+v.toFixed(1)+"%";
  const trialLeft = br?.user_trial_start ? daysLeft(br.user_trial_start) : (br?.trial_start ? daysLeft(br.trial_start) : TRIAL_DAYS);
  const isAdmin   = user?.email === ADMIN_EMAIL;
  const isActive  = br?.subscribed || trialLeft > 0 || isAdmin;
  const isInTrial = !br?.subscribed && trialLeft > 0;
  const effectiveSport = br?.sport==="Geral" ? (betSport||"Ténis") : (br?.sport||"Ténis");
  const markets   = SPORTS[effectiveSport]?.markets||["Outros"];
  const formSC    = SPORTS[effectiveSport]||sc;
  const userName  = user?.user_metadata?.name||user?.email?.split("@")[0]||"";
  const emptyForm = {event:"",market:markets[0]||"Vencedor do Jogo",selection:"",odd:"",units:1,result:"WIN",notes:"",cashoutVal:""};

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    if(params.get("subscribed")==="true"){ setShowSuccess(true); window.history.replaceState({},"",window.location.pathname); }
  },[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ if(session){setUser(session.user);loadBankrolls(session.user.id);}else setScreen("landing"); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>{ if(session){setUser(session.user);loadBankrolls(session.user.id);}else{setUser(null);setBankrolls([]);setScreen("landing");} });
    return()=>subscription.unsubscribe();
  },[]);

  async function loadBankrolls(uid){
    const{data}=await supabase.from("profiles").select("*").eq("user_id",uid).order("created_at");
    if(data&&data.length>0){setBankrolls(data);setActiveBR(data[0].id);await loadBets(data[0].id);setScreen("app");}
    else setScreen("setup");
  }
  async function loadBets(brId){
    const{data}=await supabase.from("bets").select("*").eq("bankroll_id",brId).order("created_at",{ascending:false});
    if(data) setBets(data.map(b=>({...b,odd:parseFloat(b.odd),stake:parseFloat(b.stake)})));
  }
  async function switchBankroll(id){setActiveBR(id);setBets([]);setDrawerOpen(false);await loadBets(id);setTab("dashboard");}

  async function handleAuth(){
    setAuthErr("");setLoading(true);
    if(authMode==="register"){
      const{error}=await supabase.auth.signUp({email:authForm.email,password:authForm.password,options:{data:{name:authForm.name}}});
      if(error){setAuthErr(error.message);setLoading(false);return;}
      setLoading(false);setEmailSent(true);return;
    } else {
      const{error}=await supabase.auth.signInWithPassword({email:authForm.email,password:authForm.password});
      if(error){setAuthErr("Email ou password incorretos.");setLoading(false);return;}
    }
    setLoading(false);
  }

  async function handleCreateBR(isEdit){
    const brv=parseFloat(brForm.bankroll);
    if(!brv||brv<=0||!brForm.name) return;
    if(isEdit&&editBRTarget){
      const updates={name:brForm.name,sport:brForm.sport,unit_pct:parseFloat(brForm.unit_pct)};
      if(brForm.reset) updates.bankroll=brv;
      const{data}=await supabase.from("profiles").update(updates).eq("id",editBRTarget.id).select().single();
      if(data){setBankrolls(prev=>prev.map(b=>b.id===data.id?data:b));setShowEditBR(false);}
    } else {
      const{data:{session}}=await supabase.auth.getSession();
      const uid=session?.user?.id||user?.id;
      const{data:existing}=await supabase.from("profiles").select("user_trial_start,trial_start").eq("user_id",uid).order("created_at",{ascending:true});
      const earliestTrial=existing?.[0]?.user_trial_start||existing?.[0]?.trial_start||new Date().toISOString();
      const userEmail=session?.user?.email||user?.email||"";
      const userDisplayName=session?.user?.user_metadata?.name||user?.user_metadata?.name||"";
      const{data}=await supabase.from("profiles").insert({user_id:uid,name:brForm.name,sport:brForm.sport,bankroll:brv,unit_pct:parseFloat(brForm.unit_pct),trial_start:new Date().toISOString(),user_trial_start:earliestTrial,subscribed:false,email:userEmail,user_name:userDisplayName}).select().single();
      if(data){setBankrolls(prev=>[...prev,data]);setActiveBR(data.id);setBets([]);setShowNewBR(false);setShowEditBR(false);setDrawerOpen(false);setBRForm({name:"",sport:"Ténis",bankroll:"",unit_pct:"2",reset:false});setScreen("app");}
    }
  }

  async function deleteBankroll(id){
    if(!window.confirm("Apagar esta banca e todos os registos? Esta ação não pode ser revertida.")) return;
    await supabase.from("bets").delete().eq("bankroll_id",id);
    await supabase.from("profiles").delete().eq("id",id);
    const remaining=bankrolls.filter(b=>b.id!==id);
    setBankrolls(remaining);
    if(remaining.length>0){setActiveBR(remaining[0].id);await loadBets(remaining[0].id);}
    else{setActiveBR(null);setBets([]);setScreen("setup");}
    setShowEditBR(false);setDrawerOpen(false);
  }

  async function handleSaveBet(){
    if(!form.event||!form.odd||!form.selection||!activeBR) return;
    const odd=parseFloat(form.odd);
    if(odd<=1) return;
    const stake=unitVal*(parseFloat(form.units)||1);
    const result=formMode==="immediate"?form.result:"PENDING";
    const payload={sport:br?.sport==="Geral"?(betSport||"Outros"):br.sport,event:form.event,market:form.market,selection:form.selection,odd,stake,units:parseFloat(form.units),result,notes:form.notes,cashout_val:form.result==="CASHOUT"?parseFloat(form.cashoutVal)||null:null};
    if(editBet){
      const{data}=await supabase.from("bets").update(payload).eq("id",editBet.id).select().single();
      if(data) setBets(prev=>prev.map(b=>b.id===data.id?{...data,odd:parseFloat(data.odd),stake:parseFloat(data.stake)}:b));
    } else {
      const{data}=await supabase.from("bets").insert({...payload,user_id:user.id,bankroll_id:activeBR,created_at:new Date().toISOString()}).select().single();
      if(data) setBets(prev=>[{...data,odd:parseFloat(data.odd),stake:parseFloat(data.stake)},...prev]);
    }
    setForm(emptyForm);setShowForm(false);setEditBet(null);setTab("diary");
  }

  async function settleBet(id,result,cashoutVal){
    await supabase.from("bets").update({result,cashout_val:cashoutVal||null}).eq("id",id);
    setBets(prev=>prev.map(b=>b.id===id?{...b,result,cashout_val:cashoutVal}:b));
  }

  async function deleteBet(id){
    if(!window.confirm("Apagar este registo?")) return;
    await supabase.from("bets").delete().eq("id",id);
    setBets(prev=>prev.filter(b=>b.id!==id));
  }

  function openEditBet(b){
    setEditBet(b);
    setForm({event:b.event||"",market:b.market||markets[0],selection:b.selection||"",odd:b.odd||"",units:b.units||1,result:b.result||"WIN",notes:b.notes||"",cashoutVal:b.cashout_val||""});
    setFormMode(b.result==="PENDING"?"pending":"immediate");
    setShowForm(true);
  }

  const stats = useMemo(()=>{
    const settled=bets.filter(b=>b.result!=="PENDING"&&b.result!=="VOID");
    const wins=bets.filter(b=>b.result==="WIN");
    const losses=bets.filter(b=>b.result==="LOSS");
    const cashouts=bets.filter(b=>b.result==="CASHOUT");
    const totalStaked=settled.reduce((s,b)=>s+b.stake,0);
    const totalReturned=wins.reduce((s,b)=>s+b.stake*b.odd,0)+cashouts.reduce((s,b)=>s+(b.cashout_val||0),0);
    const pnl=totalReturned-totalStaked;
    const roi=totalStaked>0?(pnl/totalStaked)*100:0;
    const strikeRate=wins.length+losses.length>0?(wins.length/(wins.length+losses.length))*100:0;
    const avgOdd=settled.length>0?settled.reduce((s,b)=>s+b.odd,0)/settled.length:0;
    return{settled:settled.length,wins:wins.length,losses:losses.length,pnl,roi,strikeRate,avgOdd,totalStaked,pending:bets.filter(b=>b.result==="PENDING").length};
  },[bets]);

  const brHistory = useMemo(()=>{
    let r=parseFloat(br?.bankroll||0);
    const pts=[{v:r}];
    [...bets].reverse().filter(b=>b.result!=="PENDING").forEach(b=>{
      if(b.result==="WIN") r+=b.stake*(b.odd-1);
      else if(b.result==="LOSS") r-=b.stake;
      else if(b.result==="CASHOUT") r+=(b.cashout_val||0)-b.stake;
      pts.push({v:r});
    });
    return pts;
  },[bets,br]);

  const currentBR = brHistory[brHistory.length-1]?.v||parseFloat(br?.bankroll||0);
  const unitVal   = br ? currentBR*br.unit_pct/100 : 0;

  const diaryBets = bets.filter(b=>b.created_at?.slice(0,10)===diaryDate);
  const diaryPnl  = diaryBets.filter(b=>b.result!=="PENDING"&&b.result!=="VOID").reduce((s,b)=>{
    if(b.result==="WIN") return s+b.stake*(b.odd-1);
    if(b.result==="LOSS") return s-b.stake;
    if(b.result==="CASHOUT") return s+(b.cashout_val||0)-b.stake;
    return s;
  },0);

  const reportBets   = bets.filter(b=>b.created_at?.slice(0,7)===reportMonth&&b.result!=="PENDING"&&b.result!=="VOID");
  const reportWins   = reportBets.filter(b=>b.result==="WIN").length;
  const reportLoss   = reportBets.filter(b=>b.result==="LOSS").length;
  const reportPnl    = reportBets.reduce((s,b)=>{ if(b.result==="WIN")return s+b.stake*(b.odd-1); if(b.result==="LOSS")return s-b.stake; if(b.result==="CASHOUT")return s+(b.cashout_val||0)-b.stake; return s; },0);
  const reportStaked = reportBets.reduce((s,b)=>s+b.stake,0);
  const reportROI    = reportStaked>0?(reportPnl/reportStaked)*100:0;

  const pts=brHistory;
  const maxV=Math.max(...pts.map(p=>p.v),parseFloat(br?.bankroll||0)+1);
  const minV=Math.min(...pts.map(p=>p.v),parseFloat(br?.bankroll||0)-1);
  const svgW=300,svgH=100;
  const toX=i=>pts.length<=1?svgW/2:(i/(pts.length-1))*svgW;
  const toY=v=>svgH-((v-minV)/(maxV-minV||1))*(svgH-16)-8;
  const polyline=pts.length>1?pts.map((p,i)=>`${toX(i)},${toY(p.v)}`).join(" "):null;

  // ── SWIPE ──
  function swipeStart(e){ touchX.current=e.touches[0].clientX; }
  function swipeEnd(e){ if(touchX.current!==null&&touchX.current-e.changedTouches[0].clientX>60) setDrawerOpen(false); touchX.current=null; }

  // ── LOADING ──
  if(screen==="loading") return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#f9fafb"}}>
      <div style={S.spinner}/>
    </div>
  );

  // ── LANDING ──
  if(screen==="landing") return (
    <div style={{background:"#f9fafb",minHeight:"100vh",fontFamily:"-apple-system,'Segoe UI',sans-serif",color:"#111827"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",background:"#fff",borderBottom:"1px solid #f3f4f6"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:"#f3f4f6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📊</div>
          <span style={{fontSize:16,fontWeight:800,color:"#111827"}}>BankrollPro</span>
        </div>
        <button style={S.btnOutline} onClick={()=>{setAuthMode("login");setScreen("auth");}}>Entrar</button>
      </header>

      <div style={{padding:"28px 20px 80px",maxWidth:480,margin:"0 auto"}}>
        <div style={{display:"inline-block",background:"#fef3c7",border:"1px solid #fde68a",color:"#92400e",borderRadius:6,padding:"3px 12px",fontSize:11,fontWeight:700,marginBottom:18}}>
          🔥 Oferta de lançamento — {PROMO_DAYS} dias
        </div>

        <h1 style={{fontSize:36,fontWeight:900,lineHeight:1.05,letterSpacing:"-2px",margin:"0 0 12px",color:"#111827"}}>
          Para de perder.<br/><span style={{color:"#374151"}}>Começa a gerir.</span>
        </h1>

        <p style={{fontSize:14,color:"#6b7280",lineHeight:1.7,marginBottom:24}}>
          Controla bancas por desporto, acompanha ROI em tempo real e recebe análise com IA para evoluir a tua performance.
        </p>

        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:16,marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
          <div style={{textAlign:"center",marginBottom:12,fontSize:12,color:"#dc2626",fontWeight:700}}>
            ⏰ Preço de lançamento — só nos primeiros {PROMO_DAYS} dias
          </div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1,background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 10px"}}>
              <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:600,marginBottom:4}}>Mensal</div>
              <div style={{fontSize:11,color:"#d1d5db",textDecoration:"line-through"}}>€{NORMAL_MONTHLY}/mês</div>
              <div style={{fontSize:22,fontWeight:900,color:"#111827"}}>€{PROMO_MONTHLY}<span style={{fontSize:12,fontWeight:400,color:"#9ca3af"}}>/mês</span></div>
              <div style={{fontSize:11,color:"#dc2626",fontWeight:600,marginTop:4}}>Depois €{NORMAL_MONTHLY}/mês</div>
            </div>
            <div style={{flex:1,background:"#f9fafb",border:"2px solid #111827",borderRadius:12,padding:"12px 10px"}}>
              <div style={{fontSize:9,color:"#fff",background:"#111827",borderRadius:4,padding:"2px 8px",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"inline-block"}}>POPULAR</div>
              <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:600,marginBottom:4}}>Anual</div>
              <div style={{fontSize:11,color:"#d1d5db",textDecoration:"line-through"}}>€{NORMAL_ANNUAL}/ano</div>
              <div style={{fontSize:22,fontWeight:900,color:"#111827"}}>€{PROMO_ANNUAL}<span style={{fontSize:12,fontWeight:400,color:"#9ca3af"}}>/ano</span></div>
              <div style={{fontSize:11,color:"#059669",fontWeight:700,marginTop:4}}>Depois €{NORMAL_ANNUAL}/ano · Poupas €{(NORMAL_MONTHLY*12-PROMO_ANNUAL).toFixed(0)}</div>
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
          {[["📊","Múltiplas bancas","Até 3, separadas por desporto"],["🤖","Análise IA","Feedback do teu histórico real"],["📅","Diário & Relatório","Cada dia, cada mês com precisão"],["⚡","Registo rápido","Imediato ou pendente — tu decides"]].map(([ico,t,d])=>(
            <div key={t} style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:12,padding:"14px 12px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <span style={{fontSize:24,marginBottom:8,display:"block"}}>{ico}</span>
              <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:4}}>{t}</div>
              <div style={{fontSize:12,color:"#6b7280",lineHeight:1.4}}>{d}</div>
            </div>
          ))}
        </div>

        <button style={{...S.btnPrimary,fontSize:16,padding:"16px",borderRadius:12,marginBottom:10}} onClick={()=>{setAuthMode("register");setScreen("auth");}}>
          🚀 Começar grátis — 7 dias
        </button>
        <button style={{...S.btnGhost}} onClick={()=>{setAuthMode("login");setScreen("auth");}}>
          Já tenho conta — entrar
        </button>
        <p style={{fontSize:11,color:"#9ca3af",textAlign:"center",marginTop:8}}>Sem cartão necessário · Cancela quando quiseres</p>

        <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginTop:20}}>
          {SPORT_KEYS.map(s=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:5,background:"#fff",border:"1px solid #e5e7eb",borderRadius:20,padding:"4px 10px",fontSize:12}}>
              <span>{SPORTS[s].icon}</span><span style={{color:"#6b7280"}}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── AUTH ──
  if(screen==="auth") return (
    <div style={{background:"#f9fafb",minHeight:"100vh",fontFamily:"-apple-system,'Segoe UI',sans-serif"}}>
      <div style={{padding:"14px 18px",background:"#fff",borderBottom:"1px solid #f3f4f6"}}>
        <button style={{background:"transparent",border:"none",color:"#6b7280",cursor:"pointer",fontSize:13,padding:0,fontWeight:600}} onClick={()=>setScreen("landing")}>← Voltar</button>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"calc(100vh - 56px)",padding:20}}>
        <div style={{width:"100%",maxWidth:380,background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:"28px 24px",boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>

          {emailSent ? (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:56,marginBottom:16}}>📩</div>
              <h2 style={{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 8px"}}>Conta criada! 🎉</h2>
              <p style={{fontSize:14,color:"#6b7280",lineHeight:1.6,marginBottom:20}}>
                Enviámos um email de boas-vindas para <strong>{authForm.email}</strong>. Podes entrar já de seguida.
              </p>
              <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 16px",marginBottom:20,textAlign:"left"}}>
                <div style={{fontSize:13,color:"#15803d",fontWeight:600}}>✓ Conta criada com sucesso</div>
                <div style={{fontSize:13,color:"#15803d",fontWeight:600,marginTop:4}}>✓ {TRIAL_DAYS} dias grátis ativados</div>
                <div style={{fontSize:13,color:"#15803d",fontWeight:600,marginTop:4}}>✓ Acesso imediato</div>
              </div>
              <button style={{...S.btnPrimary,marginBottom:8}} onClick={()=>{setEmailSent(false);setAuthMode("login");}}>Entrar agora →</button>
              <p style={{fontSize:11,color:"#9ca3af",textAlign:"center"}}>Verifica o email para o resumo da tua conta.</p>
            </div>
          ) : (
            <div>
              <div style={{fontSize:32,marginBottom:10}}>📊</div>
              <h2 style={{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 4px"}}>{authMode==="login"?"Bem-vindo de volta":"Criar conta grátis"}</h2>
              <p style={{fontSize:13,color:"#9ca3af",marginBottom:14}}>{authMode==="login"?"Entra na tua conta.":"7 dias grátis + preço de lançamento garantido."}</p>
              {authMode==="register" && (
                <div>
                  <label style={S.label}>Nome</label>
                  <input style={S.input} placeholder="O teu nome" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))}/>
                </div>
              )}
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="email@exemplo.com" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))}/>
              <label style={S.label}>Password</label>
              <input style={S.input} type="password" placeholder="••••••••" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))}/>
              {authErr && <p style={{color:"#dc2626",fontSize:12,margin:"6px 0",background:"#fef2f2",padding:"8px 10px",borderRadius:6}}>{authErr}</p>}
              <button style={{...S.btnPrimary,marginTop:20}} onClick={handleAuth} disabled={loading}>{loading?"...":authMode==="login"?"Entrar":"Criar conta"}</button>
              <p style={{fontSize:12,color:"#9ca3af",textAlign:"center",marginTop:14}}>
                {authMode==="login"?"Ainda não tens conta? ":"Já tens conta? "}
                <span style={{color:"#374151",cursor:"pointer",textDecoration:"underline",fontWeight:600}} onClick={()=>setAuthMode(m=>m==="login"?"register":"login")}>
                  {authMode==="login"?"Regista-te":"Entra aqui"}
                </span>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );

    // ── SETUP ──
  if(screen==="setup") return (
    <div style={{background:"#f9fafb",minHeight:"100vh",fontFamily:"-apple-system,'Segoe UI',sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}>
        <div style={{width:"100%",maxWidth:380,background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:"28px 24px",boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:32,marginBottom:8}}>💼</div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 4px"}}>Primeira banca</h2>
          <p style={{fontSize:13,color:"#9ca3af",marginBottom:12}}>Olá, {userName}! Configura a tua banca.</p>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#15803d",marginBottom:12,fontWeight:600,textAlign:"center"}}>
            🎯 Trial de 7 dias ativado · Preço de lançamento garantido
          </div>
          <BRForm form={brForm} setForm={setBRForm} showReset={false}/>
          <button style={{...S.btnPrimary,marginTop:20}} onClick={()=>handleCreateBR(false)}>Criar banca</button>
        </div>
      </div>
    </div>
  );

  // ── PAYWALL ──
  if(screen==="app" && !isActive && !isAdmin) return (
    <div style={{background:"#f9fafb",minHeight:"100vh",fontFamily:"-apple-system,'Segoe UI',sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}>
        <div style={{width:"100%",maxWidth:380,background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:"28px 24px",boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:40,marginBottom:8,textAlign:"center"}}>⏰</div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 4px",textAlign:"center"}}>Trial terminado</h2>
          <p style={{fontSize:13,color:"#9ca3af",textAlign:"center",marginBottom:16}}>Escolhe um plano para continuar.</p>

          <div style={{display:"flex",gap:4,background:"#f3f4f6",padding:4,borderRadius:10,marginBottom:12}}>
            <button style={{flex:1,padding:"8px 10px",borderRadius:8,border:"none",background:subView==="monthly"?"#fff":"transparent",color:subView==="monthly"?"#111827":"#9ca3af",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:subView==="monthly"?"0 1px 3px rgba(0,0,0,.1)":"none"}} onClick={()=>setSubView("monthly")}>Mensal</button>
            <button style={{flex:1,padding:"8px 10px",borderRadius:8,border:"none",background:subView==="annual"?"#fff":"transparent",color:subView==="annual"?"#111827":"#9ca3af",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:subView==="annual"?"0 1px 3px rgba(0,0,0,.1)":"none"}} onClick={()=>setSubView("annual")}>Anual ⭐</button>
          </div>

          <div style={{background:"#f9fafb",border:subView==="annual"?"2px solid #111827":"1px solid #e5e7eb",borderRadius:12,padding:20,textAlign:"center",marginBottom:12}}>
            {subView==="annual" && <div style={{fontSize:11,color:"#059669",fontWeight:700,marginBottom:4}}>Melhor valor · Poupas €{(NORMAL_MONTHLY*12-PROMO_ANNUAL).toFixed(0)}</div>}
            <div style={{fontSize:11,color:"#d1d5db",textDecoration:"line-through"}}>{subView==="monthly"?`€${NORMAL_MONTHLY}/mês`:`€${NORMAL_ANNUAL}/ano`}</div>
            <div style={{fontSize:28,fontWeight:900,color:"#111827",letterSpacing:"-.5px"}}>{subView==="monthly"?`€${PROMO_MONTHLY}`:`€${PROMO_ANNUAL}`}<span style={{fontSize:13,fontWeight:400,color:"#9ca3af"}}>{subView==="monthly"?"/mês":"/ano"}</span></div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:4,marginBottom:16}}>Depois {subView==="monthly"?`€${NORMAL_MONTHLY}/mês`:`€${NORMAL_ANNUAL}/ano`}</div>
            <a href={subView==="monthly"?STRIPE_MONTHLY:STRIPE_ANNUAL} target="_blank" rel="noreferrer" style={{display:"block",background:"#111827",color:"#fff",textDecoration:"none",padding:"13px",borderRadius:8,fontSize:14,fontWeight:700,textAlign:"center"}}>
              Subscrever agora →
            </a>
          </div>

          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#15803d",textAlign:"center",marginBottom:8}}>
            ✓ Acesso imediato · ✓ Cancela quando quiseres
          </div>
          <button style={S.btnGhost} onClick={()=>supabase.auth.signOut()}>Terminar sessão</button>
        </div>
      </div>
    </div>
  );

  // ── MAIN APP ──
  return (
    <div style={{background:"#f3f4f6",minHeight:"100vh",fontFamily:"-apple-system,'Segoe UI',sans-serif",color:"#111827",paddingBottom:100}} onTouchStart={swipeStart} onTouchEnd={swipeEnd}>

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowSuccess(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:28,maxWidth:360,width:"100%",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:56,marginBottom:12}}>🎉</div>
            <h2 style={{fontSize:22,fontWeight:900,color:"#111827",margin:"0 0 8px"}}>Bem-vindo ao BankrollPro!</h2>
            <p style={{fontSize:14,color:"#6b7280",lineHeight:1.6,marginBottom:20}}>A tua subscrição está ativa. Acesso completo desbloqueado.</p>
            <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 16px",marginBottom:20}}>
              <div style={{fontSize:13,color:"#15803d",fontWeight:600}}>✓ Acesso ilimitado ativado</div>
              <div style={{fontSize:13,color:"#15803d",fontWeight:600,marginTop:4}}>✓ Todas as bancas disponíveis</div>
              <div style={{fontSize:13,color:"#15803d",fontWeight:600,marginTop:4}}>✓ Análise IA em breve</div>
            </div>
            <button style={{...S.btnPrimary,background:sc.color,border:"none"}} onClick={()=>setShowSuccess(false)}>Começar agora →</button>
          </div>
        </div>
      )}

      {/* DRAWER */}
      {drawerOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:100,display:"flex"}} onClick={()=>setDrawerOpen(false)}>
          <div style={{width:300,maxWidth:"85vw",background:"#fff",height:"100%",display:"flex",flexDirection:"column",padding:20,overflowY:"auto",boxShadow:"4px 0 24px rgba(0,0,0,.1)"}} onClick={e=>e.stopPropagation()}>

            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,paddingBottom:16,borderBottom:"1px solid #f3f4f6"}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#374151",flexShrink:0}}>{userName[0]?.toUpperCase()||"U"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{userName}</div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{user?.email}</div>
              </div>
              <button style={{background:"none",border:"none",fontSize:20,color:"#9ca3af",cursor:"pointer"}} onClick={()=>setDrawerOpen(false)}>×</button>
            </div>

            {isInTrial && !isAdmin && (
              <div style={{background:"#fef3c7",border:"1px solid #fde68a",borderRadius:10,padding:"12px",marginBottom:14,fontSize:12,color:"#92400e"}}>
                <div style={{fontWeight:700,marginBottom:2}}>⏰ Trial — {trialLeft} dias restantes</div>
                <div style={{fontSize:11,marginBottom:10,color:"#b45309"}}>Subscreve agora e garantes o preço de lançamento</div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={{flex:1,background:"#fff",border:"1px solid #fde68a",borderRadius:8,padding:"8px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#9ca3af",textDecoration:"line-through"}}>€{NORMAL_MONTHLY}/mês</div>
                    <div style={{fontSize:14,fontWeight:900,color:"#92400e"}}>€{PROMO_MONTHLY}<span style={{fontSize:10,fontWeight:400}}>/mês</span></div>
                    <div style={{fontSize:9,color:"#dc2626",fontWeight:600}}>Depois €{NORMAL_MONTHLY}</div>
                    <a href={STRIPE_MONTHLY} target="_blank" rel="noreferrer" style={{display:"block",background:"#fff",border:"1px solid #92400e",color:"#92400e",borderRadius:6,padding:"5px 0",fontSize:10,fontWeight:700,textAlign:"center",textDecoration:"none",marginTop:6}}>Subscrever</a>
                  </div>
                  <div style={{flex:1,background:"#111827",border:"1px solid #111827",borderRadius:8,padding:"8px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#6b7280",textDecoration:"line-through"}}>€{NORMAL_ANNUAL}/ano</div>
                    <div style={{fontSize:14,fontWeight:900,color:"#fff"}}>€{PROMO_ANNUAL}<span style={{fontSize:10,fontWeight:400,color:"#9ca3af"}}>/ano</span></div>
                    <div style={{fontSize:9,color:"#4ade80",fontWeight:600}}>Depois €{NORMAL_ANNUAL} · Melhor valor</div>
                    <a href={STRIPE_ANNUAL} target="_blank" rel="noreferrer" style={{display:"block",background:"#fff",color:"#111827",borderRadius:6,padding:"5px 0",fontSize:10,fontWeight:700,textAlign:"center",textDecoration:"none",marginTop:6}}>Subscrever</a>
                  </div>
                </div>
              </div>
            )}

            <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:8}}>Moeda</div>
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              {Object.entries(CURRENCIES).map(([code,cur])=>(
                <button key={code} style={{flex:1,padding:"7px 4px",border:`1px solid ${currency===code?"#111827":"#e5e7eb"}`,background:currency===code?"#111827":"#fff",color:currency===code?"#fff":"#6b7280",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700}} onClick={()=>setCurrency(code)}>
                  {cur.flag} {code}
                </button>
              ))}
            </div>

            <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:8}}>As tuas bancas</div>
            {bankrolls.map(b=>{
              const bsc=SPORTS[b.sport];
              return (
                <div key={b.id} style={{display:"flex",alignItems:"center",gap:4,padding:"10px 8px",borderLeft:`3px solid ${b.id===activeBR?bsc?.color:"transparent"}`,background:b.id===activeBR?"#f9fafb":"transparent",borderRadius:"0 10px 10px 0",marginBottom:4}}>
                  <button style={{display:"flex",alignItems:"center",gap:10,flex:1,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}} onClick={()=>switchBankroll(b.id)}>
                    <span style={{fontSize:22}}>{bsc?.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{b.name}</div>
                      <div style={{fontSize:11,color:"#9ca3af"}}>{b.sport}</div>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:bsc?.color}}>{fmt(parseFloat(b.bankroll))}</span>
                  </button>
                  <button style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",padding:"0 4px",fontSize:14}} onClick={()=>{setEditBRTarget(b);setBRForm({name:b.name,sport:b.sport,bankroll:b.bankroll,unit_pct:b.unit_pct,reset:false});setShowEditBR(true);setDrawerOpen(false);}}>✏️</button>
                </div>
              );
            })}

            {bankrolls.length<MAX_BANKROLLS && (
              <button style={{display:"flex",alignItems:"center",width:"100%",padding:"10px",border:"1px dashed #e5e7eb",background:"transparent",cursor:"pointer",borderRadius:10,fontSize:13,marginTop:4,color:"#6b7280"}} onClick={()=>{setBRForm({name:"",sport:"Ténis",bankroll:"",unit_pct:"2",reset:false});setShowNewBR(true);setDrawerOpen(false);}}>
                <span style={{marginRight:8,color:"#9ca3af",fontSize:18}}>+</span>
                Nova banca ({bankrolls.length}/{MAX_BANKROLLS})
              </button>
            )}

            <div style={{flex:1}}/>

            {br?.subscribed && (
              <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 12px",marginTop:16,fontSize:12,color:"#15803d",fontWeight:600,textAlign:"center"}}>✓ Plano ativo</div>
            )}
            <button style={{...S.btnGhost,marginTop:10,fontSize:12}} onClick={()=>supabase.auth.signOut()}>Terminar sessão</button>
          </div>
        </div>
      )}

      {/* NEW BANKROLL MODAL */}
      {showNewBR && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:400,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#111827"}}>Nova Banca</h3>
              <button style={{background:"none",border:"none",color:"#9ca3af",fontSize:22,cursor:"pointer"}} onClick={()=>setShowNewBR(false)}>×</button>
            </div>
            <BRForm form={brForm} setForm={setBRForm} showReset={false}/>
            <button style={{...S.btnPrimary,marginTop:16}} onClick={()=>handleCreateBR(false)}>Criar banca</button>
          </div>
        </div>
      )}

      {/* EDIT BANKROLL MODAL */}
      {showEditBR && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:400,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#111827"}}>Editar Banca</h3>
              <button style={{background:"none",border:"none",color:"#9ca3af",fontSize:22,cursor:"pointer"}} onClick={()=>setShowEditBR(false)}>×</button>
            </div>
            <BRForm form={brForm} setForm={setBRForm} showReset={true}/>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button style={{...S.btnPrimary,flex:1}} onClick={()=>handleCreateBR(true)}>Guardar</button>
              <button style={{padding:"13px 16px",border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}} onClick={()=>deleteBankroll(editBRTarget?.id)}>🗑</button>
            </div>
          </div>
        </div>
      )}

      {/* BET FORM MODAL */}
      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:440,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#111827"}}>{editBet?"Editar Registo":`${sc.icon} Novo Registo`}</h3>
              <button style={{background:"none",border:"none",color:"#9ca3af",fontSize:22,cursor:"pointer"}} onClick={()=>{setShowForm(false);setEditBet(null);setForm(emptyForm);}}>×</button>
            </div>

            {!editBet && (
              <div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <button style={{flex:1,padding:"7px",border:`1px solid ${betType==="single"?sc.color:"#e5e7eb"}`,borderRadius:8,background:betType==="single"?sc.color:"#f9fafb",color:betType==="single"?"#fff":"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setBetType("single")}>Simples</button>
                  <button style={{flex:1,padding:"7px",border:`1px solid ${betType==="multiple"?sc.color:"#e5e7eb"}`,borderRadius:8,background:betType==="multiple"?sc.color:"#f9fafb",color:betType==="multiple"?"#fff":"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setBetType("multiple")}>Múltipla</button>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button style={{flex:1,padding:"7px",border:`1px solid ${formMode==="immediate"?sc.color:"#e5e7eb"}`,borderRadius:8,background:formMode==="immediate"?sc.color:"#f9fafb",color:formMode==="immediate"?"#fff":"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setFormMode("immediate")}>Resultado imediato</button>
                  <button style={{flex:1,padding:"7px",border:`1px solid ${formMode==="pending"?sc.color:"#e5e7eb"}`,borderRadius:8,background:formMode==="pending"?sc.color:"#f9fafb",color:formMode==="pending"?"#fff":"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setFormMode("pending")}>Deixar pendente</button>
                </div>
              </div>
            )}

            {br?.sport==="Geral" && (
              <div>
                <label style={S.label}>Desporto</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4,marginBottom:4}}>
                  {Object.keys(SPORTS).filter(s=>s!=="Geral").map(s=>(
                    <button key={s} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 10px",border:`1px solid ${betSport===s?SPORTS[s].color:"#e5e7eb"}`,borderRadius:8,background:betSport===s?SPORTS[s].color+"15":"#f9fafb",color:betSport===s?SPORTS[s].color:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:700}} onClick={()=>{setBetSport(s);setForm(f=>({...f,market:SPORTS[s].markets[0]}));}}>
                      <span>{SPORTS[s].icon}</span><span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label style={S.label}>{betType==="multiple"?"Nome da múltipla":"Evento"}</label>
            <input style={S.input} placeholder={betType==="multiple"?"ex: Múltipla Ténis 3 jogos":"ex: Sinner vs Alcaraz"} value={form.event} onChange={e=>setForm(f=>({...f,event:e.target.value}))}/>
            {betType==="multiple" && (
              <div>
                <label style={S.label}>Seleções (uma por linha)</label>
                <textarea style={{...S.input,height:80,resize:"none",fontFamily:"inherit"}} placeholder="ex: Sinner a ganhar" value={form.selections||""} onChange={e=>{const v=e.target.value;setForm(f=>({...f,selections:v,selection:v.split(/\r?\n/).filter(Boolean).join(" + ")}));}}/>
              </div>
            )}

            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1}}>
                <label style={S.label}>Odd</label>
                <input style={S.input} type="number" step="0.01" min="1.01" placeholder="1.85" value={form.odd} onChange={e=>setForm(f=>({...f,odd:e.target.value}))}/>
              </div>
              <div style={{flex:1}}>
                <label style={S.label}>Unidades</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                  {[0.25,0.5,0.75,1,1.25,1.5,1.75,2,2.5,3].map(u=>(
                    <button key={u} style={{padding:"8px 6px",border:`1px solid ${Number(form.units)===u?sc.color:"#e5e7eb"}`,borderRadius:8,background:Number(form.units)===u?sc.color:"#f9fafb",color:Number(form.units)===u?"#fff":"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700,minWidth:"18%"}} onClick={()=>setForm(f=>({...f,units:u}))}>{u}</button>
                  ))}
                </div>
              </div>
            </div>

            {form.odd && parseFloat(form.odd)>1 && (
              <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,border:`1px solid ${sc.color}33`,background:sc.color+"08",borderRadius:8,padding:"10px 12px",fontSize:13,marginTop:8}}>
                <span>Stake: <strong style={{color:sc.color}}>{fmt(unitVal*(parseFloat(form.units)||1))}</strong></span>
                <span style={{marginLeft:"auto"}}>Retorno: <strong style={{color:"#059669"}}>{fmt(unitVal*(parseFloat(form.units)||1)*parseFloat(form.odd))}</strong></span>
              </div>
            )}

            {betType==="single" && (
              <div>
                <label style={S.label}>Mercado</label>
                <select style={S.input} value={form.market} onChange={e=>setForm(f=>({...f,market:e.target.value}))}>
                  {markets.map(m=><option key={m}>{m}</option>)}
                </select>
                <label style={S.label}>Seleção</label>
                <input style={S.input} placeholder="ex: Sinner / Over 22.5 Games" value={form.selection} onChange={e=>setForm(f=>({...f,selection:e.target.value}))}/>
              </div>
            )}



            {(formMode==="immediate"||editBet) && (
              <div>
                <label style={S.label}>Resultado</label>
                <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                  {[["WIN","✓ Green","#059669","#f0fdf4","#bbf7d0"],["LOSS","✗ Red","#dc2626","#fef2f2","#fca5a5"],["PENDING","⏳ Pendente","#7c3aed","#faf5ff","#c4b5fd"],["CASHOUT","💰 Cash","#2563eb","#eff6ff","#93c5fd"],["VOID","Void","#92400e","#fefce8","#fde68a"]].map(([r,l,c,bg,border])=>(
                    <button key={r} style={{flex:1,minWidth:"30%",padding:"8px 4px",borderRadius:8,border:`1px solid ${form.result===r?c:border}`,background:form.result===r?bg:"#fff",color:form.result===r?c:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:700}} onClick={()=>setForm(f=>({...f,result:r}))}>{l}</button>
                  ))}
                </div>
                {form.result==="CASHOUT" && (
                  <div>
                    <label style={S.label}>Valor cashout</label>
                    <input style={S.input} type="number" placeholder="ex: 12.50" value={form.cashoutVal} onChange={e=>setForm(f=>({...f,cashoutVal:e.target.value}))}/>
                  </div>
                )}
              </div>
            )}

            <label style={S.label}>Notas (opcional)</label>
            <input style={S.input} placeholder="Raciocínio, contexto..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
            <button style={{...S.btnPrimary,marginTop:18,background:sc.color,border:"none"}} onClick={handleSaveBet}>{editBet?"Guardar alterações":"Guardar registo"}</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:"#fff",borderBottom:"1px solid #f3f4f6",position:"sticky",top:0,zIndex:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <button style={{display:"flex",flexDirection:"column",gap:4,background:"none",border:"none",cursor:"pointer",padding:"6px",borderRadius:8}} onClick={()=>setDrawerOpen(true)}>
          <div style={{width:20,height:2,background:"#9ca3af",borderRadius:2}}/>
          <div style={{width:20,height:2,background:"#9ca3af",borderRadius:2}}/>
          <div style={{width:20,height:2,background:"#9ca3af",borderRadius:2}}/>
        </button>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:18}}>{sc.icon}</span>
          <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>{br?.name||"BankrollPro"}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {isInTrial && !isAdmin && <span style={{borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:600,color:"#92400e",background:"#fef3c7",border:"1px solid #fde68a",cursor:"pointer"}} onClick={()=>setDrawerOpen(true)}>{trialLeft}d ⏰</span>}
          <span style={{borderRadius:6,padding:"3px 10px",fontSize:13,fontWeight:800,color:sc.color,background:sc.color+"15",border:`1px solid ${sc.color}33`}}>{fmt(currentBR)}</span>
        </div>
      </header>

      {/* TRIAL URGENCY BAR */}
      {isInTrial && trialLeft<=3 && !isAdmin && (
        <div style={{background:"#fef3c7",borderBottom:"1px solid #fde68a",padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:"#92400e",fontWeight:700}}>⚠️ Trial termina em {trialLeft} {trialLeft===1?"dia":"dias"}</span>
          <a href={STRIPE_ANNUAL} target="_blank" rel="noreferrer" style={{fontSize:11,fontWeight:800,textDecoration:"none",background:"#111827",color:"#fff",padding:"4px 10px",borderRadius:6}}>Subscrever €{PROMO_ANNUAL}/ano</a>
        </div>
      )}

      {/* NAV */}
      <nav style={{display:"flex",background:"#fff",borderBottom:"1px solid #f3f4f6",overflowX:"auto"}}>
        {[["dashboard","Banca"],["diary","Diário"],["report","Relatório"],["chart","Gráfico"],["ai","IA"],["sobre","Info"]].concat(isAdmin?[["admin","Admin"]]:[]).map(([v,l])=>(
          <button key={v} style={{flex:1,padding:"11px 4px",border:"none",borderBottom:`2px solid ${tab===v?sc.color:"transparent"}`,background:"transparent",color:tab===v?sc.color:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}} onClick={()=>setTab(v)}>{l}</button>
        ))}
      </nav>

      {/* MAIN */}
      <main style={{maxWidth:680,margin:"0 auto",padding:"14px 12px"}}>

        {/* DASHBOARD */}
        {tab==="dashboard" && (
          <div>
            <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:20,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>Banca Atual</div>
                  <div style={{fontSize:34,fontWeight:900,color:"#111827",letterSpacing:"-1.5px",lineHeight:1}}>{fmt(currentBR)}</div>
                  <div style={{fontSize:13,marginTop:6,color:currentBR>=(br?.bankroll||0)?"#059669":"#dc2626",fontWeight:600}}>{fmtPct(((currentBR-(br?.bankroll||0))/(br?.bankroll||1))*100)} desde o início</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>P&L Total</div>
                  <div style={{fontSize:22,fontWeight:800,color:stats.pnl>=0?"#059669":"#dc2626",letterSpacing:"-1px"}}>{fmtP(stats.pnl)}</div>
                  <div style={{fontSize:12,color:stats.roi>=0?"#059669":"#dc2626",fontWeight:600,marginTop:4}}>ROI {fmtPct(stats.roi)}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,borderTop:"1px solid #f3f4f6",paddingTop:14}}>
                {[["Acerto",stats.strikeRate.toFixed(1)+"%"],["Odd Média",stats.avgOdd.toFixed(2)],["Unidade",fmt(unitVal)],["Pendentes",stats.pending]].map(([l,v])=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:15,fontWeight:800,color:"#111827"}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[["Acertos",stats.wins,"#059669","#f0fdf4"],["Erros",stats.losses,"#dc2626","#fef2f2"],["Total",stats.settled,"#374151","#f9fafb"]].map(([l,v,c,bg])=>(
                <div key={l} style={{background:bg,border:`1px solid ${c}22`,borderRadius:14,padding:"12px 10px",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontSize:10,color:c,textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>

            {stats.pending>0 && (
              <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>Pendentes · {stats.pending}</div>
                {bets.filter(b=>b.result==="PENDING").map(b=>(
                  <div key={b.id} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f9fafb",gap:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.selection||b.event}</div>
                      <div style={{fontSize:11,color:"#9ca3af"}}>@{b.odd.toFixed(2)} · {fmt(b.stake)}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button style={S.bWin} onClick={()=>settleBet(b.id,"WIN")}>✓</button>
                      <button style={S.bLoss} onClick={()=>settleBet(b.id,"LOSS")}>✗</button>
                      <button style={{padding:"5px 8px",borderRadius:8,border:"1px solid #f3f4f6",background:"transparent",color:"#d1d5db",cursor:"pointer",fontSize:13}} onClick={()=>openEditBet(b)}>✏️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DIÁRIO */}
        {tab==="diary" && (
          <div>
            <div style={{display:"flex",alignItems:"center",background:"#fff",border:"1px solid #f3f4f6",borderRadius:12,padding:"10px 14px",marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <button style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#374151",flexShrink:0}} onClick={()=>{ const dt=new Date(diaryDate+"T00:00:00"); dt.setDate(dt.getDate()-1); setDiaryDate(padDate(dt)); }}>‹</button>
              <div style={{flex:1,textAlign:"center",fontSize:13,fontWeight:700,color:"#111827"}}>{fmtDate(diaryDate)}</div>
              <button style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#374151",flexShrink:0}} onClick={()=>{ const dt=new Date(diaryDate+"T00:00:00"); dt.setDate(dt.getDate()+1); setDiaryDate(padDate(dt)); }}>›</button>
            </div>

            <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>Lucro do dia</div>
                  <div style={{fontSize:26,fontWeight:900,color:diaryPnl>=0?"#059669":"#dc2626",letterSpacing:"-1px"}}>{fmtP(diaryPnl)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>Registos</div>
                  <div style={{fontSize:26,fontWeight:900,color:"#374151"}}>{diaryBets.length}</div>
                </div>
              </div>
            </div>

            {diaryBets.length===0 && (
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <div style={{fontSize:36,marginBottom:8}}>{sc.icon}</div>
                <div style={{fontSize:14,color:"#9ca3af"}}>Sem registos neste dia.</div>
                <div style={{fontSize:12,color:"#d1d5db",marginTop:4}}>Clica em + para adicionar</div>
              </div>
            )}

            {diaryBets.map(b=>{
              const isWin=b.result==="WIN",isLoss=b.result==="LOSS",isPending=b.result==="PENDING";
              const borderColor=isWin?"#059669":isLoss?"#dc2626":isPending?"#7c3aed":"#d1d5db";
              return (
                <div key={b.id} style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:14,marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,.04)",borderLeft:`3px solid ${borderColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{b.event}</div>
                      <div style={{fontSize:12,color:"#6b7280",marginTop:1}}>{b.market} · <strong style={{color:"#374151"}}>{b.selection}</strong></div>
                      <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>ODD {b.odd.toFixed(2)} · Stake {fmt(b.stake)}</div>
                      {b.notes && <div style={{fontSize:11,color:"#9ca3af",fontStyle:"italic",marginTop:2}}>"{b.notes}"</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                      <div style={{fontSize:13,fontWeight:800,color:isWin?"#059669":isLoss?"#dc2626":isPending?"#7c3aed":b.result==="CASHOUT"?"#2563eb":"#9ca3af"}}>
                        {isWin?fmtP(b.stake*(b.odd-1)):isLoss?fmtP(-b.stake):isPending?"Pendente":b.result==="CASHOUT"?fmtP((b.cashout_val||0)-b.stake):"—"}
                      </div>
                      {isWin && <div style={{fontSize:11,color:"#9ca3af"}}>Retorno {fmt(b.stake*b.odd)}</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:10,paddingTop:10,borderTop:"1px solid #f3f4f6"}}>
                    {isPending && (
                      <div style={{display:"flex",gap:6,flex:1,flexWrap:"wrap"}}>
                        <button style={S.bWin} onClick={()=>settleBet(b.id,"WIN")}>✓ Green</button>
                        <button style={S.bLoss} onClick={()=>settleBet(b.id,"LOSS")}>✗ Red</button>
                        <button style={S.bCash} onClick={()=>{const v=parseFloat(prompt("Valor do cashout:"));if(v>=0)settleBet(b.id,"CASHOUT",v);}}>Cash</button>
                        <button style={S.bVoid} onClick={()=>settleBet(b.id,"VOID")}>Void</button>
                      </div>
                    )}
                    <button style={{padding:"5px 8px",borderRadius:8,border:"1px solid #f3f4f6",background:"transparent",color:"#d1d5db",cursor:"pointer",fontSize:13,marginLeft:"auto"}} onClick={()=>openEditBet(b)}>✏️</button>
                    <button style={{padding:"5px 8px",borderRadius:8,border:"1px solid #f3f4f6",background:"transparent",color:"#d1d5db",cursor:"pointer",fontSize:13}} onClick={()=>deleteBet(b.id)}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RELATÓRIO */}
        {tab==="report" && (
          <div>
            <div style={{display:"flex",alignItems:"center",background:"#fff",border:"1px solid #f3f4f6",borderRadius:12,padding:"10px 14px",marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <button style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#374151",flexShrink:0}} onClick={()=>{ const d=new Date(reportMonth+"-01"); d.setMonth(d.getMonth()-1); setReportMonth(d.toISOString().slice(0,7)); }}>‹</button>
              <div style={{flex:1,textAlign:"center",fontSize:14,fontWeight:700,color:"#111827"}}>{monthLabel(reportMonth+"-01")}</div>
              <button style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#374151",flexShrink:0}} onClick={()=>{ const d=new Date(reportMonth+"-01"); d.setMonth(d.getMonth()+1); setReportMonth(d.toISOString().slice(0,7)); }}>›</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[["Banca Inicial",fmt(parseFloat(br?.bankroll||0))],["Banca Final",fmt(currentBR)],["Entradas",reportBets.length]].map(([l,v])=>(
                <div key={l} style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:12,textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#111827"}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[["Acertos",reportWins,"#059669"],["Erros",reportLoss,"#dc2626"],["% Acertos",reportWins+reportLoss>0?((reportWins/(reportWins+reportLoss))*100).toFixed(1)+"%":"—","#374151"]].map(([l,v,c])=>(
                <div key={l} style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:12,textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>{l}</div>
                  <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div style={{background:reportPnl>=0?"#f0fdf4":"#fef2f2",border:`1px solid ${reportPnl>=0?"#bbf7d0":"#fca5a5"}`,borderRadius:14,padding:16,textAlign:"center"}}>
                <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>Lucro do Mês</div>
                <div style={{fontSize:22,fontWeight:900,color:reportPnl>=0?"#059669":"#dc2626"}}>{fmtP(reportPnl)}</div>
              </div>
              <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:16,textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>ROI do Mês</div>
                <div style={{fontSize:22,fontWeight:900,color:reportROI>=0?"#059669":"#dc2626"}}>{fmtPct(reportROI)}</div>
              </div>
            </div>

            {reportBets.length>0 && (()=>{
              const byDay={};
              reportBets.forEach(b=>{
                const d=b.created_at?.slice(0,10)||"";
                if(!byDay[d]) byDay[d]={staked:0,returned:0,pnl:0,count:0};
                byDay[d].count++;byDay[d].staked+=b.stake;
                if(b.result==="WIN"){byDay[d].returned+=b.stake*b.odd;byDay[d].pnl+=b.stake*(b.odd-1);}
                else if(b.result==="LOSS") byDay[d].pnl-=b.stake;
                else if(b.result==="CASHOUT"){byDay[d].returned+=(b.cashout_val||0);byDay[d].pnl+=(b.cashout_val||0)-b.stake;}
              });
              return (
                <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>Por dia</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,borderBottom:"1px solid #f3f4f6",paddingBottom:6,marginBottom:6}}>
                    {["Dia","Invest.","Retorno","Lucro"].map(h=><div key={h} style={{fontSize:9,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,textAlign:"center"}}>{h}</div>)}
                  </div>
                  {Object.entries(byDay).sort(([a],[b])=>a>b?1:-1).map(([d,v])=>(
                    <div key={d} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,padding:"6px 0",borderBottom:"1px solid #f9fafb"}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#374151",textAlign:"center"}}>{new Date(d+"T00:00:00").getDate()}</div>
                      <div style={{fontSize:12,color:"#6b7280",textAlign:"center"}}>{fmt(v.staked)}</div>
                      <div style={{fontSize:12,color:"#6b7280",textAlign:"center"}}>{fmt(v.returned)}</div>
                      <div style={{fontSize:12,fontWeight:700,color:v.pnl>=0?"#059669":"#dc2626",textAlign:"center"}}>{fmtP(v.pnl)}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* GRÁFICO */}
        {tab==="chart" && (
          <div>
            <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:20,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>Evolução da Banca</div>
              {pts.length>1 ? (
                <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{width:"100%",height:160,display:"block"}}>
                  <defs>
                    <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sc.color} stopOpacity="0.15"/>
                      <stop offset="100%" stopColor={sc.color} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {[0.25,0.5,0.75].map(p=><line key={p} x1="0" y1={svgH*p} x2={svgW} y2={svgH*p} stroke="#f3f4f6" strokeWidth="1"/>)}
                  <polygon points={`0,${svgH} ${polyline} ${svgW},${svgH}`} fill="url(#cf)"/>
                  <polyline points={polyline} fill="none" stroke={sc.color} strokeWidth="2.5" strokeLinejoin="round"/>
                  <line x1="0" y1={toY(parseFloat(br?.bankroll||0))} x2={svgW} y2={toY(parseFloat(br?.bankroll||0))} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3"/>
                  <circle cx={toX(0)} cy={toY(pts[0].v)} r="3" fill={sc.color}/>
                  <circle cx={toX(pts.length-1)} cy={toY(pts[pts.length-1].v)} r="4" fill={sc.color}/>
                </svg>
              ) : (
                <div style={{textAlign:"center",padding:"32px 0",color:"#d1d5db"}}>
                  <div style={{fontSize:36,marginBottom:8}}>{sc.icon}</div>
                  <div style={{fontSize:13,color:"#9ca3af"}}>Adiciona registos para ver a evolução.</div>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>Início</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#374151"}}>{fmt(parseFloat(br?.bankroll||0))}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>Atual</div>
                  <div style={{fontSize:14,fontWeight:700,color:currentBR>=parseFloat(br?.bankroll||0)?"#059669":"#dc2626"}}>{fmt(currentBR)}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>Diferença</div>
                  <div style={{fontSize:14,fontWeight:700,color:stats.pnl>=0?"#059669":"#dc2626"}}>{fmtP(stats.pnl)}</div>
                </div>
              </div>
            </div>

            {(()=>{
              const byMonth={};
              bets.filter(b=>b.result!=="PENDING"&&b.result!=="VOID").forEach(b=>{
                const m=b.created_at?.slice(0,7)||"";
                if(!byMonth[m]) byMonth[m]=0;
                if(b.result==="WIN") byMonth[m]+=b.stake*(b.odd-1);
                else if(b.result==="LOSS") byMonth[m]-=b.stake;
                else if(b.result==="CASHOUT") byMonth[m]+=(b.cashout_val||0)-b.stake;
              });
              const entries=Object.entries(byMonth).sort(([a],[b])=>a>b?1:-1);
              if(!entries.length) return null;
              const maxAbs=Math.max(...entries.map(([,v])=>Math.abs(v)),1);
              return (
                <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>Por Mês</div>
                  {entries.map(([m,v])=>(
                    <div key={m} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,color:"#6b7280"}}>{monthLabel(m+"-01")}</span>
                        <span style={{fontSize:13,fontWeight:700,color:v>=0?"#059669":"#dc2626"}}>{fmtP(v)}</span>
                      </div>
                      <div style={{height:8,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(Math.abs(v)/maxAbs)*100}%`,background:v>=0?sc.color:"#dc2626",borderRadius:4}}/>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* IA */}
        {tab==="ai" && (
          <div>
            <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:20,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <span style={{fontSize:28}}>🤖</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:800,color:"#111827"}}>Análise IA · {br?.sport}</div>
                  <div style={{display:"inline-block",background:"#fef3c7",border:"1px solid #fde68a",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700,color:"#92400e",marginTop:4}}>Em breve</div>
                </div>
                {(br?.subscribed || isAdmin) && (
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700}}>Análises</div>
                    <div style={{fontSize:16,fontWeight:900,color:sc.color}}>{isAdmin?"∞":aiUsage+"/"+(br?.plan==="annual"?AI_LIMIT_ANNUAL:AI_LIMIT_MONTHLY)}</div>
                    <div style={{fontSize:10,color:"#9ca3af"}}>este mês</div>
                  </div>
                )}
              </div>
              <p style={{color:"#6b7280",fontSize:13,lineHeight:1.6,marginBottom:16}}>
                Análise personalizada do teu histórico com score de saúde da banca, identificação dos melhores mercados e recomendações.
              </p>

              {!br?.subscribed && !isAdmin && (
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#15803d",marginBottom:10}}>🔒 Funcionalidade exclusiva para subscritores</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <a href={STRIPE_MONTHLY} target="_blank" rel="noreferrer" style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 12px",textDecoration:"none"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>Plano Mensal</div>
                        <div style={{fontSize:11,color:"#6b7280"}}>{AI_LIMIT_MONTHLY} análises por mês · €{PROMO_MONTHLY}/mês</div>
                      </div>
                      <div style={{fontSize:12,fontWeight:700,color:"#15803d",flexShrink:0}}>Subscrever →</div>
                    </a>
                    <a href={STRIPE_ANNUAL} target="_blank" rel="noreferrer" style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#111827",borderRadius:8,padding:"10px 12px",textDecoration:"none"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Plano Anual ⭐</div>
                        <div style={{fontSize:11,color:"#9ca3af"}}>{AI_LIMIT_ANNUAL} análises por mês · €{PROMO_ANNUAL}/ano</div>
                      </div>
                      <div style={{fontSize:12,fontWeight:700,color:"#4ade80",flexShrink:0}}>Subscrever →</div>
                    </a>
                  </div>
                </div>
              )}

              {!isAdmin && br?.subscribed && aiUsage>=(br?.plan==="annual"?AI_LIMIT_ANNUAL:AI_LIMIT_MONTHLY) ? (
                <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"12px",textAlign:"center",fontSize:13,color:"#dc2626",fontWeight:600}}>
                  Limite mensal atingido · Renova no próximo mês
                </div>
              ) : (
                <button style={{...S.btnPrimary,background:sc.color,border:"none"}}
                  onClick={async()=>{
                    if(stats.settled<3) return;
                    setLoadingFB(true);setFeedback(null);
                    const fb=await getAIFeedback(bets,stats,currentBR,br?.sport);
                    if(fb&&!fb.error){setFeedback(fb);setAiUsage(u=>u+1);}
                    setLoadingFB(false);
                  }}
                  disabled={loadingFB||stats.settled<3}>
                  {loadingFB?"A analisar...":stats.settled<3?`Precisas de ${3-stats.settled} registo(s) liquidados`:"Analisar agora"}
                </button>
              )}
            </div>

            {loadingFB && (
              <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:40,textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.04)",marginTop:10}}>
                <div style={S.spinner}/>
                <div style={{fontSize:13,color:"#9ca3af",marginTop:16}}>A analisar o teu histórico...</div>
              </div>
            )}

            {feedback?.error && !loadingFB && (
              <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"12px",textAlign:"center",fontSize:13,color:"#dc2626",marginTop:10}}>
                Erro na análise. Tenta novamente mais tarde.
              </div>
            )}

            {!feedback && !loadingFB && (
              <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                {["Score de saúde da banca","Identificação dos melhores mercados","Alertas de risco personalizados","Recomendações baseadas no histórico"].map(f=>(
                  <div key={f} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1px solid #f3f4f6",borderRadius:10,padding:"10px 14px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                    <span style={{color:sc.color,fontWeight:700}}>→</span>
                    <span style={{fontSize:13,color:"#374151"}}>{f}</span>
                  </div>
                ))}
              </div>
            )}

            {feedback && !feedback.error && !loadingFB && (
              <div>
                <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:20,textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.04)",marginTop:10}}>
                  <div style={{width:90,height:90,borderRadius:"50%",border:`3px solid ${sc.color}44`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto",background:"#f9fafb"}}>
                    <div style={{fontSize:32,fontWeight:900,color:(feedback.score||0)>=7?"#059669":(feedback.score||0)>=4?"#d97706":"#dc2626"}}>{feedback.score||"—"}</div>
                    <div style={{fontSize:10,color:"#9ca3af"}}>/10</div>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:"#111827",marginTop:12}}>{feedback.headline||""}</div>
                </div>
                {feedback.warnings?.length>0 && (
                  <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:14,padding:16,marginTop:10}}>
                    <div style={{fontSize:10,color:"#92400e",textTransform:"uppercase",letterSpacing:1,marginBottom:10,fontWeight:800}}>⚠️ Alertas</div>
                    {feedback.warnings.map((w,i)=><p key={i} style={{color:"#78350f",fontSize:13,margin:"6px 0",lineHeight:1.5}}>{w}</p>)}
                  </div>
                )}
                <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:16,marginTop:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>Insights</div>
                  {(feedback.insights||[]).map((ins,i)=>(
                    <div key={i} style={{display:"flex",padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                      <span style={{color:sc.color,marginRight:10,flexShrink:0,fontWeight:700}}>→</span>
                      <span style={{color:"#374151",fontSize:13,lineHeight:1.5}}>{ins}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:16,marginTop:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>Recomendações</div>
                  {(feedback.tips||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                      <span style={{color:"#059669",marginRight:10,flexShrink:0,fontWeight:700}}>✓</span>
                      <span style={{color:"#374151",fontSize:13,lineHeight:1.5}}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SOBRE */}
        {tab==="sobre" && (
          <div>
            <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:24,textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.04)",marginBottom:10}}>
              <div style={{fontSize:48,marginBottom:12}}>📊</div>
              <div style={{fontSize:20,fontWeight:900,color:"#111827",marginBottom:4}}>BankrollPro</div>
              <div style={{fontSize:13,color:"#9ca3af",marginBottom:16}}>Gestão profissional de banca desportiva</div>
              <div style={{background:"#f9fafb",border:"1px solid #f3f4f6",borderRadius:10,padding:"12px 16px",marginBottom:16,textAlign:"left"}}>
                <div style={{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:8}}>Desenvolvido por</div>
                <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>BankrollPro Team</div>
                <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Todos os direitos reservados</div>
              </div>
              <div style={{background:"#f9fafb",border:"1px solid #f3f4f6",borderRadius:10,padding:"12px 16px",marginBottom:20,textAlign:"left"}}>
                <div style={{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:8}}>Plano atual</div>
                <div style={{fontSize:14,fontWeight:700,color:br?.subscribed?"#059669":"#d97706"}}>{br?.subscribed?`Plano ${br?.plan==="annual"?"Anual":"Mensal"} · Ativo`:`Trial · ${trialLeft} dias restantes`}</div>
                {br?.subscribed&&<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Análises IA: {br?.plan==="annual"?AI_LIMIT_ANNUAL:AI_LIMIT_MONTHLY}/mês</div>}
              </div>
              <a href={`mailto:tome.luis.pt@gmail.com?subject=Suporte BankrollPro&body=Olá BankrollPro Team,%0A%0A`}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#111827",color:"#fff",textDecoration:"none",padding:"14px",borderRadius:10,fontSize:14,fontWeight:700}}>
                ✉️ Contactar Suporte
              </a>

            </div>

            <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:14}}>O que está incluído</div>
              {[["📊","Múltiplas bancas","Até 3 bancas separadas por desporto"],["📅","Diário de apostas","Registo completo com resultado imediato ou pendente"],["📈","Relatório mensal","Métricas detalhadas por mês e por dia"],["📉","Gráfico de evolução","Acompanha a evolução da tua banca visualmente"],["🤖","Análise IA","Feedback personalizado baseado no teu histórico (em breve)"],["💱","Múltiplas moedas","€, R$ e $"]].map(([ico,t,d])=>(
                <div key={t} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid #f9fafb"}}>
                  <span style={{fontSize:20,flexShrink:0}}>{ico}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{t}</div>
                    <div style={{fontSize:12,color:"#9ca3af"}}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIN */}
        {tab==="admin" && isAdmin && (
          <AdminPanel supabase={supabase} fmt={fmt} daysLeft={daysLeft}/>
        )}

      </main>

      {/* FAB */}
      <button style={{position:"fixed",bottom:24,right:18,width:56,height:56,borderRadius:"50%",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,.2)",zIndex:20,fontSize:28,lineHeight:1,background:sc.color}} onClick={()=>{setForm(emptyForm);setEditBet(null);setBetSport("");setShowForm(true);}}>+</button>

    </div>
  );
}

// ── BRForm Component ──────────────────────────────────────────────────────────
function BRForm({ form, setForm, showReset }) {
  return (
    <div>
      <label style={S.label}>Nome da banca</label>
      <input style={S.input} placeholder="ex: Ténis Principal" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
      <label style={S.label}>Desporto</label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:4}}>
        {Object.keys(SPORTS).map(s=>(
          <button key={s} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",border:`1px solid ${form.sport===s?SPORTS[s].color:"#e5e7eb"}`,borderRadius:10,background:"#f9fafb",cursor:"pointer",color:form.sport===s?SPORTS[s].color:"#9ca3af",fontSize:10,fontWeight:600}} onClick={()=>setForm(f=>({...f,sport:s}))}>
            <span style={{fontSize:20}}>{SPORTS[s].icon}</span>
            <span>{s}</span>
          </button>
        ))}
      </div>
      <label style={S.label}>Bankroll {showReset?"(novo valor se repuser)":""} (€)</label>
      <input style={S.input} type="number" placeholder="ex: 500" value={form.bankroll} onChange={e=>setForm(f=>({...f,bankroll:e.target.value}))}/>
      <label style={S.label}>Unidade (% do bankroll)</label>
      <input style={S.input} type="number" step="0.5" min="0.5" max="10" value={form.unit_pct} onChange={e=>setForm(f=>({...f,unit_pct:e.target.value}))}/>
      {form.bankroll && <p style={{fontSize:12,color:"#9ca3af",margin:"6px 0 0"}}>1 unidade = <strong>€{((parseFloat(form.bankroll)||0)*(parseFloat(form.unit_pct)||2)/100).toFixed(2)}</strong> · Recomendamos 1–2%</p>}
      {showReset && (
        <label style={{display:"flex",alignItems:"center",gap:8,marginTop:14,cursor:"pointer",fontSize:12,color:"#dc2626",fontWeight:600}}>
          <input type="checkbox" checked={form.reset||false} onChange={e=>setForm(f=>({...f,reset:e.target.checked}))} style={{width:16,height:16}}/>
          Repor bankroll para o valor acima
        </label>
      )}
    </div>
  );
}

// ── AdminPanel Component ──────────────────────────────────────────────────────
function AdminPanel({ supabase, fmt, daysLeft }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    async function load(){
      setLoading(true);
      const{data:profiles}=await supabase.from("profiles").select("user_id,name,user_name,email,subscribed,plan,trial_start,user_trial_start,bankroll,sport,created_at").order("created_at",{ascending:false});
      if(profiles){
        const users={};
        profiles.forEach(p=>{ if(!users[p.user_id]) users[p.user_id]={...p,bancas:1}; else users[p.user_id].bancas++; });
        const list=Object.values(users);
        setData({ total:list.length, paid:list.filter(u=>u.subscribed).length, trial:list.filter(u=>!u.subscribed&&daysLeft(u.user_trial_start||u.trial_start)>0).length, expired:list.filter(u=>!u.subscribed&&daysLeft(u.user_trial_start||u.trial_start)===0).length, users:list });
      }
      setLoading(false);
    }
    load();
  },[]);

  if(loading) return <div style={{textAlign:"center",padding:40}}><div style={S.spinner}/></div>;

  return (
    <div>
      <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:14}}>Painel de Administração</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {[["Total Utilizadores",data?.total,"#111827"],["Subscritores Pagos",data?.paid,"#059669"],["Em Trial",data?.trial,"#d97706"],["Trial Expirado",data?.expired,"#dc2626"]].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
            <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>{l}</div>
            <div style={{fontSize:28,fontWeight:900,color:c}}>{v||0}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:14,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:14}}>Utilizadores</div>
        {data?.users.map(u=>{
          const tl=daysLeft(u.user_trial_start||u.trial_start);
          const status=u.subscribed?"Pago":tl>0?`Trial (${tl}d)`:"Expirado";
          const sc=u.subscribed?"#059669":tl>0?"#d97706":"#dc2626";
          return (
            <div key={u.user_id} style={{padding:"12px 0",borderBottom:"1px solid #f9fafb"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.user_name||u.email||u.user_id.slice(0,8)+"..."}</div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{u.email&&u.user_name?u.email:""}</div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{u.bancas} banca{u.bancas>1?"s":""} · {new Date(u.created_at).toLocaleDateString("pt-PT")}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:sc}}>{status}</div>
                </div>
              </div>

            </div>
          );
        })}
        {!data?.users.length && <div style={{textAlign:"center",color:"#9ca3af",padding:20}}>Nenhum utilizador ainda.</div>}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  spinner: { width:28,height:28,border:"2px solid #e5e7eb",borderTop:"2px solid #6b7280",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto" },
  btnPrimary: { width:"100%",background:"#111827",color:"#fff",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer" },
  btnGhost:   { width:"100%",background:"transparent",border:"1px solid #e5e7eb",color:"#6b7280",borderRadius:8,padding:"12px",fontSize:13,cursor:"pointer",marginTop:4 },
  btnOutline: { background:"#fff",border:"1px solid #d1d5db",color:"#374151",borderRadius:8,padding:"7px 16px",fontSize:13,cursor:"pointer",fontWeight:600 },
  label: { fontSize:12,color:"#374151",marginBottom:4,marginTop:12,display:"block",fontWeight:600 },
  input: { width:"100%",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,color:"#111827",padding:"11px 12px",fontSize:14,boxSizing:"border-box",outline:"none" },
  bWin:  { padding:"6px 12px",borderRadius:8,border:"1px solid #bbf7d0",background:"#f0fdf4",color:"#15803d",cursor:"pointer",fontSize:12,fontWeight:700 },
  bLoss: { padding:"6px 12px",borderRadius:8,border:"1px solid #fca5a5",background:"#fef2f2",color:"#b91c1c",cursor:"pointer",fontSize:12,fontWeight:700 },
  bCash: { padding:"6px 10px",borderRadius:8,border:"1px solid #93c5fd",background:"#eff6ff",color:"#1d4ed8",cursor:"pointer",fontSize:12,fontWeight:700 },
  bVoid: { padding:"6px 10px",borderRadius:8,border:"1px solid #fde68a",background:"#fefce8",color:"#92400e",cursor:"pointer",fontSize:12,fontWeight:700 },
};

if(typeof document!=="undefined"){
  const s=document.createElement("style");
  s.textContent=`@keyframes spin{to{transform:rotate(360deg)}} select option{background:#f9fafb} *{-webkit-tap-highlight-color:transparent;box-sizing:border-box} input:focus,select:focus{border-color:#9ca3af!important;outline:none}`;
  document.head.appendChild(s);
}
