import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { loadStripe } from "https://cdn.jsdelivr.net/npm/@stripe/stripe-js/+esm";

const SUPABASE_URL = "https://opeuermurrbzpglbkmrf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZXVlcm11cnJienBnbGJrbXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjA2NTAsImV4cCI6MjA5NDU5NjY1MH0.M-VclAmrSl0gop_7IvXh7-HH7nj5DwMFLVCMIOa3Qfw";
const STRIPE_KEY    = "pk_test_51TY69iPDBkFhOFXxSS9aPU8YSFZD5pdds2TSCGAawm36ZXSznfOJLahTu6d6KMw0Q1AffvdyQM8KLTrvKiWbYdCF00l0adSiVk";
const PRICE_MONTHLY = "price_1TY6GAPDBkFhOFXxt2mORXRN";
const PRICE_ANNUAL  = "price_1TY85vPDBkFhOFXxSr5DfJJC";
const TRIAL_DAYS    = 7;
const MAX_BANKROLLS = 3;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SPORTS_CONFIG = {
  "Ténis":       { icon:"🎾", color:"#0ea5e9", markets:["Vencedor do Jogo","Handicap Games","Total Games O/U","Set Winner","Total Sets O/U","Resultado Correto Sets","1º Set Vencedor","Total Games 1º Set","Handicap Sets","Dupla Hipótese","Tie-Break no Jogo","1º Break de Serviço","Jogo em Deuce","Total Aces O/U","Total Double Faults O/U","Outros"] },
  "Futebol":     { icon:"⚽", color:"#10b981", markets:["1X2","Dupla Hipótese","Over/Under Golos","BTTS","Handicap Asiático","Handicap Europeu","Marcador Correto","1º Marcador","Total Cantos","Total Cartões","Over/Under 1ª Parte","Resultado ao Intervalo","Outros"] },
  "Basquetebol": { icon:"🏀", color:"#f97316", markets:["1X2","Handicap","Over/Under","1º Quarto","Moneyline","Outros"] },
  "Hóquei":      { icon:"🏒", color:"#8b5cf6", markets:["1X2","Handicap","Over/Under","Resultado Final","Outros"] },
  "Baseball":    { icon:"⚾", color:"#ef4444", markets:["Moneyline","Run Line","Over/Under","1ª Entrada","Outros"] },
  "Rugby":       { icon:"🏉", color:"#eab308", markets:["1X2","Handicap","Over/Under","Primeira Tentativa","Outros"] },
  "MMA/UFC":     { icon:"🥊", color:"#ec4899", markets:["Vencedor","Método de Vitória","Round","Over/Under Rounds","Vai a Decisão","Outros"] },
  "Outros":      { icon:"🎯", color:"#6b7280", markets:["1X2","Handicap","Over/Under","Outros"] },
};
const SPORTS = Object.keys(SPORTS_CONFIG);

const fmtE   = v => "€" + Math.abs(v).toFixed(2).replace(".",",");
const fmtPnl = v => (v>=0?"+":"-")+"€"+Math.abs(v).toFixed(2).replace(".",",");
const fmtPct = v => (v>=0?"+":"")+v.toFixed(1)+"%";
const today  = () => new Date().toISOString().slice(0,10);
const daysLeft = ts => Math.max(0, TRIAL_DAYS-Math.floor((Date.now()-new Date(ts).getTime())/86400000));
const monthLabel = d => { const dt=new Date(d+"T00:00:00"); return dt.toLocaleString("pt-PT",{month:"long",year:"numeric"}).replace(/^\w/,c=>c.toUpperCase()); };

async function getAIFeedback(bets, stats, bankroll, sport) {
  const settled = bets.filter(b=>b.result!=="PENDING");
  if(settled.length<3) return null;
  const summary = { sport, totalBets:settled.length, wins:stats.wins, losses:stats.losses, roi:stats.roi.toFixed(1), strikeRate:stats.strikeRate.toFixed(1), avgOdd:stats.avgOdd.toFixed(2), pnl:stats.pnl.toFixed(2), bankroll:bankroll.toFixed(2) };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`És um analista de gestão desportiva para ${sport}. Analisa e dá feedback direto em português de Portugal.\n\nDados: ${JSON.stringify(summary)}\n\nResponde APENAS com JSON sem markdown:\n{"score":<1-10>,"headline":"<máx 60 chars>","insights":["...","...","..."],"warnings":["..."],"tips":["...","..."]}`}]})});
    const data = await res.json();
    return JSON.parse(data.content?.map(c=>c.text||"").join("").trim().replace(/```json|```/g,"").trim());
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
  const [authForm, setAuthForm]   = useState({name:"",email:"",password:""});
  const [authErr, setAuthErr]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNewBR, setShowNewBR] = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [formMode, setFormMode]   = useState("immediate"); // "immediate" | "pending"
  const [newBRForm, setNewBRForm] = useState({name:"",sport:"Ténis",bankroll:"",unit_pct:"2"});
  const [subView, setSubView]     = useState("annual");
  const [feedback, setFeedback]   = useState(null);
  const [loadingFB, setLoadingFB] = useState(false);
  const [diaryDate, setDiaryDate] = useState(today());
  const [reportMonth, setReportMonth] = useState(today().slice(0,7));
  const emptyForm = {event:"",market:"Vencedor do Jogo",selection:"",odd:"",units:1,result:"WIN",notes:""};
  const [form, setForm]           = useState(emptyForm);
  const touchStartX               = useRef(null);

  const br       = bankrolls.find(b=>b.id===activeBR);
  const sc       = SPORTS_CONFIG[br?.sport||"Ténis"];
  const trialLeft= br?.trial_start ? daysLeft(br.trial_start) : TRIAL_DAYS;
  const isActive = br?.subscribed || trialLeft>0;
  const markets  = sc?.markets || ["Outros"];
  const userName = user?.user_metadata?.name||user?.email?.split("@")[0]||"";

  function swipeStart(e){ touchStartX.current=e.touches[0].clientX; }
  function swipeEnd(e){ if(touchStartX.current!==null&&touchStartX.current-e.changedTouches[0].clientX>60)setDrawerOpen(false); touchStartX.current=null; }

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session){setUser(session.user);loadBankrolls(session.user.id);}
      else setScreen("landing");
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{
      if(session){setUser(session.user);loadBankrolls(session.user.id);}
      else{setUser(null);setBankrolls([]);setScreen("landing");}
    });
    return()=>subscription.unsubscribe();
  },[]);

  async function loadBankrolls(uid){
    const{data}=await supabase.from("profiles").select("*").eq("user_id",uid).order("created_at");
    if(data&&data.length>0){setBankrolls(data);setActiveBR(data[0].id);await loadBets(data[0].id);setScreen("app");}
    else setScreen("setup");
  }
  async function loadBets(brId){
    const{data}=await supabase.from("bets").select("*").eq("bankroll_id",brId).order("created_at",{ascending:false});
    if(data)setBets(data.map(b=>({...b,odd:parseFloat(b.odd),stake:parseFloat(b.stake)})));
  }
  async function switchBankroll(id){setActiveBR(id);setBets([]);setDrawerOpen(false);await loadBets(id);setTab("dashboard");}
  async function handleAuth(){
    setAuthErr("");setLoading(true);
    if(authMode==="register"){
      const{error}=await supabase.auth.signUp({email:authForm.email,password:authForm.password,options:{data:{name:authForm.name}}});
      if(error){setAuthErr(error.message);setLoading(false);return;}
    }else{
      const{error}=await supabase.auth.signInWithPassword({email:authForm.email,password:authForm.password});
      if(error){setAuthErr("Email ou password incorretos.");setLoading(false);return;}
    }
    setLoading(false);
  }
  async function handleSetup(){
    const brv=parseFloat(newBRForm.bankroll);
    if(!brv||brv<=0||!newBRForm.name)return;
    const{data:{session}}=await supabase.auth.getSession();
    const uid=session?.user?.id||user?.id;
    const{data}=await supabase.from("profiles").insert({user_id:uid,name:newBRForm.name,sport:newBRForm.sport,bankroll:brv,unit_pct:parseFloat(newBRForm.unit_pct),trial_start:new Date().toISOString(),subscribed:false}).select().single();
    if(data){setBankrolls(prev=>[...prev,data]);setActiveBR(data.id);setBets([]);setShowNewBR(false);setDrawerOpen(false);setNewBRForm({name:"",sport:"Ténis",bankroll:"",unit_pct:"2"});setScreen("app");}
  }
  async function handleSubscribe(plan){
    const stripe=await loadStripe(STRIPE_KEY);
    await stripe.redirectToCheckout({lineItems:[{price:plan==="monthly"?PRICE_MONTHLY:PRICE_ANNUAL,quantity:1}],mode:"subscription",successUrl:window.location.href+"?subscribed=true",cancelUrl:window.location.href,customerEmail:user?.email});
  }

  const stats=useMemo(()=>{
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

  const brHistory=useMemo(()=>{
    let r=parseFloat(br?.bankroll||0);
    const pts=[{v:r,date:br?.created_at?.slice(0,10)||today()}];
    [...bets].reverse().filter(b=>b.result!=="PENDING").forEach(b=>{
      if(b.result==="WIN")r+=b.stake*(b.odd-1);
      else if(b.result==="LOSS")r-=b.stake;
      else if(b.result==="CASHOUT")r+=(b.cashout_val||0)-b.stake;
      pts.push({v:r,date:b.created_at?.slice(0,10)||today()});
    });
    return pts;
  },[bets,br]);

  const currentBR=brHistory[brHistory.length-1]?.v||parseFloat(br?.bankroll||0);
  const unitVal  =br?currentBR*br.unit_pct/100:0;

  async function addBet(){
    if(!form.event||!form.odd||!form.selection||!activeBR)return;
    const odd=parseFloat(form.odd);
    if(odd<=1)return;
    const stake=unitVal*(parseFloat(form.units)||1);
    const result=formMode==="immediate"?form.result:"PENDING";
    const{data}=await supabase.from("bets").insert({user_id:user.id,bankroll_id:activeBR,sport:br.sport,event:form.event,market:form.market,selection:form.selection,odd,stake,units:parseFloat(form.units),result,notes:form.notes,created_at:new Date().toISOString()}).select().single();
    if(data){setBets(prev=>[{...data,odd:parseFloat(data.odd),stake:parseFloat(data.stake)},...prev]);setForm(emptyForm);setShowForm(false);setTab("diary");}
  }
  async function settleBet(id,result,cashoutVal){
    await supabase.from("bets").update({result,cashout_val:cashoutVal||null}).eq("id",id);
    setBets(prev=>prev.map(b=>b.id===id?{...b,result,cashout_val:cashoutVal}:b));
  }
  async function deleteBet(id){
    await supabase.from("bets").delete().eq("id",id);
    setBets(prev=>prev.filter(b=>b.id!==id));
  }

  // Diary
  const diaryBets = bets.filter(b=>b.created_at?.slice(0,10)===diaryDate);
  const diaryPnl  = diaryBets.filter(b=>b.result!=="PENDING"&&b.result!=="VOID").reduce((s,b)=>{
    if(b.result==="WIN")return s+b.stake*(b.odd-1);
    if(b.result==="LOSS")return s-b.stake;
    if(b.result==="CASHOUT")return s+(b.cashout_val||0)-b.stake;
    return s;
  },0);

  // Report
  const reportBets = bets.filter(b=>b.created_at?.slice(0,7)===reportMonth&&b.result!=="PENDING"&&b.result!=="VOID");
  const reportWins = reportBets.filter(b=>b.result==="WIN").length;
  const reportLoss = reportBets.filter(b=>b.result==="LOSS").length;
  const reportPnl  = reportBets.reduce((s,b)=>{
    if(b.result==="WIN")return s+b.stake*(b.odd-1);
    if(b.result==="LOSS")return s-b.stake;
    if(b.result==="CASHOUT")return s+(b.cashout_val||0)-b.stake;
    return s;
  },0);
  const reportStaked = reportBets.reduce((s,b)=>s+b.stake,0);
  const reportROI    = reportStaked>0?(reportPnl/reportStaked)*100:0;

  // Chart
  const pts=brHistory;
  const maxV=Math.max(...pts.map(p=>p.v),parseFloat(br?.bankroll||0)+1);
  const minV=Math.min(...pts.map(p=>p.v),parseFloat(br?.bankroll||0)-1);
  const svgW=300,svgH=100;
  const toX=i=>pts.length<=1?svgW/2:(i/(pts.length-1))*svgW;
  const toY=v=>svgH-((v-minV)/(maxV-minV||1))*(svgH-16)-8;
  const polyline=pts.length>1?pts.map((p,i)=>`${toX(i)},${toY(p.v)}`).join(" "):null;

  // ── LOADING ──
  if(screen==="loading")return(
    <div style={{...S.root,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={S.spinner}/>
    </div>
  );

  // ── LANDING ──
  if(screen==="landing")return(
    <div style={{...S.root,background:"#f9fafb"}}>
      <header style={S.landingHeader}>
        <div style={S.logoWrap}><span style={S.logoBadge}>📊</span><span style={S.logoText}>BankrollPro</span></div>
        <button style={S.btnOutline} onClick={()=>{setAuthMode("login");setScreen("auth");}}>Entrar</button>
      </header>
      <div style={S.hero}>
        <div style={S.heroTag}>🚀 Preço de lançamento</div>
        <h1 style={S.heroTitle}>Gestão mais<br/><span style={{color:"#374151"}}>inteligente.</span></h1>
        <p style={S.heroSub}>Controla as tuas bancas por desporto, acompanha métricas em tempo real e recebe análise com IA para evoluir a tua performance.</p>
        <div style={S.pricingRow}>
          <div style={S.pCard}>
            <div style={S.pLabel}>Mensal</div>
            <div style={S.pOld}>€4,99/mês</div>
            <div style={S.pPrice}>€3,99<span style={S.pPer}>/mês</span></div>
            <div style={S.pTag}>Lançamento</div>
          </div>
          <div style={{...S.pCard,border:"1px solid #d1d5db",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}>
            <div style={{fontSize:9,color:"#374151",letterSpacing:1.5,fontWeight:800,textTransform:"uppercase",marginBottom:6}}>Melhor valor</div>
            <div style={S.pLabel}>Anual</div>
            <div style={S.pOld}>€22,99/ano</div>
            <div style={S.pPrice}>€19,99<span style={S.pPer}>/ano</span></div>
            <div style={{...S.pTag,color:"#059669"}}>Poupas €28</div>
          </div>
        </div>
        <div style={S.sportChips}>
          {SPORTS.map(s=>(
            <div key={s} style={{...S.sportChip,borderColor:SPORTS_CONFIG[s].color+"44"}}>
              <span>{SPORTS_CONFIG[s].icon}</span>
              <span style={{fontSize:11,color:"#6b7280"}}>{s}</span>
            </div>
          ))}
        </div>
        <div style={S.featList}>
          {[["Até 3 bancas simultâneas","Organiza por desporto independentemente"],["Análise com IA","Feedback baseado no teu histórico real"],["Registo duplo","Pendente ou resultado imediato"],["7 dias grátis","Sem cartão necessário"]].map(([t,d])=>(
            <div key={t} style={S.featItem}><div style={S.featDot}/><div><div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{t}</div><div style={{fontSize:12,color:"#6b7280"}}>{d}</div></div></div>
          ))}
        </div>
        <button style={S.btnPrimary} onClick={()=>{setAuthMode("register");setScreen("auth");}}>Começar grátis — 7 dias</button>
        <p style={{fontSize:12,color:"#9ca3af",textAlign:"center",marginTop:8}}>Sem cartão necessário</p>
      </div>
    </div>
  );

  // ── AUTH ──
  if(screen==="auth")return(
    <div style={{...S.root,background:"#f9fafb"}}>
      <div style={S.topBar}><button style={S.backBtn} onClick={()=>setScreen("landing")}>← Voltar</button></div>
      <div style={S.centeredWrap}>
        <div style={S.authCard}>
          <div style={S.authIcon}>📊</div>
          <h2 style={S.authTitle}>{authMode==="login"?"Bem-vindo de volta":"Criar conta grátis"}</h2>
          <p style={S.authSub}>{authMode==="login"?"Entra na tua conta.":"7 dias grátis, sem cartão."}</p>
          {authMode==="register"&&<><label style={S.label}>Nome</label><input style={S.input} placeholder="O teu nome" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))}/></>}
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="email@exemplo.com" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))}/>
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" placeholder="••••••••" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))}/>
          {authErr&&<p style={S.errMsg}>{authErr}</p>}
          <button style={{...S.btnPrimary,marginTop:20}} onClick={handleAuth} disabled={loading}>{loading?"...":authMode==="login"?"Entrar":"Criar conta"}</button>
          <p style={S.switchTxt}>{authMode==="login"?"Ainda não tens conta? ":"Já tens conta? "}<span style={S.switchLink} onClick={()=>setAuthMode(m=>m==="login"?"register":"login")}>{authMode==="login"?"Regista-te":"Entra aqui"}</span></p>
        </div>
      </div>
    </div>
  );

  // ── SETUP ──
  if(screen==="setup")return(
    <div style={{...S.root,background:"#f9fafb"}}>
      <div style={S.centeredWrap}>
        <div style={S.authCard}>
          <div style={S.authIcon}>💼</div>
          <h2 style={S.authTitle}>Primeira banca</h2>
          <p style={S.authSub}>Olá, {userName}! Configura a tua banca.</p>
          <div style={S.trialBanner}>🎯 Trial de 7 dias ativado</div>
          <label style={S.label}>Nome da banca</label>
          <input style={S.input} placeholder="ex: Ténis Principal" value={newBRForm.name} onChange={e=>setNewBRForm(f=>({...f,name:e.target.value}))}/>
          <label style={S.label}>Desporto</label>
          <div style={S.sportGrid}>
            {SPORTS.map(s=>(
              <button key={s} style={{...S.sportBtn,...(newBRForm.sport===s?{...S.sportBtnActive,borderColor:SPORTS_CONFIG[s].color,color:SPORTS_CONFIG[s].color}:{})}}
                onClick={()=>setNewBRForm(f=>({...f,sport:s}))}>
                <span style={{fontSize:20}}>{SPORTS_CONFIG[s].icon}</span>
                <span style={{fontSize:10}}>{s}</span>
              </button>
            ))}
          </div>
          <label style={S.label}>Bankroll inicial (€)</label>
          <input style={S.input} type="number" placeholder="ex: 500" value={newBRForm.bankroll} onChange={e=>setNewBRForm(f=>({...f,bankroll:e.target.value}))}/>
          <label style={S.label}>Unidade (% do bankroll)</label>
          <input style={S.input} type="number" step="0.5" min="0.5" max="10" value={newBRForm.unit_pct} onChange={e=>setNewBRForm(f=>({...f,unit_pct:e.target.value}))}/>
          {newBRForm.bankroll&&<p style={S.hint}>1 unidade = <strong>€{((parseFloat(newBRForm.bankroll)||0)*(parseFloat(newBRForm.unit_pct)||2)/100).toFixed(2)}</strong> · Recomendamos 1–2%</p>}
          <button style={{...S.btnPrimary,marginTop:20}} onClick={handleSetup}>Criar banca</button>
        </div>
      </div>
    </div>
  );

  // ── PAYWALL ──
  if(screen==="app"&&!isActive)return(
    <div style={{...S.root,background:"#f9fafb"}}>
      <div style={S.centeredWrap}>
        <div style={S.authCard}>
          <div style={S.authIcon}>⏰</div>
          <h2 style={S.authTitle}>Trial terminado</h2>
          <p style={S.authSub}>Escolhe um plano para continuar.</p>
          <div style={S.planToggle}>
            <button style={{...S.planBtn,...(subView==="monthly"?S.planBtnActive:{})}} onClick={()=>setSubView("monthly")}>Mensal</button>
            <button style={{...S.planBtn,...(subView==="annual"?S.planBtnActive:{})}} onClick={()=>setSubView("annual")}>Anual ⭐</button>
          </div>
          <div style={S.planCard}>
            {subView==="annual"&&<div style={{fontSize:11,color:"#059669",fontWeight:700,marginBottom:4}}>Melhor valor · Poupas €28</div>}
            <div style={S.pOld}>{subView==="monthly"?"€4,99/mês":"€22,99/ano"}</div>
            <div style={S.planPrice}>{subView==="monthly"?"€3,99":"€19,99"}<span style={S.pPer}>{subView==="monthly"?"/mês":"/ano"}</span></div>
            <button style={{...S.btnPrimary,marginTop:16}} onClick={()=>handleSubscribe(subView)}>Subscrever</button>
          </div>
          <button style={S.btnGhost} onClick={()=>supabase.auth.signOut()}>Terminar sessão</button>
        </div>
      </div>
    </div>
  );

  // ── MAIN APP ──
  return(
    <div style={{...S.root,background:"#f3f4f6"}} onTouchStart={swipeStart} onTouchEnd={swipeEnd}>

      {/* DRAWER */}
      {drawerOpen&&(
        <div style={S.overlay} onClick={()=>setDrawerOpen(false)}>
          <div style={S.drawer} onClick={e=>e.stopPropagation()}>
            <div style={S.drawerTop}>
              <div style={S.drawerAvatar}>{userName[0]?.toUpperCase()||"U"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{userName}</div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{user?.email}</div>
              </div>
              <button style={{background:"none",border:"none",fontSize:20,color:"#9ca3af",cursor:"pointer"}} onClick={()=>setDrawerOpen(false)}>×</button>
            </div>
            {trialLeft>0&&!br?.subscribed&&(
              <div style={S.drawerTrial}>⏳ Trial — <strong>{trialLeft} dias</strong> restantes</div>
            )}
            <div style={S.drawerLabel}>As tuas bancas</div>
            {bankrolls.map(b=>{
              const bsc=SPORTS_CONFIG[b.sport];
              return(
                <button key={b.id} style={{...S.drawerItem,...(b.id===activeBR?{...S.drawerItemActive,borderLeftColor:bsc?.color}:{})}}
                  onClick={()=>switchBankroll(b.id)}>
                  <span style={{fontSize:22}}>{bsc?.icon}</span>
                  <div style={{flex:1,textAlign:"left"}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{b.name}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>{b.sport}</div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:bsc?.color}}>{fmtE(parseFloat(b.bankroll))}</span>
                </button>
              );
            })}
            {bankrolls.length<MAX_BANKROLLS&&(
              <button style={S.drawerAdd} onClick={()=>{setShowNewBR(true);setDrawerOpen(false);}}>
                <span style={{marginRight:8,color:"#9ca3af",fontSize:18}}>+</span>
                <span style={{color:"#6b7280"}}>Nova banca ({bankrolls.length}/{MAX_BANKROLLS})</span>
              </button>
            )}
            <div style={{flex:1}}/>
            {!br?.subscribed&&(
              <div style={S.drawerSubBox}>
                <div style={{fontSize:12,color:"#6b7280",marginBottom:10,fontWeight:600}}>Acesso completo</div>
                <div style={{display:"flex",gap:8}}>
                  <button style={{...S.btnPrimary,fontSize:12,padding:"9px 8px"}} onClick={()=>handleSubscribe("monthly")}>€3,99/mês</button>
                  <button style={{...S.btnPrimary,fontSize:12,padding:"9px 8px",background:"#059669",border:"none"}} onClick={()=>handleSubscribe("annual")}>€19,99/ano</button>
                </div>
              </div>
            )}
            <button style={{...S.btnGhost,marginTop:10,fontSize:12}} onClick={()=>supabase.auth.signOut()}>Terminar sessão</button>
          </div>
        </div>
      )}

      {/* NEW BANKROLL MODAL */}
      {showNewBR&&(
        <div style={S.overlay}>
          <div style={{...S.modal,background:"#fff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#111827"}}>Nova Banca</h3>
              <button style={{background:"none",border:"none",color:"#9ca3af",fontSize:22,cursor:"pointer"}} onClick={()=>setShowNewBR(false)}>×</button>
            </div>
            <label style={S.label}>Nome</label>
            <input style={S.input} placeholder="ex: Futebol Europa" value={newBRForm.name} onChange={e=>setNewBRForm(f=>({...f,name:e.target.value}))}/>
            <label style={S.label}>Desporto</label>
            <div style={S.sportGrid}>
              {SPORTS.map(s=>(
                <button key={s} style={{...S.sportBtn,...(newBRForm.sport===s?{...S.sportBtnActive,borderColor:SPORTS_CONFIG[s].color,color:SPORTS_CONFIG[s].color}:{})}}
                  onClick={()=>setNewBRForm(f=>({...f,sport:s}))}>
                  <span style={{fontSize:20}}>{SPORTS_CONFIG[s].icon}</span>
                  <span style={{fontSize:10}}>{s}</span>
                </button>
              ))}
            </div>
            <label style={S.label}>Bankroll (€)</label>
            <input style={S.input} type="number" placeholder="ex: 300" value={newBRForm.bankroll} onChange={e=>setNewBRForm(f=>({...f,bankroll:e.target.value}))}/>
            <label style={S.label}>Unidade (%)</label>
            <input style={S.input} type="number" step="0.5" min="0.5" max="10" value={newBRForm.unit_pct} onChange={e=>setNewBRForm(f=>({...f,unit_pct:e.target.value}))}/>
            <button style={{...S.btnPrimary,marginTop:16}} onClick={handleSetup}>Criar banca</button>
          </div>
        </div>
      )}

      {/* REGISTER FORM MODAL */}
      {showForm&&(
        <div style={S.overlay}>
          <div style={{...S.modal,background:"#fff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#111827"}}>{sc?.icon} Novo Registo</h3>
              <button style={{background:"none",border:"none",color:"#9ca3af",fontSize:22,cursor:"pointer"}} onClick={()=>setShowForm(false)}>×</button>
            </div>

            {/* Mode toggle */}
            <div style={S.modeToggle}>
              <button style={{...S.modeBtn,...(formMode==="immediate"?{...S.modeBtnActive,background:sc?.color,borderColor:sc?.color,color:"#fff"}:{})}}
                onClick={()=>setFormMode("immediate")}>Resultado imediato</button>
              <button style={{...S.modeBtn,...(formMode==="pending"?{...S.modeBtnActive,background:sc?.color,borderColor:sc?.color,color:"#fff"}:{})}}
                onClick={()=>setFormMode("pending")}>Deixar pendente</button>
            </div>

            <label style={S.label}>Evento</label>
            <input style={S.input} placeholder="ex: Sinner vs Alcaraz" value={form.event} onChange={e=>setForm(f=>({...f,event:e.target.value}))}/>

            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1}}>
                <label style={S.label}>Odd</label>
                <input style={S.input} type="number" step="0.01" min="1.01" placeholder="1.85" value={form.odd} onChange={e=>setForm(f=>({...f,odd:e.target.value}))}/>
              </div>
              <div style={{flex:1}}>
                <label style={S.label}>% Banca</label>
                <div style={{display:"flex",gap:4,marginTop:4}}>
                  {[0.5,1,2,3].map(u=>(
                    <button key={u} style={{...S.unitBtn,...(parseFloat(form.units)===u?{...S.unitBtnActive,background:sc?.color,borderColor:sc?.color,color:"#fff"}:{})}}
                      onClick={()=>setForm(f=>({...f,units:u}))}>{u}</button>
                  ))}
                </div>
              </div>
            </div>

            {form.odd&&parseFloat(form.odd)>1&&(
              <div style={{...S.stakeBox,borderColor:sc?.color+"33",background:sc?.color+"08"}}>
                <span>Stake: <strong style={{color:sc?.color}}>{fmtE(unitVal*(parseFloat(form.units)||1))}</strong></span>
                <span style={{marginLeft:"auto"}}>Retorno: <strong style={{color:"#059669"}}>{fmtE(unitVal*(parseFloat(form.units)||1)*parseFloat(form.odd))}</strong></span>
              </div>
            )}

            <label style={S.label}>Mercado</label>
            <select style={S.input} value={form.market} onChange={e=>setForm(f=>({...f,market:e.target.value}))}>
              {markets.map(m=><option key={m}>{m}</option>)}
            </select>

            <label style={S.label}>Seleção</label>
            <input style={S.input} placeholder="ex: Sinner / Over 22.5 Games" value={form.selection} onChange={e=>setForm(f=>({...f,selection:e.target.value}))}/>

            {formMode==="immediate"&&(
              <>
                <label style={S.label}>Resultado</label>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  {[["WIN","✓ Green","#059669","#f0fdf4","#bbf7d0"],["LOSS","✗ Red","#dc2626","#fef2f2","#fca5a5"],["CASHOUT","Cashout","#2563eb","#eff6ff","#93c5fd"],["VOID","Void","#92400e","#fefce8","#fde68a"]].map(([r,l,c,bg,border])=>(
                    <button key={r} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`1px solid ${form.result===r?c:border}`,background:form.result===r?bg:"#fff",color:form.result===r?c:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:700}}
                      onClick={()=>setForm(f=>({...f,result:r}))}>{l}</button>
                  ))}
                </div>
                {form.result==="CASHOUT"&&(
                  <>
                    <label style={S.label}>Valor cashout (€)</label>
                    <input style={S.input} type="number" placeholder="ex: 12.50" value={form.cashoutVal||""} onChange={e=>setForm(f=>({...f,cashoutVal:e.target.value}))}/>
                  </>
                )}
              </>
            )}

            <label style={S.label}>Notas (opcional)</label>
            <input style={S.input} placeholder="Raciocínio, contexto..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>

            <button style={{...S.btnPrimary,marginTop:18,background:sc?.color,border:"none"}} onClick={addBet}>Guardar registo</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header style={S.header}>
        <button style={S.menuBtn} onClick={()=>setDrawerOpen(true)}>
          <div style={S.menuLine}/><div style={S.menuLine}/><div style={S.menuLine}/>
        </button>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:18}}>{sc?.icon}</span>
          <span style={S.headerTitle}>{br?.name||"BankrollPro"}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {trialLeft>0&&!br?.subscribed&&<span style={{...S.chip,color:"#92400e",background:"#fef3c7",border:"1px solid #fde68a"}}>{trialLeft}d</span>}
          <span style={{...S.chip,color:sc?.color,background:sc?.color+"15",border:`1px solid ${sc?.color}33`,fontWeight:800}}>{fmtE(currentBR)}</span>
        </div>
      </header>

      {/* NAV */}
      <nav style={S.nav}>
        {[["dashboard","Banca"],["diary","Diário"],["report","Relatório"],["chart","Gráfico"],["ai","IA"]].map(([v,l])=>(
          <button key={v} style={{...S.navBtn,...(tab===v?{...S.navActive,color:sc?.color,borderBottomColor:sc?.color}:{})}}
            onClick={()=>setTab(v)}>{l}</button>
        ))}
      </nav>

      <main style={S.main}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div>
            {/* Main card */}
            <div style={{...S.card,padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <div style={S.cardLabel}>Banca Atual</div>
                  <div style={{fontSize:34,fontWeight:900,color:"#111827",letterSpacing:"-1.5px",lineHeight:1}}>{fmtE(currentBR)}</div>
                  <div style={{fontSize:13,marginTop:6,color:currentBR>=(br?.bankroll||0)?"#059669":"#dc2626",fontWeight:600}}>
                    {fmtPct(((currentBR-(br?.bankroll||0))/(br?.bankroll||1))*100)} desde o início
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={S.cardLabel}>P&L Total</div>
                  <div style={{fontSize:22,fontWeight:800,color:stats.pnl>=0?"#059669":"#dc2626",letterSpacing:"-1px"}}>{fmtPnl(stats.pnl)}</div>
                  <div style={{fontSize:12,color:stats.roi>=0?"#059669":"#dc2626",fontWeight:600,marginTop:4}}>ROI {fmtPct(stats.roi)}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,borderTop:"1px solid #f3f4f6",paddingTop:14}}>
                {[["Acerto",stats.strikeRate.toFixed(1)+"%"],["Odd Média",stats.avgOdd.toFixed(2)],["Unidade",fmtE(unitVal)],["Pendentes",stats.pending]].map(([l,v])=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:15,fontWeight:800,color:"#111827"}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats: wins/losses */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[["Acertos",stats.wins,"#059669","#f0fdf4"],["Erros",stats.losses,"#dc2626","#fef2f2"],["Total",stats.settled,"#374151","#f9fafb"]].map(([l,v,c,bg])=>(
                <div key={l} style={{...S.card,padding:"12px 10px",textAlign:"center",background:bg,border:`1px solid ${c}22`}}>
                  <div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontSize:10,color:c,textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>

            {/* Pending quick settle */}
            {stats.pending>0&&(
              <div style={S.card}>
                <div style={S.cardTitle}>Pendentes · {stats.pending}</div>
                {bets.filter(b=>b.result==="PENDING").map(b=>(
                  <div key={b.id} style={S.pendRow}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.selection||b.event}</div>
                      <div style={{fontSize:11,color:"#9ca3af"}}>@{b.odd.toFixed(2)} · {fmtE(b.stake)}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button style={S.bWin} onClick={()=>settleBet(b.id,"WIN")}>✓</button>
                      <button style={S.bLoss} onClick={()=>settleBet(b.id,"LOSS")}>✗</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DIÁRIO ── */}
        {tab==="diary"&&(
          <div>
            {/* Date nav */}
            <div style={S.dateNav}>
              <button style={S.dateBtn} onClick={()=>{ const d=new Date(diaryDate+"T00:00:00"); d.setDate(d.getDate()-1); setDiaryDate(d.toISOString().slice(0,10)); }}>‹</button>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{new Date(diaryDate+"T00:00:00").toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"}).replace(/^\w/,c=>c.toUpperCase())}</div>
              </div>
              <button style={S.dateBtn} onClick={()=>{ const d=new Date(diaryDate+"T00:00:00"); d.setDate(d.getDate()+1); setDiaryDate(d.toISOString().slice(0,10)); }}>›</button>
            </div>

            {/* Day summary */}
            <div style={{...S.card,padding:16,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={S.cardLabel}>Lucro do dia</div>
                  <div style={{fontSize:26,fontWeight:900,color:diaryPnl>=0?"#059669":"#dc2626",letterSpacing:"-1px"}}>{fmtPnl(diaryPnl)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={S.cardLabel}>Registos</div>
                  <div style={{fontSize:26,fontWeight:900,color:"#374151"}}>{diaryBets.length}</div>
                </div>
              </div>
            </div>

            {/* Day bets */}
            {diaryBets.length===0&&(
              <div style={{textAlign:"center",padding:"32px 0",color:"#d1d5db"}}>
                <div style={{fontSize:36,marginBottom:8}}>{sc?.icon}</div>
                <div style={{fontSize:14,color:"#9ca3af"}}>Sem registos neste dia.</div>
                <div style={{fontSize:12,color:"#d1d5db",marginTop:4}}>Clica em + para adicionar</div>
              </div>
            )}
            {diaryBets.map(b=>{
              const isWin=b.result==="WIN", isLoss=b.result==="LOSS", isPending=b.result==="PENDING";
              return(
                <div key={b.id} style={{...S.betCard,borderLeft:`3px solid ${isWin?"#059669":isLoss?"#dc2626":isPending?"#7c3aed":"#d1d5db"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{b.event}</div>
                      <div style={{fontSize:12,color:"#6b7280",marginTop:1}}>{b.market} · <strong style={{color:"#374151"}}>{b.selection}</strong></div>
                      <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>ODD {b.odd.toFixed(2)} · Stake {fmtE(b.stake)}</div>
                      {b.notes&&<div style={{fontSize:11,color:"#9ca3af",fontStyle:"italic",marginTop:2}}>"{b.notes}"</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                      <div style={{fontSize:13,fontWeight:800,color:isWin?"#059669":isLoss?"#dc2626":isPending?"#7c3aed":"#9ca3af"}}>
                        {isWin?fmtPnl(b.stake*(b.odd-1)):isLoss?fmtPnl(-b.stake):isPending?"Pendente":"—"}
                      </div>
                      {isWin&&<div style={{fontSize:11,color:"#9ca3af"}}>Retorno {fmtE(b.stake*b.odd)}</div>}
                    </div>
                  </div>
                  {isPending&&(
                    <div style={{display:"flex",gap:6,marginTop:10,paddingTop:10,borderTop:"1px solid #f3f4f6"}}>
                      <button style={S.bWin} onClick={()=>settleBet(b.id,"WIN")}>✓ Green</button>
                      <button style={S.bLoss} onClick={()=>settleBet(b.id,"LOSS")}>✗ Red</button>
                      <button style={S.bCash} onClick={()=>{const v=parseFloat(prompt("Valor do cashout (€):"));if(v>=0)settleBet(b.id,"CASHOUT",v);}}>Cash</button>
                      <button style={S.bVoid} onClick={()=>settleBet(b.id,"VOID")}>Void</button>
                      <button style={S.bDel} onClick={()=>deleteBet(b.id)}>🗑</button>
                    </div>
                  )}
                  {!isPending&&(
                    <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                      <button style={S.bDel} onClick={()=>deleteBet(b.id)}>🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── RELATÓRIO ── */}
        {tab==="report"&&(
          <div>
            <div style={S.dateNav}>
              <button style={S.dateBtn} onClick={()=>{ const d=new Date(reportMonth+"-01"); d.setMonth(d.getMonth()-1); setReportMonth(d.toISOString().slice(0,7)); }}>‹</button>
              <div style={{flex:1,textAlign:"center",fontSize:14,fontWeight:700,color:"#111827"}}>{monthLabel(reportMonth+"-01")}</div>
              <button style={S.dateBtn} onClick={()=>{ const d=new Date(reportMonth+"-01"); d.setMonth(d.getMonth()+1); setReportMonth(d.toISOString().slice(0,7)); }}>›</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[["Banca Inicial",fmtE(parseFloat(br?.bankroll||0))],["Banca Final",fmtE(currentBR)],["Entradas",reportBets.length]].map(([l,v])=>(
                <div key={l} style={{...S.card,padding:12,textAlign:"center"}}>
                  <div style={S.cardLabel}>{l}</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#111827"}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[["Acertos",reportWins,"#059669"],["Erros",reportLoss,"#dc2626"],["% Acertos",reportWins+reportLoss>0?((reportWins/(reportWins+reportLoss))*100).toFixed(1)+"%":"—","#374151"]].map(([l,v,c])=>(
                <div key={l} style={{...S.card,padding:12,textAlign:"center"}}>
                  <div style={S.cardLabel}>{l}</div>
                  <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div style={{...S.card,padding:16,textAlign:"center",background:reportPnl>=0?"#f0fdf4":"#fef2f2",border:`1px solid ${reportPnl>=0?"#bbf7d0":"#fca5a5"}`}}>
                <div style={S.cardLabel}>Lucro do Mês</div>
                <div style={{fontSize:22,fontWeight:900,color:reportPnl>=0?"#059669":"#dc2626"}}>{fmtPnl(reportPnl)}</div>
              </div>
              <div style={{...S.card,padding:16,textAlign:"center"}}>
                <div style={S.cardLabel}>ROI do Mês</div>
                <div style={{fontSize:22,fontWeight:900,color:reportROI>=0?"#059669":"#dc2626"}}>{fmtPct(reportROI)}</div>
              </div>
            </div>

            {/* Day by day table */}
            {reportBets.length>0&&(()=>{
              const byDay={};
              reportBets.forEach(b=>{
                const d=b.created_at?.slice(0,10)||"";
                if(!byDay[d])byDay[d]={staked:0,returned:0,pnl:0,count:0};
                byDay[d].count++;
                byDay[d].staked+=b.stake;
                if(b.result==="WIN"){byDay[d].returned+=b.stake*b.odd;byDay[d].pnl+=b.stake*(b.odd-1);}
                else if(b.result==="LOSS"){byDay[d].pnl-=b.stake;}
                else if(b.result==="CASHOUT"){byDay[d].returned+=(b.cashout_val||0);byDay[d].pnl+=(b.cashout_val||0)-b.stake;}
              });
              return(
                <div style={S.card}>
                  <div style={S.cardTitle}>Por dia</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,borderBottom:"1px solid #f3f4f6",paddingBottom:6,marginBottom:6}}>
                    {["Dia","Invest.","Retorno","Lucro"].map(h=><div key={h} style={{fontSize:9,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,textAlign:"center"}}>{h}</div>)}
                  </div>
                  {Object.entries(byDay).sort(([a],[b])=>a>b?1:-1).map(([d,v])=>(
                    <div key={d} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,padding:"6px 0",borderBottom:"1px solid #f9fafb"}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#374151",textAlign:"center"}}>{new Date(d+"T00:00:00").getDate()}</div>
                      <div style={{fontSize:12,color:"#6b7280",textAlign:"center"}}>{fmtE(v.staked)}</div>
                      <div style={{fontSize:12,color:"#6b7280",textAlign:"center"}}>{fmtE(v.returned)}</div>
                      <div style={{fontSize:12,fontWeight:700,color:v.pnl>=0?"#059669":"#dc2626",textAlign:"center"}}>{fmtPnl(v.pnl)}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── GRÁFICO ── */}
        {tab==="chart"&&(
          <div>
            <div style={{...S.card,padding:20}}>
              <div style={S.cardTitle}>Evolução da Banca</div>
              {pts.length>1?(
                <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{width:"100%",height:160,display:"block"}}>
                  <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sc?.color} stopOpacity="0.15"/>
                      <stop offset="100%" stopColor={sc?.color} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  {[0.25,0.5,0.75].map(p=>(
                    <line key={p} x1="0" y1={svgH*p} x2={svgW} y2={svgH*p} stroke="#f3f4f6" strokeWidth="1"/>
                  ))}
                  <polygon points={`0,${svgH} ${polyline} ${svgW},${svgH}`} fill="url(#chartFill)"/>
                  <polyline points={polyline} fill="none" stroke={sc?.color} strokeWidth="2.5" strokeLinejoin="round"/>
                  <line x1="0" y1={toY(parseFloat(br?.bankroll||0))} x2={svgW} y2={toY(parseFloat(br?.bankroll||0))} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3"/>
                  {/* Start & end dots */}
                  <circle cx={toX(0)} cy={toY(pts[0].v)} r="3" fill={sc?.color}/>
                  <circle cx={toX(pts.length-1)} cy={toY(pts[pts.length-1].v)} r="4" fill={sc?.color}/>
                </svg>
              ):(
                <div style={{textAlign:"center",padding:"32px 0",color:"#d1d5db"}}>
                  <div style={{fontSize:36,marginBottom:8}}>{sc?.icon}</div>
                  <div style={{fontSize:13,color:"#9ca3af"}}>Regista algumas entradas para ver o gráfico.</div>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
                <div style={{textAlign:"center"}}>
                  <div style={S.cardLabel}>Início</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#374151"}}>{fmtE(parseFloat(br?.bankroll||0))}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={S.cardLabel}>Atual</div>
                  <div style={{fontSize:14,fontWeight:700,color:currentBR>=parseFloat(br?.bankroll||0)?"#059669":"#dc2626"}}>{fmtE(currentBR)}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={S.cardLabel}>Diferença</div>
                  <div style={{fontSize:14,fontWeight:700,color:stats.pnl>=0?"#059669":"#dc2626"}}>{fmtPnl(stats.pnl)}</div>
                </div>
              </div>
            </div>

            {/* Monthly bars */}
            {(()=>{
              const byMonth={};
              bets.filter(b=>b.result!=="PENDING"&&b.result!=="VOID").forEach(b=>{
                const m=b.created_at?.slice(0,7)||"";
                if(!byMonth[m])byMonth[m]=0;
                if(b.result==="WIN")byMonth[m]+=b.stake*(b.odd-1);
                else if(b.result==="LOSS")byMonth[m]-=b.stake;
                else if(b.result==="CASHOUT")byMonth[m]+=(b.cashout_val||0)-b.stake;
              });
              const entries=Object.entries(byMonth).sort(([a],[b])=>a>b?1:-1);
              if(!entries.length)return null;
              const maxAbs=Math.max(...entries.map(([,v])=>Math.abs(v)),1);
              return(
                <div style={S.card}>
                  <div style={S.cardTitle}>Por Mês</div>
                  {entries.map(([m,v])=>(
                    <div key={m} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,color:"#6b7280"}}>{monthLabel(m+"-01")}</span>
                        <span style={{fontSize:13,fontWeight:700,color:v>=0?"#059669":"#dc2626"}}>{fmtPnl(v)}</span>
                      </div>
                      <div style={{height:8,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(Math.abs(v)/maxAbs)*100}%`,background:v>=0?sc?.color:"#dc2626",borderRadius:4,transition:"width .3s"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── ANÁLISE IA ── */}
        {tab==="ai"&&(
          <div>
            <div style={S.card}>
              <div style={S.cardTitle}>Análise IA · {br?.sport}</div>
              <p style={{color:"#6b7280",fontSize:13,lineHeight:1.6,marginBottom:16}}>Análise personalizada baseada no teu histórico. Precisas de pelo menos 3 registos liquidados.</p>
              <button style={{...S.btnPrimary,background:sc?.color,border:"none"}}
                onClick={async()=>{setLoadingFB(true);setFeedback(null);const fb=await getAIFeedback(bets,stats,currentBR,br?.sport);setFeedback(fb);setLoadingFB(false);}}
                disabled={loadingFB||stats.settled<3}>
                {loadingFB?"A analisar...":stats.settled<3?`Precisas de ${3-stats.settled} registo(s) mais`:"Analisar agora"}
              </button>
            </div>
            {loadingFB&&<div style={{...S.card,textAlign:"center",padding:40}}><div style={S.spinner}/></div>}
            {feedback&&!loadingFB&&(
              <div>
                <div style={{...S.card,textAlign:"center",padding:20}}>
                  <div style={{...S.scoreRing,borderColor:sc?.color+"44"}}>
                    <div style={{fontSize:32,fontWeight:900,color:feedback.score>=7?"#059669":feedback.score>=4?"#d97706":"#dc2626"}}>{feedback.score}</div>
                    <div style={{fontSize:10,color:"#9ca3af"}}>/10</div>
                  </div>
                  <div style={{fontSize:16,fontWeight:700,color:"#111827",marginTop:12}}>{feedback.headline}</div>
                </div>
                {feedback.warnings?.length>0&&(
                  <div style={{...S.card,background:"#fffbeb",border:"1px solid #fde68a"}}>
                    <div style={{...S.cardTitle,color:"#92400e"}}>⚠️ Alertas</div>
                    {feedback.warnings.map((w,i)=><p key={i} style={{color:"#78350f",fontSize:13,margin:"6px 0",lineHeight:1.5}}>{w}</p>)}
                  </div>
                )}
                <div style={S.card}>
                  <div style={S.cardTitle}>Insights</div>
                  {feedback.insights?.map((ins,i)=>(
                    <div key={i} style={{display:"flex",padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
                      <span style={{color:sc?.color,marginRight:10,flexShrink:0,fontWeight:700}}>→</span>
                      <span style={{color:"#374151",fontSize:13,lineHeight:1.5}}>{ins}</span>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <div style={S.cardTitle}>Recomendações</div>
                  {feedback.tips?.map((t,i)=>(
                    <div key={i} style={{display:"flex",padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
                      <span style={{color:"#059669",marginRight:10,flexShrink:0,fontWeight:700}}>✓</span>
                      <span style={{color:"#374151",fontSize:13,lineHeight:1.5}}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      <button style={{...S.fab,background:sc?.color}} onClick={()=>{setForm(emptyForm);setShowForm(true);}}>+</button>
    </div>
  );
}

const S={
  root:{ minHeight:"100vh",color:"#111827",fontFamily:"-apple-system,'Segoe UI',sans-serif",paddingBottom:100 },
  spinner:{ width:28,height:28,border:"2px solid #e5e7eb",borderTop:"2px solid #6b7280",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto" },
  landingHeader:{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",background:"#ffffff",borderBottom:"1px solid #f3f4f6" },
  logoWrap:{ display:"flex",alignItems:"center",gap:10 },
  logoBadge:{ width:32,height:32,background:"#f3f4f6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 },
  logoText:{ fontSize:16,fontWeight:800,color:"#111827" },
  btnOutline:{ background:"#fff",border:"1px solid #d1d5db",color:"#374151",borderRadius:8,padding:"7px 16px",fontSize:13,cursor:"pointer",fontWeight:600 },
  hero:{ padding:"28px 20px 80px",maxWidth:480,margin:"0 auto" },
  heroTag:{ display:"inline-block",background:"#fef3c7",border:"1px solid #fde68a",color:"#92400e",borderRadius:6,padding:"3px 12px",fontSize:11,fontWeight:700,marginBottom:18 },
  heroTitle:{ fontSize:38,fontWeight:900,lineHeight:1.05,letterSpacing:"-2px",margin:"0 0 12px",color:"#111827" },
  heroSub:{ fontSize:14,color:"#6b7280",lineHeight:1.7,marginBottom:24 },
  pricingRow:{ display:"flex",gap:12,marginBottom:24 },
  pCard:{ flex:1,background:"#ffffff",border:"1px solid #e5e7eb",borderRadius:14,padding:"14px 12px",boxShadow:"0 1px 3px rgba(0,0,0,.06)" },
  pLabel:{ fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,marginBottom:4,fontWeight:600 },
  pOld:{ fontSize:11,color:"#d1d5db",textDecoration:"line-through",marginBottom:2 },
  pPrice:{ fontSize:22,fontWeight:900,color:"#111827",letterSpacing:"-.5px" },
  pPer:{ fontSize:12,fontWeight:400,color:"#9ca3af" },
  pTag:{ fontSize:11,color:"#6b7280",marginTop:4 },
  sportChips:{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:20 },
  sportChip:{ display:"flex",alignItems:"center",gap:6,background:"#ffffff",border:"1px solid #e5e7eb",borderRadius:20,padding:"5px 10px",fontSize:12 },
  featList:{ display:"flex",flexDirection:"column",gap:12,marginBottom:24 },
  featItem:{ display:"flex",gap:12,alignItems:"flex-start" },
  featDot:{ width:8,height:8,borderRadius:"50%",background:"#d1d5db",marginTop:5,flexShrink:0 },
  topBar:{ padding:"14px 18px",background:"#ffffff",borderBottom:"1px solid #f3f4f6" },
  backBtn:{ background:"transparent",border:"none",color:"#6b7280",cursor:"pointer",fontSize:13,padding:0,fontWeight:600 },
  centeredWrap:{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"calc(100vh - 56px)",padding:20 },
  authCard:{ width:"100%",maxWidth:380,background:"#ffffff",border:"1px solid #e5e7eb",borderRadius:16,padding:"28px 24px",boxShadow:"0 4px 24px rgba(0,0,0,.06)" },
  authIcon:{ fontSize:32,marginBottom:10 },
  authTitle:{ fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 4px" },
  authSub:{ fontSize:13,color:"#9ca3af",marginBottom:14 },
  switchTxt:{ fontSize:12,color:"#9ca3af",textAlign:"center",marginTop:14 },
  switchLink:{ color:"#374151",cursor:"pointer",textDecoration:"underline",fontWeight:600 },
  errMsg:{ color:"#dc2626",fontSize:12,margin:"6px 0",background:"#fef2f2",padding:"8px 10px",borderRadius:6 },
  trialBanner:{ background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#15803d",marginBottom:12,fontWeight:600,textAlign:"center" },
  hint:{ fontSize:12,color:"#9ca3af",margin:"6px 0 0" },
  planToggle:{ display:"flex",gap:4,background:"#f3f4f6",padding:4,borderRadius:10,marginTop:8 },
  planBtn:{ flex:1,padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",color:"#9ca3af",cursor:"pointer",fontSize:13,fontWeight:700 },
  planBtnActive:{ background:"#ffffff",color:"#111827",boxShadow:"0 1px 3px rgba(0,0,0,.1)" },
  planCard:{ background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:12,padding:20,textAlign:"center",marginTop:12 },
  planPrice:{ fontSize:28,fontWeight:900,color:"#111827",letterSpacing:"-.5px" },
  overlay:{ position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:100,display:"flex" },
  drawer:{ width:300,maxWidth:"85vw",background:"#ffffff",height:"100%",display:"flex",flexDirection:"column",padding:20,overflowY:"auto",boxShadow:"4px 0 24px rgba(0,0,0,.1)" },
  drawerTop:{ display:"flex",alignItems:"center",gap:12,marginBottom:20,paddingBottom:16,borderBottom:"1px solid #f3f4f6" },
  drawerAvatar:{ width:40,height:40,borderRadius:"50%",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#374151",flexShrink:0 },
  drawerTrial:{ background:"#fef3c7",border:"1px solid #fde68a",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#92400e",marginBottom:16,fontWeight:600 },
  drawerLabel:{ fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:8 },
  drawerItem:{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 8px",border:"none",background:"transparent",cursor:"pointer",borderRadius:10,marginBottom:4,borderLeft:"3px solid transparent",textAlign:"left" },
  drawerItemActive:{ background:"#f9fafb" },
  drawerAdd:{ display:"flex",alignItems:"center",width:"100%",padding:"10px",border:"1px dashed #e5e7eb",background:"transparent",cursor:"pointer",borderRadius:10,fontSize:13,marginTop:4 },
  drawerSubBox:{ background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:14,marginTop:16 },
  modal:{ width:"100%",maxWidth:440,maxHeight:"92vh",overflowY:"auto",margin:"auto",borderRadius:16,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.2)" },
  modeToggle:{ display:"flex",gap:8,marginBottom:4 },
  modeBtn:{ flex:1,padding:"8px",border:"1px solid #e5e7eb",borderRadius:8,background:"#f9fafb",color:"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700 },
  modeBtnActive:{ },
  header:{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:"#ffffff",borderBottom:"1px solid #f3f4f6",position:"sticky",top:0,zIndex:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)" },
  menuBtn:{ display:"flex",flexDirection:"column",gap:4,background:"none",border:"none",cursor:"pointer",padding:"6px",borderRadius:8 },
  menuLine:{ width:20,height:2,background:"#9ca3af",borderRadius:2 },
  headerTitle:{ fontSize:14,fontWeight:700,color:"#111827" },
  chip:{ borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:600 },
  nav:{ display:"flex",background:"#ffffff",borderBottom:"1px solid #f3f4f6",overflowX:"auto" },
  navBtn:{ flex:1,padding:"11px 4px",border:"none",borderBottom:"2px solid transparent",background:"transparent",color:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap" },
  navActive:{ color:"#111827",borderBottomColor:"#111827" },
  main:{ maxWidth:680,margin:"0 auto",padding:"14px 12px" },
  card:{ background:"#ffffff",border:"1px solid #f3f4f6",borderRadius:14,padding:16,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)" },
  cardTitle:{ fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800 },
  cardLabel:{ fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4 },
  pendRow:{ display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f9fafb",gap:10 },
  dateNav:{ display:"flex",alignItems:"center",background:"#ffffff",border:"1px solid #f3f4f6",borderRadius:12,padding:"10px 14px",marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)" },
  dateBtn:{ background:"none",border:"1px solid #e5e7eb",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#374151",flexShrink:0 },
  betCard:{ background:"#ffffff",border:"1px solid #f3f4f6",borderRadius:14,padding:14,marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,.04)" },
  label:{ fontSize:12,color:"#374151",marginBottom:4,marginTop:12,display:"block",fontWeight:600 },
  input:{ width:"100%",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,color:"#111827",padding:"11px 12px",fontSize:14,boxSizing:"border-box",outline:"none" },
  unitBtn:{ flex:1,padding:"10px 0",border:"1px solid #e5e7eb",borderRadius:8,background:"#f9fafb",color:"#9ca3af",cursor:"pointer",fontSize:13,fontWeight:700,marginTop:4 },
  unitBtnActive:{ },
  stakeBox:{ display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,marginTop:10 },
  btnPrimary:{ width:"100%",background:"#111827",color:"#ffffff",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer" },
  btnGhost:{ width:"100%",background:"transparent",border:"1px solid #e5e7eb",color:"#6b7280",borderRadius:8,padding:"12px",fontSize:13,cursor:"pointer",marginTop:4 },
  bWin:{ padding:"6px 14px",borderRadius:8,border:"1px solid #bbf7d0",background:"#f0fdf4",color:"#15803d",cursor:"pointer",fontSize:12,fontWeight:700 },
  bLoss:{ padding:"6px 14px",borderRadius:8,border:"1px solid #fca5a5",background:"#fef2f2",color:"#b91c1c",cursor:"pointer",fontSize:12,fontWeight:700 },
  bCash:{ padding:"6px 12px",borderRadius:8,border:"1px solid #93c5fd",background:"#eff6ff",color:"#1d4ed8",cursor:"pointer",fontSize:12,fontWeight:700 },
  bVoid:{ padding:"6px 12px",borderRadius:8,border:"1px solid #fde68a",background:"#fefce8",color:"#92400e",cursor:"pointer",fontSize:12,fontWeight:700 },
  bDel:{ padding:"6px 10px",borderRadius:8,border:"1px solid #f3f4f6",background:"transparent",color:"#d1d5db",cursor:"pointer",fontSize:13,marginLeft:"auto" },
  scoreRing:{ width:90,height:90,borderRadius:"50%",border:"3px solid #f3f4f6",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto",background:"#f9fafb" },
  fab:{ position:"fixed",bottom:24,right:18,width:56,height:56,borderRadius:"50%",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,.2)",zIndex:20,fontSize:28,fontWeight:300,lineHeight:1 },
  sportGrid:{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:4 },
  sportBtn:{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",border:"1px solid #e5e7eb",borderRadius:10,background:"#f9fafb",cursor:"pointer",color:"#9ca3af",fontSize:10,fontWeight:600 },
  sportBtnActive:{ background:"#f9fafb" },
};

if(typeof document!=="undefined"){
  const s=document.createElement("style");
  s.textContent=`@keyframes spin{to{transform:rotate(360deg)}} select option{background:#f9fafb} *{-webkit-tap-highlight-color:transparent;box-sizing:border-box} input:focus,select:focus{border-color:#9ca3af!important;box-shadow:0 0 0 3px rgba(156,163,175,.15);outline:none}`;
  document.head.appendChild(s);
}
