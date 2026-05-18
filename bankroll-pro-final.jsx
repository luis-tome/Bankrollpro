import { useState, useMemo, useEffect } from "react";
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
  "Ténis":        { icon:"🎾", accent:"#94a3b8", markets:["Vencedor do Jogo","Handicap Games","Total Games O/U","Set Winner","Total Sets O/U","Resultado Correto Sets","1º Set Vencedor","Total Games 1º Set","Handicap Sets","Dupla Hipótese","Tie-Break no Jogo","1º Break de Serviço","Jogo em Deuce","Total Aces O/U","Total Double Faults O/U","Outros"] },
  "Futebol":      { icon:"⚽", accent:"#94a3b8", markets:["1X2","Dupla Hipótese","Over/Under Golos","BTTS","Handicap Asiático","Handicap Europeu","Marcador Correto","1º Marcador","Total Cantos","Total Cartões","Over/Under 1ª Parte","Resultado ao Intervalo","Outros"] },
  "Basquetebol":  { icon:"🏀", accent:"#94a3b8", markets:["1X2","Handicap","Over/Under","1º Quarto","Moneyline","Outros"] },
  "Hóquei":       { icon:"🏒", accent:"#94a3b8", markets:["1X2","Handicap","Over/Under","Resultado Final","Outros"] },
  "Baseball":     { icon:"⚾", accent:"#94a3b8", markets:["Moneyline","Run Line","Over/Under","1ª Entrada","Outros"] },
  "Rugby":        { icon:"🏉", accent:"#94a3b8", markets:["1X2","Handicap","Over/Under","Primeira Tentativa","Outros"] },
  "MMA/UFC":      { icon:"🥊", accent:"#94a3b8", markets:["Vencedor","Método de Vitória","Round","Over/Under Rounds","Vai a Decisão","Outros"] },
  "Outros":       { icon:"🎯", accent:"#94a3b8", markets:["1X2","Handicap","Over/Under","Outros"] },
};
const SPORTS = Object.keys(SPORTS_CONFIG);

const fmtE   = v => "€" + Math.abs(v).toFixed(2).replace(".",",");
const fmtPnl = v => (v>=0?"+":"-")+"€"+Math.abs(v).toFixed(2).replace(".",",");
const fmtPct = v => (v>=0?"+":"")+v.toFixed(1)+"%";
const daysLeft = ts => Math.max(0, TRIAL_DAYS - Math.floor((Date.now()-new Date(ts).getTime())/86400000));

function rStyle(r) {
  const m = { WIN:["#0d1f14","#6ee7b7","#059669"], LOSS:["#1f0d0d","#fca5a5","#dc2626"], VOID:["#1f1c0d","#fcd34d","#d97706"], CASHOUT:["#0d1520","#93c5fd","#2563eb"], PENDING:["#13111f","#c4b5fd","#7c3aed"] };
  const [bg,color,border] = m[r]||m.PENDING;
  return { background:bg, color, border:`1px solid ${border}` };
}

async function getAIFeedback(bets, stats, bankroll, sport) {
  const settled = bets.filter(b=>b.result!=="PENDING");
  if (settled.length<3) return null;
  const summary = { sport, totalBets:settled.length, wins:stats.wins, losses:stats.losses, roi:stats.roi.toFixed(1), strikeRate:stats.strikeRate.toFixed(1), avgOdd:stats.avgOdd.toFixed(2), pnl:stats.pnl.toFixed(2), bankroll:bankroll.toFixed(2), byMarket:{} };
  settled.forEach(b=>{ if(!summary.byMarket[b.market])summary.byMarket[b.market]={bets:0,wins:0,pnl:0}; summary.byMarket[b.market].bets++; if(b.result==="WIN"){summary.byMarket[b.market].wins++;summary.byMarket[b.market].pnl+=b.stake*(b.odd-1);}else if(b.result==="LOSS")summary.byMarket[b.market].pnl-=b.stake; });
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`És um analista de gestão desportiva para ${sport}. Analisa e dá feedback direto em português de Portugal.\n\nDados: ${JSON.stringify(summary)}\n\nResponde APENAS com JSON sem markdown:\n{"score":<1-10>,"headline":"<máx 60 chars>","insights":["...","...","..."],"warnings":["..."],"tips":["...","..."],"bestMarket":"<ou null>","worstMarket":"<ou null>"}`}]})});
    const data = await res.json();
    return JSON.parse(data.content?.map(c=>c.text||"").join("").trim().replace(/```json|```/g,"").trim());
  } catch { return null; }
}

export default function App() {
  // Navigation stack for back button
  const [navStack, setNavStack]   = useState([]);
  const [screen, setScreen]       = useState("loading");
  const [authMode, setAuthMode]   = useState("register");
  const [user, setUser]           = useState(null);
  const [bankrolls, setBankrolls] = useState([]);
  const [activeBR, setActiveBR]   = useState(null);
  const [bets, setBets]           = useState([]);
  const [appView, setAppView]     = useState("dashboard");
  const [authForm, setAuthForm]   = useState({name:"",email:"",password:""});
  const [authErr, setAuthErr]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [filter, setFilter]       = useState("ALL");
  const [feedback, setFeedback]   = useState(null);
  const [loadingFB, setLoadingFB] = useState(false);
  const [subView, setSubView]     = useState("annual");
  const [showNewBR, setShowNewBR] = useState(false);
  const [newBRForm, setNewBRForm] = useState({name:"",sport:"Ténis",bankroll:"",unit_pct:"2"});
  const emptyForm = {sport:"Ténis",event:"",market:"Vencedor do Jogo",selection:"",odd:"",units:1,notes:""};
  const [form, setForm]           = useState(emptyForm);

  // Navigation helpers
  function navigate(newScreen, newView) {
    setNavStack(prev => [...prev, { screen, appView }]);
    if (newScreen) setScreen(newScreen);
    if (newView) setAppView(newView);
  }
  function goBack() {
    if (navStack.length === 0) return;
    const prev = navStack[navStack.length - 1];
    setNavStack(s => s.slice(0,-1));
    setScreen(prev.screen);
    setAppView(prev.appView);
  }
  const canGoBack = navStack.length > 0;

  const currentBankroll = bankrolls.find(b=>b.id===activeBR);
  const trialLeft = currentBankroll?.trial_start ? daysLeft(currentBankroll.trial_start) : TRIAL_DAYS;
  const isActive  = currentBankroll?.subscribed || trialLeft > 0;

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session){setUser(session.user);loadBankrolls(session.user.id);}
      else setScreen("landing");
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>{
      if(session){setUser(session.user);loadBankrolls(session.user.id);}
      else{setUser(null);setBankrolls([]);setScreen("landing");}
    });
    return ()=>subscription.unsubscribe();
  },[]);

  async function loadBankrolls(uid) {
    const {data} = await supabase.from("profiles").select("*").eq("user_id",uid).order("created_at");
    if(data&&data.length>0){setBankrolls(data);setActiveBR(data[0].id);await loadBets(data[0].id);setScreen("app");}
    else setScreen("setup");
  }
  async function loadBets(brId) {
    const {data} = await supabase.from("bets").select("*").eq("bankroll_id",brId).order("created_at",{ascending:false});
    if(data) setBets(data.map(b=>({...b,odd:parseFloat(b.odd),stake:parseFloat(b.stake)})));
  }
  async function switchBankroll(id) {
    setActiveBR(id); setBets([]); await loadBets(id); setAppView("dashboard");
  }
  async function handleAuth() {
    setAuthErr(""); setLoading(true);
    if(authMode==="register"){
      const {error} = await supabase.auth.signUp({email:authForm.email,password:authForm.password,options:{data:{name:authForm.name}}});
      if(error){setAuthErr(error.message);setLoading(false);return;}
    } else {
      const {error} = await supabase.auth.signInWithPassword({email:authForm.email,password:authForm.password});
      if(error){setAuthErr("Email ou password incorretos.");setLoading(false);return;}
    }
    setLoading(false);
  }
  async function handleSetup() {
    const br = parseFloat(newBRForm.bankroll);
    if(!br||br<=0||!newBRForm.name) return;
    const {data:{session}} = await supabase.auth.getSession();
    const uid = session?.user?.id||user?.id;
    const {data} = await supabase.from("profiles").insert({user_id:uid,name:newBRForm.name,sport:newBRForm.sport,bankroll:br,unit_pct:parseFloat(newBRForm.unit_pct),trial_start:new Date().toISOString(),subscribed:false}).select().single();
    if(data){setBankrolls(prev=>[...prev,data]);setActiveBR(data.id);setBets([]);setShowNewBR(false);setNewBRForm({name:"",sport:"Ténis",bankroll:"",unit_pct:"2"});setScreen("app");setNavStack([]);}
  }
  async function handleSubscribe(plan) {
    const stripe = await loadStripe(STRIPE_KEY);
    await stripe.redirectToCheckout({lineItems:[{price:plan==="monthly"?PRICE_MONTHLY:PRICE_ANNUAL,quantity:1}],mode:"subscription",successUrl:window.location.href+"?subscribed=true",cancelUrl:window.location.href,customerEmail:user?.email});
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
    return {settled:settled.length,wins:wins.length,losses:losses.length,pnl,roi,strikeRate,avgOdd,totalStaked,pending:bets.filter(b=>b.result==="PENDING").length};
  },[bets]);

  const brHistory = useMemo(()=>{
    let r=parseFloat(currentBankroll?.bankroll||0);
    const pts=[r];
    [...bets].reverse().filter(b=>b.result!=="PENDING").forEach(b=>{
      if(b.result==="WIN")r+=b.stake*(b.odd-1);
      else if(b.result==="LOSS")r-=b.stake;
      else if(b.result==="CASHOUT")r+=(b.cashout_val||0)-b.stake;
      pts.push(r);
    });
    return pts;
  },[bets,currentBankroll]);

  const currentBR = brHistory[brHistory.length-1]||parseFloat(currentBankroll?.bankroll||0);
  const unitVal   = currentBankroll ? currentBR*currentBankroll.unit_pct/100 : 0;

  async function addBet() {
    if(!form.event||!form.odd||!form.selection||!activeBR) return;
    const odd=parseFloat(form.odd);
    if(odd<=1) return;
    const stake=unitVal*(parseFloat(form.units)||1);
    const {data}=await supabase.from("bets").insert({user_id:user.id,bankroll_id:activeBR,sport:currentBankroll.sport,event:form.event,market:form.market,selection:form.selection,odd,stake,units:parseFloat(form.units),result:"PENDING",notes:form.notes}).select().single();
    if(data) setBets(prev=>[{...data,odd:parseFloat(data.odd),stake:parseFloat(data.stake)},...prev]);
    setForm(emptyForm); setAppView("history");
  }
  async function settleBet(id,result,cashoutVal) {
    await supabase.from("bets").update({result,cashout_val:cashoutVal||null}).eq("id",id);
    setBets(prev=>prev.map(b=>b.id===id?{...b,result,cashout_val:cashoutVal}:b));
  }
  async function deleteBet(id) {
    await supabase.from("bets").delete().eq("id",id);
    setBets(prev=>prev.filter(b=>b.id!==id));
  }

  const pts=brHistory;
  const maxV=Math.max(...pts,parseFloat(currentBankroll?.bankroll||0)+1);
  const minV=Math.min(...pts,parseFloat(currentBankroll?.bankroll||0)-1);
  const svgW=300,svgH=60;
  const toX=i=>pts.length<=1?svgW/2:(i/(pts.length-1))*svgW;
  const toY=v=>svgH-((v-minV)/(maxV-minV||1))*(svgH-10)-5;
  const polyline=pts.length>1?pts.map((v,i)=>`${toX(i)},${toY(v)}`).join(" "):null;

  const filteredBets=filter==="ALL"?bets:bets.filter(b=>b.result===filter);
  const markets=SPORTS_CONFIG[currentBankroll?.sport||"Ténis"]?.markets||["Outros"];
  const userName=user?.user_metadata?.name||user?.email?.split("@")[0]||"";

  // ── LOADING ──
  if(screen==="loading") return (
    <div style={{...C.root,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={C.spinner}/>
    </div>
  );

  // ── LANDING ──
  if(screen==="landing") return (
    <div style={C.root}>
      <header style={C.landingHeader}>
        <div style={C.logoWrap}>
          <span style={{fontSize:20}}>📊</span>
          <span style={C.logoText}>BankrollPro</span>
        </div>
        <button style={C.btnSm} onClick={()=>{setAuthMode("login");setScreen("auth");}}>Entrar</button>
      </header>
      <div style={C.hero}>
        <div style={C.heroTag}>Preço de lançamento · Oferta limitada</div>
        <h1 style={C.heroTitle}>Gestão mais<br/><span style={C.heroAccent}>inteligente.</span></h1>
        <p style={C.heroSub}>Controla as tuas bancas por desporto, acompanha métricas em tempo real e recebe análise com IA para evoluir a tua performance.</p>
        <div style={C.pricingRow}>
          <div style={C.pCard}>
            <div style={C.pLabel}>Mensal</div>
            <div style={C.pOld}>€4,99/mês</div>
            <div style={C.pPrice}>€3,99<span style={C.pPer}>/mês</span></div>
            <div style={C.pTag}>Lançamento</div>
          </div>
          <div style={{...C.pCard,...C.pCardFeat}}>
            <div style={C.pBest}>MELHOR VALOR</div>
            <div style={C.pLabel}>Anual</div>
            <div style={C.pOld}>€22,99/ano</div>
            <div style={C.pPrice}>€19,99<span style={C.pPer}>/ano</span></div>
            <div style={{...C.pTag,color:"#6ee7b7"}}>Poupas €28</div>
          </div>
        </div>
        <div style={C.sportRow}>
          {SPORTS.slice(0,6).map(s=>(
            <div key={s} style={C.sportPill}>
              <span style={{fontSize:16}}>{SPORTS_CONFIG[s].icon}</span>
              <span style={{fontSize:10,color:"#64748b"}}>{s}</span>
            </div>
          ))}
        </div>
        <div style={C.featList}>
          {["Até 3 bancas simultâneas","Análise com IA por desporto","Gestão por unidades dinâmicas","7 dias grátis — sem cartão"].map(f=>(
            <div key={f} style={C.featItem}><span style={{color:"#6b7280",marginRight:8}}>—</span>{f}</div>
          ))}
        </div>
        <button style={C.btnPrimary} onClick={()=>{setAuthMode("register");setScreen("auth");}}>
          Começar grátis
        </button>
      </div>
    </div>
  );

  // ── AUTH ──
  if(screen==="auth") return (
    <div style={C.root}>
      <div style={C.topBar}>
        <button style={C.backBtn} onClick={()=>setScreen("landing")}>
          ← Voltar
        </button>
      </div>
      <div style={C.centeredWrap}>
        <div style={C.authCard}>
          <h2 style={C.authTitle}>{authMode==="login"?"Bem-vindo de volta":"Criar conta"}</h2>
          <p style={C.authSub}>{authMode==="login"?"Entra na tua conta.":"7 dias grátis, sem cartão."}</p>
          {authMode==="register"&&<>
            <label style={C.label}>Nome</label>
            <input style={C.input} placeholder="O teu nome" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))}/>
          </>}
          <label style={C.label}>Email</label>
          <input style={C.input} type="email" placeholder="email@exemplo.com" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))}/>
          <label style={C.label}>Password</label>
          <input style={C.input} type="password" placeholder="••••••••" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))}/>
          {authErr&&<p style={C.errMsg}>{authErr}</p>}
          <button style={{...C.btnPrimary,marginTop:16}} onClick={handleAuth} disabled={loading}>
            {loading?"...":authMode==="login"?"Entrar":"Criar conta"}
          </button>
          <p style={C.switchTxt}>
            {authMode==="login"?"Ainda não tens conta? ":"Já tens conta? "}
            <span style={C.switchLink} onClick={()=>setAuthMode(m=>m==="login"?"register":"login")}>
              {authMode==="login"?"Regista-te":"Entra aqui"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  // ── SETUP ──
  if(screen==="setup") return (
    <div style={C.root}>
      <div style={C.centeredWrap}>
        <div style={C.authCard}>
          <h2 style={C.authTitle}>Primeira banca</h2>
          <p style={C.authSub}>Olá, {userName}! Configura a tua banca.</p>
          <div style={C.trialPill}>7 dias grátis ativados</div>
          <label style={C.label}>Nome da banca</label>
          <input style={C.input} placeholder="ex: Ténis Principal" value={newBRForm.name} onChange={e=>setNewBRForm(f=>({...f,name:e.target.value}))}/>
          <label style={C.label}>Desporto</label>
          <div style={C.sportGrid}>
            {SPORTS.map(s=>(
              <button key={s} style={{...C.sportBtn,...(newBRForm.sport===s?C.sportBtnActive:{})}}
                onClick={()=>setNewBRForm(f=>({...f,sport:s}))}>
                <span style={{fontSize:18}}>{SPORTS_CONFIG[s].icon}</span>
                <span style={{fontSize:10,color:newBRForm.sport===s?"#f1f5f9":"#64748b"}}>{s}</span>
              </button>
            ))}
          </div>
          <label style={C.label}>Bankroll (€)</label>
          <input style={C.input} type="number" placeholder="ex: 500" value={newBRForm.bankroll} onChange={e=>setNewBRForm(f=>({...f,bankroll:e.target.value}))}/>
          <label style={C.label}>Unidade (% do bankroll)</label>
          <input style={C.input} type="number" step="0.5" min="0.5" max="10" value={newBRForm.unit_pct} onChange={e=>setNewBRForm(f=>({...f,unit_pct:e.target.value}))}/>
          {newBRForm.bankroll&&<p style={C.hint}>1 unidade = <strong style={{color:"#cbd5e1"}}>€{((parseFloat(newBRForm.bankroll)||0)*(parseFloat(newBRForm.unit_pct)||2)/100).toFixed(2)}</strong> · Recomendamos 1–2%</p>}
          <button style={{...C.btnPrimary,marginTop:20}} onClick={handleSetup}>Criar banca</button>
        </div>
      </div>
    </div>
  );

  // ── PAYWALL ──
  if(screen==="app"&&!isActive) return (
    <div style={C.root}>
      <div style={C.centeredWrap}>
        <div style={C.authCard}>
          <h2 style={C.authTitle}>Trial terminado</h2>
          <p style={C.authSub}>Escolhe um plano para continuar.</p>
          <div style={C.planToggle}>
            <button style={{...C.planBtn,...(subView==="monthly"?C.planBtnActive:{})}} onClick={()=>setSubView("monthly")}>Mensal</button>
            <button style={{...C.planBtn,...(subView==="annual"?C.planBtnActive:{})}} onClick={()=>setSubView("annual")}>Anual</button>
          </div>
          {subView==="monthly"
            ?<div style={C.planCard}>
              <div style={C.pOld}>€4,99/mês</div>
              <div style={C.planPrice}>€3,99<span style={C.pPer}>/mês</span></div>
              <button style={{...C.btnPrimary,marginTop:12}} onClick={()=>handleSubscribe("monthly")}>Subscrever</button>
            </div>
            :<div style={{...C.planCard,borderColor:"#374151"}}>
              <div style={{fontSize:10,color:"#9ca3af",letterSpacing:1,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Melhor valor</div>
              <div style={C.pOld}>€22,99/ano</div>
              <div style={C.planPrice}>€19,99<span style={C.pPer}>/ano</span></div>
              <div style={{fontSize:11,color:"#6ee7b7",marginBottom:12}}>€1,67/mês · Poupas €28</div>
              <button style={{...C.btnPrimary}} onClick={()=>handleSubscribe("annual")}>Subscrever</button>
            </div>
          }
          <button style={{...C.btnGhost,marginTop:8}} onClick={()=>supabase.auth.signOut()}>Terminar sessão</button>
        </div>
      </div>
    </div>
  );

  // ── MAIN APP ──
  return (
    <div style={C.root}>
      {/* Header */}
      <header style={C.header}>
        <div style={C.headerL}>
          {canGoBack
            ? <button style={C.backBtnHeader} onClick={goBack}>←</button>
            : <span style={{fontSize:18}}>{SPORTS_CONFIG[currentBankroll?.sport||"Ténis"]?.icon}</span>
          }
          <div>
            <div style={C.headerTitle}>{currentBankroll?.name||"BankrollPro"}</div>
            <div style={C.headerSub}>{currentBankroll?.sport}</div>
          </div>
        </div>
        <div style={C.headerR}>
          {trialLeft>0&&!currentBankroll?.subscribed&&(
            <span style={C.trialChip}>{trialLeft}d</span>
          )}
          <span style={C.brChip}>{fmtE(currentBR)}</span>
        </div>
      </header>

      {/* Bankroll tabs */}
      <div style={C.brTabs}>
        {bankrolls.map(br=>(
          <button key={br.id} style={{...C.brTab,...(br.id===activeBR?C.brTabActive:{})}}
            onClick={()=>switchBankroll(br.id)}>
            {SPORTS_CONFIG[br.sport]?.icon} {br.name}
          </button>
        ))}
        {bankrolls.length<MAX_BANKROLLS&&(
          <button style={C.brAddBtn} onClick={()=>setShowNewBR(true)}>+ Nova</button>
        )}
      </div>

      {/* New bankroll modal */}
      {showNewBR&&(
        <div style={C.overlay}>
          <div style={C.modal}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{color:"#f1f5f9",margin:0,fontSize:16,fontWeight:700}}>Nova Banca</h3>
              <button style={{background:"none",border:"none",color:"#6b7280",fontSize:22,cursor:"pointer",lineHeight:1}} onClick={()=>setShowNewBR(false)}>×</button>
            </div>
            <label style={C.label}>Nome</label>
            <input style={C.input} placeholder="ex: Futebol Europa" value={newBRForm.name} onChange={e=>setNewBRForm(f=>({...f,name:e.target.value}))}/>
            <label style={C.label}>Desporto</label>
            <div style={C.sportGrid}>
              {SPORTS.map(s=>(
                <button key={s} style={{...C.sportBtn,...(newBRForm.sport===s?C.sportBtnActive:{})}}
                  onClick={()=>setNewBRForm(f=>({...f,sport:s}))}>
                  <span style={{fontSize:18}}>{SPORTS_CONFIG[s].icon}</span>
                  <span style={{fontSize:10,color:newBRForm.sport===s?"#f1f5f9":"#64748b"}}>{s}</span>
                </button>
              ))}
            </div>
            <label style={C.label}>Bankroll (€)</label>
            <input style={C.input} type="number" placeholder="ex: 300" value={newBRForm.bankroll} onChange={e=>setNewBRForm(f=>({...f,bankroll:e.target.value}))}/>
            <label style={C.label}>Unidade (%)</label>
            <input style={C.input} type="number" step="0.5" min="0.5" max="10" value={newBRForm.unit_pct} onChange={e=>setNewBRForm(f=>({...f,unit_pct:e.target.value}))}/>
            <button style={{...C.btnPrimary,marginTop:16}} onClick={handleSetup}>Criar banca</button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={C.nav}>
        {[["dashboard","Dashboard"],["nova","Registar"],["history","Histórico"],["feedback","Análise IA"],["account","Conta"]].map(([v,l])=>(
          <button key={v} style={{...C.navBtn,...(appView===v?C.navActive:{})}}
            onClick={()=>{setNavStack([]);setAppView(v);}}>
            {l}
          </button>
        ))}
      </nav>

      <main style={C.main}>

        {/* DASHBOARD */}
        {appView==="dashboard"&&(
          <div>
            <div style={C.kpiGrid}>
              <KPI label="Banca Atual" value={fmtE(currentBR)}
                sub={fmtPct(((currentBR-(currentBankroll?.bankroll||0))/(currentBankroll?.bankroll||1))*100)}
                subColor={currentBR>=(currentBankroll?.bankroll||0)?"#6ee7b7":"#fca5a5"}/>
              <KPI label="Resultado" value={fmtPnl(stats.pnl)}
                valueColor={stats.pnl>=0?"#6ee7b7":"#fca5a5"}
                sub={`ROI ${fmtPct(stats.roi)}`} subColor={stats.roi>=0?"#6ee7b7":"#fca5a5"}/>
              <KPI label="Taxa de Acerto" value={stats.strikeRate.toFixed(1)+"%"}
                sub={`${stats.wins} acertos / ${stats.losses} erros`}/>
              <KPI label="Odd Média" value={stats.avgOdd.toFixed(2)} sub={`${stats.settled} registos`}/>
            </div>

            {pts.length>1&&(
              <div style={C.card}>
                <div style={C.cardTitle}>Evolução da Banca</div>
                <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{width:"100%",height:70,display:"block"}}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6b7280" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="#6b7280" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <polygon points={`0,${svgH} ${polyline} ${svgW},${svgH}`} fill="url(#g)"/>
                  <polyline points={polyline} fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinejoin="round"/>
                  <line x1="0" y1={toY(currentBankroll?.bankroll||0)} x2={svgW} y2={toY(currentBankroll?.bankroll||0)} stroke="#374151" strokeWidth="1" strokeDasharray="4,3"/>
                </svg>
              </div>
            )}

            {stats.pending>0&&(
              <div style={{...C.card,borderColor:"#374151"}}>
                <div style={C.cardTitle}>Pendentes</div>
                {bets.filter(b=>b.result==="PENDING").map(b=>(
                  <div key={b.id} style={C.pendRow}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#e5e7eb"}}>{b.selection}</div>
                      <div style={{fontSize:11,color:"#6b7280"}}>{b.event} · @{b.odd.toFixed(2)} · {fmtE(b.stake)}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button style={C.bWin} onClick={()=>settleBet(b.id,"WIN")}>✓</button>
                      <button style={C.bLoss} onClick={()=>settleBet(b.id,"LOSS")}>✗</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={C.statGrid}>
              <Pill label="Por unidade" value={fmtE(unitVal)}/>
              <Pill label="Total apostado" value={fmtE(stats.totalStaked)}/>
              <Pill label="Pendentes" value={stats.pending}/>
              <Pill label="Liquidados" value={stats.settled}/>
            </div>
          </div>
        )}

        {/* REGISTAR */}
        {appView==="nova"&&(
          <div style={C.card}>
            <div style={C.cardTitle}>{SPORTS_CONFIG[currentBankroll?.sport||"Ténis"]?.icon} Novo Registo</div>
            <label style={C.label}>Evento</label>
            <input style={C.input} placeholder="ex: Sinner vs Alcaraz" value={form.event} onChange={e=>setForm(f=>({...f,event:e.target.value}))}/>
            <label style={C.label}>Mercado</label>
            <select style={C.input} value={form.market} onChange={e=>setForm(f=>({...f,market:e.target.value}))}>
              {markets.map(m=><option key={m}>{m}</option>)}
            </select>
            <label style={C.label}>Seleção</label>
            <input style={C.input} placeholder="ex: Sinner / Over 22.5 Games" value={form.selection} onChange={e=>setForm(f=>({...f,selection:e.target.value}))}/>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1}}>
                <label style={C.label}>Odd</label>
                <input style={C.input} type="number" step="0.01" min="1.01" placeholder="1.85" value={form.odd} onChange={e=>setForm(f=>({...f,odd:e.target.value}))}/>
              </div>
              <div style={{flex:1}}>
                <label style={C.label}>Unidades</label>
                <div style={{display:"flex",gap:4,marginTop:4}}>
                  {[0.5,1,2,3].map(u=>(
                    <button key={u} style={{...C.unitBtn,...(parseFloat(form.units)===u?C.unitBtnActive:{})}}
                      onClick={()=>setForm(f=>({...f,units:u}))}>{u}</button>
                  ))}
                </div>
              </div>
            </div>
            {form.odd&&parseFloat(form.odd)>1&&(
              <div style={C.stakeBox}>
                <span>Stake: <strong style={{color:"#e5e7eb"}}>{fmtE(unitVal*(parseFloat(form.units)||1))}</strong></span>
                <span style={{marginLeft:"auto"}}>Retorno pot.: <strong style={{color:"#6ee7b7"}}>{fmtE(unitVal*(parseFloat(form.units)||1)*parseFloat(form.odd))}</strong></span>
              </div>
            )}
            <label style={C.label}>Notas (opcional)</label>
            <input style={C.input} placeholder="Raciocínio, contexto..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
            <button style={{...C.btnPrimary,marginTop:18}} onClick={addBet}>Registar</button>
          </div>
        )}

        {/* HISTÓRICO */}
        {appView==="history"&&(
          <div>
            <div style={C.filterRow}>
              {[["ALL","Todos"],["PENDING","Pendentes"],["WIN","Acertos"],["LOSS","Erros"],["CASHOUT","Cashout"],["VOID","Void"]].map(([v,l])=>(
                <button key={v} style={{...C.filterBtn,...(filter===v?C.filterActive:{})}} onClick={()=>setFilter(v)}>{l}</button>
              ))}
            </div>
            {filteredBets.length===0&&(
              <div style={{textAlign:"center",padding:"40px 0",color:"#4b5563"}}>
                <div style={{fontSize:36,marginBottom:8}}>{SPORTS_CONFIG[currentBankroll?.sport||"Ténis"]?.icon}</div>
                Nenhum registo encontrado.
              </div>
            )}
            {filteredBets.map(b=>{
              const rs=rStyle(b.result);
              return (
                <div key={b.id} style={C.betCard}>
                  <div style={{display:"flex",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9"}}>{b.event}</div>
                      <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{b.market} · <strong style={{color:"#9ca3af"}}>{b.selection}</strong></div>
                      {b.notes&&<div style={{fontSize:11,color:"#4b5563",fontStyle:"italic",marginTop:2}}>"{b.notes}"</div>}
                      <div style={{fontSize:10,color:"#374151",marginTop:4}}>{new Date(b.created_at).toLocaleDateString("pt-PT")}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,minWidth:76}}>
                      <span style={{...C.badge,...rs}}>{b.result}</span>
                      <div style={{fontSize:16,fontWeight:700,color:"#d1d5db"}}>@{b.odd.toFixed(2)}</div>
                      <div style={{fontSize:12,color:"#6b7280"}}>{fmtE(b.stake)}</div>
                    </div>
                  </div>
                  {b.result==="PENDING"&&(
                    <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                      <button style={C.bWin}  onClick={()=>settleBet(b.id,"WIN")}>✓ Acertou</button>
                      <button style={C.bLoss} onClick={()=>settleBet(b.id,"LOSS")}>✗ Errou</button>
                      <button style={C.bCash} onClick={()=>{const v=parseFloat(prompt("Valor do cashout (€):"));if(v>=0)settleBet(b.id,"CASHOUT",v);}}>Cashout</button>
                      <button style={C.bVoid} onClick={()=>settleBet(b.id,"VOID")}>Void</button>
                      <button style={C.bDel}  onClick={()=>deleteBet(b.id)}>🗑</button>
                    </div>
                  )}
                  {b.result!=="PENDING"&&(
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                      {b.result==="WIN"&&<span style={{color:"#6ee7b7",fontSize:12,fontWeight:700}}>+{fmtE(b.stake*(b.odd-1))}</span>}
                      {b.result==="LOSS"&&<span style={{color:"#fca5a5",fontSize:12,fontWeight:700}}>-{fmtE(b.stake)}</span>}
                      {b.result==="CASHOUT"&&<span style={{color:"#93c5fd",fontSize:12,fontWeight:700}}>{fmtPnl((b.cashout_val||0)-b.stake)}</span>}
                      <button style={C.bDel} onClick={()=>deleteBet(b.id)}>🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ANÁLISE IA */}
        {appView==="feedback"&&(
          <div>
            <div style={C.card}>
              <div style={C.cardTitle}>Análise IA · {currentBankroll?.sport}</div>
              <p style={{color:"#6b7280",fontSize:13,lineHeight:1.6,marginBottom:16}}>
                Análise do teu histórico com recomendações personalizadas. Precisas de pelo menos 3 registos liquidados.
              </p>
              <button style={C.btnPrimary}
                onClick={async()=>{setLoadingFB(true);setFeedback(null);const fb=await getAIFeedback(bets,stats,currentBR,currentBankroll?.sport);setFeedback(fb);setLoadingFB(false);}}
                disabled={loadingFB||stats.settled<3}>
                {loadingFB?"A analisar...":stats.settled<3?`Precisas de ${3-stats.settled} registo(s) mais`:"Analisar"}
              </button>
            </div>
            {loadingFB&&<div style={{...C.card,textAlign:"center",padding:40}}><div style={C.spinner}/></div>}
            {feedback&&!loadingFB&&(
              <div>
                <div style={{...C.card,textAlign:"center"}}>
                  <div style={C.scoreRing}>
                    <div style={{fontSize:32,fontWeight:800,color:feedback.score>=7?"#6ee7b7":feedback.score>=4?"#fcd34d":"#fca5a5"}}>{feedback.score}</div>
                    <div style={{fontSize:10,color:"#6b7280"}}>/10</div>
                  </div>
                  <div style={{fontSize:15,fontWeight:600,color:"#f1f5f9",marginTop:12}}>{feedback.headline}</div>
                </div>
                {feedback.warnings?.length>0&&(
                  <div style={{...C.card,background:"#1c1208",borderColor:"#78350f"}}>
                    <div style={{...C.cardTitle,color:"#fcd34d"}}>Alertas</div>
                    {feedback.warnings.map((w,i)=><p key={i} style={{color:"#fcd34d",fontSize:13,margin:"6px 0"}}>{w}</p>)}
                  </div>
                )}
                <div style={C.card}>
                  <div style={C.cardTitle}>Insights</div>
                  {feedback.insights?.map((ins,i)=>(
                    <div key={i} style={{display:"flex",padding:"8px 0",borderBottom:"1px solid #1f2937"}}>
                      <span style={{color:"#6b7280",marginRight:10,flexShrink:0}}>—</span>
                      <span style={{color:"#d1d5db",fontSize:13,lineHeight:1.5}}>{ins}</span>
                    </div>
                  ))}
                </div>
                <div style={C.card}>
                  <div style={C.cardTitle}>Recomendações</div>
                  {feedback.tips?.map((t,i)=>(
                    <div key={i} style={{display:"flex",padding:"8px 0",borderBottom:"1px solid #1f2937"}}>
                      <span style={{color:"#6ee7b7",marginRight:10,flexShrink:0}}>✓</span>
                      <span style={{color:"#d1d5db",fontSize:13,lineHeight:1.5}}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTA */}
        {appView==="account"&&(
          <div>
            <div style={C.card}>
              <div style={C.cardTitle}>Conta</div>
              <div style={C.accRow}><span style={C.accLabel}>Nome</span><span style={{color:"#d1d5db"}}>{userName}</span></div>
              <div style={C.accRow}><span style={C.accLabel}>Email</span><span style={{color:"#d1d5db",fontSize:12}}>{user?.email}</span></div>
              <div style={C.accRow}>
                <span style={C.accLabel}>Estado</span>
                <span style={{color:currentBankroll?.subscribed?"#6ee7b7":trialLeft>0?"#fcd34d":"#fca5a5",fontWeight:600}}>
                  {currentBankroll?.subscribed?"Ativo":trialLeft>0?`Trial (${trialLeft}d)`:"Expirado"}
                </span>
              </div>
            </div>
            <div style={C.card}>
              <div style={C.cardTitle}>Bancas</div>
              {bankrolls.map(br=>(
                <div key={br.id} style={{...C.accRow,cursor:"pointer"}} onClick={()=>switchBankroll(br.id)}>
                  <span style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>{SPORTS_CONFIG[br.sport]?.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:br.id===activeBR?"#f1f5f9":"#9ca3af"}}>{br.name}</div>
                      <div style={{fontSize:11,color:"#4b5563"}}>{br.sport}</div>
                    </div>
                  </span>
                  <span style={{color:"#d1d5db",fontWeight:700}}>{fmtE(parseFloat(br.bankroll))}</span>
                </div>
              ))}
              {bankrolls.length<MAX_BANKROLLS&&(
                <button style={{...C.btnGhost,marginTop:12}} onClick={()=>setShowNewBR(true)}>
                  + Nova banca ({bankrolls.length}/{MAX_BANKROLLS})
                </button>
              )}
            </div>
            {!currentBankroll?.subscribed&&(
              <div style={C.card}>
                <div style={C.cardTitle}>Subscrever</div>
                <div style={C.planToggle}>
                  <button style={{...C.planBtn,...(subView==="monthly"?C.planBtnActive:{})}} onClick={()=>setSubView("monthly")}>Mensal €3,99</button>
                  <button style={{...C.planBtn,...(subView==="annual"?C.planBtnActive:{})}} onClick={()=>setSubView("annual")}>Anual €19,99</button>
                </div>
                <button style={{...C.btnPrimary,marginTop:12}} onClick={()=>handleSubscribe(subView)}>
                  Subscrever {subView==="monthly"?"€3,99/mês":"€19,99/ano"}
                </button>
              </div>
            )}
            <button style={C.btnGhost} onClick={()=>supabase.auth.signOut()}>Terminar sessão</button>
          </div>
        )}
      </main>
    </div>
  );
}

function KPI({label,value,sub,valueColor,subColor}) {
  return (
    <div style={C.kpiCard}>
      <div style={C.kpiLabel}>{label}</div>
      <div style={{...C.kpiVal,color:valueColor||"#f1f5f9"}}>{value}</div>
      {sub&&<div style={{fontSize:11,marginTop:3,color:subColor||"#6b7280"}}>{sub}</div>}
    </div>
  );
}
function Pill({label,value,color}) {
  return (
    <div style={C.pill}>
      <div style={{fontSize:10,color:"#4b5563",textTransform:"uppercase",letterSpacing:.8,marginBottom:3}}>{label}</div>
      <div style={{fontSize:15,fontWeight:700,color:color||"#e5e7eb"}}>{value}</div>
    </div>
  );
}

// ── Design System: Professional Grey ─────────────────────────────────────────
const C = {
  root:{ minHeight:"100vh", background:"#0f1117", color:"#f1f5f9", fontFamily:"'DM Mono','Courier New',monospace", paddingBottom:80 },
  spinner:{ width:28,height:28,border:"2px solid #1f2937",borderTop:"2px solid #6b7280",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto" },

  // Landing
  landingHeader:{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 20px",borderBottom:"1px solid #1f2937" },
  logoWrap:{ display:"flex",alignItems:"center",gap:8 },
  logoText:{ fontSize:16,fontWeight:800,color:"#f1f5f9",letterSpacing:"-.5px" },
  btnSm:{ background:"transparent",border:"1px solid #374151",color:"#9ca3af",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit" },
  hero:{ padding:"32px 20px 60px",maxWidth:460,margin:"0 auto" },
  heroTag:{ display:"inline-block",background:"#1f2937",border:"1px solid #374151",color:"#9ca3af",borderRadius:4,padding:"3px 10px",fontSize:10,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:20 },
  heroTitle:{ fontSize:42,fontWeight:900,lineHeight:1.05,letterSpacing:"-2px",margin:"0 0 14px",color:"#f9fafb" },
  heroAccent:{ color:"#9ca3af" },
  heroSub:{ fontSize:14,color:"#6b7280",lineHeight:1.7,marginBottom:28 },
  pricingRow:{ display:"flex",gap:10,marginBottom:24 },
  pCard:{ flex:1,background:"#161b22",border:"1px solid #21262d",borderRadius:12,padding:14 },
  pCardFeat:{ border:"1px solid #374151",background:"#161b22" },
  pBest:{ fontSize:9,color:"#9ca3af",letterSpacing:1.5,fontWeight:800,textTransform:"uppercase",marginBottom:6 },
  pLabel:{ fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:.8,marginBottom:4 },
  pOld:{ fontSize:11,color:"#4b5563",textDecoration:"line-through",marginBottom:2 },
  pPrice:{ fontSize:22,fontWeight:900,color:"#f9fafb",letterSpacing:"-.5px" },
  pPer:{ fontSize:12,fontWeight:400,color:"#6b7280" },
  pTag:{ fontSize:10,color:"#9ca3af",marginTop:4 },
  sportRow:{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:20 },
  sportPill:{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"#161b22",border:"1px solid #21262d",borderRadius:10,padding:"8px 10px",minWidth:54 },
  featList:{ display:"flex",flexDirection:"column",gap:8,marginBottom:28 },
  featItem:{ fontSize:13,color:"#6b7280",display:"flex",alignItems:"center" },

  // Auth
  topBar:{ padding:"14px 18px",borderBottom:"1px solid #1f2937" },
  backBtn:{ background:"transparent",border:"none",color:"#6b7280",cursor:"pointer",fontFamily:"inherit",fontSize:13,padding:0 },
  centeredWrap:{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"calc(100vh - 60px)",padding:20 },
  authCard:{ width:"100%",maxWidth:380,background:"#161b22",border:"1px solid #21262d",borderRadius:16,padding:"28px 24px",display:"flex",flexDirection:"column",gap:4 },
  authTitle:{ fontSize:20,fontWeight:800,color:"#f9fafb",margin:"0 0 4px",letterSpacing:"-.5px" },
  authSub:{ fontSize:13,color:"#6b7280",marginBottom:12 },
  switchTxt:{ fontSize:12,color:"#4b5563",textAlign:"center",marginTop:12 },
  switchLink:{ color:"#9ca3af",cursor:"pointer",textDecoration:"underline" },
  errMsg:{ color:"#fca5a5",fontSize:12,margin:"4px 0" },
  trialPill:{ background:"#0d2118",border:"1px solid #065f46",borderRadius:6,padding:"6px 12px",fontSize:12,color:"#6ee7b7",marginBottom:8,textAlign:"center" },
  hint:{ fontSize:12,color:"#4b5563",margin:"6px 0 0" },

  // Plan
  planToggle:{ display:"flex",gap:4,background:"#0f1117",padding:4,borderRadius:8,marginTop:8 },
  planBtn:{ flex:1,padding:"8px 10px",borderRadius:6,border:"none",background:"transparent",color:"#6b7280",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700 },
  planBtnActive:{ background:"#1f2937",color:"#e5e7eb" },
  planCard:{ background:"#0f1117",border:"1px solid #21262d",borderRadius:12,padding:20,textAlign:"center",marginTop:12 },
  planPrice:{ fontSize:26,fontWeight:900,color:"#f9fafb",marginBottom:8,letterSpacing:"-.5px" },

  // Header
  header:{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"#161b22",borderBottom:"1px solid #21262d",position:"sticky",top:0,zIndex:10 },
  headerL:{ display:"flex",alignItems:"center",gap:10 },
  backBtnHeader:{ background:"transparent",border:"none",color:"#9ca3af",fontSize:18,cursor:"pointer",padding:"0 8px 0 0",fontFamily:"inherit",lineHeight:1 },
  headerTitle:{ fontSize:14,fontWeight:700,color:"#f1f5f9",letterSpacing:"-.3px" },
  headerSub:{ fontSize:10,color:"#4b5563" },
  headerR:{ display:"flex",alignItems:"center",gap:6 },
  trialChip:{ background:"#0d2118",border:"1px solid #065f46",borderRadius:6,padding:"3px 8px",fontSize:11,color:"#6ee7b7",fontWeight:700 },
  brChip:{ background:"#1f2937",border:"1px solid #374151",borderRadius:8,padding:"4px 10px",fontSize:13,fontWeight:800,color:"#f1f5f9" },

  // BR tabs
  brTabs:{ display:"flex",gap:4,padding:"8px 12px",background:"#0f1117",borderBottom:"1px solid #1f2937",overflowX:"auto" },
  brTab:{ padding:"4px 12px",borderRadius:6,border:"1px solid #1f2937",background:"transparent",color:"#4b5563",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,whiteSpace:"nowrap" },
  brTabActive:{ background:"#1f2937",color:"#e5e7eb",borderColor:"#374151" },
  brAddBtn:{ padding:"4px 12px",borderRadius:6,border:"1px dashed #1f2937",background:"transparent",color:"#4b5563",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,whiteSpace:"nowrap" },

  // Modal
  overlay:{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20 },
  modal:{ background:"#161b22",border:"1px solid #21262d",borderRadius:16,padding:24,width:"100%",maxWidth:380,maxHeight:"80vh",overflowY:"auto" },

  // Nav
  nav:{ display:"flex",background:"#161b22",borderBottom:"1px solid #21262d",overflowX:"auto" },
  navBtn:{ flex:1,padding:"12px 4px",border:"none",borderBottom:"2px solid transparent",background:"transparent",color:"#4b5563",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,whiteSpace:"nowrap" },
  navActive:{ color:"#e5e7eb",borderBottomColor:"#6b7280",background:"#0f1117" },

  main:{ maxWidth:680,margin:"0 auto",padding:"16px 14px" },

  // KPI
  kpiGrid:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 },
  kpiCard:{ background:"#161b22",border:"1px solid #21262d",borderRadius:12,padding:"14px 16px" },
  kpiLabel:{ fontSize:10,color:"#4b5563",textTransform:"uppercase",letterSpacing:.8,marginBottom:5 },
  kpiVal:{ fontSize:20,fontWeight:800,letterSpacing:"-.5px" },

  // Card
  card:{ background:"#161b22",border:"1px solid #21262d",borderRadius:12,padding:16,marginBottom:10 },
  cardTitle:{ fontSize:10,color:"#4b5563",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800 },

  statGrid:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4 },
  pill:{ background:"#161b22",border:"1px solid #21262d",borderRadius:10,padding:"12px 14px" },
  pendRow:{ display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1f2937",gap:10 },

  label:{ fontSize:11,color:"#6b7280",marginBottom:4,marginTop:10,display:"block",fontWeight:600 },
  input:{ width:"100%",background:"#0f1117",border:"1px solid #1f2937",borderRadius:8,color:"#f1f5f9",padding:"11px 12px",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",outline:"none" },
  unitBtn:{ flex:1,padding:"10px 0",border:"1px solid #1f2937",borderRadius:8,background:"#0f1117",color:"#4b5563",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,marginTop:4 },
  unitBtnActive:{ background:"#1f2937",color:"#e5e7eb",borderColor:"#374151" },
  stakeBox:{ display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,background:"#0f1117",border:"1px solid #1f2937",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#6b7280",marginTop:8 },

  btnPrimary:{ width:"100%",background:"#1f2937",color:"#f1f5f9",border:"1px solid #374151",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" },
  btnGhost:{ width:"100%",background:"transparent",border:"1px solid #1f2937",color:"#6b7280",borderRadius:8,padding:"12px",fontSize:13,cursor:"pointer",fontFamily:"inherit",marginTop:4 },

  filterRow:{ display:"flex",gap:6,marginBottom:12,flexWrap:"wrap" },
  filterBtn:{ padding:"4px 12px",borderRadius:20,border:"1px solid #1f2937",background:"transparent",color:"#4b5563",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700 },
  filterActive:{ background:"#1f2937",color:"#e5e7eb",borderColor:"#374151" },

  betCard:{ background:"#161b22",border:"1px solid #21262d",borderRadius:12,padding:14,marginBottom:8 },
  badge:{ borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:800,letterSpacing:.5 },

  bWin:{ padding:"5px 12px",borderRadius:6,border:"1px solid #059669",background:"#0d2118",color:"#6ee7b7",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit" },
  bLoss:{ padding:"5px 12px",borderRadius:6,border:"1px solid #dc2626",background:"#1f0d0d",color:"#fca5a5",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit" },
  bCash:{ padding:"5px 12px",borderRadius:6,border:"1px solid #2563eb",background:"#0d1520",color:"#93c5fd",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit" },
  bVoid:{ padding:"5px 12px",borderRadius:6,border:"1px solid #d97706",background:"#1c1208",color:"#fcd34d",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit" },
  bDel:{ padding:"5px 8px",borderRadius:6,border:"1px solid #1f2937",background:"transparent",color:"#374151",cursor:"pointer",fontSize:12,fontFamily:"inherit",marginLeft:"auto" },

  scoreRing:{ width:80,height:80,borderRadius:"50%",border:"2px solid #1f2937",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto",background:"#0f1117" },

  accRow:{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1f2937",fontSize:13 },
  accLabel:{ color:"#4b5563",fontSize:10,textTransform:"uppercase",letterSpacing:.5,fontWeight:700 },

  sportGrid:{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:4 },
  sportBtn:{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",border:"1px solid #1f2937",borderRadius:8,background:"#0f1117",cursor:"pointer",fontFamily:"inherit" },
  sportBtnActive:{ border:"1px solid #374151",background:"#1f2937" },
};

if(typeof document!=="undefined"){
  const s=document.createElement("style");
  s.textContent=`@keyframes spin{to{transform:rotate(360deg)}} select option{background:#0f1117} *{-webkit-tap-highlight-color:transparent} input:focus,select:focus{border-color:#374151!important;outline:none}`;
  document.head.appendChild(s);
}
