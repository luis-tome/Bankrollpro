import React, { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://opeuermurrbzpglbkmrf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZXVlcm11cnJienBnbGJrbXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjA2NTAsImV4cCI6MjA5NDU5NjY1MH0.M-VclAmrSl0gop_7IvXh7-HH7nj5DwMFLVCMIOa3Qfw";
const STRIPE_MONTHLY = "https://buy.stripe.com/00wfZg8Z0dIb5TRbiTgQE01";
const STRIPE_ANNUAL  = "https://buy.stripe.com/28E00iejkfQj0zx9aLgQE00";
const TRIAL_DAYS = 7;
const MAX_BANKROLLS = 3;
const ADMIN_EMAIL = "luistome.work@gmail.com";

const I18N = {
  PT:{
    tabs:["Banca","Diário","Relatório","Gráfico","IA","Info"],
    logout:"Terminar sessão",currency:"Moeda",language:"Idioma",
    bankroll:"Banca Atual",pnl:"P&L Total",roi:"ROI",
    wins:"Acertos",losses:"Erros",total:"Total",pending:"Pendente",
    strike:"Taxa de Acerto",avgOdd:"Odd Média",unit:"Unidade",
    dayProfit:"Lucro do dia",records:"Registos",
    noRecords:"Sem registos neste dia.",addHint:"Clica em + para adicionar",
    initialBR:"Banca Inicial",finalBR:"Banca Final",entries:"Entradas",
    monthProfit:"Lucro do Mês",monthROI:"ROI do Mês",perDay:"Por dia",
    day:"Dia",invested:"Invest.",returned:"Retorno",profit:"Lucro",
    evolution:"Evolução da Banca",start:"Início",current:"Atual",diff:"Diferença",perMonth:"Por Mês",
    aiTitle:"Análise IA",aiDesc:"Análise personalizada do teu histórico com score de saúde da banca e recomendações.",
    analyzeNow:"Analisar agora",analyzing:"A analisar...",
    insights:"Insights",recommendations:"Recomendações",alerts:"⚠️ Alertas",
    newRecord:"Novo Registo",editRecord:"Editar Registo",
    immediate:"Resultado imediato",leavePending:"Deixar pendente",
    single:"Simples",multiple:"Múltipla",
    event:"Evento",odd:"Odd",units:"Unidades",market:"Mercado",selection:"Seleção",
    result:"Resultado",notes:"Notas (opcional)",saveRecord:"Guardar registo",saveChanges:"Guardar alterações",
    stake:"Stake",potReturn:"Retorno pot.",
    yourBankrolls:"As tuas bancas",newBankroll:"Nova banca",
    trialDays:"dias de trial restantes",subscribePitch:"Subscreve agora ao preço de lançamento",
    activePlan:"✓ Plano ativo",
    importTitle:"📋 Importar do Telegram",importDesc:"Cola o texto com as apostas do grupo",
    yourOdds:"da tua casa",unrecognized:"Formato não reconhecido. Usa 🎾 🎯 💰",
    settleWin:"✓ Green",settleLoss:"✗ Red",
    infoContact:"✉️ Contactar Suporte",infoIncluded:"O que está incluído",
    perMonth2:"análises/mês",exclusive:"🔒 Funcionalidade exclusiva para subscritores",
    limitReached:"Limite mensal atingido · Renova no próximo mês",
  },
  EN:{
    tabs:["Bankroll","Diary","Report","Chart","AI","Info"],
    logout:"Sign out",currency:"Currency",language:"Language",
    bankroll:"Current Bankroll",pnl:"Total P&L",roi:"ROI",
    wins:"Wins",losses:"Losses",total:"Total",pending:"Pending",
    strike:"Strike Rate",avgOdd:"Avg Odd",unit:"Unit",
    dayProfit:"Day Profit",records:"Records",
    noRecords:"No records for this day.",addHint:"Tap + to add",
    initialBR:"Initial Bankroll",finalBR:"Final Bankroll",entries:"Entries",
    monthProfit:"Month Profit",monthROI:"Month ROI",perDay:"Per Day",
    day:"Day",invested:"Staked",returned:"Return",profit:"Profit",
    evolution:"Bankroll Evolution",start:"Start",current:"Current",diff:"Difference",perMonth:"Per Month",
    aiTitle:"AI Analysis",aiDesc:"Personalised analysis of your betting history — bankroll health score and recommendations.",
    analyzeNow:"Analyse now",analyzing:"Analysing...",
    insights:"Insights",recommendations:"Recommendations",alerts:"⚠️ Alerts",
    newRecord:"New Record",editRecord:"Edit Record",
    immediate:"Immediate result",leavePending:"Leave pending",
    single:"Single",multiple:"Multiple",
    event:"Event",odd:"Odd",units:"Units",market:"Market",selection:"Selection",
    result:"Result",notes:"Notes (optional)",saveRecord:"Save record",saveChanges:"Save changes",
    stake:"Stake",potReturn:"Potential return",
    yourBankrolls:"Your bankrolls",newBankroll:"New bankroll",
    trialDays:"trial days remaining",subscribePitch:"Subscribe now at launch price",
    activePlan:"✓ Active plan",
    importTitle:"📋 Import from Telegram",importDesc:"Paste the picks text from the group",
    yourOdds:"your odds",unrecognized:"Format not recognised. Use 🎾 🎯 💰",
    settleWin:"✓ Win",settleLoss:"✗ Loss",
    infoContact:"✉️ Contact Support",infoIncluded:"What's included",
    perMonth2:"analyses/month",exclusive:"🔒 Subscribers only",
    limitReached:"Monthly limit reached · Resets next month",
  }
};

const SUPPORT_EMAIL = "tome.luis.pt@gmail.com";
const AI_LIMIT_MONTHLY = 3;
const AI_LIMIT_ANNUAL = 10;

const PROMO_MONTHLY = 3.99;
const PROMO_ANNUAL  = 19.99;
const NORMAL_MONTHLY = 6.99;
const NORMAL_ANNUAL  = 29.99;
const PROMO_END = new Date("2026-06-30T23:59:59");
const PROMO_DAYS_LEFT = () => Math.max(0, Math.ceil((PROMO_END.getTime() - Date.now()) / 86400000));

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const QUOTES = [
  { text: "A disciplina é mais importante do que a estratégia. Sem gestão de banca, até o melhor tipster perde.", author: "Joseph Buchdahl" },
  { text: "O apostador profissional não aposta para ganhar. Aposta para não perder.", author: "Nassim Nicholas Taleb" },
  { text: "A maior vantagem que podes ter não é a melhor análise, é a melhor gestão de risco.", author: "Ed Thorp" },
  { text: "Não é sobre ter razão. É sobre quanto ganhas quando tens razão e quanto perdes quando não tens.", author: "George Soros" },
  { text: "O ROI diz-te se és bom. A gestão de banca diz-te se sobrevives.", author: "Patrick Veitch" },
  { text: "Apostadores que quebram não perdem porque escolhem mal. Perdem porque apostam demasiado.", author: "Kelly Criterion" },
  { text: "Trata cada aposta como um investimento, não como entretenimento.", author: "Pinnacle Sports" },
  { text: "A paciência é a arma mais poderosa de qualquer apostador profissional.", author: "Zeljko Ranogajec" },
  { text: "Na subida do Monte Evereste está cheio de corpos de gente super motivada.", author: "Theo Borges" },
];

function useQuote(interval = 8000) {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % QUOTES.length), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return QUOTES[idx];
}

const SPORTS = {
  "Geral":       { icon:"🎯", color:"#6b7280", markets:["Outros"], strategies:["Liga Principal","Torneio Secundário"] },
  "Ténis":       { icon:"🎾", color:"#0ea5e9", markets:["Vencedor do Jogo","Handicap Games","Total Games O/U","Set Winner","Total Sets O/U","Resultado Correto Sets","1º Set Vencedor","Total Games 1º Set","Handicap Sets","Dupla Hipótese","Tie-Break no Jogo","1º Break de Serviço","Jogo em Deuce","Total Aces O/U","Total Double Faults O/U","Outros"], strategies:["ATP","WTA","Challenger","ITF"] },
  "Futebol":     { icon:"⚽", color:"#10b981", markets:["1X2","Dupla Hipótese","Over/Under Golos","BTTS","Handicap Asiático","Handicap Europeu","Marcador Correto","1º Marcador","Total Cantos","Total Cartões","Over/Under 1ª Parte","Resultado ao Intervalo","Outros"], strategies:["Liga Principal","Copa Nacional","Liga Europeia","Amigável"] },
  "Basquetebol": { icon:"🏀", color:"#f97316", markets:["1X2","Handicap","Over/Under","1º Quarto","Moneyline","Outros"], strategies:["NBA","EuroLiga","Liga Nacional"] },
  "Hóquei":      { icon:"🏒", color:"#8b5cf6", markets:["1X2","Handicap","Over/Under","Resultado Final","Outros"], strategies:["NHL","Liga Europeia","Liga Nacional"] },
  "Baseball":    { icon:"⚾", color:"#ef4444", markets:["Moneyline","Run Line","Over/Under","1ª Entrada","Outros"], strategies:["MLB","Liga Nacional"] },
  "Rugby":       { icon:"🏉", color:"#eab308", markets:["1X2","Handicap","Over/Under","Primeira Tentativa","Outros"], strategies:["Six Nations","Liga Principal","Torneio Internacional"] },
  "MMA/UFC":     { icon:"🥊", color:"#ec4899", markets:["Vencedor","Método de Vitória","Round","Over/Under Rounds","Vai a Decisão","Outros"], strategies:["UFC","Bellator","Outro Evento"] },
  "Outros":      { icon:"🎯", color:"#6b7280", markets:["1X2","Handicap","Over/Under","Outros"], strategies:["Liga Principal","Torneio Secundário"] },
};
const SPORT_KEYS = Object.keys(SPORTS);

const CURRENCIES = { EUR:{ symbol:"€", flag:"🇪🇺" }, BRL:{ symbol:"R$", flag:"🇧🇷" }, USD:{ symbol:"$", flag:"🇺🇸" } };

const today = () => new Date().toISOString().slice(0,10);
const daysLeft = ts => Math.max(0, TRIAL_DAYS - Math.floor((Date.now()-new Date(ts).getTime())/86400000));
const monthLabel = d => new Date(d+"T00:00:00").toLocaleString("pt-PT",{month:"long",year:"numeric"}).replace(/^\w/,c=>c.toUpperCase());
const fmtDate = d => { const dt=new Date(d+"T00:00:00"); return dt.toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"}).replace(/^\w/,c=>c.toUpperCase()); };
const padDate = dt => { const y=dt.getFullYear(),m=String(dt.getMonth()+1).padStart(2,"0"),d=String(dt.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; };

function parseTelegramTips(text) {
  const bets = [];
  let currentEvent = null;
  let currentSelection = null;
  let bingoMode = false;
  let bingoSelections = [];

  const SPORT = ["🎾","⚽","🏀","🏒","⚾","🏉","🥊","🏸","🎱","🏓"];
  const hasSport = l => SPORT.some(e => l.includes(e));
  const cleanSport = l => { let r=l; SPORT.forEach(e=>{r=r.split(e).join("");}); return r.trim(); };

  for (let line of text.split("\n")) {
    line = line.trim();
    if (!line) continue;

    if (line.includes("🎲") && line.toUpperCase().includes("BINGO")) {
      bingoMode = true; bingoSelections = []; continue;
    }

    if (bingoMode) {
      if (hasSport(line) && !line.includes("💰")) {
        bingoSelections.push(cleanSport(line));
      } else if (line.includes("💰") && line.includes("@") && bingoSelections.length) {
        const um = line.match(/([\d.,]+)\s*un/i);
        const om = line.match(/@\s*([\d.,]+)/);
        if (om) {
          const odd = parseFloat(om[1].replace(",","."));
          const units = um ? parseFloat(um[1].replace(",",".")) : 1;
          if (odd > 1) bets.push({ event:"BINGO", selection:bingoSelections.join(" + "), units, odd, market:"Múltipla", result:"PENDING", notes:"" });
        }
        bingoMode = false; bingoSelections = [];
      }
      continue;
    }

    if (hasSport(line) && !line.includes("🎯") && !line.includes("💰")) {
      currentEvent = cleanSport(line);
      currentSelection = null;
    } else if (line.includes("🎯")) {
      currentSelection = line.replace(/🎯/g,"").trim();
    } else if (line.includes("💰") && line.includes("@") && currentEvent && currentSelection) {
      const um = line.match(/([\d.,]+)\s*un/i);
      const om = line.match(/@\s*([\d.,]+)/);
      if (om) {
        const odd = parseFloat(om[1].replace(",","."));
        const units = um ? parseFloat(um[1].replace(",",".")) : 1;
        if (odd > 1) bets.push({ event:currentEvent, selection:currentSelection, units, odd, market:"Outros", result:"PENDING", notes:"" });
      }
      currentSelection = null;
    }
  }
  return bets;
}

async function getAIFeedback(bets, stats, bankroll, sport) {
  const settled = bets.filter(b=>b.result!=="PENDING"&&b.result!=="VOID");
  if(settled.length<3) return {error:"Poucos registos"};
  const effectiveSport = (!sport||sport==="Geral") ? "Desporto geral" : sport;

  // Aggregate by market
  const byMarket = {};
  settled.forEach(b => {
    const mkt = b.market || "Outros";
    if(!byMarket[mkt]) byMarket[mkt] = {wins:0,losses:0,pnl:0,count:0,totalOdd:0};
    byMarket[mkt].count++;
    byMarket[mkt].totalOdd += b.odd;
    if(b.result==="WIN"){ byMarket[mkt].wins++; byMarket[mkt].pnl+=b.stake*(b.odd-1); }
    else if(b.result==="LOSS"){ byMarket[mkt].losses++; byMarket[mkt].pnl-=b.stake; }
    else if(b.result==="CASHOUT"){ byMarket[mkt].pnl+=(b.cashout_val||0)-b.stake; }
  });
  const marketSummary = Object.entries(byMarket)
    .map(([market,v])=>({
      market, count:v.count,
      wins:v.wins, losses:v.losses,
      pnl:Number(v.pnl.toFixed(2)),
      sr:v.wins+v.losses>0?Number((v.wins/(v.wins+v.losses)*100).toFixed(0)):0,
      avgOdd:Number((v.totalOdd/v.count).toFixed(2))
    }))
    .sort((a,b)=>a.pnl-b.pnl);

  // Aggregate by odd range
  const byOddRange = {"1.01-1.50":{wins:0,losses:0,pnl:0,count:0},"1.51-2.00":{wins:0,losses:0,pnl:0,count:0},"2.01-3.00":{wins:0,losses:0,pnl:0,count:0},"3.01+":{wins:0,losses:0,pnl:0,count:0}};
  settled.forEach(b => {
    const range = b.odd<=1.50?"1.01-1.50":b.odd<=2.00?"1.51-2.00":b.odd<=3.00?"2.01-3.00":"3.01+";
    const pnl = b.result==="WIN"?b.stake*(b.odd-1):b.result==="LOSS"?-b.stake:(b.cashout_val||0)-b.stake;
    byOddRange[range].count++;
    byOddRange[range].pnl+=pnl;
    if(pnl>0) byOddRange[range].wins++; else byOddRange[range].losses++;
  });
  const oddRangeSummary = Object.entries(byOddRange)
    .filter(([,v])=>v.count>0)
    .map(([range,v])=>({range,count:v.count,wins:v.wins,losses:v.losses,pnl:Number(v.pnl.toFixed(2)),sr:v.count>0?Number((v.wins/v.count*100).toFixed(0)):0}));

  // Individual bets (last 50 max to stay within token limits)
  const individualBets = settled.slice(0,50).map(b=>({
    event: b.event||"",
    selection: b.selection||"",
    market: b.market||"Outros",
    odd: b.odd,
    units: b.units||1,
    result: b.result,
    date: b.created_at||"",
    pnl: Number((b.result==="WIN"?b.stake*(b.odd-1):b.result==="LOSS"?-b.stake:(b.cashout_val||0)-b.stake).toFixed(2)),
    notes: b.notes||""
  }));

  const payload = {
    sport: effectiveSport,
    overview: { totalBets:settled.length, wins:stats.wins, losses:stats.losses, roi:Number(stats.roi.toFixed(1)), strikeRate:Number(stats.strikeRate.toFixed(1)), avgOdd:Number(stats.avgOdd.toFixed(2)), pnl:Number(stats.pnl.toFixed(2)), bankroll:Number(bankroll.toFixed(2)) },
    byMarket: marketSummary,
    byOddRange: oddRangeSummary,
    individualBets
  };

  try {
    const res = await fetch("/api/analyze",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({payload}) });
    const text = await res.text();
    const data = JSON.parse(text);
    if(data.error) return { error: data.error };
    if(!data.score) return { error: "Resposta invalida" };
    return data;
  } catch(e) { return { error: e.message }; }
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
  const [lang, setLang]           = useState("PT");
  const tx = k => (I18N[lang]||I18N.PT)[k]||k;

  const [authForm, setAuthForm]   = useState({name:"",email:"",password:""});
  const [authErr, setAuthErr]     = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNewBR, setShowNewBR] = useState(false);
  const [showEditBR, setShowEditBR] = useState(false);
  const [editBRTarget, setEditBRTarget] = useState(null);
  const [brForm, setBRForm]       = useState({name:"",sport:"Ténis",bankroll:"",unit_pct:"2",reset:false,stake_mode:"variable"});
  const [showForm, setShowForm]   = useState(false);
  const [editBet, setEditBet]     = useState(null);
  const [formMode, setFormMode]   = useState("immediate");
  const [betType, setBetType]       = useState("single");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importBets, setImportBets] = useState([]);
  const [importDate, setImportDate] = useState(today());
  const [betSport, setBetSport]     = useState("");
  const [form, setForm]           = useState({event:"",market:"Vencedor do Jogo",selection:"",odd:"",units:1,result:"WIN",notes:"",cashoutVal:"",betDate:today(),strategy:""});
  const [subView, setSubView]     = useState("annual");
  const [feedback, setFeedback]   = useState(null);
  const [loadingFB, setLoadingFB] = useState(false);
  const [aiUsage, setAiUsage]       = useState(0);
  const [diaryDate, setDiaryDate] = useState(today());
  const [diaryStrategyFilter, setDiaryStrategyFilter] = useState("all");
  const [reportStrategyFilter, setReportStrategyFilter] = useState("all");
  const [reportMonth, setReportMonth] = useState(today().slice(0,7));
  const [showSuccess, setShowSuccess] = useState(false);
  const [showStakeReview, setShowStakeReview] = useState(false);
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
  const emptyForm = {event:"",market:markets[0]||"Vencedor do Jogo",selection:"",odd:"",units:1,result:"WIN",notes:"",cashoutVal:"",betDate:today(),strategy:""};
  

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
      const updates={name:brForm.name,sport:brForm.sport,unit_pct:parseFloat(brForm.unit_pct),stake_mode:brForm.stake_mode||"variable"};
      if(brForm.reset){ updates.bankroll=brv; updates.last_stake_review=new Date().toISOString(); }
      const{data}=await supabase.from("profiles").update(updates).eq("id",editBRTarget.id).select().single();
      if(data){setBankrolls(prev=>prev.map(b=>b.id===data.id?data:b));setShowEditBR(false);}
    } else {
      const{data:{session}}=await supabase.auth.getSession();
      const uid=session?.user?.id||user?.id;
      const{data:existing}=await supabase.from("profiles").select("user_trial_start,trial_start").eq("user_id",uid).order("created_at",{ascending:true});
      const earliestTrial=existing?.[0]?.user_trial_start||existing?.[0]?.trial_start||new Date().toISOString();
      const userEmail=session?.user?.email||user?.email||"";
      const userDisplayName=session?.user?.user_metadata?.name||user?.user_metadata?.name||"";
      const{data}=await supabase.from("profiles").insert({user_id:uid,name:brForm.name,sport:brForm.sport,bankroll:brv,unit_pct:parseFloat(brForm.unit_pct),trial_start:new Date().toISOString(),user_trial_start:earliestTrial,subscribed:false,email:userEmail,user_name:userDisplayName,last_stake_review:new Date().toISOString(),stake_mode:brForm.stake_mode||"variable"}).select().single();
      if(data){setBankrolls(prev=>[...prev,data]);setActiveBR(data.id);setBets([]);setShowNewBR(false);setShowEditBR(false);setDrawerOpen(false);setBRForm({name:"",sport:"Ténis",bankroll:"",unit_pct:"2",reset:false,stake_mode:"variable"});setScreen("app");}
    }
  }

  async function deleteBankroll(id){
    if(!window.confirm(lang==="PT"?"Apagar esta banca e todos os registos? Esta ação não pode ser revertida.":"Delete this bankroll and all records? This action cannot be undone.")) return;
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
    // Preserve time-of-day from "now", but use the selected date
    const now = new Date();
    const [by,bm,bd] = (form.betDate||today()).split("-").map(Number);
    const betTimestamp = new Date(by, bm-1, bd, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
    const payload={sport:br?.sport==="Geral"?(betSport||"Outros"):br.sport,event:form.event,market:form.market,selection:form.selection,odd,stake,units:parseFloat(form.units),result,notes:form.notes,cashout_val:form.result==="CASHOUT"?parseFloat(form.cashoutVal)||null:null,created_at:betTimestamp,strategy:form.strategy||null};
    if(editBet){
      const{data}=await supabase.from("bets").update(payload).eq("id",editBet.id).select().single();
      if(data) setBets(prev=>prev.map(b=>b.id===data.id?{...data,odd:parseFloat(data.odd),stake:parseFloat(data.stake)}:b).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)));
    } else {
      const{data}=await supabase.from("bets").insert({...payload,user_id:user.id,bankroll_id:activeBR}).select().single();
      if(data) setBets(prev=>[{...data,odd:parseFloat(data.odd),stake:parseFloat(data.stake)},...prev].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)));
    }
    setForm(emptyForm);setShowForm(false);setEditBet(null);setTab("diary");
  }

  async function settleBet(id,result,cashoutVal){
    await supabase.from("bets").update({result,cashout_val:cashoutVal||null}).eq("id",id);
    setBets(prev=>prev.map(b=>b.id===id?{...b,result,cashout_val:cashoutVal}:b));
  }

  async function deleteBet(id){
    if(!window.confirm(lang==="PT"?"Apagar este registo?":"Delete this record?")) return;
    await supabase.from("bets").delete().eq("id",id);
    setBets(prev=>prev.filter(b=>b.id!==id));
  }

  function openEditBet(b){
    setEditBet(b);
    setForm({event:b.event||"",market:b.market||markets[0],selection:b.selection||"",odd:b.odd||"",units:b.units||1,result:b.result||"WIN",notes:b.notes||"",cashoutVal:b.cashout_val||"",betDate:b.created_at?b.created_at.slice(0,10):today(),strategy:b.strategy||""});
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
  const unitVal   = br ? (br.stake_mode==="fixed" ? parseFloat(br.bankroll||0)*br.unit_pct/100 : currentBR*br.unit_pct/100) : 0;

  // Revisão de stake a cada 30 dias
  const lastReviewDate = br?.last_stake_review || br?.created_at;
  const daysSinceReview = lastReviewDate ? Math.floor((Date.now()-new Date(lastReviewDate).getTime())/86400000) : 0;
  const stakeReviewDue = br && daysSinceReview >= 30;
  const reviewPnlPct = br ? ((currentBR-parseFloat(br.bankroll||0))/(parseFloat(br.bankroll||0)||1))*100 : 0;
  const suggestedBankroll = currentBR;

  useEffect(()=>{
    if(stakeReviewDue && screen==="app" && isActive){
      const dismissedKey = `stakeReviewDismissed_${br?.id}`;
      const dismissedUntil = typeof localStorage!=="undefined" ? localStorage.getItem(dismissedKey) : null;
      if(!dismissedUntil || new Date(dismissedUntil) < new Date()){
        setShowStakeReview(true);
      }
    }
  },[stakeReviewDue, br?.id, screen]);

  async function acceptStakeReview(){
    if(!br) return;
    const{data}=await supabase.from("profiles").update({bankroll:suggestedBankroll, last_stake_review:new Date().toISOString()}).eq("id",br.id).select().single();
    if(data) setBankrolls(prev=>prev.map(b=>b.id===data.id?data:b));
    setShowStakeReview(false);
  }

  function dismissStakeReview(){
    if(br?.id && typeof localStorage!=="undefined"){
      const snooze = new Date(); snooze.setDate(snooze.getDate()+30);
      localStorage.setItem(`stakeReviewDismissed_${br.id}`, snooze.toISOString());
    }
    setShowStakeReview(false);
  }

  const availableStrategies = useMemo(()=>{
    const set = new Set(bets.map(b=>b.strategy).filter(Boolean));
    return Array.from(set).sort();
  },[bets]);

  const diaryBets = bets.filter(b=>b.created_at?.slice(0,10)===diaryDate && (diaryStrategyFilter==="all" || b.strategy===diaryStrategyFilter));
  const diaryPnl  = diaryBets.filter(b=>b.result!=="PENDING"&&b.result!=="VOID").reduce((s,b)=>{
    if(b.result==="WIN") return s+b.stake*(b.odd-1);
    if(b.result==="LOSS") return s-b.stake;
    if(b.result==="CASHOUT") return s+(b.cashout_val||0)-b.stake;
    return s;
  },0);

  const reportBets   = bets.filter(b=>b.created_at?.slice(0,7)===reportMonth&&b.result!=="PENDING"&&b.result!=="VOID"&&(reportStrategyFilter==="all"||b.strategy===reportStrategyFilter));
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

  function swipeStart(e){ touchX.current=e.touches[0].clientX; }
  function swipeEnd(e){ if(touchX.current!==null&&touchX.current-e.changedTouches[0].clientX>60) setDrawerOpen(false); touchX.current=null; }

  if(screen==="loading") return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#f7f8fa"}}>
      <div style={{...S.spinner,border:"2px solid #e5e7eb",borderTop:"2px solid #111827"}}/>
    </div>
  );

  if(screen==="landing") return (
    <div style={{background:"#f7f8fa",minHeight:"100vh",fontFamily:"-apple-system,'Segoe UI',sans-serif",color:"#111827"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",background:"#fff",borderBottom:"1px solid #fff"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:"#f7f8fa",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📊</div>
          <span style={{fontSize:16,fontWeight:800,color:"#111827"}}>BankrollPro</span>
        </div>
        <button style={S.btnOutline} onClick={()=>{setAuthMode("login");setScreen("auth");}}>Entrar</button>
      </header>

      <div style={{padding:"28px 20px 80px",maxWidth:480,margin:"0 auto"}}>
        <div style={{display:"inline-block",background:"#f8f9fa",border:"1px solid #e9ecef",color:"#92400e",borderRadius:6,padding:"3px 12px",fontSize:11,fontWeight:700,marginBottom:18}}>
          🔥 Oferta de lançamento — termina 30 de Junho
        </div>

        <h1 style={{fontSize:36,fontWeight:900,lineHeight:1.05,letterSpacing:"-2px",margin:"0 0 12px",color:"#111827"}}>
          Para de perder.<br/><span style={{color:"#111827"}}>Começa a gerir.</span>
        </h1>

        <p style={{fontSize:14,color:"#6b7280",lineHeight:1.7,marginBottom:24}}>
          Controla bancas por desporto, acompanha ROI em tempo real e recebe análise com IA para evoluir a tua performance.
        </p>

        <LandingQuote/>

        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:16,marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
          <div style={{textAlign:"center",marginBottom:12,fontSize:12,color:"#dc2626",fontWeight:700}}>
            ⏰ Preço de lançamento — só até 30 de Junho · {PROMO_DAYS_LEFT()} dias restantes
          </div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1,background:"#f7f8fa",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 10px"}}>
              <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:600,marginBottom:4}}>Mensal</div>
              <div style={{fontSize:11,color:"#d1d5db",textDecoration:"line-through"}}>€{NORMAL_MONTHLY}/mês</div>
              <div style={{fontSize:22,fontWeight:900,color:"#111827"}}>€{PROMO_MONTHLY}<span style={{fontSize:12,fontWeight:400,color:"#111827"}}>/mês</span></div>
              <div style={{fontSize:11,color:"#dc2626",fontWeight:600,marginTop:4}}>Depois €{NORMAL_MONTHLY}/mês</div>
            </div>
            <div style={{flex:1,background:"#f7f8fa",border:"2px solid #111827",borderRadius:12,padding:"12px 10px"}}>
              <div style={{fontSize:9,color:"#fff",background:"#111827",borderRadius:4,padding:"2px 8px",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"inline-block"}}>POPULAR</div>
              <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:600,marginBottom:4}}>Anual</div>
              <div style={{fontSize:11,color:"#d1d5db",textDecoration:"line-through"}}>€{NORMAL_ANNUAL}/ano</div>
              <div style={{fontSize:22,fontWeight:900,color:"#111827"}}>€{PROMO_ANNUAL}<span style={{fontSize:12,fontWeight:400,color:"#111827"}}>/ano</span></div>
              <div style={{fontSize:11,color:"#059669",fontWeight:700,marginTop:4}}>Depois €{NORMAL_ANNUAL}/ano · Poupas €{(NORMAL_MONTHLY*12-PROMO_ANNUAL).toFixed(0)}</div>
            </div>
          </div>
        </div>


        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:"16px 18px",marginBottom:20,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:12,fontWeight:800,color:"#111827",textTransform:"uppercase",letterSpacing:.8,marginBottom:12}}>✅ O que está incluído</div>
          {[
            ["📊","Até 3 bancas separadas por desporto"],
            ["📅","Diário por dia — registo imediato ou pendente"],
            ["📈","Relatório mensal — lucro, ROI, % acertos"],
            ["📉","Gráfico de evolução da banca"],
            ["🎯","Apostas simples e múltiplas com unidades configuráveis"],
            ["📋","Importação de apostas via Telegram"],
            ["🤖","Análise IA — score, padrões e recomendações reais"],
            ["🏅","Ténis, Futebol, NBA, MMA e mais desportos"],
            ["💱","€, R$ e $ — múltiplas moedas"],
            ["🚫","Sem anúncios"],
          ].map(([ico,txt])=>(
            <div key={txt} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:"1px solid #f9fafb",alignItems:"flex-start"}}>
              <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
              <span style={{fontSize:13,color:"#374151",lineHeight:1.4}}>{txt}</span>
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
              <span>{SPORTS[s].icon}</span><span style={{color:"#111827"}}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if(screen==="auth") return (
    <div style={{background:"#f7f8fa",minHeight:"100vh",fontFamily:"-apple-system,'Segoe UI',sans-serif"}}>
      <div style={{padding:"14px 18px",background:"#fff",borderBottom:"1px solid #fff"}}>
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
              <p style={{fontSize:13,color:"#9ca3af",marginBottom:14}}>{authMode==="login"?"Entra na tua conta.":"7 dias grátis · Preço de lançamento até 30 de Junho."}</p>
              {authMode==="register" && (
                <div>
                  <label style={{...S.label,color:"#111827"}}>Nome</label>
                  <input style={S.input} placeholder="O teu nome" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))}/>
                </div>
              )}
              <label style={{...S.label,color:"#111827"}}>Email</label>
              <input style={S.input} type="email" placeholder="email@exemplo.com" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))}/>
              <label style={{...S.label,color:"#111827"}}>Password</label>
              <input style={S.input} type="password" placeholder="••••••••" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))}/>
              {authErr && <p style={{color:"#dc2626",fontSize:12,margin:"6px 0",background:"#fef2f2",padding:"8px 10px",borderRadius:6}}>{authErr}</p>}
              <button style={{...S.btnPrimary,marginTop:20}} onClick={handleAuth} disabled={loading}>{loading?"...":authMode==="login"?"Entrar":"Criar conta"}</button>
              <p style={{fontSize:12,color:"#9ca3af",textAlign:"center",marginTop:14}}>
                {authMode==="login"?"Ainda não tens conta? ":"Já tens conta? "}
                <span style={{color:"#111827",cursor:"pointer",textDecoration:"underline",fontWeight:600}} onClick={()=>setAuthMode(m=>m==="login"?"register":"login")}>
                  {authMode==="login"?"Regista-te":"Entra aqui"}
                </span>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  if(screen==="setup") return (
    <div style={{background:"#f7f8fa",minHeight:"100vh",fontFamily:"-apple-system,'Segoe UI',sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}>
        <div style={{width:"100%",maxWidth:380,background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:"28px 24px",boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:32,marginBottom:8}}>💼</div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 4px"}}>Primeira banca</h2>
          <p style={{fontSize:13,color:"#9ca3af",marginBottom:12}}>Olá, {userName}! Configura a tua banca.</p>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#15803d",marginBottom:12,fontWeight:600,textAlign:"center"}}>
            🎯 7 dias de trial grátis · Preço de lançamento até 30 Jun
          </div>
          <BRForm form={brForm} setForm={setBRForm} showReset={false} lang={lang}/>
          <button style={{...S.btnPrimary,marginTop:20}} onClick={()=>handleCreateBR(false)}>Criar banca</button>
        </div>
      </div>
    </div>
  );

  if(screen==="app" && !isActive && !isAdmin) return (
    <div style={{background:"#f7f8fa",minHeight:"100vh",fontFamily:"-apple-system,'Segoe UI',sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}>
        <div style={{width:"100%",maxWidth:380,background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:"28px 24px",boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:40,marginBottom:8,textAlign:"center"}}>⏰</div>
          <h2 style={{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 4px",textAlign:"center"}}>Trial terminado</h2>
          <p style={{fontSize:13,color:"#9ca3af",textAlign:"center",marginBottom:4}}>Escolhe um plano para continuar.</p>
          <div style={{background:"#fef3c7",border:"1px solid #fde68a",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#92400e",fontWeight:600,textAlign:"center",marginBottom:16}}>🔥 Preço de lançamento até 30 de Junho</div>

          <div style={{display:"flex",gap:4,background:"#f7f8fa",padding:4,borderRadius:10,marginBottom:12}}>
            <button style={{flex:1,padding:"8px 10px",borderRadius:8,border:"none",background:subView==="monthly"?"#fff":"transparent",color:subView==="monthly"?"#111827":"#9ca3af",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:subView==="monthly"?"0 1px 3px rgba(0,0,0,.1)":"none"}} onClick={()=>setSubView("monthly")}>Mensal</button>
            <button style={{flex:1,padding:"8px 10px",borderRadius:8,border:"none",background:subView==="annual"?"#fff":"transparent",color:subView==="annual"?"#111827":"#9ca3af",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:subView==="annual"?"0 1px 3px rgba(0,0,0,.1)":"none"}} onClick={()=>setSubView("annual")}>Anual ⭐</button>
          </div>

          <div style={{background:"#f7f8fa",border:subView==="annual"?"2px solid #111827":"1px solid #e5e7eb",borderRadius:12,padding:20,marginBottom:12}}>
            {subView==="annual" && <div style={{fontSize:11,color:"#059669",fontWeight:700,marginBottom:8,textAlign:"center"}}>⭐ Melhor valor · Poupas €{(NORMAL_MONTHLY*12-PROMO_ANNUAL).toFixed(0)}</div>}
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:11,color:"#d1d5db",textDecoration:"line-through"}}>{subView==="monthly"?`€${NORMAL_MONTHLY}/mês`:`€${NORMAL_ANNUAL}/ano`}</div>
              <div style={{fontSize:28,fontWeight:900,color:"#111827",letterSpacing:"-.5px"}}>{subView==="monthly"?`€${PROMO_MONTHLY}`:`€${PROMO_ANNUAL}`}<span style={{fontSize:13,fontWeight:400,color:"#111827"}}>{subView==="monthly"?"/mês":"/ano"}</span></div>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Depois {subView==="monthly"?`€${NORMAL_MONTHLY}/mês`:`€${NORMAL_ANNUAL}/ano`}</div>
            </div>
            <div style={{borderTop:"1px solid #e5e7eb",paddingTop:12,marginBottom:16}}>
              {[
                ["✓","Até 3 bancas separadas por desporto"],
                ["✓","Diário por dia — registo imediato ou pendente"],
                ["✓","Relatório mensal — lucro, ROI, % acertos"],
                ["✓","Gráfico de evolução da banca"],
                ["✓","Apostas simples e múltiplas com unidades"],
                ["✓","Importação de apostas via Telegram"],
                ["✓",`Análise IA — ${subView==="annual"?AI_LIMIT_ANNUAL:AI_LIMIT_MONTHLY} análises/mês`],
                ["✓","Ténis, Futebol, NBA, MMA e mais"],
                ["✓","€, R$ e $ — múltiplas moedas"],
                ["✓","Sem anúncios"],
              ].map(([ico,txt])=>(
                <div key={txt} style={{display:"flex",gap:8,marginBottom:6,fontSize:12,color:"#111827"}}>
                  <span style={{color:"#059669",fontWeight:700,flexShrink:0}}>{ico}</span>
                  <span>{txt}</span>
                </div>
              ))}
            </div>
            <a href={subView==="monthly"?STRIPE_MONTHLY:STRIPE_ANNUAL} target="_blank" rel="noreferrer" style={{display:"block",background:"#111827",color:"#fff",textDecoration:"none",padding:"13px",borderRadius:10,fontSize:14,fontWeight:700,textAlign:"center"}}>
              Subscrever agora →
            </a>
          </div>

          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#15803d",textAlign:"center",marginBottom:8}}>
            ✓ Acesso imediato · ✓ Cancela quando quiseres
          </div>
          <button style={S.btnGhost} onClick={()=>supabase.auth.signOut()}>{tx("logout")}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{background:"#f7f8fa",minHeight:"100vh",fontFamily:"-apple-system,'Segoe UI',sans-serif",color:"#111827",paddingBottom:100}} onTouchStart={swipeStart} onTouchEnd={swipeEnd}>

      {showImport && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowImport(false)}>
          <div style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:24,width:"100%",maxWidth:500,maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#111827"}}>📋 Importar do Telegram</h3>
                <p style={{margin:"4px 0 0",fontSize:12,color:"#111827"}}>Cola o texto com as apostas do grupo</p>
              </div>
              <button style={{background:"none",border:"none",color:"#9ca3af",fontSize:22,cursor:"pointer"}} onClick={()=>setShowImport(false)}>×</button>
            </div>

            <label style={S.label}>{lang==="PT"?"Data das apostas":"Bets date"}</label>
            <input type="date" style={S.input} max={today()} value={importDate} onChange={e=>setImportDate(e.target.value)}/>

            <label style={{...S.label,marginTop:14}}>{lang==="PT"?"Texto das apostas":"Bets text"}</label>
            <textarea
              style={{...S.input,height:140,resize:"none",fontFamily:"inherit",fontSize:13}}
              placeholder={"🎾  SINNER v ALCARAZ\n🎯   SINNER VENCE\n💰  1un @1.85 (Pinnacle)"}
              value={importText}
              onChange={e=>{
                setImportText(e.target.value);
                setImportBets(parseTelegramTips(e.target.value));
              }}
            />

            {importBets.length>0 && (
              <div style={{marginTop:12}}>
                <div style={{fontSize:11,color:"#6b7280",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:8}}>
                  {importBets.length} aposta{importBets.length>1?"s":""} detectada{importBets.length>1?"s":""}
                </div>
                {importBets.map((b,i)=>(
                  <div key={i} style={{background:"#f7f8fa",border:"1px solid #fff",borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#111827",marginBottom:6}}>{b.event}</div>
                    <div style={{fontSize:12,color:"#6b7280",marginBottom:6}}>{b.selection} · {b.units}u</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,color:"#9ca3af",fontWeight:600,whiteSpace:"nowrap"}}>Odd:</span>
                      <input
                        type="number" step="0.01" min="1.01"
                        value={b.odd}
                        onChange={e=>{
                          const newBets=[...importBets];
                          newBets[i]={...newBets[i],odd:parseFloat(e.target.value)||b.odd};
                          setImportBets(newBets);
                        }}
                        style={{...S.input,padding:"5px 8px",fontSize:13,width:80,textAlign:"center"}}
                      />
                      <span style={{fontSize:11,color:"#111827"}}>da tua casa</span>
                    </div>
                  </div>
                ))}
                <button style={{...S.btnPrimary,marginTop:12,background:sc.color,border:"none"}}
                  onClick={async()=>{
                    const now = new Date();
                    const [iy,im,id] = (importDate||today()).split("-").map(Number);
                    const importTimestamp = new Date(iy, im-1, id, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
                    for(const b of importBets){
                      const stake=unitVal*b.units;
                      await supabase.from("bets").insert({
                        user_id:user.id,bankroll_id:activeBR,sport:br.sport,
                        event:b.event,market:b.market,selection:b.selection,
                        odd:b.odd,stake,units:b.units,result:"PENDING",
                        notes:b.notes,created_at:importTimestamp
                      });
                    }
                    await loadBets(activeBR);
                    setShowImport(false);
                    setTab("diary");
                  }}>
                  Importar {importBets.length} aposta{importBets.length>1?"s":""}
                </button>
              </div>
            )}

            {importText.length>0 && importBets.length===0 && (
              <div style={{marginTop:10,padding:"10px 12px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,fontSize:12,color:"#dc2626"}}>
                Formato não reconhecido. Usa o formato com 🎾 🎯 💰
              </div>
            )}
          </div>
        </div>
      )}

      {showSuccess && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowSuccess(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:28,maxWidth:360,width:"100%",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:56,marginBottom:12}}>🎉</div>
            <h2 style={{fontSize:22,fontWeight:900,color:"#111827",margin:"0 0 8px"}}>Bem-vindo ao BankrollPro!</h2>
            <p style={{fontSize:14,color:"#6b7280",lineHeight:1.6,marginBottom:20}}>A tua subscrição está ativa. Acesso completo desbloqueado.</p>
            <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 16px",marginBottom:20}}>
              <div style={{fontSize:13,color:"#15803d",fontWeight:600}}>✓ Acesso ilimitado ativado</div>
              <div style={{fontSize:13,color:"#15803d",fontWeight:600,marginTop:4}}>✓ Todas as bancas disponíveis</div>
              <div style={{fontSize:13,color:"#15803d",fontWeight:600,marginTop:4}}>✓ Análise IA disponível</div>
            </div>
            <button style={{...S.btnPrimary,background:sc.color,border:"none"}} onClick={()=>setShowSuccess(false)}>Começar agora →</button>
          </div>
        </div>
      )}

      {showStakeReview && br && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:28,maxWidth:380,width:"100%"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40,marginBottom:10,textAlign:"center"}}>📊</div>
            <h2 style={{fontSize:19,fontWeight:900,color:"#111827",margin:"0 0 6px",textAlign:"center"}}>{lang==="PT"?"Hora de rever a tua banca":"Time to review your bankroll"}</h2>
            <p style={{fontSize:13,color:"#6b7280",lineHeight:1.5,marginBottom:18,textAlign:"center"}}>
              {lang==="PT"?`Já passaram 30 dias desde a última revisão de "${br.name}".`:`30 days have passed since the last review of "${br.name}".`}
            </p>

            <div style={{background:"#f9fafb",border:"1px solid #f3f4f6",borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:12,color:"#9ca3af"}}>{lang==="PT"?"Modo de stake":"Stake mode"}</span>
                <strong style={{fontSize:13,color:"#374151"}}>{br.stake_mode==="fixed"?(lang==="PT"?"Fixa 🔒":"Fixed 🔒"):(lang==="PT"?"Variável 📈":"Variable 📈")}</strong>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:12,color:"#9ca3af"}}>{lang==="PT"?"Banca declarada":"Declared bankroll"}</span>
                <strong style={{fontSize:13,color:"#374151"}}>{fmt(parseFloat(br.bankroll||0))}</strong>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:12,color:"#9ca3af"}}>{lang==="PT"?"Banca atual (real)":"Current bankroll (actual)"}</span>
                <strong style={{fontSize:14,color:reviewPnlPct>=0?"#059669":"#dc2626"}}>{fmt(currentBR)} ({fmtPct(reviewPnlPct)})</strong>
              </div>
              <div style={{borderTop:"1px solid #e5e7eb",paddingTop:10,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:"#9ca3af"}}>{lang==="PT"?"Nova unidade sugerida":"Suggested new unit"}</span>
                <strong style={{fontSize:14,color:sc.color}}>{fmt(suggestedBankroll*br.unit_pct/100)} <span style={{fontSize:11,fontWeight:400,color:"#9ca3af"}}>({br.unit_pct}%)</span></strong>
              </div>
            </div>

            <p style={{fontSize:12,color:"#9ca3af",lineHeight:1.5,marginBottom:18,textAlign:"center"}}>
              {br.stake_mode==="fixed"
                ? (lang==="PT"?"A tua stake fixa está calculada sobre €"+parseFloat(br.bankroll||0).toFixed(2)+". Queres atualizá-la para a banca atual?":"Your fixed stake is calculated on €"+parseFloat(br.bankroll||0).toFixed(2)+". Update it to the current bankroll?")
                : (lang==="PT"?"A tua stake variável usa "+br.unit_pct+"% da banca atual. Queres manter a percentagem ou ajustá-la?":"Your variable stake uses "+br.unit_pct+"% of current bankroll. Keep the percentage or adjust it?")
              }
            </p>

            <button style={{...S.btnPrimary,background:sc.color,border:"none",marginBottom:8}} onClick={acceptStakeReview}>
              {lang==="PT"?"✓ Atualizar banca":"✓ Update bankroll"}
            </button>
            <button style={S.btnGhost} onClick={dismissStakeReview}>
              {lang==="PT"?"Manter como está · lembrar em 30 dias":"Keep as is · remind in 30 days"}
            </button>
          </div>
        </div>
      )}

      {drawerOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:100,display:"flex"}} onClick={()=>setDrawerOpen(false)}>
          <div style={{width:300,maxWidth:"85vw",background:"#fff",height:"100%",display:"flex",flexDirection:"column",padding:20,overflowY:"auto",boxShadow:"4px 0 24px rgba(0,0,0,.06)"}} onClick={e=>e.stopPropagation()}>

            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,paddingBottom:16,borderBottom:"1px solid #fff"}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:"#f7f8fa",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#111827",flexShrink:0}}>{userName[0]?.toUpperCase()||"U"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{userName}</div>
                <div style={{fontSize:11,color:"#111827"}}>{user?.email}</div>
              </div>
              <button style={{background:"none",border:"none",fontSize:20,color:"#9ca3af",cursor:"pointer"}} onClick={()=>setDrawerOpen(false)}>×</button>
            </div>

            {isInTrial && !isAdmin && (
              <div style={{background:"#f8f9fa",border:"1px solid #e9ecef",borderRadius:10,padding:"12px",marginBottom:14,fontSize:12,color:"#92400e"}}>
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
                    <div style={{fontSize:14,fontWeight:900,color:"#fff"}}>€{PROMO_ANNUAL}<span style={{fontSize:10,fontWeight:400,color:"#111827"}}>/ano</span></div>
                    <div style={{fontSize:9,color:"#4ade80",fontWeight:600}}>Depois €{NORMAL_ANNUAL} · Melhor valor</div>
                    <a href={STRIPE_ANNUAL} target="_blank" rel="noreferrer" style={{display:"block",background:"#fff",color:"#111827",borderRadius:6,padding:"5px 0",fontSize:10,fontWeight:700,textAlign:"center",textDecoration:"none",marginTop:6}}>Subscrever</a>
                  </div>
                </div>
              </div>
            )}

            <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:8}}>{tx("language")}</div>
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              {[["PT","🇵🇹"],["EN","🇬🇧"]].map(([l,f])=>(
                <button key={l} style={{flex:1,padding:"7px",border:`1px solid ${lang===l?"#111827":"#e5e7eb"}`,background:lang===l?"#111827":"#fff",color:lang===l?"#fff":"#6b7280",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setLang(l)}>{f} {l}</button>
              ))}
            </div>
            <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:8}}>{tx("currency")}</div>
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              {Object.entries(CURRENCIES).map(([code,cur])=>(
                <button key={code} style={{flex:1,padding:"7px 4px",border:`1px solid ${currency===code?"#111827":"#e5e7eb"}`,background:currency===code?"#111827":"#fff",color:currency===code?"#fff":"#6b7280",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700}} onClick={()=>setCurrency(code)}>
                  {cur.flag} {code}
                </button>
              ))}
            </div>


            <div style={{fontSize:10,color:"#111827",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:8}}>{tx("yourBankrolls")}</div>
            {bankrolls.map(b=>{
              const bsc=SPORTS[b.sport];
              return (
                <div key={b.id} style={{display:"flex",alignItems:"center",gap:4,padding:"10px 8px",borderLeft:`3px solid ${b.id===activeBR?bsc?.color:"transparent"}`,background:b.id===activeBR?"#f7f8fa":"transparent",borderRadius:"0 10px 10px 0",marginBottom:4}}>
                  <button style={{display:"flex",alignItems:"center",gap:10,flex:1,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}} onClick={()=>switchBankroll(b.id)}>
                    <span style={{fontSize:22}}>{bsc?.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{b.name}</div>
                      <div style={{fontSize:11,color:"#111827"}}>{b.sport}</div>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:bsc?.color}}>{fmt(parseFloat(b.bankroll))}</span>
                  </button>
                  <button style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",padding:"0 4px",fontSize:14}} onClick={()=>{setEditBRTarget(b);setBRForm({name:b.name,sport:b.sport,bankroll:b.bankroll,unit_pct:b.unit_pct,reset:false,stake_mode:b.stake_mode||"variable"});setShowEditBR(true);setDrawerOpen(false);}}>✏️</button>
                </div>
              );
            })}

            {bankrolls.length<MAX_BANKROLLS && (
              <button style={{display:"flex",alignItems:"center",width:"100%",padding:"10px",border:"1px dashed #e5e7eb",background:"transparent",cursor:"pointer",borderRadius:10,fontSize:13,marginTop:4,color:"#111827"}} onClick={()=>{setBRForm({name:"",sport:"Ténis",bankroll:"",unit_pct:"2",reset:false,stake_mode:"variable"});setShowNewBR(true);setDrawerOpen(false);}}>
                <span style={{marginRight:8,color:"#9ca3af",fontSize:18}}>+</span>
                {lang==="PT"?"Nova banca":"New bankroll"} ({bankrolls.length}/{MAX_BANKROLLS})
              </button>
            )}

            <div style={{flex:1}}/>

            {br?.subscribed && (
              <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 12px",marginTop:16,fontSize:12,color:"#15803d",fontWeight:600,textAlign:"center"}}>{tx("activePlan")}</div>
            )}
            <button style={{...S.btnGhost,marginTop:10,fontSize:12,border:"1.5px solid #e5e7eb",color:"#6b7280",background:"transparent"}} onClick={()=>supabase.auth.signOut()}>{tx("logout")}</button>
          </div>
        </div>
      )}

      {showNewBR && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:400,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#111827"}}>{lang==="PT"?"Nova Banca":"New Bankroll"}</h3>
              <button style={{background:"none",border:"none",color:"#9ca3af",fontSize:22,cursor:"pointer"}} onClick={()=>setShowNewBR(false)}>×</button>
            </div>
            <BRForm form={brForm} setForm={setBRForm} showReset={false} lang={lang}/>
            <button style={{...S.btnPrimary,marginTop:16}} onClick={()=>handleCreateBR(false)}>Criar banca</button>
          </div>
        </div>
      )}

      {showEditBR && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:400,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#111827"}}>{lang==="PT"?"Editar Banca":"Edit Bankroll"}</h3>
              <button style={{background:"none",border:"none",color:"#9ca3af",fontSize:22,cursor:"pointer"}} onClick={()=>setShowEditBR(false)}>×</button>
            </div>
            <BRForm form={brForm} setForm={setBRForm} showReset={true} lang={lang}/>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button style={{...S.btnPrimary,flex:1}} onClick={()=>handleCreateBR(true)}>{lang==="PT"?"Guardar":"Save"}</button>
              <button style={{padding:"13px 16px",border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}} onClick={()=>deleteBankroll(editBRTarget?.id)}>🗑</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:440,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#111827"}}>{editBet?tx("editRecord"):`${sc.icon} ${tx("newRecord")}`}</h3>
              <button style={{background:"none",border:"none",color:"#9ca3af",fontSize:22,cursor:"pointer"}} onClick={()=>{setShowForm(false);setEditBet(null);setForm(emptyForm);}}>×</button>
            </div>

            {!editBet && (
              <div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <button style={{flex:1,padding:"7px",border:`1px solid ${betType==="single"?sc.color:"#e5e7eb"}`,borderRadius:8,background:betType==="single"?sc.color:"#f9fafb",color:betType==="single"?"#fff":"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setBetType("single")}>{tx("single")}</button>
                  <button style={{flex:1,padding:"7px",border:`1px solid ${betType==="multiple"?sc.color:"#e5e7eb"}`,borderRadius:8,background:betType==="multiple"?sc.color:"#f9fafb",color:betType==="multiple"?"#fff":"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setBetType("multiple")}>{tx("multiple")}</button>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button style={{flex:1,padding:"7px",border:`1px solid ${formMode==="immediate"?sc.color:"#e5e7eb"}`,borderRadius:8,background:formMode==="immediate"?sc.color:"#f9fafb",color:formMode==="immediate"?"#fff":"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setFormMode("immediate")}>{tx("immediate")}</button>
                  <button style={{flex:1,padding:"7px",border:`1px solid ${formMode==="pending"?sc.color:"#e5e7eb"}`,borderRadius:8,background:formMode==="pending"?sc.color:"#f9fafb",color:formMode==="pending"?"#fff":"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setFormMode("pending")}>{tx("leavePending")}</button>
                </div>
              </div>
            )}

            <label style={S.label}>{lang==="PT"?"Data da aposta":"Bet date"}</label>
            <input type="date" style={S.input} max={today()} value={form.betDate||today()} onChange={e=>setForm(f=>({...f,betDate:e.target.value}))}/>

            <label style={S.label}>{lang==="PT"?"Estratégia (opcional)":"Strategy (optional)"}</label>
            <input style={S.input} list="strategy-suggestions" placeholder={lang==="PT"?"ex: ATP, Liga Principal...":"e.g. ATP, Main League..."} value={form.strategy} onChange={e=>setForm(f=>({...f,strategy:e.target.value}))}/>
            <datalist id="strategy-suggestions">
              {(SPORTS[br?.sport==="Geral"?(betSport||"Outros"):(br?.sport||"Ténis")]?.strategies||[]).map(s=><option key={s} value={s}/>)}
            </datalist>

            {br?.sport==="Geral" && (
              <div>
                <label style={{...S.label,color:"#111827"}}>{lang==="PT"?"Desporto":"Sport"}</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4,marginBottom:4}}>
                  {Object.keys(SPORTS).filter(s=>s!=="Geral").map(s=>(
                    <button key={s} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 10px",border:`1px solid ${betSport===s?SPORTS[s].color:"#e5e7eb"}`,borderRadius:8,background:betSport===s?SPORTS[s].color+"15":"#f9fafb",color:betSport===s?SPORTS[s].color:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:700}} onClick={()=>{setBetSport(s);setForm(f=>({...f,market:SPORTS[s].markets[0]}));}}>
                      <span>{SPORTS[s].icon}</span><span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label style={{...S.label,color:"#111827"}}>{betType==="multiple"?"Nome da múltipla":tx("event")}</label>
            <input style={S.input} placeholder={betType==="multiple"?lang==="PT"?"ex: Múltipla Ténis 3 jogos":"e.g. Tennis Multi 3 games":lang==="PT"?"ex: Sinner vs Alcaraz":"e.g. Sinner vs Alcaraz"} value={form.event} onChange={e=>setForm(f=>({...f,event:e.target.value}))}/>
            {betType==="multiple" && (
              <div>
                <label style={{...S.label,color:"#111827"}}>{lang==="PT"?"Seleções (uma por linha)":"Selections (one per line)"}</label>
                <textarea style={{...S.input,height:80,resize:"none",fontFamily:"inherit"}} placeholder={lang==="PT"?"ex: Sinner a ganhar":"e.g. Sinner to win"} value={form.selections||""} onChange={e=>{const v=e.target.value;setForm(f=>({...f,selections:v,selection:v.split(/\r?\n/).filter(Boolean).join(" + ")}));}}/>
              </div>
            )}

            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1}}>
                <label style={{...S.label,color:"#111827"}}>{tx("odd")}</label>
                <input style={S.input} type="number" step="0.01" min="1.01" placeholder="1.85" value={form.odd} onChange={e=>setForm(f=>({...f,odd:e.target.value}))}/>
              </div>
              <div style={{flex:1}}>
                <label style={{...S.label,color:"#111827"}}>{tx("units")}</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                  {[0.25,0.5,0.75,1,1.25,1.5,1.75,2,2.5,3].map(u=>(
                    <button key={u} style={{padding:"8px 6px",border:`1px solid ${Number(form.units)===u?sc.color:"#e5e7eb"}`,borderRadius:8,background:Number(form.units)===u?sc.color:"#f9fafb",color:Number(form.units)===u?"#fff":"#9ca3af",cursor:"pointer",fontSize:12,fontWeight:700,minWidth:"18%"}} onClick={()=>setForm(f=>({...f,units:u}))}>{u}</button>
                  ))}
                </div>
              </div>
            </div>

            {form.odd && parseFloat(form.odd)>1 && (
              <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,border:`1px solid ${sc.color}33`,background:sc.color+"08",borderRadius:8,padding:"10px 12px",fontSize:13,marginTop:8}}>
                <span>{tx("stake")}: <strong style={{color:sc.color}}>{fmt(unitVal*(parseFloat(form.units)||1))}</strong></span>
                <span style={{marginLeft:"auto"}}>{lang==="PT"?"Retorno":"Return"}: <strong style={{color:"#059669"}}>{fmt(unitVal*(parseFloat(form.units)||1)*parseFloat(form.odd))}</strong></span>
              </div>
            )}

            {betType==="single" && (
              <div>
                <label style={{...S.label,color:"#111827"}}>{tx("market")}</label>
                <select style={S.input} value={form.market} onChange={e=>setForm(f=>({...f,market:e.target.value}))}>
                  {markets.map(m=><option key={m}>{m}</option>)}
                </select>
                <label style={{...S.label,color:"#111827"}}>{tx("selection")}</label>
                <input style={S.input} placeholder="ex: Sinner / Over 22.5 Games" value={form.selection} onChange={e=>setForm(f=>({...f,selection:e.target.value}))}/>
              </div>
            )}

            {(formMode==="immediate"||editBet) && (
              <div>
                <label style={{...S.label,color:"#111827"}}>{tx("result")}</label>
                <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                  {[["WIN","✓ Green","#059669","#f0fdf4","#bbf7d0"],["LOSS","✗ Red","#dc2626","#fef2f2","#fca5a5"],["PENDING",tx("pending"),"#7c3aed","#faf5ff","#c4b5fd"],["CASHOUT","💰 Cash","#2563eb","#eff6ff","#93c5fd"],["VOID","Void","#92400e","#fefce8","#fde68a"]].map(([r,l,c,bg,border])=>(
                    <button key={r} style={{flex:1,minWidth:"30%",padding:"8px 4px",borderRadius:8,border:`1px solid ${form.result===r?c:border}`,background:form.result===r?bg:"#fff",color:form.result===r?c:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:700}} onClick={()=>setForm(f=>({...f,result:r}))}>{l}</button>
                  ))}
                </div>
                {form.result==="CASHOUT" && (
                  <div>
                    <label style={{...S.label,color:"#111827"}}>{lang==="PT"?"Valor cashout":"Cashout value"}</label>
                    <input style={S.input} type="number" placeholder="ex: 12.50" value={form.cashoutVal} onChange={e=>setForm(f=>({...f,cashoutVal:e.target.value}))}/>
                  </div>
                )}
              </div>
            )}

            <label style={{...S.label,color:"#111827"}}>{tx("notes")}</label>
            <input style={S.input} placeholder={lang==="PT"?"Raciocínio, contexto...":"Reasoning, context..."} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
            <button style={{...S.btnPrimary,marginTop:18,background:sc.color,border:"none"}} onClick={handleSaveBet}>{editBet?tx("saveChanges"):tx("saveRecord")}</button>
          </div>
        </div>
      )}

      <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"#fff",borderBottom:"1px solid #f3f4f6",position:"sticky",top:0,zIndex:10,boxShadow:"0 1px 0 #f0f0f0"}}>
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
          {isInTrial && !isAdmin && <span style={{borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:600,color:"#92400e",background:"#f8f9fa",border:"1px solid #e9ecef",cursor:"pointer"}} onClick={()=>setDrawerOpen(true)}>{trialLeft}d ⏰</span>}
          <span style={{borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,color:"#6b7280",background:"#f3f4f6",border:"1px solid #e5e7eb"}}>{br?.stake_mode==="fixed"?"🔒 Fixa":"📈 Var"}</span>
          <span style={{borderRadius:6,padding:"3px 10px",fontSize:13,fontWeight:800,color:sc.color,background:sc.color+"15",border:`1px solid ${sc.color}33`}}>{fmt(currentBR)}</span>
        </div>
      </header>

      {isInTrial && trialLeft<=3 && !isAdmin && (
        <div style={{background:"#111827",padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:"#e5e7eb",fontWeight:600}}>⏰ Trial termina em {trialLeft} {trialLeft===1?"dia":"dias"}</span>
          <a href={STRIPE_ANNUAL} target="_blank" rel="noreferrer" style={{fontSize:11,fontWeight:800,textDecoration:"none",background:"#fff",color:"#111827",padding:"4px 10px",borderRadius:6}}>€{PROMO_ANNUAL}/ano →</a>
        </div>
      )}

      <nav style={{display:"flex",background:"#fff",borderBottom:"1px solid #f3f4f6",overflowX:"auto",scrollbarWidth:"none"}}>
        {[["dashboard",(I18N[lang]||I18N.PT).tabs[0]],["diary",(I18N[lang]||I18N.PT).tabs[1]],["report",(I18N[lang]||I18N.PT).tabs[2]],["chart",(I18N[lang]||I18N.PT).tabs[3]],["ai",(I18N[lang]||I18N.PT).tabs[4]],["sobre",(I18N[lang]||I18N.PT).tabs[5]]].concat(isAdmin?[["admin","Admin"]]:[]).map(([v,l])=>(
          <button key={v} style={{flex:1,padding:"11px 4px",border:"none",borderBottom:`2px solid ${tab===v?sc.color:"transparent"}`,background:"transparent",color:tab===v?sc.color:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}} onClick={()=>setTab(v)}>{l}</button>
        ))}
      </nav>

      <main style={{maxWidth:680,margin:"0 auto",padding:"14px 12px"}}>

        {tab==="dashboard" && (
          <div>
            <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:20,marginBottom:10,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>{tx("bankroll")}</div>
                  <div style={{fontSize:34,fontWeight:900,color:"#111827",letterSpacing:"-1.5px",lineHeight:1}}>{fmt(currentBR)}</div>
                  <div style={{fontSize:13,marginTop:6,color:currentBR>=(br?.bankroll||0)?"#059669":"#dc2626",fontWeight:600}}>{fmtPct(((currentBR-(br?.bankroll||0))/(br?.bankroll||1))*100)} {lang==="PT"?"desde o início":"since start"}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>{tx("pnl")}</div>
                  <div style={{fontSize:22,fontWeight:800,color:stats.pnl>=0?"#059669":"#dc2626",letterSpacing:"-1px"}}>{fmtP(stats.pnl)}</div>
                  <div style={{fontSize:12,color:stats.roi>=0?"#059669":"#dc2626",fontWeight:600,marginTop:4}}>ROI {fmtPct(stats.roi)}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,borderTop:"1px solid #fff",paddingTop:14}}>
                {[[tx("strike"),stats.strikeRate.toFixed(1)+"%"],[tx("avgOdd"),stats.avgOdd.toFixed(2)],[tx("unit"),fmt(unitVal)],[tx("pending"),stats.pending]].map(([l,v])=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:15,fontWeight:800,color:"#111827"}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[[tx("wins"),stats.wins,"#059669","#f0fdf4"],[tx("losses"),stats.losses,"#dc2626","#fef2f2"],[tx("total"),stats.settled,"#374151","#f9fafb"]].map(([l,v,c,bg])=>(
                <div key={l} style={{background:bg,border:`1px solid ${c}22`,borderRadius:14,padding:"12px 10px",textAlign:"center",boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontSize:10,color:c,textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>

            <DashboardQuote/>

            {stats.pending>0 && (
              <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:16,marginBottom:10,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>{tx("pending").toUpperCase()} · {stats.pending}</div>
                {bets.filter(b=>b.result==="PENDING").map(b=>(
                  <div key={b.id} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f3f4f6",gap:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.event||b.selection}</div>
                      {b.event && b.selection && <div style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.selection}</div>}
                      <div style={{fontSize:11,color:"#111827"}}>@{b.odd.toFixed(2)} · {fmt(b.stake)}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button style={S.bWin} onClick={()=>settleBet(b.id,"WIN")}>✓</button>
                      <button style={S.bLoss} onClick={()=>settleBet(b.id,"LOSS")}>✗</button>
                      <button style={{padding:"5px 8px",borderRadius:8,border:"1px solid #fff",background:"transparent",color:"#d1d5db",cursor:"pointer",fontSize:13}} onClick={()=>openEditBet(b)}>✏️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="diary" && (
          <div>
            <div style={{display:"flex",alignItems:"center",background:"#fff",border:"1px solid #fff",borderRadius:12,padding:"10px 14px",marginBottom:10,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
              <button style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#111827",flexShrink:0}} onClick={()=>{ const dt=new Date(diaryDate+"T00:00:00"); dt.setDate(dt.getDate()-1); setDiaryDate(padDate(dt)); }}>‹</button>
              <div style={{flex:1,textAlign:"center",fontSize:13,fontWeight:700,color:"#111827"}}>{fmtDate(diaryDate)}</div>
              <button style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#111827",flexShrink:0}} onClick={()=>{ const dt=new Date(diaryDate+"T00:00:00"); dt.setDate(dt.getDate()+1); setDiaryDate(padDate(dt)); }}>›</button>
            </div>

            {availableStrategies.length>0 && (
              <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:10,paddingBottom:2}}>
                <button style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:`1px solid ${diaryStrategyFilter==="all"?sc.color:"#e5e7eb"}`,background:diaryStrategyFilter==="all"?sc.color:"#fff",color:diaryStrategyFilter==="all"?"#fff":"#6b7280",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setDiaryStrategyFilter("all")}>{lang==="PT"?"Todas":"All"}</button>
                {availableStrategies.map(s=>(
                  <button key={s} style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:`1px solid ${diaryStrategyFilter===s?sc.color:"#e5e7eb"}`,background:diaryStrategyFilter===s?sc.color:"#fff",color:diaryStrategyFilter===s?"#fff":"#6b7280",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setDiaryStrategyFilter(s)}>{s}</button>
                ))}
              </div>
            )}

            <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:16,marginBottom:10,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>{tx("dayProfit")}</div>
                  <div style={{fontSize:26,fontWeight:900,color:diaryPnl>=0?"#059669":"#dc2626",letterSpacing:"-1px"}}>{fmtP(diaryPnl)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>{tx("records")}</div>
                  <div style={{fontSize:26,fontWeight:900,color:"#111827"}}>{diaryBets.length}</div>
                </div>
              </div>
            </div>

            {diaryBets.length===0 && (
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <div style={{fontSize:36,marginBottom:8}}>{sc.icon}</div>
                <div style={{fontSize:14,color:"#111827"}}>{tx("noRecords")}</div>
                <div style={{fontSize:12,color:"#d1d5db",marginTop:4}}>{tx("addHint")}</div>
              </div>
            )}

            {diaryBets.map(b=>{
              const isWin=b.result==="WIN",isLoss=b.result==="LOSS",isPending=b.result==="PENDING";
              const borderColor=isWin?"#059669":isLoss?"#dc2626":isPending?"#7c3aed":"#d1d5db";
              return (
                <div key={b.id} style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:14,marginBottom:8,boxShadow:"0 1px 2px rgba(0,0,0,.04)",borderLeft:`3px solid ${borderColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{b.event||b.selection}</div>
                        {b.strategy && <span style={{fontSize:10,fontWeight:700,color:sc.color,background:sc.color+"15",border:`1px solid ${sc.color}33`,borderRadius:10,padding:"1px 8px"}}>{b.strategy}</span>}
                      </div>
                      {b.event && <div style={{fontSize:12,color:"#6b7280",marginTop:1}}>{b.market} · <strong style={{color:"#111827"}}>{b.selection}</strong></div>}
                      {!b.event && b.market && <div style={{fontSize:12,color:"#6b7280",marginTop:1}}>{b.market}</div>}
                      <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>ODD {b.odd.toFixed(2)} · Stake {fmt(b.stake)}</div>
                      {b.notes && <div style={{fontSize:11,color:"#9ca3af",fontStyle:"italic",marginTop:2}}>"{b.notes}"</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                      <div style={{fontSize:13,fontWeight:800,color:isWin?"#059669":isLoss?"#dc2626":isPending?"#7c3aed":b.result==="CASHOUT"?"#2563eb":"#9ca3af"}}>
                        {isWin?fmtP(b.stake*(b.odd-1)):isLoss?fmtP(-b.stake):isPending?tx("pending"):b.result==="CASHOUT"?fmtP((b.cashout_val||0)-b.stake):"—"}
                      </div>
                      {isWin && <div style={{fontSize:11,color:"#111827"}}>Retorno {fmt(b.stake*b.odd)}</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:10,paddingTop:10,borderTop:"1px solid #fff"}}>
                    {isPending && (
                      <div style={{display:"flex",gap:6,flex:1,flexWrap:"wrap"}}>
                        <button style={S.bWin} onClick={()=>settleBet(b.id,"WIN")}>{tx("settleWin")}</button>
                        <button style={S.bLoss} onClick={()=>settleBet(b.id,"LOSS")}>{tx("settleLoss")}</button>
                        <button style={S.bCash} onClick={()=>{const v=parseFloat(prompt("Valor do cashout:"));if(v>=0)settleBet(b.id,"CASHOUT",v);}}>{lang==="PT"?"Cash":"Cash"}</button>
                        <button style={S.bVoid} onClick={()=>settleBet(b.id,"VOID")}>{lang==="PT"?"Void":"Void"}</button>
                      </div>
                    )}
                    <button style={{padding:"5px 8px",borderRadius:8,border:"1px solid #fff",background:"transparent",color:"#d1d5db",cursor:"pointer",fontSize:13,marginLeft:"auto"}} onClick={()=>openEditBet(b)}>✏️</button>
                    <button style={{padding:"5px 8px",borderRadius:8,border:"1px solid #fff",background:"transparent",color:"#d1d5db",cursor:"pointer",fontSize:13}} onClick={()=>deleteBet(b.id)}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==="report" && (
          <div>
            <div style={{display:"flex",alignItems:"center",background:"#fff",border:"1px solid #fff",borderRadius:12,padding:"10px 14px",marginBottom:10,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
              <button style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#111827",flexShrink:0}} onClick={()=>{ const d=new Date(reportMonth+"-01"); d.setMonth(d.getMonth()-1); setReportMonth(d.toISOString().slice(0,7)); }}>‹</button>
              <div style={{flex:1,textAlign:"center",fontSize:14,fontWeight:700,color:"#111827"}}>{monthLabel(reportMonth+"-01")}</div>
              <button style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#111827",flexShrink:0}} onClick={()=>{ const d=new Date(reportMonth+"-01"); d.setMonth(d.getMonth()+1); setReportMonth(d.toISOString().slice(0,7)); }}>›</button>
            </div>

            {availableStrategies.length>0 && (
              <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:10,paddingBottom:2}}>
                <button style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:`1px solid ${reportStrategyFilter==="all"?sc.color:"#e5e7eb"}`,background:reportStrategyFilter==="all"?sc.color:"#fff",color:reportStrategyFilter==="all"?"#fff":"#6b7280",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setReportStrategyFilter("all")}>{lang==="PT"?"Todas":"All"}</button>
                {availableStrategies.map(s=>(
                  <button key={s} style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:`1px solid ${reportStrategyFilter===s?sc.color:"#e5e7eb"}`,background:reportStrategyFilter===s?sc.color:"#fff",color:reportStrategyFilter===s?"#fff":"#6b7280",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>setReportStrategyFilter(s)}>{s}</button>
                ))}
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[[tx("initialBR"),fmt(parseFloat(br?.bankroll||0))],[tx("finalBR"),fmt(currentBR)],[tx("entries"),reportBets.length]].map(([l,v])=>(
                <div key={l} style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:12,textAlign:"center",boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#111827"}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[[tx("wins"),reportWins,"#059669"],[tx("losses"),reportLoss,"#dc2626"],[(lang==="PT"?lang==="PT"?"% Acertos":"% Wins":"% Wins"),reportWins+reportLoss>0?((reportWins/(reportWins+reportLoss))*100).toFixed(1)+"%":"—","#374151"]].map(([l,v,c])=>(
                <div key={l} style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:12,textAlign:"center",boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>{l}</div>
                  <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div style={{background:reportPnl>=0?"#f0fdf4":"#fef2f2",border:`1px solid ${reportPnl>=0?"#bbf7d0":"#fca5a5"}`,borderRadius:14,padding:16,textAlign:"center"}}>
                <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>{tx("monthProfit")}</div>
                <div style={{fontSize:22,fontWeight:900,color:reportPnl>=0?"#059669":"#dc2626"}}>{fmtP(reportPnl)}</div>
              </div>
              <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:16,textAlign:"center",boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>{tx("monthROI")}</div>
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
                <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:16,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>{tx("perDay")}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,borderBottom:"1px solid #fff",paddingBottom:6,marginBottom:6}}>
                    {[tx("day"),tx("invested"),tx("returned"),tx("profit")].map(h=><div key={h} style={{fontSize:9,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,textAlign:"center"}}>{h}</div>)}
                  </div>
                  {Object.entries(byDay).sort(([a],[b])=>a>b?1:-1).map(([d,v])=>(
                    <div key={d} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,padding:"6px 0",borderBottom:"1px solid #f3f4f6"}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#111827",textAlign:"center"}}>{new Date(d+"T00:00:00").getDate()}</div>
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

        {tab==="chart" && (
          <div>
            <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:20,marginBottom:10,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
              <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>{tx("evolution")}</div>
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
                  <div style={{fontSize:13,color:"#111827"}}>Adiciona registos para ver a evolução.</div>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>{tx("start")}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{fmt(parseFloat(br?.bankroll||0))}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>{tx("current")}</div>
                  <div style={{fontSize:14,fontWeight:700,color:currentBR>=parseFloat(br?.bankroll||0)?"#059669":"#dc2626"}}>{fmt(currentBR)}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:4}}>{tx("diff")}</div>
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
                <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:16,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>{tx("perMonth")}</div>
                  {entries.map(([m,v])=>(
                    <div key={m} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,color:"#111827"}}>{monthLabel(m+"-01")}</span>
                        <span style={{fontSize:13,fontWeight:700,color:v>=0?"#059669":"#dc2626"}}>{fmtP(v)}</span>
                      </div>
                      <div style={{height:8,background:"#f7f8fa",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(Math.abs(v)/maxAbs)*100}%`,background:v>=0?sc.color:"#dc2626",borderRadius:4}}/>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {tab==="ai" && (
          <div>
            <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:20,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <span style={{fontSize:28}}>🤖</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:800,color:"#111827"}}>{tx("aiTitle")} · {br?.sport}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700}}>Análises</div>
                  <div style={{fontSize:16,fontWeight:900,color:sc.color}}>{isAdmin?"∞":aiUsage+"/"+(br?.plan==="annual"?AI_LIMIT_ANNUAL:AI_LIMIT_MONTHLY)}</div>
                  <div style={{fontSize:10,color:"#111827"}}>{lang==="PT"?"este mês":"this month"}</div>
                </div>
              </div>
              <p style={{color:"#6b7280",fontSize:13,lineHeight:1.6,marginBottom:12}}>
                Análise personalizada do teu histórico com score de saúde da banca, identificação dos melhores mercados e recomendações.
              </p>
              <div style={{background:"#f8f9fa",border:"1px solid #e9ecef",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>💡</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#111827",marginBottom:3}}>{lang==="PT"?"Análise mais precisa":"More precise analysis"}</div>
                  <div style={{fontSize:12,color:"#111827",lineHeight:1.5}}>{lang==="PT"?"Preenche o campo":"Fill in the"} <strong>{tx("notes").replace(" (opcional)","").replace(" (optional)","")}</strong> {lang==="PT"?"nas apostas com contexto extra":"field in bets with extra context"} — ex: <em>{lang==="PT"?'"Alcaraz @1.23, terra"':' "Alcaraz @1.23, clay"'}</em> {lang==="PT"?"ou":"or"} <em>'indoor, top 10'</em>. {lang==="PT"?"A IA usa esse contexto para identificar padrões cruzados.":"The AI uses this context to identify cross-patterns."}</div>
                </div>
              </div>

              {!br?.subscribed && !isAdmin && (
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#15803d",marginBottom:10}}>🔒 Funcionalidade exclusiva para subscritores</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <a href={STRIPE_MONTHLY} target="_blank" rel="noreferrer" style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 12px",textDecoration:"none"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>Plano Mensal</div>
                        <div style={{fontSize:11,color:"#111827"}}>{AI_LIMIT_MONTHLY} análises por mês · €{PROMO_MONTHLY}/mês</div>
                      </div>
                      <div style={{fontSize:12,fontWeight:700,color:"#15803d",flexShrink:0}}>Subscrever →</div>
                    </a>
                    <a href={STRIPE_ANNUAL} target="_blank" rel="noreferrer" style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#111827",borderRadius:8,padding:"10px 12px",textDecoration:"none"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Plano Anual ⭐</div>
                        <div style={{fontSize:11,color:"#111827"}}>{AI_LIMIT_ANNUAL} análises por mês · €{PROMO_ANNUAL}/ano</div>
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
                    try {
                      const fb=await getAIFeedback(bets,stats,currentBR,br?.sport);
                      if(fb&&!fb.error){setFeedback(fb);setAiUsage(u=>u+1);}
                      else{setFeedback({error:fb?.error||"Erro desconhecido"});}
                    } catch(e){
                      setFeedback({error:e.message});
                    } finally {
                      setLoadingFB(false);
                    }
                  }}
                  disabled={loadingFB||stats.settled<3}>
                  {loadingFB?tx("analyzing"):stats.settled<3?(lang==="PT"?`Precisas de ${3-stats.settled} registo(s) liquidados`:`Need ${3-stats.settled} more settled bet(s)`):tx("analyzeNow")}
                </button>
              )}
            </div>

            {loadingFB && (
              <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:40,textAlign:"center",boxShadow:"0 1px 2px rgba(0,0,0,.04)",marginTop:10}}>
                <div style={{...S.spinner,border:"2px solid #e5e7eb",borderTop:"2px solid #111827"}}/>
                <div style={{fontSize:13,color:"#9ca3af",marginTop:16}}>{lang==="PT"?lang==="PT"?"A analisar o teu histórico...":"Analysing your history...":"Analysing your history..."}</div>
              </div>
            )}

            {feedback?.error && !loadingFB && (
              <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"12px",fontSize:12,color:"#dc2626",marginTop:10}}>
                <strong>Erro:</strong> {feedback.error}
              </div>
            )}

            {!feedback && !loadingFB && (
              <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                {(lang==="PT"?["Score de saúde da banca","Identificação dos melhores mercados","Alertas de risco personalizados","Recomendações baseadas no histórico"]:["Bankroll health score","Best markets identification","Personalised risk alerts","Recommendations based on history"]).map(f=>(
                  <div key={f} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1px solid #fff",borderRadius:10,padding:"10px 14px",boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                    <span style={{color:sc.color,fontWeight:700}}>→</span>
                    <span style={{fontSize:13,color:"#111827"}}>{f}</span>
                  </div>
                ))}
              </div>
            )}

            {feedback && !feedback.error && !loadingFB && (
              <div>
                <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:20,textAlign:"center",boxShadow:"0 1px 2px rgba(0,0,0,.04)",marginTop:10}}>
                  <div style={{width:90,height:90,borderRadius:"50%",border:`3px solid ${sc.color}44`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto",background:"#f7f8fa"}}>
                    <div style={{fontSize:32,fontWeight:900,color:(feedback.score||0)>=7?"#059669":(feedback.score||0)>=4?"#d97706":"#dc2626"}}>{feedback.score||"—"}</div>
                    <div style={{fontSize:10,color:"#111827"}}>/10</div>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:"#111827",marginTop:12}}>{feedback.headline||""}</div>
                </div>
                {feedback.warnings?.length>0 && (
                  <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:14,padding:16,marginTop:10}}>
                    <div style={{fontSize:10,color:"#92400e",textTransform:"uppercase",letterSpacing:1,marginBottom:10,fontWeight:800}}>{tx("alerts")}</div>
                    {feedback.warnings.map((w,i)=><p key={i} style={{color:"#78350f",fontSize:13,margin:"6px 0",lineHeight:1.5}}>{w}</p>)}
                  </div>
                )}
                <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:16,marginTop:10,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>{tx("insights")}</div>
                  {(feedback.insights||[]).map((ins,i)=>(
                    <div key={i} style={{display:"flex",padding:"8px 0",borderBottom:"1px solid #fff"}}>
                      <span style={{color:sc.color,marginRight:10,flexShrink:0,fontWeight:700}}>→</span>
                      <span style={{color:"#111827",fontSize:13,lineHeight:1.5}}>{ins}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:16,marginTop:10,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
                  <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:14,fontWeight:800}}>{tx("recommendations")}</div>
                  {(feedback.tips||[]).map((t,i)=>(
                    <div key={i} style={{display:"flex",padding:"8px 0",borderBottom:"1px solid #fff"}}>
                      <span style={{color:"#059669",marginRight:10,flexShrink:0,fontWeight:700}}>✓</span>
                      <span style={{color:"#111827",fontSize:13,lineHeight:1.5}}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="sobre" && (
          <div>
            <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:24,textAlign:"center",boxShadow:"0 1px 2px rgba(0,0,0,.04)",marginBottom:10}}>
              <div style={{fontSize:48,marginBottom:12}}>📊</div>
              <div style={{fontSize:20,fontWeight:900,color:"#111827",marginBottom:4}}>BankrollPro</div>
              <div style={{fontSize:13,color:"#9ca3af",marginBottom:16}}>Gestão profissional de banca desportiva</div>
              <div style={{background:"#f7f8fa",border:"1px solid #fff",borderRadius:10,padding:"12px 16px",marginBottom:16,textAlign:"left"}}>
                <div style={{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:8}}>Desenvolvido por</div>
                <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>BankrollPro Team</div>
                <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Todos os direitos reservados</div>
              </div>
              <div style={{background:"#f7f8fa",border:"1px solid #fff",borderRadius:10,padding:"12px 16px",marginBottom:20,textAlign:"left"}}>
                <div style={{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:8}}>Plano atual</div>
                <div style={{fontSize:14,fontWeight:700,color:br?.subscribed?"#059669":"#d97706"}}>{br?.subscribed?lang==="PT"?`Plano ${br?.plan==="annual"?"Anual":"Mensal"} · Ativo`:`${br?.plan==="annual"?"Annual":"Monthly"} Plan · Active`:lang==="PT"?`Trial · ${trialLeft} dias restantes`:`Trial · ${trialLeft} days remaining`}</div>
                {br?.subscribed&&<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Análises IA: {br?.plan==="annual"?AI_LIMIT_ANNUAL:AI_LIMIT_MONTHLY}/mês</div>}
              </div>
              <a href={`mailto:tome.luis.pt@gmail.com?subject=Suporte BankrollPro&body=Olá BankrollPro Team,%0A%0A`}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#111827",color:"#fff",textDecoration:"none",padding:"14px",borderRadius:10,fontSize:14,fontWeight:700}}>
                ✉️ Contactar Suporte
              </a>
            </div>

            <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:16,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
              <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:14}}>{lang==="PT"?"O que está incluído":"What's included"}</div>
              {[
                ["📊","Múltiplas bancas","Até 3 bancas separadas por desporto"],
                ["📅","Diário de apostas","Registo por dia — Green/Red/Cashout/Void — imediato ou pendente"],
                ["📈","Relatório mensal","Lucro, ROI, % acertos, investido e retorno — por dia e por mês"],
                ["📉","Gráfico de evolução","Curva da banca e resultados por mês em barras"],
                ["🎯","Simples e múltiplas","Unidades configuráveis, cálculo automático de stake e retorno"],
                ["📋","Importação Telegram","Cola o texto do grupo e importa apostas automaticamente"],
                ["🤖","Análise IA","Score de saúde, padrões por mercado e recomendações reais"],
                ["🏅","Múltiplos desportos","Ténis, Futebol, Basquetebol, MMA, Hóquei, Rugby e mais"],
                ["💱","Múltiplas moedas","€, R$ e $"],
                ["🚫","Sem anúncios","Experiência limpa e focada"],
              ].map(([ico,t,d])=>(
                <div key={t} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <span style={{fontSize:20,flexShrink:0}}>{ico}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{t}</div>
                    <div style={{fontSize:12,color:"#111827"}}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="admin" && isAdmin && (
          <AdminPanel supabase={supabase} fmt={fmt} daysLeft={daysLeft}/>
        )}

      </main>

      <button style={{position:"fixed",bottom:90,right:18,width:44,height:44,borderRadius:"50%",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,.15)",zIndex:20,fontSize:18,background:"#374151"}} onClick={()=>{setShowImport(true);setImportText("");setImportBets([]);setImportDate(today());}}>📋</button>

      <button style={{position:"fixed",bottom:24,right:18,width:56,height:56,borderRadius:"50%",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,.2)",zIndex:20,fontSize:28,lineHeight:1,background:sc.color}} onClick={()=>{setForm(emptyForm);setEditBet(null);setBetSport("");setShowForm(true);}}>+</button>

    </div>
  );
}

function BRForm({ form, setForm, showReset, lang="PT", T={card:"#fff",cardBorder:"#e5e7eb",inputBg:"#fff",inputBorder:"#e5e7eb",text:"#111827",text2:"#6b7280",bg3:"#f9fafb"} }) {
  return (
    <div>
      <label style={{...S.label,color:"#111827"}}>{lang==="PT"?"Nome da banca":"Bankroll name"}</label>
      <input style={S.input} placeholder="ex: Ténis Principal" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
      <label style={{...S.label,color:"#111827"}}>{lang==="PT"?"Desporto":"Sport"}</label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:4}}>
        {Object.keys(SPORTS).map(s=>(
          <button key={s} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",border:`1px solid ${form.sport===s?SPORTS[s].color:"#e5e7eb"}`,borderRadius:10,background:"#f7f8fa",cursor:"pointer",color:form.sport===s?SPORTS[s].color:"#9ca3af",fontSize:10,fontWeight:600}} onClick={()=>setForm(f=>({...f,sport:s}))}>
            <span style={{fontSize:20}}>{SPORTS[s].icon}</span>
            <span>{s}</span>
          </button>
        ))}
      </div>
      <label style={{...S.label,color:"#111827"}}>{lang==="PT"?`Bankroll ${showReset?"(novo valor se repuser)":""} (€)`:`Bankroll ${showReset?"(reset value)":""} (€)`}</label>
      <input style={S.input} type="number" placeholder="ex: 500" value={form.bankroll} onChange={e=>setForm(f=>({...f,bankroll:e.target.value}))}/>

      <label style={{...S.label,color:"#111827"}}>{lang==="PT"?"Tipo de stake":"Stake type"}</label>
      <div style={{display:"flex",gap:8,marginTop:4,marginBottom:4}}>
        <button style={{flex:1,padding:"10px 8px",border:`1px solid ${(form.stake_mode||"variable")==="variable"?"#111827":"#e5e7eb"}`,borderRadius:10,background:(form.stake_mode||"variable")==="variable"?"#111827":"#f9fafb",color:(form.stake_mode||"variable")==="variable"?"#fff":"#6b7280",cursor:"pointer",fontSize:12,fontWeight:700,textAlign:"center"}}
          onClick={()=>setForm(f=>({...f,stake_mode:"variable"}))}>
          <div style={{fontSize:16,marginBottom:4}}>📈</div>
          <div>{lang==="PT"?"Variável":"Variable"}</div>
          <div style={{fontSize:10,fontWeight:400,marginTop:2,opacity:.8}}>{lang==="PT"?"% da banca atual":"% of current bankroll"}</div>
        </button>
        <button style={{flex:1,padding:"10px 8px",border:`1px solid ${(form.stake_mode||"variable")==="fixed"?"#111827":"#e5e7eb"}`,borderRadius:10,background:(form.stake_mode||"variable")==="fixed"?"#111827":"#f9fafb",color:(form.stake_mode||"variable")==="fixed"?"#fff":"#6b7280",cursor:"pointer",fontSize:12,fontWeight:700,textAlign:"center"}}
          onClick={()=>setForm(f=>({...f,stake_mode:"fixed"}))}>
          <div style={{fontSize:16,marginBottom:4}}>🔒</div>
          <div>{lang==="PT"?"Fixa":"Fixed"}</div>
          <div style={{fontSize:10,fontWeight:400,marginTop:2,opacity:.8}}>{lang==="PT"?"% da banca inicial":"% of initial bankroll"}</div>
        </button>
      </div>
      {(form.stake_mode||"variable")==="fixed" && (
        <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#15803d",marginBottom:4}}>
          {lang==="PT"?"A unidade mantém-se sempre baseada na banca inicial. Usa a revisão de 30 dias para a atualizar manualmente.":"The unit always stays based on the initial bankroll. Use the 30-day review to update it manually."}
        </div>
      )}

      <label style={{...S.label,color:"#111827"}}>{lang==="PT"?"Unidade (% do bankroll)":"Unit (% of bankroll)"}</label>
      <input style={S.input} type="number" step="0.5" min="0.5" max="10" value={form.unit_pct} onChange={e=>setForm(f=>({...f,unit_pct:e.target.value}))}/>
      {form.bankroll && <p style={{fontSize:12,color:"#9ca3af",margin:"6px 0 0"}}>{lang==="PT"?"1 unidade":"1 unit"} = <strong>€{((parseFloat(form.bankroll)||0)*(parseFloat(form.unit_pct)||2)/100).toFixed(2)}</strong> · {lang==="PT"?"Recomendamos 1–2%":"We recommend 1–2%"}</p>}
      {showReset && (
        <label style={{display:"flex",alignItems:"center",gap:8,marginTop:14,cursor:"pointer",fontSize:12,color:"#dc2626",fontWeight:600}}>
          <input type="checkbox" checked={form.reset||false} onChange={e=>setForm(f=>({...f,reset:e.target.checked}))} style={{width:16,height:16}}/>
          {lang==="PT"?"Repor bankroll para o valor acima":"Reset bankroll to value above"}
        </label>
      )}
    </div>
  );
}

function DashboardQuote() {
  const quote = useQuote(8000);
  return (
    <div style={{background:"linear-gradient(135deg,#f8fafc,#f1f5f9)",border:"1px solid #fff",borderRadius:14,padding:"16px 18px",marginBottom:10,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:10,left:14,fontSize:32,color:"#e2e8f0",fontFamily:"Georgia,serif",lineHeight:1}}>"</div>
      <p style={{fontSize:13,color:"#111827",lineHeight:1.6,fontStyle:"italic",margin:"0 0 10px",paddingLeft:16}}>{quote.text}</p>
      <div style={{fontSize:11,fontWeight:700,color:"#111827"}}>— {quote.author}</div>
    </div>
  );
}

function LandingQuote() {
  const quote = useQuote(8000);
  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:"16px 18px",marginBottom:20,boxShadow:"0 1px 4px rgba(0,0,0,.06)",position:"relative"}}>
      <div style={{position:"absolute",top:8,left:14,fontSize:36,color:"#f3f4f6",fontFamily:"Georgia,serif",lineHeight:1}}>"</div>
      <p style={{fontSize:13,color:"#111827",lineHeight:1.6,fontStyle:"italic",margin:"0 0 10px",paddingLeft:18}}>{quote.text}</p>
      <div style={{fontSize:11,fontWeight:700,color:"#111827"}}>— {quote.author}</div>
    </div>
  );
}

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

  if(loading) return <div style={{textAlign:"center",padding:40}}><div style={{...S.spinner,border:"2px solid #e5e7eb",borderTop:"2px solid #111827"}}/></div>;

  return (
    <div>
      <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:14}}>Painel de Administração</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {[["Total Utilizadores",data?.total,"#111827"],["Subscritores Pagos",data?.paid,"#059669"],["Em Trial",data?.trial,"#d97706"],["Trial Expirado",data?.expired,"#dc2626"]].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
            <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>{l}</div>
            <div style={{fontSize:28,fontWeight:900,color:c}}>{v||0}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#fff",border:"1px solid #fff",borderRadius:14,padding:16,boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
        <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,fontWeight:800,marginBottom:14}}>Utilizadores</div>
        {data?.users.map(u=>{
          const tl=daysLeft(u.user_trial_start||u.trial_start);
          const status=u.subscribed?"Pago":tl>0?`Trial (${tl}d)`:"Expirado";
          const sc=u.subscribed?"#059669":tl>0?"#d97706":"#dc2626";
          return (
            <div key={u.user_id} style={{padding:"12px 0",borderBottom:"1px solid #f3f4f6"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.user_name||u.email||u.user_id.slice(0,8)+"..."}</div>
                  <div style={{fontSize:11,color:"#111827"}}>{u.email&&u.user_name?u.email:""}</div>
                  <div style={{fontSize:11,color:"#111827"}}>{u.bancas} banca{u.bancas>1?"s":""} · {new Date(u.created_at).toLocaleDateString("pt-PT")}</div>
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

const S = {
  spinner: { width:26,height:26,border:"2px solid #e5e7eb",borderTop:"2px solid #111827",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto" },
  btnPrimary: { width:"100%",background:"#111827",color:"#fff",border:"none",borderRadius:10,padding:"14px",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:.3 },
  btnGhost:   { width:"100%",background:"transparent",border:"1.5px solid #e5e7eb",color:"#6b7280",borderRadius:10,padding:"12px",fontSize:13,cursor:"pointer",marginTop:4 },
  btnOutline: { background:"#fff",border:"1.5px solid #e5e7eb",color:"#111827",borderRadius:8,padding:"8px 18px",fontSize:13,cursor:"pointer",fontWeight:600 },
  label: { fontSize:11,color:"#6b7280",marginBottom:5,marginTop:14,display:"block",fontWeight:700,textTransform:"uppercase",letterSpacing:.8 },
  input: { width:"100%",background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:10,color:"#111827",padding:"12px 14px",fontSize:14,boxSizing:"border-box",outline:"none",transition:"border-color .15s" },
  bWin:  { padding:"7px 14px",borderRadius:8,border:"1.5px solid #d1fae5",background:"#ecfdf5",color:"#065f46",cursor:"pointer",fontSize:12,fontWeight:700 },
  bLoss: { padding:"7px 14px",borderRadius:8,border:"1.5px solid #fecaca",background:"#fff1f2",color:"#991b1b",cursor:"pointer",fontSize:12,fontWeight:700 },
  bCash: { padding:"7px 12px",borderRadius:8,border:"1.5px solid #bfdbfe",background:"#eff6ff",color:"#1e40af",cursor:"pointer",fontSize:12,fontWeight:700 },
  bVoid: { padding:"7px 12px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#f7f8fa",color:"#6b7280",cursor:"pointer",fontSize:12,fontWeight:700 },
};

if(typeof document!=="undefined"){
  const s=document.createElement("style");
  s.textContent=`@keyframes spin{to{transform:rotate(360deg)}} select option{background:#fff} *{-webkit-tap-highlight-color:transparent;box-sizing:border-box} body{-webkit-font-smoothing:antialiased} input:focus,select:focus{border-color:#111827!important;box-shadow:0 0 0 3px rgba(17,24,39,.08);outline:none} button:active{transform:scale(.98)} textarea:focus{border-color:#111827!important;box-shadow:0 0 0 3px rgba(17,24,39,.08);outline:none} select{color-scheme:light dark}`;
  document.head.appendChild(s);
}
