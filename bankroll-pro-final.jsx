import { useState, useMemo, useEffect } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { loadStripe } from "https://cdn.jsdelivr.net/npm/@stripe/stripe-js/+esm";

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://opeuermurrbzpglbkmrf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZXVlcm11cnJienBnbGJrbXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjA2NTAsImV4cCI6MjA5NDU5NjY1MH0.M-VclAmrSl0gop_7IvXh7-HH7nj5DwMFLVCMIOa3Qfw";
const STRIPE_KEY    = "pk_test_51TY69iPDBkFhOFXxSS9aPU8YSFZD5pdds2TSCGAawm36ZXSznfOJLahTu6d6KMw0Q1AffvdyQM8KLTrvKiWbYdCF00l0adSiVk";
const PRICE_MONTHLY = "price_1TY6GAPDBkFhOFXxt2mORXRN";
const PRICE_ANNUAL  = "price_1TY85vPDBkFhOFXxSr5DfJJC";
const TRIAL_DAYS    = 7;
const MAX_BANKROLLS = 3;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Sport Config ─────────────────────────────────────────────────────────────
const SPORTS_CONFIG = {
  "Ténis": {
    icon: "🎾",
    gradient: "linear-gradient(135deg, #1a3a2a 0%, #0d1f17 100%)",
    accent: "#4ade80",
    markets: [
      "Vencedor do Jogo","Handicap Games","Total Games O/U","Set Winner",
      "Total Sets O/U","Resultado Correto Sets","1º Set Vencedor",
      "Total Games 1º Set","Vencedor com Handicap Sets",
      "Dupla Hipótese","Tie-Break no Jogo","1º Serviço Break",
      "Jogo em Deuce","Total Aces O/U","Total Double Faults O/U","Outros"
    ],
  },
  "Futebol": {
    icon: "⚽",
    gradient: "linear-gradient(135deg, #1a2a3a 0%, #0d1520 100%)",
    accent: "#60a5fa",
    markets: [
      "1X2","Dupla Hipótese","Over/Under Golos","BTTS",
      "Handicap Asiático","Handicap Europeu","Marcador Correto",
      "1º Marcador","Última Equipa a Marcar","Total Cantos",
      "Total Cartões","Over/Under 1ª Parte","Resultado ao Intervalo","Outros"
    ],
  },
  "Basquetebol": {
    icon: "🏀",
    gradient: "linear-gradient(135deg, #3a1a0a 0%, #200d05 100%)",
    accent: "#fb923c",
    markets: ["1X2","Handicap","Over/Under","1º Quarto","Moneyline","Outros"],
  },
  "Hóquei": {
    icon: "🏒",
    gradient: "linear-gradient(135deg, #1a1a3a 0%, #0d0d20 100%)",
    accent: "#a78bfa",
    markets: ["1X2","Handicap","Over/Under","Resultado Final","Outros"],
  },
  "Baseball": {
    icon: "⚾",
    gradient: "linear-gradient(135deg, #2a1a1a 0%, #180d0d 100%)",
    accent: "#f87171",
    markets: ["Moneyline","Run Line","Over/Under","1ª Entrada","Outros"],
  },
  "Rugby": {
    icon: "🏉",
    gradient: "linear-gradient(135deg, #2a2a1a 0%, #181800 100%)",
    accent: "#fbbf24",
    markets: ["1X2","Handicap","Over/Under","Primeira Tentativa","Outros"],
  },
  "MMA/UFC": {
    icon: "🥊",
    gradient: "linear-gradient(135deg, #3a0a0a 0%, #200505 100%)",
    accent: "#f43f5e",
    markets: ["Vencedor","Método de Vitória","Round","Over/Under Rounds","Vai a Decisão","Outros"],
  },
  "Outros": {
    icon: "🎯",
    gradient: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)",
    accent: "#94a3b8",
    markets: ["1X2","Handicap","Over/Under","Outros"],
  },
};

const SPORTS = Object.keys(SPORTS_CONFIG);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtE   = (v) => "€" + Math.abs(v).toFixed(2).replace(".", ",");
const fmtPnl = (v) => (v >= 0 ? "+" : "-") + "€" + Math.abs(v).toFixed(2).replace(".", ",");
const fmtPct = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
const daysLeft = (ts) => Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(ts).getTime()) / 86400000));

function resultStyle(r) {
  const m = {
    WIN:     ["#0d2218","#34d399","#059669"],
    LOSS:    ["#2d0f0f","#f87171","#dc2626"],
    VOID:    ["#2a270a","#fbbf24","#d97706"],
    CASHOUT: ["#0a1a2d","#60a5fa","#2563eb"],
    PENDING: ["#1a1a2a","#a78bfa","#7c3aed"],
  };
  const [bg,color,border] = m[r]||m.PENDING;
  return { background:bg, color, border:`1px solid ${border}` };
}

// ─── AI Feedback ──────────────────────────────────────────────────────────────
async function getAIFeedback(bets, stats, bankroll, sport) {
  const settled = bets.filter(b => b.result !== "PENDING");
  if (settled.length < 3) return null;
  const summary = {
    sport, totalBets: settled.length, wins: stats.wins, losses: stats.losses,
    roi: stats.roi.toFixed(1), strikeRate: stats.strikeRate.toFixed(1),
    avgOdd: stats.avgOdd.toFixed(2), pnl: stats.pnl.toFixed(2), bankroll: bankroll.toFixed(2),
    byMarket: {},
  };
  settled.forEach(b => {
    if (!summary.byMarket[b.market]) summary.byMarket[b.market] = { bets:0, wins:0, pnl:0 };
    summary.byMarket[b.market].bets++;
    if (b.result==="WIN") { summary.byMarket[b.market].wins++; summary.byMarket[b.market].pnl += b.stake*(b.odd-1); }
    else if (b.result==="LOSS") summary.byMarket[b.market].pnl -= b.stake;
  });
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:1000,
        messages:[{ role:"user", content:`És um analista especializado em gestão de banca desportiva para ${sport}. Analisa os dados e dá feedback direto, útil e honesto em português de Portugal.\n\nDados: ${JSON.stringify(summary)}\n\nResponde APENAS com JSON sem markdown:\n{"score":<1-10>,"headline":"<máx 60 chars>","insights":["...","...","..."],"warnings":["..."],"tips":["...","..."],"bestMarket":"<mercado ou null>","worstMarket":"<mercado ou null>"}` }],
      }),
    });
    const data = await res.json();
    const text = data.content?.map(c=>c.text||"").join("").trim();
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  } catch { return null; }
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]       = useState("loading");
  const [authMode, setAuthMode]   = useState("register");
  const [user, setUser]           = useState(null);
  const [bankrolls, setBankrolls] = useState([]); // [{id,name,sport,bankroll,unit_pct,trial_start,subscribed,plan}]
  const [activeBR, setActiveBR]   = useState(null); // active bankroll id
  const [bets, setBets]           = useState([]);
  const [appView, setAppView]     = useState("dashboard");
  const [authForm, setAuthForm]   = useState({ name:"", email:"", password:"" });
  const [authErr, setAuthErr]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [filter, setFilter]       = useState("ALL");
  const [feedback, setFeedback]   = useState(null);
  const [loadingFB, setLoadingFB] = useState(false);
  const [subView, setSubView]     = useState("annual");
  const [showNewBR, setShowNewBR] = useState(false);
  const [newBRForm, setNewBRForm] = useState({ name:"", sport:"Ténis", bankroll:"", unit_pct:"2" });
  const emptyForm = { sport:"Ténis", event:"", market:"Vencedor do Jogo", selection:"", odd:"", units:1, notes:"" };
  const [form, setForm]           = useState(emptyForm);
  const [vipCode, setVipCode]     = useState("");

  const currentBankroll = bankrolls.find(b => b.id === activeBR);
  const sportCfg = currentBankroll ? SPORTS_CONFIG[currentBankroll.sport] : SPORTS_CONFIG["Ténis"];
  const trialLeft = currentBankroll?.trial_start ? daysLeft(currentBankroll.trial_start) : TRIAL_DAYS;
  const isActive  = currentBankroll?.subscribed || trialLeft > 0;

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); loadBankrolls(session.user.id); }
      else setScreen("landing");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setUser(session.user); loadBankrolls(session.user.id); }
      else { setUser(null); setBankrolls([]); setScreen("landing"); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadBankrolls(uid) {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).order("created_at");
    if (data && data.length > 0) {
      setBankrolls(data);
      setActiveBR(data[0].id);
      await loadBets(data[0].id);
      setScreen("app");
    } else {
      setScreen("setup");
    }
  }

  async function loadBets(bankrollId) {
    const { data } = await supabase.from("bets").select("*").eq("bankroll_id", bankrollId).order("created_at", { ascending:false });
    if (data) setBets(data.map(b => ({ ...b, odd: parseFloat(b.odd), stake: parseFloat(b.stake) })));
  }

  async function switchBankroll(id) {
    setActiveBR(id);
    setBets([]);
    await loadBets(id);
    setAppView("dashboard");
  }

  async function handleAuth() {
    setAuthErr(""); setLoading(true);
    if (authMode === "register") {
      const { error } = await supabase.auth.signUp({
        email: authForm.email, password: authForm.password,
        options: { data: { name: authForm.name } },
      });
      if (error) { setAuthErr(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authForm.email, password: authForm.password,
      });
      if (error) { setAuthErr("Email ou password incorretos."); setLoading(false); return; }
    }
    setLoading(false);
  }

  async function handleSetup() {
    const br = parseFloat(newBRForm.bankroll);
    if (!br || br <= 0 || !newBRForm.name) return;
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || user?.id;
    const { data } = await supabase.from("profiles").insert({
      user_id: uid, name: newBRForm.name, sport: newBRForm.sport,
      bankroll: br, unit_pct: parseFloat(newBRForm.unit_pct),
      trial_start: new Date().toISOString(), subscribed: false,
    }).select().single();
    if (data) {
      setBankrolls(prev => [...prev, data]);
      setActiveBR(data.id);
      setBets([]);
      setShowNewBR(false);
      setNewBRForm({ name:"", sport:"Ténis", bankroll:"", unit_pct:"2" });
      setScreen("app");
    }
  }

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
  const unitVal = currentBankroll ? (brHistory[brHistory.length-1] || currentBankroll.bankroll) * currentBankroll.unit_pct / 100 : 0;

  const stats = useMemo(() => {
    const settled  = bets.filter(b => b.result!=="PENDING" && b.result!=="VOID");
    const wins     = bets.filter(b => b.result==="WIN");
    const losses   = bets.filter(b => b.result==="LOSS");
    const cashouts = bets.filter(b => b.result==="CASHOUT");
    const totalStaked   = settled.reduce((s,b)=>s+b.stake,0);
    const totalReturned = wins.reduce((s,b)=>s+b.stake*b.odd,0) + cashouts.reduce((s,b)=>s+(b.cashout_val||0),0);
    const pnl        = totalReturned - totalStaked;
    const roi        = totalStaked > 0 ? (pnl/totalStaked)*100 : 0;
    const strikeRate = wins.length+losses.length > 0 ? (wins.length/(wins.length+losses.length))*100 : 0;
    const avgOdd     = settled.length > 0 ? settled.reduce((s,b)=>s+b.odd,0)/settled.length : 0;
    return { settled:settled.length, wins:wins.length, losses:losses.length,
             pnl, roi, strikeRate, avgOdd, totalStaked,
             pending: bets.filter(b=>b.result==="PENDING").length };
  }, [bets]);

  const brHistory = useMemo(() => {
    let r = parseFloat(currentBankroll?.bankroll||0);
    const pts = [r];
    [...bets].reverse().filter(b=>b.result!=="PENDING").forEach(b => {
      if (b.result==="WIN") r += b.stake*(b.odd-1);
      else if (b.result==="LOSS") r -= b.stake;
      else if (b.result==="CASHOUT") r += (b.cashout_val||0)-b.stake;
      pts.push(r);
    });
    return pts;
  }, [bets, currentBankroll]);

  const currentBR = brHistory[brHistory.length-1] || parseFloat(currentBankroll?.bankroll||0);
  const unitValCalc = currentBankroll ? currentBR * currentBankroll.unit_pct / 100 : 0;

  async function addBet() {
    if (!form.event||!form.odd||!form.selection||!activeBR) return;
    const odd = parseFloat(form.odd);
    if (odd <= 1) return;
    const stake = unitValCalc * (parseFloat(form.units)||1);
    const { data } = await supabase.from("bets").insert({
      user_id: user.id, bankroll_id: activeBR,
      sport: form.sport, event: form.event, market: form.market,
      selection: form.selection, odd, stake, units: parseFloat(form.units),
      result:"PENDING", notes: form.notes,
    }).select().single();
    if (data) setBets(prev => [{ ...data, odd: parseFloat(data.odd), stake: parseFloat(data.stake) }, ...prev]);
    setForm(emptyForm);
    setAppView("history");
  }

  async function settleBet(id, result, cashoutVal) {
    await supabase.from("bets").update({ result, cashout_val: cashoutVal||null }).eq("id", id);
    setBets(prev => prev.map(b => b.id===id ? {...b, result, cashout_val: cashoutVal} : b));
  }

  async function deleteBet(id) {
    await supabase.from("bets").delete().eq("id", id);
    setBets(prev => prev.filter(b => b.id!==id));
  }

  // Sparkline
  const pts = brHistory;
  const maxV = Math.max(...pts, parseFloat(currentBankroll?.bankroll||0)+1);
  const minV = Math.min(...pts, parseFloat(currentBankroll?.bankroll||0)-1);
  const svgW=300, svgH=60;
  const toX = i => pts.length<=1 ? svgW/2 : (i/(pts.length-1))*svgW;
  const toY = v => svgH - ((v-minV)/(maxV-minV||1))*(svgH-10) - 5;
  const polyline = pts.length>1 ? pts.map((v,i)=>`${toX(i)},${toY(v)}`).join(" ") : null;

  const filteredBets = filter==="ALL" ? bets : bets.filter(b=>b.result===filter);
  const markets = SPORTS_CONFIG[form.sport]?.markets || ["Outros"];
  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "";

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
        <div style={S.landingNoise}/>
        <header style={S.landingHeader}>
          <div style={S.landingLogo}>
            <span style={{fontSize:20}}>📊</span>
            <span style={S.logoText}>BankrollPro</span>
          </div>
          <button style={S.btnOutline} onClick={()=>{setAuthMode("login");setScreen("auth");}}>
            Entrar
          </button>
        </header>

        <div style={S.hero}>
          <div style={S.heroTag}>🚀 Preço de lançamento — oferta limitada</div>
          <h1 style={S.heroTitle}>
            Gestão mais<br/>
            <span style={S.heroGrad}>inteligente.</span>
          </h1>
          <p style={S.heroSub}>
            Controla as tuas bancas por desporto, acompanha o ROI em tempo real
            e recebe análise com IA para melhorar a tua performance.
          </p>

          <div style={S.pricingCards}>
            <div style={S.pCard}>
              <div style={S.pCardLabel}>Mensal</div>
              <div style={S.pCardOld}>€4,99/mês</div>
              <div style={S.pCardPrice}>€3,99<span style={S.pCardPer}>/mês</span></div>
              <div style={S.pCardSave}>Preço de lançamento</div>
            </div>
            <div style={{...S.pCard,...S.pCardFeatured}}>
              <div style={S.pCardBest}>⭐ MELHOR VALOR</div>
              <div style={S.pCardLabel}>Anual</div>
              <div style={S.pCardOld}>€22,99/ano</div>
              <div style={S.pCardPrice}>€19,99<span style={S.pCardPer}>/ano</span></div>
              <div style={{...S.pCardSave,color:"#4ade80"}}>Poupas €28 · €1,67/mês</div>
            </div>
          </div>

          <div style={S.sportIcons}>
            {Object.entries(SPORTS_CONFIG).slice(0,6).map(([sport,cfg])=>(
              <div key={sport} style={{...S.sportChip,background:cfg.gradient,border:`1px solid ${cfg.accent}22`}}>
                <span style={{fontSize:18}}>{cfg.icon}</span>
                <span style={{fontSize:11,color:cfg.accent}}>{sport}</span>
              </div>
            ))}
          </div>

          <div style={S.features}>
            {["✓ Até 3 bancas simultâneas","✓ Análise com IA por desporto","✓ Gestão por unidades dinâmicas","✓ Trial gratuito 7 dias","✓ Sem compromisso"].map(f=>(
              <span key={f} style={S.featureItem}>{f}</span>
            ))}
          </div>

          <button style={S.btnHero} onClick={()=>{setAuthMode("register");setScreen("auth");}}>
            Começar grátis — 7 dias
          </button>
          <p style={{fontSize:12,color:"#475569",textAlign:"center",marginTop:8}}>
            Sem cartão necessário durante o trial
          </p>
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
          <div style={{fontSize:32,marginBottom:4}}>📊</div>
          <h2 style={S.authTitle}>{authMode==="login"?"Bem-vindo de volta":"Criar conta grátis"}</h2>
          <p style={{color:"#64748b",fontSize:13,marginBottom:16}}>
            {authMode==="login"?"Entra na tua conta.":"7 dias grátis, sem cartão."}
          </p>
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
            {loading?"...":authMode==="login"?"Entrar":"Criar conta"}
          </button>
          <p style={S.authSwitch}>
            {authMode==="login"?"Ainda não tens conta? ":"Já tens conta? "}
            <span style={S.authLink} onClick={()=>setAuthMode(m=>m==="login"?"register":"login")}>
              {authMode==="login"?"Regista-te":"Entra aqui"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  // ── SETUP (first bankroll) ──
  if (screen==="setup") return (
    <div style={S.root}>
      <div style={S.authWrap}>
        <div style={S.authCard}>
          <div style={{fontSize:32,marginBottom:4}}>💼</div>
          <h2 style={S.authTitle}>Cria a tua primeira banca</h2>
          <p style={{color:"#64748b",fontSize:13,marginBottom:16}}>
            Olá, {userName}! Vamos configurar a tua banca.
          </p>
          <div style={S.trialBanner}>🎯 {TRIAL_DAYS} dias grátis ativados</div>
          <label style={S.label}>Nome da banca</label>
          <input style={S.input} placeholder="ex: Ténis Principal" value={newBRForm.name}
            onChange={e=>setNewBRForm(f=>({...f,name:e.target.value}))}/>
          <label style={S.label}>Desporto</label>
          <div style={S.sportGrid}>
            {SPORTS.map(s=>(
              <button key={s} style={{...S.sportBtn,...(newBRForm.sport===s?{...S.sportBtnActive,background:SPORTS_CONFIG[s].gradient,borderColor:SPORTS_CONFIG[s].accent}:{})}}
                onClick={()=>setNewBRForm(f=>({...f,sport:s}))}>
                <span style={{fontSize:20}}>{SPORTS_CONFIG[s].icon}</span>
                <span style={{fontSize:10,color:newBRForm.sport===s?SPORTS_CONFIG[s].accent:"#64748b"}}>{s}</span>
              </button>
            ))}
          </div>
          <label style={S.label}>Bankroll inicial (€)</label>
          <input style={S.input} type="number" placeholder="ex: 500" value={newBRForm.bankroll}
            onChange={e=>setNewBRForm(f=>({...f,bankroll:e.target.value}))}/>
          <label style={S.label}>Unidade (% do bankroll)</label>
          <input style={S.input} type="number" step="0.5" min="0.5" max="10" value={newBRForm.unit_pct}
            onChange={e=>setNewBRForm(f=>({...f,unit_pct:e.target.value}))}/>
          {newBRForm.bankroll && <p style={{fontSize:12,color:"#64748b",margin:"6px 0 0"}}>
            1 unidade = <strong style={{color:sportCfg.accent}}>
              €{((parseFloat(newBRForm.bankroll)||0)*(parseFloat(newBRForm.unit_pct)||2)/100).toFixed(2)}
            </strong> · Recomendamos 1–2%.
          </p>}
          <button style={{...S.btnPrimary,marginTop:20}} onClick={handleSetup}>Criar banca</button>
        </div>
      </div>
    </div>
  );

  // ── PAYWALL ──
  if (screen==="app" && !isActive) return (
    <div style={S.root}>
      <div style={S.authWrap}>
        <div style={S.authCard}>
          <div style={{fontSize:40,marginBottom:8}}>⏰</div>
          <h2 style={S.authTitle}>Trial terminado</h2>
          <p style={{color:"#64748b",fontSize:13,textAlign:"center",marginBottom:16}}>
            Escolhe um plano para continuar.
          </p>
          <div style={S.planToggle}>
            <button style={{...S.planBtn,...(subView==="monthly"?S.planBtnActive:{})}} onClick={()=>setSubView("monthly")}>Mensal</button>
            <button style={{...S.planBtn,...(subView==="annual"?S.planBtnActive:{})}} onClick={()=>setSubView("annual")}>Anual ⭐</button>
          </div>
          {subView==="monthly"
            ? <div style={S.planCard}>
                <div style={{fontSize:12,color:"#64748b",textDecoration:"line-through"}}>€4,99/mês</div>
                <div style={S.planPrice}>€3,99<span style={S.planPer}>/mês</span></div>
                <div style={{fontSize:11,color:"#fbbf24",marginBottom:12}}>Preço de lançamento</div>
                <button style={S.btnPrimary} onClick={()=>handleSubscribe("monthly")}>Subscrever</button>
              </div>
            : <div style={{...S.planCard,border:"1px solid #e2c97e33",background:"#1a1508"}}>
                <div style={{fontSize:10,color:"#e2c97e",letterSpacing:1,fontWeight:700,marginBottom:4}}>⭐ MELHOR VALOR</div>
                <div style={{fontSize:12,color:"#64748b",textDecoration:"line-through"}}>€22,99/ano</div>
                <div style={S.planPrice}>€19,99<span style={S.planPer}>/ano</span></div>
                <div style={{fontSize:11,color:"#4ade80",marginBottom:12}}>€1,67/mês · Poupas €28</div>
                <button style={S.btnPrimary} onClick={()=>handleSubscribe("annual")}>Subscrever</button>
              </div>
          }
          <div style={{marginTop:16}}>
            <label style={{...S.label,textAlign:"center"}}>Tens código VIP?</label>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <input style={{...S.input,flex:1}} placeholder="Código VIP" value={vipCode}
                onChange={e=>setVipCode(e.target.value.toUpperCase())}/>
              <button style={{...S.btnPrimary,width:"auto",padding:"10px 16px",fontSize:13}}
                onClick={()=>handleSubscribe("monthly")}>
                Aplicar
              </button>
            </div>
          </div>
          <button style={{...S.btnGhost,marginTop:8}} onClick={()=>supabase.auth.signOut()}>
            Terminar sessão
          </button>
        </div>
      </div>
    </div>
  );

  // ── MAIN APP ──
  return (
    <div style={S.root}>
      {/* Header */}
      <header style={{...S.header,background:sportCfg.gradient}}>
        <div style={S.headerL}>
          <span style={{fontSize:18}}>{sportCfg.icon}</span>
          <div>
            <div style={S.headerTitle}>{currentBankroll?.name || "BankrollPro"}</div>
            <div style={{fontSize:10,color:sportCfg.accent+"99"}}>{currentBankroll?.sport}</div>
          </div>
        </div>
        <div style={S.headerR}>
          {trialLeft>0&&!currentBankroll?.subscribed&&(
            <span style={{...S.chip,borderColor:sportCfg.accent+"44",color:sportCfg.accent}}>
              {trialLeft}d trial
            </span>
          )}
          <span style={{...S.chip,borderColor:sportCfg.accent+"44",color:sportCfg.accent,fontWeight:800}}>
            {fmtE(currentBR)}
          </span>
        </div>
      </header>

      {/* Bankroll switcher */}
      <div style={S.brSwitcher}>
        {bankrolls.map(br=>(
          <button key={br.id}
            style={{...S.brTab,...(br.id===activeBR?{...S.brTabActive,borderColor:SPORTS_CONFIG[br.sport]?.accent+"44",color:SPORTS_CONFIG[br.sport]?.accent}:{})}}
            onClick={()=>switchBankroll(br.id)}>
            {SPORTS_CONFIG[br.sport]?.icon} {br.name}
          </button>
        ))}
        {bankrolls.length < MAX_BANKROLLS && (
          <button style={S.brAddBtn} onClick={()=>setShowNewBR(true)}>+ Nova</button>
        )}
      </div>

      {/* New bankroll modal */}
      {showNewBR && (
        <div style={S.modal}>
          <div style={S.modalCard}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{color:"#f1f5f9",margin:0,fontSize:16}}>Nova Banca</h3>
              <button style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}
                onClick={()=>setShowNewBR(false)}>×</button>
            </div>
            <label style={S.label}>Nome</label>
            <input style={S.input} placeholder="ex: Futebol Europa" value={newBRForm.name}
              onChange={e=>setNewBRForm(f=>({...f,name:e.target.value}))}/>
            <label style={S.label}>Desporto</label>
            <div style={S.sportGrid}>
              {SPORTS.map(s=>(
                <button key={s} style={{...S.sportBtn,...(newBRForm.sport===s?{...S.sportBtnActive,background:SPORTS_CONFIG[s].gradient,borderColor:SPORTS_CONFIG[s].accent}:{})}}
                  onClick={()=>setNewBRForm(f=>({...f,sport:s}))}>
                  <span style={{fontSize:18}}>{SPORTS_CONFIG[s].icon}</span>
                  <span style={{fontSize:10,color:newBRForm.sport===s?SPORTS_CONFIG[s].accent:"#64748b"}}>{s}</span>
                </button>
              ))}
            </div>
            <label style={S.label}>Bankroll (€)</label>
            <input style={S.input} type="number" placeholder="ex: 300" value={newBRForm.bankroll}
              onChange={e=>setNewBRForm(f=>({...f,bankroll:e.target.value}))}/>
            <label style={S.label}>Unidade (%)</label>
            <input style={S.input} type="number" step="0.5" min="0.5" max="10" value={newBRForm.unit_pct}
              onChange={e=>setNewBRForm(f=>({...f,unit_pct:e.target.value}))}/>
            <button style={{...S.btnPrimary,marginTop:16}} onClick={handleSetup}>Criar banca</button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={S.nav}>
        {[["dashboard","📊","Dashboard"],["nova","➕","Registar"],["history","📋","Histórico"],["feedback","🤖","IA"],["account","👤","Conta"]].map(([v,ico,l])=>(
          <button key={v} style={{...S.navBtn,...(appView===v?{...S.navActive,color:sportCfg.accent,borderTopColor:sportCfg.accent}:{})}}
            onClick={()=>setAppView(v)}>
            <span style={{fontSize:16}}>{ico}</span>
            <span>{l}</span>
          </button>
        ))}
      </nav>

      <main style={S.main}>

        {/* ── DASHBOARD ── */}
        {appView==="dashboard" && (
          <div>
            <div style={S.kpiGrid}>
              <KPI label="Banca Atual" value={fmtE(currentBR)} accent={sportCfg.accent}
                sub={fmtPct(((currentBR-(currentBankroll?.bankroll||0))/(currentBankroll?.bankroll||1))*100)}
                subColor={currentBR>=(currentBankroll?.bankroll||0)?"#4ade80":"#f87171"}/>
              <KPI label="Resultado" value={fmtPnl(stats.pnl)} accent={sportCfg.accent}
                valueColor={stats.pnl>=0?"#4ade80":"#f87171"}
                sub={`ROI ${fmtPct(stats.roi)}`} subColor={stats.roi>=0?"#4ade80":"#f87171"}/>
              <KPI label="Taxa de Acerto" value={stats.strikeRate.toFixed(1)+"%"} accent={sportCfg.accent}
                sub={`${stats.wins}✓ ${stats.losses}✗`} valueColor={sportCfg.accent}/>
              <KPI label="Odd Média" value={stats.avgOdd.toFixed(2)} accent={sportCfg.accent}
                sub={`${stats.settled} registos`}/>
            </div>

            {pts.length>1 && (
              <div style={{...S.card,background:sportCfg.gradient}}>
                <div style={{...S.cardTitle,color:sportCfg.accent}}>Evolução da Banca</div>
                <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{width:"100%",height:70,display:"block"}}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sportCfg.accent} stopOpacity="0.3"/>
                      <stop offset="100%" stopColor={sportCfg.accent} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <polygon points={`0,${svgH} ${polyline} ${svgW},${svgH}`} fill="url(#chartGrad)"/>
                  <polyline points={polyline} fill="none" stroke={sportCfg.accent} strokeWidth="2" strokeLinejoin="round"/>
                  <line x1="0" y1={toY(currentBankroll?.bankroll||0)} x2={svgW} y2={toY(currentBankroll?.bankroll||0)}
                    stroke="#ffffff22" strokeWidth="1" strokeDasharray="4,3"/>
                </svg>
              </div>
            )}

            <div style={S.statGrid}>
              <Pill label="Por unidade" value={fmtE(unitValCalc)} color={sportCfg.accent}/>
              <Pill label="Total em jogo" value={fmtE(stats.totalStaked)}/>
              <Pill label="Pendentes" value={stats.pending} color="#a78bfa"/>
              <Pill label="Liquidados" value={stats.settled}/>
            </div>

            {stats.pending > 0 && (
              <div style={{...S.card,background:"#1a1a2a",borderColor:"#7c3aed44"}}>
                <div style={{...S.cardTitle,color:"#a78bfa"}}>⏳ Pendentes</div>
                {bets.filter(b=>b.result==="PENDING").map(b=>(
                  <div key={b.id} style={S.pendingRow}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{b.selection}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>{b.event} · @{b.odd.toFixed(2)}</div>
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

        {/* ── REGISTAR ── */}
        {appView==="nova" && (
          <div style={S.card}>
            <div style={{...S.cardTitle,color:sportCfg.accent}}>
              {sportCfg.icon} Novo Registo · {currentBankroll?.sport}
            </div>

            <label style={S.label}>Evento</label>
            <input style={S.input} placeholder={currentBankroll?.sport==="Ténis"?"ex: Sinner vs Alcaraz":"ex: Benfica vs Porto"}
              value={form.event} onChange={e=>setForm(f=>({...f,event:e.target.value}))}/>

            <label style={S.label}>Mercado</label>
            <select style={S.input} value={form.market}
              onChange={e=>setForm(f=>({...f,market:e.target.value}))}>
              {markets.map(m=><option key={m}>{m}</option>)}
            </select>

            <label style={S.label}>Seleção</label>
            <input style={S.input} placeholder="ex: Sinner / Over 22.5 Games"
              value={form.selection} onChange={e=>setForm(f=>({...f,selection:e.target.value}))}/>

            <div style={S.row2}>
              <div style={{flex:1}}>
                <label style={S.label}>Odd</label>
                <input style={S.input} type="number" step="0.01" min="1.01" placeholder="1.85"
                  value={form.odd} onChange={e=>setForm(f=>({...f,odd:e.target.value}))}/>
              </div>
              <div style={{flex:1}}>
                <label style={S.label}>Unidades</label>
                <div style={{display:"flex",gap:4,marginTop:0}}>
                  {[0.5,1,2,3].map(u=>(
                    <button key={u} style={{...S.unitBtn,...(parseFloat(form.units)===u?{...S.unitBtnActive,background:sportCfg.gradient,borderColor:sportCfg.accent,color:sportCfg.accent}:{})}}
                      onClick={()=>setForm(f=>({...f,units:u}))}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {form.odd && parseFloat(form.odd)>1 && (
              <div style={{...S.stakeBox,borderColor:sportCfg.accent+"33"}}>
                <div>Stake: <strong style={{color:sportCfg.accent}}>{fmtE(unitValCalc*(parseFloat(form.units)||1))}</strong></div>
                <div style={{marginLeft:"auto"}}>
                  Retorno pot.: <strong style={{color:"#4ade80"}}>
                    {fmtE(unitValCalc*(parseFloat(form.units)||1)*parseFloat(form.odd))}
                  </strong>
                </div>
              </div>
            )}

            <label style={S.label}>Notas (opcional)</label>
            <input style={S.input} placeholder="Raciocínio, contexto, fonte..."
              value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>

            <button style={{...S.btnPrimary,marginTop:18,background:sportCfg.gradient,
              border:`1px solid ${sportCfg.accent}44`,color:sportCfg.accent}} onClick={addBet}>
              Registar
            </button>
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {appView==="history" && (
          <div>
            <div style={S.filterRow}>
              {[["ALL","Todos"],["PENDING","⏳"],["WIN","✓ Acerto"],["LOSS","✗ Erro"],["CASHOUT","💰"],["VOID","Void"]].map(([v,l])=>(
                <button key={v} style={{...S.filterBtn,...(filter===v?{...S.filterActive,borderColor:sportCfg.accent,color:sportCfg.accent}:{})}}
                  onClick={()=>setFilter(v)}>{l}</button>
              ))}
            </div>
            {filteredBets.length===0 && (
              <div style={{textAlign:"center",padding:40,color:"#475569"}}>
                <div style={{fontSize:40,marginBottom:12}}>{sportCfg.icon}</div>
                <div>Nenhum registo aqui.</div>
              </div>
            )}
            {filteredBets.map(b=>{
              const rs = resultStyle(b.result);
              return (
                <div key={b.id} style={S.betCard}>
                  <div style={S.betTop}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{b.event}</div>
                      <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                        {b.market} · <strong style={{color:"#cbd5e1"}}>{b.selection}</strong>
                      </div>
                      {b.notes && <div style={{fontSize:11,color:"#475569",fontStyle:"italic",marginTop:2}}>"{b.notes}"</div>}
                      <div style={{fontSize:10,color:"#334155",marginTop:4}}>
                        {new Date(b.created_at).toLocaleDateString("pt-PT")}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,minWidth:80}}>
                      <span style={{...S.badge,...rs}}>{b.result}</span>
                      <div style={{fontSize:16,fontWeight:800,color:sportCfg.accent}}>@{b.odd.toFixed(2)}</div>
                      <div style={{fontSize:12,color:"#64748b"}}>{fmtE(b.stake)}</div>
                    </div>
                  </div>
                  {b.result==="PENDING" && (
                    <div style={S.betActions}>
                      <button style={S.bWin}  onClick={()=>settleBet(b.id,"WIN")}>✓ Acertou</button>
                      <button style={S.bLoss} onClick={()=>settleBet(b.id,"LOSS")}>✗ Errou</button>
                      <button style={S.bCash} onClick={()=>{const v=parseFloat(prompt("Valor do cashout (€):"));if(v>=0)settleBet(b.id,"CASHOUT",v);}}>💰 Cash</button>
                      <button style={S.bVoid} onClick={()=>settleBet(b.id,"VOID")}>Void</button>
                      <button style={S.bDel}  onClick={()=>deleteBet(b.id)}>🗑</button>
                    </div>
                  )}
                  {b.result!=="PENDING" && (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                      {b.result==="WIN"&&<span style={{color:"#4ade80",fontSize:12,fontWeight:700}}>+{fmtE(b.stake*(b.odd-1))}</span>}
                      {b.result==="LOSS"&&<span style={{color:"#f87171",fontSize:12,fontWeight:700}}>-{fmtE(b.stake)}</span>}
                      {b.result==="CASHOUT"&&<span style={{color:"#60a5fa",fontSize:12,fontWeight:700}}>{fmtPnl((b.cashout_val||0)-b.stake)}</span>}
                      <button style={S.bDel} onClick={()=>deleteBet(b.id)}>🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── IA FEEDBACK ── */}
        {appView==="feedback" && (
          <div>
            <div style={{...S.card,background:sportCfg.gradient}}>
              <div style={{...S.cardTitle,color:sportCfg.accent}}>🤖 Análise IA · {currentBankroll?.sport}</div>
              <p style={{color:"#94a3b8",fontSize:13,marginBottom:16}}>
                A IA analisa o teu histórico de {currentBankroll?.sport} e dá feedback honesto.
                Precisas de pelo menos 3 registos liquidados.
              </p>
              <button style={{...S.btnPrimary,background:"#ffffff15",border:`1px solid ${sportCfg.accent}44`,color:sportCfg.accent}}
                onClick={async()=>{setLoadingFB(true);setFeedback(null);const fb=await getAIFeedback(bets,stats,currentBR,currentBankroll?.sport);setFeedback(fb);setLoadingFB(false);}}
                disabled={loadingFB||stats.settled<3}>
                {loadingFB?"A analisar...":stats.settled<3?`Precisas de ${3-stats.settled} registo(s) mais`:"Analisar agora"}
              </button>
            </div>

            {loadingFB && <div style={{...S.card,textAlign:"center",padding:40}}><div style={S.spinner}/></div>}

            {feedback && !loadingFB && (
              <div>
                <div style={{...S.card,textAlign:"center",background:sportCfg.gradient}}>
                  <div style={{...S.scoreRing,borderColor:sportCfg.accent+"44"}}>
                    <div style={{fontSize:32,fontWeight:800,color:feedback.score>=7?"#4ade80":feedback.score>=4?"#fbbf24":"#f87171"}}>{feedback.score}</div>
                    <div style={{fontSize:10,color:"#64748b"}}>/10</div>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",marginTop:12}}>{feedback.headline}</div>
                  {(feedback.bestMarket||feedback.worstMarket) && (
                    <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:10,flexWrap:"wrap"}}>
                      {feedback.bestMarket&&<span style={{background:"#0f2d1a",color:"#4ade80",border:"1px solid #16a34a",borderRadius:20,padding:"3px 10px",fontSize:11}}>🏆 {feedback.bestMarket}</span>}
                      {feedback.worstMarket&&<span style={{background:"#2d0f0f",color:"#f87171",border:"1px solid #dc2626",borderRadius:20,padding:"3px 10px",fontSize:11}}>⚠️ {feedback.worstMarket}</span>}
                    </div>
                  )}
                </div>
                {feedback.warnings?.length>0&&(
                  <div style={{...S.card,background:"#2d1a0f",borderColor:"#92400e"}}>
                    <div style={{...S.cardTitle,color:"#fbbf24"}}>⚠️ Alertas</div>
                    {feedback.warnings.map((w,i)=><p key={i} style={{color:"#fbbf24",fontSize:13,margin:"6px 0"}}>{w}</p>)}
                  </div>
                )}
                <div style={S.card}>
                  <div style={S.cardTitle}>📈 Insights</div>
                  {feedback.insights?.map((ins,i)=>(
                    <div key={i} style={{display:"flex",padding:"8px 0",borderBottom:"1px solid #1a2535"}}>
                      <span style={{color:sportCfg.accent,marginRight:8,flexShrink:0}}>→</span>
                      <span style={{color:"#cbd5e1",fontSize:13}}>{ins}</span>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <div style={S.cardTitle}>💡 Conselhos</div>
                  {feedback.tips?.map((t,i)=>(
                    <div key={i} style={{display:"flex",padding:"8px 0",borderBottom:"1px solid #1a2535"}}>
                      <span style={{color:"#4ade80",marginRight:8,flexShrink:0}}>✓</span>
                      <span style={{color:"#cbd5e1",fontSize:13}}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CONTA ── */}
        {appView==="account" && (
          <div>
            <div style={{...S.card,background:sportCfg.gradient}}>
              <div style={{...S.cardTitle,color:sportCfg.accent}}>👤 A tua conta</div>
              <div style={S.accountRow}><span style={S.aLabel}>Nome</span><span>{userName}</span></div>
              <div style={S.accountRow}><span style={S.aLabel}>Email</span><span style={{fontSize:12}}>{user?.email}</span></div>
              <div style={S.accountRow}>
                <span style={S.aLabel}>Estado</span>
                <span style={{color:currentBankroll?.subscribed?"#4ade80":trialLeft>0?"#fbbf24":"#f87171",fontWeight:700}}>
                  {currentBankroll?.subscribed?`Ativo`:trialLeft>0?`Trial (${trialLeft}d)`:"Expirado"}
                </span>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>💼 As tuas bancas</div>
              {bankrolls.map(br=>(
                <div key={br.id} style={{...S.accountRow,cursor:"pointer",...(br.id===activeBR?{background:"#1a2535",margin:"0 -18px",padding:"10px 18px"}:{})}}
                  onClick={()=>switchBankroll(br.id)}>
                  <span style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18}}>{SPORTS_CONFIG[br.sport]?.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{br.name}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>{br.sport}</div>
                    </div>
                  </span>
                  <span style={{color:SPORTS_CONFIG[br.sport]?.accent,fontWeight:800}}>
                    {fmtE(parseFloat(br.bankroll))}
                  </span>
                </div>
              ))}
              {bankrolls.length < MAX_BANKROLLS && (
                <button style={{...S.btnGhost,marginTop:12}} onClick={()=>setShowNewBR(true)}>
                  + Nova banca ({bankrolls.length}/{MAX_BANKROLLS})
                </button>
              )}
            </div>

            {!currentBankroll?.subscribed && (
              <div style={{...S.card,borderColor:"#e2c97e33"}}>
                <div style={S.cardTitle}>⭐ Subscrever</div>
                <div style={S.planToggle}>
                  <button style={{...S.planBtn,...(subView==="monthly"?S.planBtnActive:{})}} onClick={()=>setSubView("monthly")}>Mensal €3,99</button>
                  <button style={{...S.planBtn,...(subView==="annual"?S.planBtnActive:{})}} onClick={()=>setSubView("annual")}>Anual €19,99 ⭐</button>
                </div>
                <button style={{...S.btnPrimary,marginTop:12}} onClick={()=>handleSubscribe(subView)}>
                  Subscrever {subView==="monthly"?"€3,99/mês":"€19,99/ano"}
                </button>
              </div>
            )}

            <button style={{...S.btnGhost,color:"#64748b"}} onClick={()=>supabase.auth.signOut()}>
              Terminar sessão
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function KPI({ label, value, sub, valueColor, subColor, accent }) {
  return (
    <div style={{...S.kpiCard,borderColor:accent+"22"}}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={{...S.kpiVal,color:valueColor||"#f1f5f9"}}>{value}</div>
      {sub&&<div style={{fontSize:11,marginTop:3,color:subColor||"#64748b"}}>{sub}</div>}
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
  root:{ minHeight:"100vh",background:"#0a0c14",color:"#f1f5f9",fontFamily:"'DM Mono','Courier New',monospace",paddingBottom:80 },
  spinner:{ width:32,height:32,border:"3px solid #1e2535",borderTop:"3px solid #94a3b8",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto" },
  landing:{ minHeight:"100vh",position:"relative",overflow:"hidden" },
  landingNoise:{ position:"fixed",inset:0,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",pointerEvents:"none",zIndex:0 },
  landingHeader:{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",position:"relative",zIndex:1 },
  landingLogo:{ display:"flex",alignItems:"center",gap:8 },
  logoText:{ fontSize:18,fontWeight:800,color:"#f1f5f9",letterSpacing:"-.5px" },
  btnOutline:{ background:"transparent",border:"1px solid #2a3547",color:"#94a3b8",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit" },
  hero:{ padding:"20px 24px 60px",maxWidth:480,margin:"0 auto",position:"relative",zIndex:1 },
  heroTag:{ display:"inline-block",background:"#1a2535",border:"1px solid #fbbf2444",color:"#fbbf24",borderRadius:20,padding:"4px 14px",fontSize:11,fontWeight:700,marginBottom:20 },
  heroTitle:{ fontSize:44,fontWeight:900,lineHeight:1.05,letterSpacing:"-2px",margin:"0 0 16px",color:"#f1f5f9" },
  heroGrad:{ background:"linear-gradient(135deg,#94a3b8,#f1f5f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" },
  heroSub:{ fontSize:15,color:"#64748b",lineHeight:1.6,marginBottom:28 },
  pricingCards:{ display:"flex",gap:12,marginBottom:24 },
  pCard:{ flex:1,background:"#111827",border:"1px solid #1e2d40",borderRadius:14,padding:16 },
  pCardFeatured:{ border:"1px solid #e2c97e33",background:"#16130a" },
  pCardBest:{ fontSize:9,color:"#e2c97e",letterSpacing:1,fontWeight:800,textTransform:"uppercase",marginBottom:6 },
  pCardLabel:{ fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:.8,marginBottom:4 },
  pCardOld:{ fontSize:11,color:"#475569",textDecoration:"line-through" },
  pCardPrice:{ fontSize:22,fontWeight:900,color:"#f1f5f9",letterSpacing:"-.5px" },
  pCardPer:{ fontSize:12,fontWeight:400,color:"#64748b" },
  pCardSave:{ fontSize:10,color:"#fbbf24",marginTop:4 },
  sportIcons:{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:20 },
  sportChip:{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px 12px",borderRadius:12,minWidth:60 },
  features:{ display:"flex",flexDirection:"column",gap:6,marginBottom:24 },
  featureItem:{ fontSize:13,color:"#64748b" },
  btnHero:{ width:"100%",background:"linear-gradient(135deg,#2a3547,#1a2535)",border:"1px solid #3a4a60",color:"#f1f5f9",borderRadius:12,padding:"16px",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"inherit",letterSpacing:"-.3px" },
  btnGhost:{ width:"100%",background:"transparent",border:"1px solid #1e2535",color:"#64748b",borderRadius:10,padding:"12px",fontSize:13,cursor:"pointer",fontFamily:"inherit" },
  authWrap:{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:24,flexDirection:"column",gap:12 },
  backBtn:{ alignSelf:"flex-start",background:"transparent",border:"none",color:"#64748b",cursor:"pointer",fontFamily:"inherit",fontSize:13 },
  authCard:{ width:"100%",maxWidth:380,background:"#111827",border:"1px solid #1e2535",borderRadius:16,padding:"28px 24px",display:"flex",flexDirection:"column",gap:4 },
  authTitle:{ fontSize:20,fontWeight:800,color:"#f1f5f9",margin:"4px 0 4px",letterSpacing:"-.5px" },
  authSwitch:{ fontSize:12,color:"#475569",textAlign:"center",marginTop:12 },
  authLink:{ color:"#94a3b8",cursor:"pointer",textDecoration:"underline" },
  errMsg:{ color:"#f87171",fontSize:12,margin:"4px 0" },
  trialBanner:{ background:"#0d2218",border:"1px solid #065f46",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#34d399",marginBottom:8 },
  planToggle:{ display:"flex",gap:4,background:"#0a0c14",padding:4,borderRadius:10,marginTop:8 },
  planBtn:{ flex:1,padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",color:"#64748b",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700 },
  planBtnActive:{ background:"#1e2535",color:"#f1f5f9" },
  planCard:{ background:"#0a0c14",border:"1px solid #1e2535",borderRadius:12,padding:20,textAlign:"center",marginTop:12 },
  planPrice:{ fontSize:28,fontWeight:900,color:"#f1f5f9",marginBottom:8,letterSpacing:"-.5px" },
  planPer:{ fontSize:13,fontWeight:400,color:"#64748b" },
  header:{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",position:"sticky",top:0,zIndex:10 },
  headerL:{ display:"flex",alignItems:"center",gap:10 },
  headerTitle:{ fontSize:15,fontWeight:800,color:"#f1f5f9",letterSpacing:"-.3px" },
  headerR:{ display:"flex",alignItems:"center",gap:8 },
  chip:{ border:"1px solid #2a3547",borderRadius:8,padding:"4px 10px",fontSize:13,fontWeight:700 },
  brSwitcher:{ display:"flex",gap:4,padding:"8px 14px",overflowX:"auto",background:"#0d0f1a",borderBottom:"1px solid #1a2535" },
  brTab:{ padding:"5px 12px",borderRadius:20,border:"1px solid #1a2535",background:"transparent",color:"#475569",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,whiteSpace:"nowrap" },
  brTabActive:{ background:"#1a2535",color:"#f1f5f9" },
  brAddBtn:{ padding:"5px 12px",borderRadius:20,border:"1px dashed #2a3547",background:"transparent",color:"#475569",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,whiteSpace:"nowrap" },
  modal:{ position:"fixed",inset:0,background:"#000000bb",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20 },
  modalCard:{ background:"#111827",border:"1px solid #1e2535",borderRadius:16,padding:24,width:"100%",maxWidth:380,maxHeight:"80vh",overflowY:"auto" },
  nav:{ display:"flex",background:"#0d0f1a",borderBottom:"1px solid #1a2535",position:"sticky",top:64,zIndex:9 },
  navBtn:{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"10px 4px",border:"none",borderTop:"2px solid transparent",background:"transparent",color:"#475569",cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700 },
  navActive:{ background:"#0d1220",color:"#f1f5f9",borderTopColor:"#94a3b8" },
  main:{ maxWidth:680,margin:"0 auto",padding:"16px 14px" },
  kpiGrid:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 },
  kpiCard:{ background:"#111827",border:"1px solid #1a2535",borderRadius:14,padding:"14px 16px" },
  kpiLabel:{ fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:.8,marginBottom:5 },
  kpiVal:{ fontSize:20,fontWeight:800,letterSpacing:"-.5px" },
  card:{ background:"#111827",border:"1px solid #1a2535",borderRadius:14,padding:18,marginBottom:12 },
  cardTitle:{ fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:.8,marginBottom:14,fontWeight:800 },
  statGrid:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 },
  pill:{ background:"#111827",border:"1px solid #1a2535",borderRadius:12,padding:"12px 14px" },
  pendingRow:{ display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1a2535",gap:10 },
  label:{ fontSize:11,color:"#64748b",marginBottom:4,marginTop:10,display:"block",fontWeight:700,letterSpacing:.3 },
  input:{ width:"100%",background:"#0d0f1a",border:"1px solid #1a2535",borderRadius:10,color:"#f1f5f9",padding:"11px 14px",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",outline:"none" },
  row2:{ display:"flex",gap:10 },
  unitBtn:{ flex:1,padding:"11px 0",border:"1px solid #1a2535",borderRadius:10,background:"#0d0f1a",color:"#64748b",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,marginTop:4 },
  unitBtnActive:{ color:"#f1f5f9" },
  stakeBox:{ display:"flex",alignItems:"center",flexWrap:"wrap",gap:10,background:"#0d0f1a",border:"1px solid #1a2535",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#94a3b8",marginTop:8 },
  btnPrimary:{ width:"100%",background:"#1e2d40",color:"#f1f5f9",border:"1px solid #2a3f55",borderRadius:10,padding:"13px",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",letterSpacing:"-.2px" },
  filterRow:{ display:"flex",gap:6,marginBottom:14,flexWrap:"wrap" },
  filterBtn:{ padding:"5px 12px",borderRadius:20,border:"1px solid #1a2535",background:"transparent",color:"#475569",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700 },
  filterActive:{ background:"#1a2535",color:"#f1f5f9" },
  betCard:{ background:"#111827",border:"1px solid #1a2535",borderRadius:14,padding:14,marginBottom:8 },
  betTop:{ display:"flex",gap:10 },
  betActions:{ display:"flex",gap:6,marginTop:10,flexWrap:"wrap" },
  badge:{ borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:800,letterSpacing:.5 },
  bWin:{ padding:"5px 12px",borderRadius:8,border:"1px solid #059669",background:"#0d2218",color:"#34d399",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"inherit" },
  bLoss:{ padding:"5px 12px",borderRadius:8,border:"1px solid #dc2626",background:"#2d0f0f",color:"#f87171",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"inherit" },
  bCash:{ padding:"5px 12px",borderRadius:8,border:"1px solid #2563eb",background:"#0f1f2d",color:"#60a5fa",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"inherit" },
  bVoid:{ padding:"5px 12px",borderRadius:8,border:"1px solid #d97706",background:"#2d2a0f",color:"#fbbf24",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"inherit" },
  bDel:{ padding:"5px 8px",borderRadius:8,border:"1px solid #1a2535",background:"transparent",color:"#334155",cursor:"pointer",fontSize:12,fontFamily:"inherit",marginLeft:"auto" },
  scoreRing:{ width:90,height:90,borderRadius:"50%",border:"3px solid #1a2535",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto",background:"#0d0f1a" },
  accountRow:{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1a2535",fontSize:13 },
  aLabel:{ color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:.5,fontWeight:700 },
  sportGrid:{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:4 },
  sportBtn:{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",border:"1px solid #1a2535",borderRadius:10,background:"#0d0f1a",cursor:"pointer",fontFamily:"inherit" },
  sportBtnActive:{ border:"1px solid #94a3b8" },
};

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `@keyframes spin{to{transform:rotate(360deg)}} select option{background:#0d0f1a} *{-webkit-tap-highlight-color:transparent} input:focus,select:focus{border-color:#2a3f55!important;box-shadow:0 0 0 3px #2a3f5522}`;
  document.head.appendChild(style);
}
