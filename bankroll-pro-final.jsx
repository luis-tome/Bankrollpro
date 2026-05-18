import { useState, useMemo, useEffect } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { loadStripe } from "https://cdn.jsdelivr.net/npm/@stripe/stripe-js/+esm";

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://opeuermurrbzpglbkmrf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZXVlcm11cnJienBnbGJrbXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjA2NTAsImV4cCI6MjA5NDU5NjY1MH0.M-VclAmrSl0gop_7IvXh7-HH7nj5DwMFLVCMIOa3Qfw";
const STRIPE_KEY   = "pk_test_51TY69iPDBkFhOFXxSS9aPU8YSFZD5pdds2TSCGAawm36ZXSznfOJLahTu6d6KMw0Q1AffvdyQM8KLTrvKiWbYdCF00l0adSiVk";
const PRICE_MONTHLY = "price_1TY6GAPDBkFhOFXxt2mORXRN";
const PRICE_ANNUAL  = "price_1TY85vPDBkFhOFXxSr5DfJJC";
const TRIAL_DAYS    = 7;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Constants ────────────────────────────────────────────────────────────────
const SPORTS = ["Ténis","Futebol","Basquetebol","Hóquei","Baseball","Rugby","MMA/UFC","Outros"];
const MARKETS = {
  "Ténis":       ["1X2","Handicap Games","Total Games","Set Winner","Total Sets","Outros"],
  "Futebol":     ["1X2","Dupla Hipótese","Over/Under","BTTS","Handicap","Marcador Correto","Outros"],
  "Basquetebol": ["1X2","Handicap","Over/Under","1º Quarto","Outros"],
  "Hóquei":      ["1X2","Handicap","Over/Under","Outros"],
  "Baseball":    ["Moneyline","Run Line","Over/Under","Outros"],
  "Rugby":       ["1X2","Handicap","Over/Under","Outros"],
  "MMA/UFC":     ["Vencedor","Método Vitória","Round","Over/Under Rounds","Outros"],
  "Outros":      ["1X2","Handicap","Over/Under","Outros"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt    = (v) => (v >= 0 ? "+" : "-") + "€" + Math.abs(v).toFixed(2).replace(".", ",");
const fmtAbs = (v) => "€" + Math.abs(v).toFixed(2).replace(".", ",");
const fmtPct = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
const daysLeft = (ts) => Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(ts).getTime()) / 86400000));

function badgeStyle(result) {
  const map = {
    WIN:     { bg:"#0f2d1a", color:"#4ade80", border:"#16a34a" },
    LOSS:    { bg:"#2d0f0f", color:"#f87171", border:"#dc2626" },
    VOID:    { bg:"#2d2a0f", color:"#fbbf24", border:"#d97706" },
    CASHOUT: { bg:"#0f1f2d", color:"#60a5fa", border:"#2563eb" },
    PENDING: { bg:"#1a1a2d", color:"#a78bfa", border:"#7c3aed" },
  };
  return map[result] || map.PENDING;
}

// ─── AI Feedback ──────────────────────────────────────────────────────────────
async function getAIFeedback(bets, stats, bankroll) {
  const settled = bets.filter(b => b.result !== "PENDING");
  if (settled.length < 3) return null;
  const summary = {
    totalBets: settled.length, wins: stats.wins, losses: stats.losses,
    roi: stats.roi.toFixed(1), strikeRate: stats.strikeRate.toFixed(1),
    avgOdd: stats.avgOdd.toFixed(2), pnl: stats.pnl.toFixed(2),
    bankroll: bankroll.toFixed(2), bySport: {},
  };
  settled.forEach(b => {
    if (!summary.bySport[b.sport]) summary.bySport[b.sport] = { bets:0, wins:0, pnl:0 };
    summary.bySport[b.sport].bets++;
    if (b.result==="WIN") { summary.bySport[b.sport].wins++; summary.bySport[b.sport].pnl += b.stake*(b.odd-1); }
    else if (b.result==="LOSS") summary.bySport[b.sport].pnl -= b.stake;
  });
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:1000,
        messages:[{ role:"user", content:`És um analista de gestão de banca para apostas desportivas. Analisa os dados e dá feedback direto em português de Portugal.\n\nDados: ${JSON.stringify(summary)}\n\nResponde APENAS com JSON (sem markdown):\n{"score":<1-10>,"headline":"<60 chars>","insights":["...","...","..."],"warnings":["..."],"tips":["...","..."],"bestSport":"<sport ou null>","worstSport":"<sport ou null>"}` }],
      }),
    });
    const data = await res.json();
    const text = data.content?.map(c=>c.text||"").join("").trim();
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  } catch { return null; }
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]     = useState("loading");
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [appView, setAppView]   = useState("dashboard");
  const [bets, setBets]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [authErr, setAuthErr]   = useState("");
  const [authForm, setAuthForm] = useState({ name:"", email:"", password:"" });
  const [setupForm, setSetupForm] = useState({ br:"", unit:"2" });
  const [filter, setFilter]     = useState("ALL");
  const [feedback, setFeedback] = useState(null);
  const [loadingFB, setLoadingFB] = useState(false);
  const [subView, setSubView]   = useState("monthly");
  const emptyForm = { sport:"Ténis", event:"", market:"1X2", selection:"", odd:"", units:1, notes:"" };
  const [form, setForm]         = useState(emptyForm);

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        loadProfile(session.user.id);
        loadBets(session.user.id);
      } else {
        setScreen("landing");
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        loadProfile(session.user.id);
        loadBets(session.user.id);
      } else {
        setUser(null); setProfile(null); setBets([]);
        setScreen("landing");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
      setScreen(data.bankroll > 0 ? "app" : "setup");
    } else {
      setScreen("setup");
    }
  }

  async function loadBets(userId) {
    const { data } = await supabase.from("bets").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setBets(data.map(b => ({ ...b, odd: parseFloat(b.odd), stake: parseFloat(b.stake) })));
  }

  // ── Auth ──
  async function handleAuth() {
    setAuthErr(""); setLoading(true);
    if (authMode === "register") {
      const { error } = await supabase.auth.signUp({
        email: authForm.email, password: authForm.password,
        options: { data: { name: authForm.name } },
      });
      if (error) { setAuthErr(error.message); setLoading(false); return; }
      // Create profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("profiles").upsert({
          id: session.user.id, name: authForm.name,
          trial_start: new Date().toISOString(),
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authForm.email, password: authForm.password,
      });
      if (error) { setAuthErr("Email ou password incorretos."); setLoading(false); return; }
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ── Setup ──
  async function handleSetup() {
    const br = parseFloat(setupForm.br);
    const up = parseFloat(setupForm.unit);
    if (!br || br <= 0) return;
    await supabase.from("profiles").upsert({
      id: user.id, bankroll: br, unit_pct: up,
      name: authForm.name || user.user_metadata?.name || user.email.split("@")[0],
      trial_start: new Date().toISOString(),
    });
    setProfile(p => ({ ...p, bankroll: br, unit_pct: up }));
    setScreen("app");
  }

  // ── Stripe ──
  async function handleSubscribe(plan) {
    const stripe = await loadStripe(STRIPE_KEY);
    const priceId = plan === "monthly" ? PRICE_MONTHLY : PRICE_ANNUAL;
    await stripe.redirectToCheckout({
      lineItems: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      successUrl: window.location.href + "?subscribed=true",
      cancelUrl: window.location.href,
      customerEmail: user?.email,
    });
  }

  // ── Bets ──
  async function addBet() {
    if (!form.event || !form.odd || !form.selection) return;
    const odd = parseFloat(form.odd);
    if (odd <= 1) return;
    const unitVal = (currentBR * (profile?.unit_pct || 2)) / 100;
    const stake = unitVal * (parseFloat(form.units) || 1);
    const newBet = {
      user_id: user.id, sport: form.sport, event: form.event,
      market: form.market, selection: form.selection,
      odd, stake, units: parseFloat(form.units),
      result: "PENDING", notes: form.notes,
    };
    const { data } = await supabase.from("bets").insert(newBet).select().single();
    if (data) setBets(prev => [{ ...data, odd: parseFloat(data.odd), stake: parseFloat(data.stake) }, ...prev]);
    setForm(emptyForm);
    setAppView("history");
  }

  async function settleBet(id, result, cashoutVal) {
    await supabase.from("bets").update({ result, cashout_val: cashoutVal || null }).eq("id", id);
    setBets(prev => prev.map(b => b.id === id ? { ...b, result, cashout_val: cashoutVal } : b));
  }

  async function deleteBet(id) {
    await supabase.from("bets").delete().eq("id", id);
    setBets(prev => prev.filter(b => b.id !== id));
  }

  // ── Stats ──
  const stats = useMemo(() => {
    const settled  = bets.filter(b => b.result !== "PENDING" && b.result !== "VOID");
    const wins     = bets.filter(b => b.result === "WIN");
    const losses   = bets.filter(b => b.result === "LOSS");
    const cashouts = bets.filter(b => b.result === "CASHOUT");
    const totalStaked   = settled.reduce((s,b) => s + b.stake, 0);
    const totalReturned = wins.reduce((s,b) => s + b.stake*b.odd, 0)
                        + cashouts.reduce((s,b) => s + (b.cashout_val||0), 0);
    const pnl        = totalReturned - totalStaked;
    const roi        = totalStaked > 0 ? (pnl/totalStaked)*100 : 0;
    const strikeRate = wins.length+losses.length > 0 ? (wins.length/(wins.length+losses.length))*100 : 0;
    const avgOdd     = settled.length > 0 ? settled.reduce((s,b)=>s+b.odd,0)/settled.length : 0;
    return { settled:settled.length, wins:wins.length, losses:losses.length,
             pnl, roi, strikeRate, avgOdd, totalStaked,
             pending: bets.filter(b=>b.result==="PENDING").length };
  }, [bets]);

  const bankrollHistory = useMemo(() => {
    let r = parseFloat(profile?.bankroll || 0);
    const pts = [r];
    [...bets].reverse().filter(b=>b.result!=="PENDING").forEach(b => {
      if (b.result==="WIN")     r += b.stake*(b.odd-1);
      else if (b.result==="LOSS") r -= b.stake;
      else if (b.result==="CASHOUT") r += (b.cashout_val||0) - b.stake;
      pts.push(r);
    });
    return pts;
  }, [bets, profile]);

  const currentBR = bankrollHistory[bankrollHistory.length-1] || parseFloat(profile?.bankroll||0);
  const unitVal   = (currentBR * (profile?.unit_pct||2)) / 100;
  const trialLeft = profile?.trial_start ? daysLeft(profile.trial_start) : TRIAL_DAYS;
  const isActive  = profile?.subscribed || trialLeft > 0;

  // Sparkline
  const pts  = bankrollHistory;
  const maxV = Math.max(...pts, parseFloat(profile?.bankroll||0)+1);
  const minV = Math.min(...pts, parseFloat(profile?.bankroll||0)-1);
  const svgW = 300, svgH = 60;
  const toX  = (i) => pts.length<=1 ? svgW/2 : (i/(pts.length-1))*svgW;
  const toY  = (v) => svgH - ((v-minV)/(maxV-minV||1))*(svgH-10) - 5;
  const polyline = pts.length>1 ? pts.map((v,i)=>`${toX(i)},${toY(v)}`).join(" ") : null;

  const filteredBets = filter==="ALL" ? bets : bets.filter(b=>b.result===filter);
  const markets = MARKETS[form.sport] || MARKETS["Outros"];
  const userName = profile?.name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";

  // ── LOADING ──
  if (screen==="loading") return (
    <div style={{...S.root,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={S.spinner}/>
    </div>
  );

  // ── LANDING ──
  if (screen==="landing") return (
    <div style={S.root}>
      <div style={S.landing}>
        <div style={S.landingGlow}/>
        <div style={S.landingContent}>
          <div style={S.pill}>🎯 Gestão de banca profissional</div>
          <h1 style={S.heroTitle}>Apostas mais<br/><span style={S.heroAccent}>inteligentes.</span></h1>
          <p style={S.heroSub}>Controla o teu bankroll, acompanha o ROI por desporto e recebe feedback com IA baseado no teu histórico real.</p>
          <div style={S.pricingRow}>
            <div style={S.pricingCard}>
              <div style={S.pricingLabel}>Mensal</div>
              <div style={S.pricingPrice}>€3,99<span style={S.pricingPer}>/mês</span></div>
            </div>
            <div style={{...S.pricingCard,...S.pricingFeatured}}>
              <div style={S.pricingBest}>MELHOR VALOR</div>
              <div style={S.pricingLabel}>Anual</div>
              <div style={S.pricingPrice}>€19,99<span style={S.pricingPer}>/ano</span></div>
              <div style={{fontSize:11,color:"#4ade80"}}>Poupas €27,89</div>
            </div>
          </div>
          <div style={S.featureList}>
            {["✓ Trial gratuito 7 dias","✓ Multi-desporto","✓ Feedback com IA","✓ Gestão por unidades","✓ ROI por desporto","✓ Sem anúncios"].map(f=>(
              <span key={f} style={S.featureItem}>{f}</span>
            ))}
          </div>
          <button style={S.btnHero} onClick={()=>{setAuthMode("register");setScreen("auth");}}>
            Começar grátis — 7 dias
          </button>
          <button style={S.btnGhost} onClick={()=>{setAuthMode("login");setScreen("auth");}}>
            Já tenho conta
          </button>
        </div>
      </div>
    </div>
  );

  // ── AUTH ──
  if (screen==="auth") return (
    <div style={S.root}>
      <div style={S.authWrap}>
        <button style={S.backBtn} onClick={()=>setScreen("landing")}>← Voltar</button>
        <div style={S.authCard}>
          <div style={{fontSize:32,marginBottom:8}}>📊</div>
          <h2 style={S.authTitle}>{authMode==="login"?"Entrar":"Criar conta"}</h2>
          {authMode==="register" && <>
            <label style={S.label}>Nome</label>
            <input style={S.input} placeholder="O teu nome" value={authForm.name}
              onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))}/>
          </>}
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="email@exemplo.com" value={authForm.email}
            onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))}/>
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" placeholder="••••••••" value={authForm.password}
            onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))}/>
          {authErr && <p style={S.errMsg}>{authErr}</p>}
          <button style={S.btnPrimary} onClick={handleAuth} disabled={loading}>
            {loading ? "..." : authMode==="login" ? "Entrar" : "Criar conta grátis"}
          </button>
          <p style={S.authSwitch}>
            {authMode==="login"?"Ainda não tens conta? ":"Já tens conta? "}
            <span style={S.authLink} onClick={()=>setAuthMode(m=>m==="login"?"register":"login")}>
              {authMode==="login"?"Regista-te":"Entra aqui"}
            </span>
          </p>
          {authMode==="register" && <p style={S.authNote}>7 dias grátis. Sem cartão necessário.</p>}
        </div>
      </div>
    </div>
  );

  // ── SETUP ──
  if (screen==="setup") return (
    <div style={S.root}>
      <div style={S.authWrap}>
        <div style={S.authCard}>
          <div style={{fontSize:36,marginBottom:8}}>💰</div>
          <h2 style={S.authTitle}>Configura a tua banca</h2>
          <p style={{color:"#64748b",fontSize:13,marginBottom:16}}>Olá, {userName}! Vamos começar.</p>
          <div style={S.trialBanner}>🎯 Trial ativo — {trialLeft} {trialLeft===1?"dia":"dias"} restantes</div>
          <label style={S.label}>Bankroll inicial (€)</label>
          <input style={S.input} type="number" placeholder="ex: 500" value={setupForm.br}
            onChange={e=>setSetupForm(f=>({...f,br:e.target.value}))}/>
          <label style={S.label}>Unidade (% do bankroll)</label>
          <input style={S.input} type="number" step="0.5" min="0.5" max="10" value={setupForm.unit}
            onChange={e=>setSetupForm(f=>({...f,unit:e.target.value}))}/>
          {setupForm.br && <p style={{fontSize:12,color:"#64748b",margin:"6px 0 0"}}>
            1 unidade = <strong style={{color:"#e2c97e"}}>
              €{((parseFloat(setupForm.br)||0)*(parseFloat(setupForm.unit)||2)/100).toFixed(2)}
            </strong> · Recomendamos 1–2%.
          </p>}
          <button style={{...S.btnPrimary,marginTop:20}} onClick={handleSetup}>Começar</button>
        </div>
      </div>
    </div>
  );

  // ── PAYWALL ──
  if (screen==="app" && !isActive) return (
    <div style={S.root}>
      <div style={S.authWrap}>
        <div style={S.authCard}>
          <div style={{fontSize:40,marginBottom:12}}>⏰</div>
          <h2 style={S.authTitle}>Trial terminado</h2>
          <p style={{color:"#64748b",fontSize:13,marginBottom:16,textAlign:"center"}}>
            Escolhe um plano para continuar.
          </p>
          <div style={S.planToggle}>
            <button style={{...S.planBtn,...(subView==="monthly"?S.planBtnActive:{})}} onClick={()=>setSubView("monthly")}>Mensal</button>
            <button style={{...S.planBtn,...(subView==="annual"?S.planBtnActive:{})}} onClick={()=>setSubView("annual")}>Anual</button>
          </div>
          {subView==="monthly"
            ? <div style={S.planCard}>
                <div style={S.planPrice}>€3,99<span style={S.planPer}>/mês</span></div>
                <button style={S.btnPrimary} onClick={()=>handleSubscribe("monthly")}>Subscrever</button>
              </div>
            : <div style={{...S.planCard,border:"1px solid #e2c97e",background:"#1a1508"}}>
                <div style={{fontSize:10,color:"#e2c97e",letterSpacing:1,fontWeight:700,marginBottom:4}}>MELHOR VALOR</div>
                <div style={S.planPrice}>€19,99<span style={S.planPer}>/ano</span></div>
                <div style={{fontSize:12,color:"#4ade80",marginBottom:12}}>€1,67/mês</div>
                <button style={S.btnPrimary} onClick={()=>handleSubscribe("annual")}>Subscrever</button>
              </div>
          }
          <button style={{...S.btnGhost,marginTop:8}} onClick={handleLogout}>Terminar sessão</button>
        </div>
      </div>
    </div>
  );

  // ── MAIN APP ──
  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.headerL}>
          <span style={{fontSize:20}}>📊</span>
          <span style={S.headerTitle}>BankrollPro</span>
        </div>
        <div style={S.headerR}>
          {trialLeft>0 && !profile?.subscribed && <span style={S.trialChip}>{trialLeft}d trial</span>}
          <span style={S.brChip}>€{currentBR.toFixed(2).replace(".",",")}</span>
        </div>
      </header>

      <nav style={S.nav}>
        {[["dashboard","Dashboard"],["nova","+ Aposta"],["history","Histórico"],["feedback","IA"],["account","Conta"]].map(([v,l])=>(
          <button key={v} style={{...S.navBtn,...(appView===v?S.navActive:{})}} onClick={()=>setAppView(v)}>{l}</button>
        ))}
      </nav>

      <main style={S.main}>

        {/* DASHBOARD */}
        {appView==="dashboard" && (
          <div>
            <div style={S.kpiGrid}>
              <KPI label="Bankroll" value={fmtAbs(currentBR)}
                sub={fmtPct(((currentBR-(profile?.bankroll||0))/(profile?.bankroll||1))*100)}
                subColor={currentBR>=(profile?.bankroll||0)?"#4ade80":"#f87171"}/>
              <KPI label="P&L Total" value={fmt(stats.pnl)}
                valueColor={stats.pnl>=0?"#4ade80":"#f87171"}
                sub={`ROI ${fmtPct(stats.roi)}`} subColor={stats.roi>=0?"#4ade80":"#f87171"}/>
              <KPI label="Strike Rate" value={stats.strikeRate.toFixed(1)+"%"}
                sub={`${stats.wins}V / ${stats.losses}D`} valueColor="#e2c97e"/>
              <KPI label="Odd Média" value={stats.avgOdd.toFixed(2)} sub={`${stats.settled} apostas`}/>
            </div>

            {pts.length>1 && (
              <div style={S.card}>
                <div style={S.cardTitle}>Evolução do Bankroll</div>
                <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{width:"100%",height:70,display:"block"}}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e2c97e" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#e2c97e" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <polygon points={`0,${svgH} ${polyline} ${svgW},${svgH}`} fill="url(#g1)"/>
                  <polyline points={polyline} fill="none" stroke="#e2c97e" strokeWidth="2" strokeLinejoin="round"/>
                  <line x1="0" y1={toY(profile?.bankroll||0)} x2={svgW} y2={toY(profile?.bankroll||0)}
                    stroke="#334155" strokeWidth="1" strokeDasharray="4,3"/>
                </svg>
              </div>
            )}

            {(() => {
              const sports = {};
              bets.filter(b=>b.result!=="PENDING"&&b.result!=="VOID").forEach(b=>{
                if (!sports[b.sport]) sports[b.sport]={bets:0,wins:0,pnl:0};
                sports[b.sport].bets++;
                if (b.result==="WIN") { sports[b.sport].wins++; sports[b.sport].pnl+=b.stake*(b.odd-1); }
                else if (b.result==="LOSS") sports[b.sport].pnl-=b.stake;
                else if (b.result==="CASHOUT") sports[b.sport].pnl+=(b.cashout_val||0)-b.stake;
              });
              const entries = Object.entries(sports);
              if (!entries.length) return null;
              return (
                <div style={S.card}>
                  <div style={S.cardTitle}>Por Desporto</div>
                  {entries.map(([sport,d])=>(
                    <div key={sport} style={S.sportRow}>
                      <span style={{fontWeight:700,fontSize:13,flex:1}}>{sport}</span>
                      <span style={{fontSize:12,color:"#64748b"}}>{d.bets} apostas</span>
                      <span style={{fontSize:12,color:"#64748b",marginLeft:12}}>
                        {d.bets>0?(d.wins/d.bets*100).toFixed(0):0}% SR
                      </span>
                      <span style={{fontWeight:700,fontSize:13,marginLeft:12,
                        color:d.pnl>=0?"#4ade80":"#f87171"}}>{fmt(d.pnl)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={S.statGrid}>
              <Pill label="Unidade atual" value={fmtAbs(unitVal)} color="#e2c97e"/>
              <Pill label="Apostado total" value={fmtAbs(stats.totalStaked)}/>
              <Pill label="Pendentes" value={stats.pending} color="#a78bfa"/>
              <Pill label="Liquidadas" value={stats.settled}/>
            </div>
          </div>
        )}

        {/* NOVA APOSTA */}
        {appView==="nova" && (
          <div style={S.card}>
            <div style={S.cardTitle}>Nova Aposta</div>
            <label style={S.label}>Desporto</label>
            <select style={S.input} value={form.sport}
              onChange={e=>setForm(f=>({...f,sport:e.target.value,market:MARKETS[e.target.value][0]}))}>
              {SPORTS.map(s=><option key={s}>{s}</option>)}
            </select>
            <label style={S.label}>Evento</label>
            <input style={S.input} placeholder="ex: Sinner vs Alcaraz" value={form.event}
              onChange={e=>setForm(f=>({...f,event:e.target.value}))}/>
            <div style={S.row2}>
              <div style={{flex:1}}>
                <label style={S.label}>Mercado</label>
                <select style={S.input} value={form.market}
                  onChange={e=>setForm(f=>({...f,market:e.target.value}))}>
                  {markets.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={S.label}>Seleção</label>
                <input style={S.input} placeholder="ex: Sinner" value={form.selection}
                  onChange={e=>setForm(f=>({...f,selection:e.target.value}))}/>
              </div>
            </div>
            <div style={S.row2}>
              <div style={{flex:1}}>
                <label style={S.label}>Odd</label>
                <input style={S.input} type="number" step="0.01" min="1.01" placeholder="1.85"
                  value={form.odd} onChange={e=>setForm(f=>({...f,odd:e.target.value}))}/>
              </div>
              <div style={{flex:1}}>
                <label style={S.label}>Unidades</label>
                <input style={S.input} type="number" step="0.5" min="0.5" max="10"
                  value={form.units} onChange={e=>setForm(f=>({...f,units:e.target.value}))}/>
              </div>
            </div>
            {form.odd && parseFloat(form.odd)>1 && (
              <div style={S.stakeBox}>
                <div>Stake: <strong style={{color:"#e2c97e"}}>{fmtAbs(unitVal*(parseFloat(form.units)||1))}</strong></div>
                <div style={{color:"#64748b",fontSize:12}}>{form.units} × {fmtAbs(unitVal)}</div>
                <div style={{marginLeft:"auto"}}>Retorno: <strong style={{color:"#4ade80"}}>
                  {fmtAbs(unitVal*(parseFloat(form.units)||1)*parseFloat(form.odd))}
                </strong></div>
              </div>
            )}
            <label style={S.label}>Notas (opcional)</label>
            <input style={S.input} placeholder="Raciocínio, contexto..." value={form.notes}
              onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
            <button style={{...S.btnPrimary,marginTop:18}} onClick={addBet}>Registar Aposta</button>
          </div>
        )}

        {/* HISTÓRICO */}
        {appView==="history" && (
          <div>
            <div style={S.filterRow}>
              {[["ALL","Todas"],["PENDING","Pendentes"],["WIN","Ganhas"],["LOSS","Perdidas"],["CASHOUT","Cashout"],["VOID","Void"]].map(([v,l])=>(
                <button key={v} style={{...S.filterBtn,...(filter===v?S.filterActive:{})}}
                  onClick={()=>setFilter(v)}>{l}</button>
              ))}
            </div>
            {filteredBets.length===0 && <p style={{color:"#475569",textAlign:"center",marginTop:40}}>Nenhuma aposta aqui.</p>}
            {filteredBets.map(b=>{
              const bs = badgeStyle(b.result);
              return (
                <div key={b.id} style={S.betCard}>
                  <div style={S.betTop}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{b.event}</div>
                      <div style={{fontSize:11,color:"#475569",marginTop:3}}>
                        {b.sport} · {b.market} · <strong style={{color:"#f1f5f9"}}>{b.selection}</strong>
                      </div>
                      {b.notes && <div style={{fontSize:11,color:"#64748b",fontStyle:"italic",marginTop:3}}>"{b.notes}"</div>}
                      <div style={{fontSize:11,color:"#334155",marginTop:4}}>
                        {new Date(b.created_at).toLocaleDateString("pt-PT")}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,minWidth:80}}>
                      <span style={{...S.badge,background:bs.bg,color:bs.color,border:`1px solid ${bs.border}`}}>
                        {b.result}
                      </span>
                      <div style={{fontSize:16,fontWeight:800,color:"#e2c97e"}}>@{b.odd.toFixed(2)}</div>
                      <div style={{fontSize:12,color:"#64748b"}}>{fmtAbs(b.stake)}</div>
                    </div>
                  </div>
                  {b.result==="PENDING" && (
                    <div style={S.betActions}>
                      <button style={S.bWin}  onClick={()=>settleBet(b.id,"WIN")}>✓ Ganhou</button>
                      <button style={S.bLoss} onClick={()=>settleBet(b.id,"LOSS")}>✗ Perdeu</button>
                      <button style={S.bCash} onClick={()=>{
                        const v=parseFloat(prompt("Valor do cashout (€):"));
                        if(v>=0) settleBet(b.id,"CASHOUT",v);
                      }}>💰 Cash</button>
                      <button style={S.bVoid} onClick={()=>settleBet(b.id,"VOID")}>Void</button>
                      <button style={S.bDel}  onClick={()=>deleteBet(b.id)}>🗑</button>
                    </div>
                  )}
                  {b.result!=="PENDING" && (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                      {b.result==="WIN" && <span style={{color:"#4ade80",fontSize:12,fontWeight:700}}>+{fmtAbs(b.stake*(b.odd-1))}</span>}
                      {b.result==="LOSS" && <span style={{color:"#f87171",fontSize:12,fontWeight:700}}>-{fmtAbs(b.stake)}</span>}
                      {b.result==="CASHOUT" && <span style={{color:"#60a5fa",fontSize:12,fontWeight:700}}>{fmt((b.cashout_val||0)-b.stake)}</span>}
                      <button style={S.bDel} onClick={()=>deleteBet(b.id)}>🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* IA FEEDBACK */}
        {appView==="feedback" && (
          <div>
            <div style={S.card}>
              <div style={S.cardTitle}>Análise com IA</div>
              <p style={{color:"#64748b",fontSize:13,marginBottom:16}}>
                A IA analisa o teu histórico e dá feedback honesto sobre a tua gestão de banca. Precisas de pelo menos 3 apostas liquidadas.
              </p>
              <button style={S.btnPrimary} onClick={async()=>{
                setLoadingFB(true); setFeedback(null);
                const fb = await getAIFeedback(bets, stats, currentBR);
                setFeedback(fb); setLoadingFB(false);
              }} disabled={loadingFB||stats.settled<3}>
                {loadingFB?"A analisar...":stats.settled<3?`Precisas de ${3-stats.settled} aposta(s) mais`:"Analisar agora"}
              </button>
            </div>
            {loadingFB && <div style={{...S.card,textAlign:"center",padding:40}}><div style={S.spinner}/></div>}
            {feedback && !loadingFB && (
              <div>
                <div style={{...S.card,textAlign:"center"}}>
                  <div style={S.scoreRing}>
                    <div style={{fontSize:36,fontWeight:800,color:feedback.score>=7?"#4ade80":feedback.score>=4?"#fbbf24":"#f87171"}}>{feedback.score}</div>
                    <div style={{fontSize:11,color:"#475569"}}>/10</div>
                  </div>
                  <div style={{fontSize:16,fontWeight:700,color:"#f1f5f9",marginTop:12}}>{feedback.headline}</div>
                </div>
                {feedback.warnings?.length>0 && (
                  <div style={{...S.card,background:"#2d1a0f",borderColor:"#92400e"}}>
                    <div style={{...S.cardTitle,color:"#fbbf24"}}>⚠️ Alertas</div>
                    {feedback.warnings.map((w,i)=><p key={i} style={{color:"#fbbf24",fontSize:13,margin:"6px 0"}}>{w}</p>)}
                  </div>
                )}
                <div style={S.card}>
                  <div style={S.cardTitle}>📈 Insights</div>
                  {feedback.insights?.map((ins,i)=>(
                    <div key={i} style={{display:"flex",padding:"7px 0",borderBottom:"1px solid #1a2535"}}>
                      <span style={{color:"#e2c97e",marginRight:8}}>→</span>
                      <span style={{color:"#cbd5e1",fontSize:13}}>{ins}</span>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <div style={S.cardTitle}>💡 Conselhos</div>
                  {feedback.tips?.map((t,i)=>(
                    <div key={i} style={{display:"flex",padding:"7px 0",borderBottom:"1px solid #1a2535"}}>
                      <span style={{color:"#4ade80",marginRight:8}}>✓</span>
                      <span style={{color:"#cbd5e1",fontSize:13}}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTA */}
        {appView==="account" && (
          <div>
            <div style={S.card}>
              <div style={S.cardTitle}>A tua conta</div>
              <div style={S.accountRow}><span style={S.aLabel}>Nome</span><span>{userName}</span></div>
              <div style={S.accountRow}><span style={S.aLabel}>Email</span><span>{user?.email}</span></div>
              <div style={S.accountRow}>
                <span style={S.aLabel}>Estado</span>
                <span style={{color:profile?.subscribed?"#4ade80":trialLeft>0?"#fbbf24":"#f87171"}}>
                  {profile?.subscribed?`Ativo · ${profile.plan==="monthly"?"Mensal":"Anual"}`:trialLeft>0?`Trial (${trialLeft}d)`:"Expirado"}
                </span>
              </div>
            </div>
            {!profile?.subscribed && (
              <div style={{...S.card,background:"#0f1a2d",borderColor:"#1e3a5f"}}>
                <div style={S.cardTitle}>Subscrever</div>
                <div style={S.planToggle}>
                  <button style={{...S.planBtn,...(subView==="monthly"?S.planBtnActive:{})}} onClick={()=>setSubView("monthly")}>Mensal €3,99</button>
                  <button style={{...S.planBtn,...(subView==="annual"?S.planBtnActive:{})}} onClick={()=>setSubView("annual")}>Anual €19,99</button>
                </div>
                <button style={{...S.btnPrimary,marginTop:12}} onClick={()=>handleSubscribe(subView)}>
                  Subscrever {subView==="monthly"?"€3,99/mês":"€19,99/ano"}
                </button>
              </div>
            )}
            <div style={S.card}>
              <div style={S.cardTitle}>Banca</div>
              <div style={S.accountRow}><span style={S.aLabel}>Bankroll inicial</span><span>{fmtAbs(profile?.bankroll||0)}</span></div>
              <div style={S.accountRow}><span style={S.aLabel}>Bankroll atual</span><span style={{color:"#e2c97e"}}>{fmtAbs(currentBR)}</span></div>
              <div style={S.accountRow}><span style={S.aLabel}>Unidade</span><span>{profile?.unit_pct}% ({fmtAbs(unitVal)})</span></div>
            </div>
            <button style={{...S.btnPrimary,background:"#1e2d40",color:"#94a3b8"}} onClick={handleLogout}>
              Terminar sessão
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function KPI({ label, value, sub, valueColor, subColor }) {
  return (
    <div style={S.kpiCard}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={{...S.kpiVal,color:valueColor||"#f1f5f9"}}>{value}</div>
      {sub && <div style={{fontSize:12,marginTop:3,color:subColor||"#64748b"}}>{sub}</div>}
    </div>
  );
}
function Pill({ label, value, color }) {
  return (
    <div style={S.pill}>
      <div style={{fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:.8,marginBottom:3}}>{label}</div>
      <div style={{fontSize:15,fontWeight:700,color:color||"#f1f5f9"}}>{value}</div>
    </div>
  );
}

const S = {
  root:{ minHeight:"100vh",background:"#080c18",color:"#f1f5f9",fontFamily:"'IBM Plex Mono','Courier New',monospace",paddingBottom:60 },
  landing:{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden" },
  landingGlow:{ position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:600,height:400,background:"radial-gradient(ellipse,rgba(226,201,126,.12),transparent 70%)",pointerEvents:"none" },
  landingContent:{ maxWidth:420,width:"100%",display:"flex",flexDirection:"column",gap:12,position:"relative",zIndex:1 },
  pill:{ alignSelf:"flex-start",background:"#1a2535",border:"1px solid #2a3f55",borderRadius:20,padding:"4px 14px",fontSize:12,color:"#94a3b8" },
  heroTitle:{ fontSize:42,fontWeight:800,margin:"4px 0",lineHeight:1.1,letterSpacing:"-1px",color:"#f1f5f9" },
  heroAccent:{ color:"#e2c97e" },
  heroSub:{ fontSize:14,color:"#64748b",lineHeight:1.6,margin:0 },
  pricingRow:{ display:"flex",gap:12,marginTop:8 },
  pricingCard:{ flex:1,background:"#111827",border:"1px solid #1e2d40",borderRadius:12,padding:"14px" },
  pricingFeatured:{ border:"1px solid #e2c97e",background:"#1a1508" },
  pricingBest:{ fontSize:9,color:"#e2c97e",letterSpacing:1,fontWeight:700,textTransform:"uppercase",marginBottom:4 },
  pricingLabel:{ fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:.8 },
  pricingPrice:{ fontSize:22,fontWeight:800,color:"#f1f5f9",marginTop:4 },
  pricingPer:{ fontSize:13,fontWeight:400,color:"#64748b" },
  featureList:{ display:"flex",flexWrap:"wrap",gap:8 },
  featureItem:{ fontSize:12,color:"#64748b" },
  btnHero:{ background:"#e2c97e",color:"#080c18",border:"none",borderRadius:10,padding:"14px",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"inherit" },
  btnGhost:{ background:"transparent",color:"#64748b",border:"1px solid #1e2d40",borderRadius:10,padding:"12px",fontSize:14,cursor:"pointer",fontFamily:"inherit" },
  authWrap:{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:24,flexDirection:"column",gap:16 },
  backBtn:{ alignSelf:"flex-start",background:"transparent",border:"none",color:"#64748b",cursor:"pointer",fontFamily:"inherit",fontSize:13 },
  authCard:{ width:"100%",maxWidth:380,background:"#111827",border:"1px solid #1e2d40",borderRadius:16,padding:"32px 28px",display:"flex",flexDirection:"column",gap:4 },
  authTitle:{ fontSize:22,fontWeight:700,color:"#e2c97e",margin:"0 0 12px",letterSpacing:"-.5px" },
  authSwitch:{ fontSize:12,color:"#475569",textAlign:"center",marginTop:12 },
  authLink:{ color:"#e2c97e",cursor:"pointer",textDecoration:"underline" },
  authNote:{ fontSize:11,color:"#334155",textAlign:"center" },
  errMsg:{ color:"#f87171",fontSize:12,margin:"4px 0" },
  trialBanner:{ background:"#0f2d1a",border:"1px solid #16a34a",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#4ade80",marginBottom:8 },
  planToggle:{ display:"flex",gap:6,background:"#0d1220",padding:4,borderRadius:10 },
  planBtn:{ flex:1,padding:"8px 12px",borderRadius:8,border:"none",background:"transparent",color:"#64748b",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600 },
  planBtnActive:{ background:"#1a2535",color:"#e2c97e" },
  planCard:{ width:"100%",background:"#0d1220",border:"1px solid #1e2d40",borderRadius:12,padding:20,textAlign:"center",marginTop:12 },
  planPrice:{ fontSize:28,fontWeight:800,color:"#f1f5f9",marginBottom:16 },
  planPer:{ fontSize:14,fontWeight:400,color:"#64748b" },
  header:{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:"1px solid #111827",background:"#0a0e1a",position:"sticky",top:0,zIndex:10 },
  headerL:{ display:"flex",alignItems:"center",gap:10 },
  headerTitle:{ fontSize:17,fontWeight:700,color:"#e2c97e",letterSpacing:"-.3px" },
  headerR:{ display:"flex",alignItems:"center",gap:8 },
  trialChip:{ background:"#1a2d1a",border:"1px solid #16a34a",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#4ade80",fontWeight:700 },
  brChip:{ background:"#1a2535",border:"1px solid #2a3f55",borderRadius:8,padding:"5px 12px",fontSize:14,fontWeight:700,color:"#e2c97e" },
  nav:{ display:"flex",gap:2,padding:"10px 14px",background:"#0a0e1a",borderBottom:"1px solid #111827",overflowX:"auto" },
  navBtn:{ padding:"7px 12px",borderRadius:8,border:"none",background:"transparent",color:"#475569",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,whiteSpace:"nowrap" },
  navActive:{ background:"#1a2535",color:"#e2c97e" },
  main:{ maxWidth:680,margin:"0 auto",padding:"18px 14px" },
  kpiGrid:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 },
  kpiCard:{ background:"#111827",border:"1px solid #1a2535",borderRadius:12,padding:"14px 16px" },
  kpiLabel:{ fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:.8,marginBottom:5 },
  kpiVal:{ fontSize:20,fontWeight:800,letterSpacing:"-.5px" },
  card:{ background:"#111827",border:"1px solid #1a2535",borderRadius:12,padding:18,marginBottom:12 },
  cardTitle:{ fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:.8,marginBottom:14,fontWeight:700 },
  sportRow:{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1a2535" },
  statGrid:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 },
  pill:{ background:"#111827",border:"1px solid #1a2535",borderRadius:10,padding:"12px 14px" },
  label:{ fontSize:11,color:"#475569",marginBottom:4,marginTop:10,display:"block" },
  input:{ width:"100%",background:"#0d1220",border:"1px solid #1a2535",borderRadius:8,color:"#f1f5f9",padding:"10px 12px",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",outline:"none" },
  row2:{ display:"flex",gap:10 },
  stakeBox:{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:"#0d1220",border:"1px solid #2a3f55",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#94a3b8",marginTop:8 },
  btnPrimary:{ width:"100%",background:"#e2c97e",color:"#080c18",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit" },
  filterRow:{ display:"flex",gap:6,marginBottom:14,flexWrap:"wrap" },
  filterBtn:{ padding:"5px 12px",borderRadius:20,border:"1px solid #1a2535",background:"transparent",color:"#475569",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700 },
  filterActive:{ background:"#1a2535",color:"#e2c97e",borderColor:"#2a3f55" },
  betCard:{ background:"#111827",border:"1px solid #1a2535",borderRadius:12,padding:14,marginBottom:8 },
  betTop:{ display:"flex",gap:10 },
  betActions:{ display:"flex",gap:6,marginTop:10,flexWrap:"wrap" },
  badge:{ borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:800,letterSpacing:.5 },
  bWin:{ padding:"5px 12px",borderRadius:8,border:"1px solid #16a34a",background:"#0f2d1a",color:"#4ade80",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"inherit" },
  bLoss:{ padding:"5px 12px",borderRadius:8,border:"1px solid #dc2626",background:"#2d0f0f",color:"#f87171",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"inherit" },
  bCash:{ padding:"5px 12px",borderRadius:8,border:"1px solid #2563eb",background:"#0f1f2d",color:"#60a5fa",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"inherit" },
  bVoid:{ padding:"5px 12px",borderRadius:8,border:"1px solid #d97706",background:"#2d2a0f",color:"#fbbf24",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"inherit" },
  bDel:{ padding:"5px 8px",borderRadius:8,border:"1px solid #1a2535",background:"transparent",color:"#334155",cursor:"pointer",fontSize:12,fontFamily:"inherit",marginLeft:"auto" },
  scoreRing:{ width:90,height:90,borderRadius:"50%",border:"3px solid #1a2535",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto",background:"#0d1220" },
  spinner:{ width:32,height:32,border:"3px solid #1a2535",borderTop:"3px solid #e2c97e",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto" },
  accountRow:{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1a2535",fontSize:13 },
  aLabel:{ color:"#475569",fontSize:11,textTransform:"uppercase",letterSpacing:.5 },
};

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } } select option { background: #0d1220; }`;
  document.head.appendChild(style);
}
