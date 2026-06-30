import { useState, useRef } from "react";

const PHASES = ["ENTRADA", "GUIÃO", "CENAS", "THUMBNAIL", "PUBLICAR", "INSTAGRAM"];

const SYS_SINGLE = `You are the lead writer for Dark Reflex — a faceless YouTube true crime/horror channel. Scripts are narrated via ElevenLabs, paired with real images, edited in CapCut.

CRITICAL: Your entire response must be ONE valid JSON object and nothing else. No preamble, no "Here is...", no explanation, no markdown code fences. The first character of your response must be { and the last character must be }. If the source material is thin or ambiguous, still produce your best complete JSON output — never respond with prose asking for clarification.

## WRITING PHILOSOPHY — Mr. Nightmare pattern (proven, high-retention)
- NO cinematic cold-open. Start with direct personal context: age, situation, location. Conversational, like someone telling you something that really happened to them. Examples of correct opening register: "It was my first year of University..." / "I'm a 21-year-old currently home for the summer..." / "When I was in high school, I was what you would call a nerd..."
- Establish normalcy FIRST — routine, place, people — before introducing the first sign of wrongness. That first sign is always small and ambiguous, never dramatic.
- Escalate gradually with PHYSICAL EVIDENCE at each stage: a sound, then a glimpse, then a confrontation, then a scare. Always ground escalation in concrete proof — muddy footprints, tape on a door, handprints on glass, a moved object. Atmosphere alone is not enough; there must be evidence.
- At the climax, switch to short, brutal sentences. "I screamed and ran for the door." "I just kept running."
- End plainly and personally. No elaborate moral, no poetic closer. A flat, human last line: "I still carry these experiences with me today." "Never take your safety for granted."
- Mark natural speech pauses with " ... " sparingly, only where a real person would pause.
- Write visually but through plain, lived detail, not metaphor. What things looked like, sounded like, felt like — stated simply.
- Name people, places, ages. Specificity creates belief.

## FIXED CHANNEL BOOKENDS — NEVER CHANGE, ALWAYS INCLUDE
Immediately after the opening personal-context line(s), insert a short block (labeled "block":"INTRODUÇÃO") that opens with exactly: "This is Dark Reflex." followed by 1 short atmospheric sentence about the channel/case.
The final block's (labeled "block":"CONCLUSÃO") last sentence must always be exactly: "Stay in the dark with me."

## SEO RULES
youtube_title: 50-60 chars, lead with searchable element, proven patterns like "The [Name] Case" or "[Topic] Horror Stories", no emojis.
youtube_description: 200-250 words, opens with hook, 8-12 natural keywords, ends with "Subscribe to Dark Reflex for more true crime investigations. Stay in the dark with me."
tags: 15-20 tags including channel name, case name, victim, location, crime type, year, broad terms.

## PRODUCTION SCENE GUIDE
Break the entire script into sequential SCENES (8-14 scenes for a single case). Each scene is a discrete visual+audio unit the editor will build in CapCut. Keep this LEAN — only flag something when it actually needs doing. Most scenes are a plain hard cut with continuing background sound; don't over-annotate.

For each scene provide:
- timestamp_in / timestamp_out: exact start-end matching the narration block it covers
- image_source: "real" if a direct image/URL exists from the source material, "generated" if it needs an AI image
- image_url: direct URL if image_source is "real" and found in source, else empty string
- scene_prompt: if image_source is "generated", a complete photorealistic image-generation prompt for this exact moment, written in plain descriptive language (works in Leonardo AI, Meta AI/Imagine, or any generator — no platform-specific flags or parameters). Describe: subject/location, mood, lighting, camera angle, film style, in full sentences. Always end with "widescreen 16:9 cinematic photograph" to set the aspect ratio in words. No faces, no gore. If image_source is "real", leave empty.
- caption: on-screen CapCut caption text for this scene, max 6 words
- effect_note: ONLY fill this if something beyond a plain hard cut should happen in THIS scene. Write the instruction in PORTUGUESE (e.g. "Zoom lento ao longo de 6s", "Flash de luz na palavra 'sangue', depois 1s de silêncio", "Fade to black — fim do vídeo", "Dip to black antes da introdução"). Leave as empty string "" for ordinary scenes that are just a hard cut with no special treatment.
- sound_change: ONLY fill this if the background sound should START or CHANGE at this scene (new track, swap, or stop). Write the instruction in PORTUGUESE but keep the CapCut search term itself in English exactly as it should be typed into the search bar. Format: "dark drone — começa aqui, continua por baixo" or "PARAR todo o som — deixar a narração respirar" or "trocar para heartbeat slow — a construir para o clímax". The English term (e.g. "dark drone", "tense ambience", "heartbeat slow", "horror riser", "wind howl", "vinyl crackle", "deep rumble", "static noise", "footsteps gravel", "clock ticking", "old tape rewind") must stay in English since that's what gets typed into CapCut's search bar — never invent fixed track names, never translate the search term itself. Leave as empty string "" if the sound from the previous scene just continues unchanged.

## OUTPUT — valid JSON only, no markdown, no backticks:
{
  "case_title": "Short punchy name",
  "hook_line": "Opening personal-context line — plain, direct, not cinematic",
  "estimated_duration": "e.g. 11:30",
  "script": [
    {"block":"ABERTURA","duration_estimate":"0:00-0:25","narration":"direct personal context, plain register, written in English for narration","caption":"max 6 words, in English"},
    {"block":"INTRODUÇÃO","duration_estimate":"0:25-0:40","narration":"This is Dark Reflex. ...","caption":"DARK REFLEX"}
  ],
  "scenes": [
    {
      "timestamp_in": "0:00",
      "timestamp_out": "0:25",
      "image_source": "real",
      "image_url": "direct url or empty string",
      "scene_prompt": "",
      "caption": "max 6 words",
      "effect_note": "",
      "sound_change": "dark drone — começa aqui, continua por baixo"
    }
  ],
  "thumbnail_title": "2-5 WORD TITLE",
  "thumbnail_concept": "visual direction — mundane location made threatening, no faces, no gore",
  "midjourney_prompt": "photorealistic cinematic dark prompt of a mundane location turned ominous (a front door, a hallway, a parking lot, a treeline, a motel sign) — no faces, no gore, written in plain descriptive sentences, ending with widescreen 16:9 cinematic photograph",
  "youtube_title": "SEO title 50-60 chars",
  "youtube_description": "200-250 word SEO description",
  "tags": ["tag1","tag2"]
}

All blocks (use these exact Portuguese labels in the "block" field, while narration/caption text stays in English): ABERTURA, INTRODUÇÃO, CONTEXTO, INCIDENTE, INVESTIGAÇÃO, CLÍMAX, CONCLUSÃO.
Each narration: 80-160 words at 130 wpm. Total: 10-14 min.`;

const SYS_MULTI = `You are the lead writer for Dark Reflex — a faceless YouTube true crime/horror channel. This is a MULTI-STORY video: 3-4 independent short stories compiled into one video, exactly like Mr. Nightmare's format. Scripts are narrated via ElevenLabs, paired with real images, edited in CapCut.

CRITICAL: Your entire response must be ONE valid JSON object and nothing else. No preamble, no "Here is...", no explanation, no markdown code fences. The first character of your response must be { and the last character must be }. If the source material is thin or ambiguous, still produce your best complete JSON output — never respond with prose asking for clarification.

## WRITING PHILOSOPHY — Mr. Nightmare pattern (proven, high-retention)
- Each story is independent and self-contained, 5-9 minutes each. NOT one continuous narrative — separate stories from separate sources/people, stitched into one video.
- Each story: NO cinematic cold-open. Start with direct personal context: age, situation, location. Conversational register, like someone telling you something that really happened. E.g. "It was my first year of University..." / "I'm a 21-year-old currently home for the summer..."
- Establish normalcy FIRST before introducing the first sign of wrongness — always small and ambiguous at first.
- Escalate gradually with PHYSICAL EVIDENCE at each stage: a sound, a glimpse, a confrontation, a scare. Ground every escalation in concrete proof (footprints, tape, handprints, moved objects) — never atmosphere alone.
- At each story's climax, switch to short brutal sentences.
- Each story ends plainly and personally — no elaborate moral, a flat human last line.
- Write visually through plain, lived detail, not metaphor.
- Name people, places, ages for believability.

## FIXED CHANNEL BOOKENDS — NEVER CHANGE
Right after the opening line(s) of the very first story only, insert a short block (labeled "block":"INTRODUÇÃO") opening with exactly: "This is Dark Reflex." plus 1 short atmospheric sentence about the channel.
The final block (labeled "block":"CONCLUSÃO") of the LAST story only must end with exactly: "Stay in the dark with me."
Between stories, use a short TRANSITION block (1 sentence) to bridge to the next story.

## SEO RULES
youtube_title: 50-60 chars, format like "3 [Topic] Horror Stories" or "[Category] Horror Stories", no emojis.
youtube_description: 200-250 words, briefly previews all stories, 8-12 keywords, ends with "Subscribe to Dark Reflex for more true crime investigations. Stay in the dark with me."
tags: 15-20 tags.

## PRODUCTION SCENE GUIDE
For EACH story, break its script into sequential SCENES (4-7 scenes per story). Each scene is a discrete visual+audio unit the editor will build in CapCut. Keep this LEAN — only flag something when it actually needs doing. Most scenes are a plain hard cut with continuing background sound; don't over-annotate.

For each scene provide:
- story: which story number this scene belongs to
- timestamp_in / timestamp_out: exact start-end matching the narration block it covers, relative to the full video timeline
- image_source: "real" if a direct image/URL exists from that story's source, "generated" if it needs an AI image
- image_url: direct URL if image_source is "real" and found in source, else empty string
- scene_prompt: if image_source is "generated", a complete photorealistic image-generation prompt for this exact moment, written in plain descriptive language (works in Leonardo AI, Meta AI/Imagine, or any generator — no platform-specific flags or parameters). Describe: subject/location, mood, lighting, camera angle, film style, in full sentences. Always end with "widescreen 16:9 cinematic photograph" to set the aspect ratio in words. No faces, no gore. If image_source is "real", leave empty.
- caption: on-screen CapCut caption text for this scene, max 6 words
- effect_note: ONLY fill if something beyond a plain hard cut should happen here. Write the instruction in PORTUGUESE (e.g. "Zoom lento ao longo de 6s", "Flash de luz, depois 1s de silêncio", "Fade to black — fim da história"). Leave "" for ordinary scenes.
- sound_change: ONLY fill if background sound should START or CHANGE at this scene. Write the instruction in PORTUGUESE but keep the CapCut search term itself in English exactly as it should be typed into the search bar. Format: "dark drone — começa aqui" or "PARAR todo o som" or "trocar para heartbeat slow — a construir para o clímax". The English term must stay in English (real CapCut search-bar phrases only, never invent fixed track names, never translate the term itself). Leave "" if sound from previous scene just continues.

Aim for 16-28 scenes total across all stories.

## OUTPUT — valid JSON only, no markdown, no backticks:
{
  "case_title": "Compilation title, e.g. '3 Real Stalker Horror Stories'",
  "hook_line": "Plain opening line of story 1",
  "estimated_duration": "e.g. 24:00",
  "stories": [
    {
      "story_title": "Short label for this story",
      "script": [
        {"block":"ABERTURA","duration_estimate":"0:00-0:20","narration":"...","caption":"max 6 words"},
        {"block":"INTRODUÇÃO","duration_estimate":"0:20-0:35","narration":"This is Dark Reflex. ...","caption":"DARK REFLEX"},
        {"block":"CONTEXTO","duration_estimate":"...","narration":"...","caption":"..."},
        {"block":"INCIDENTE","duration_estimate":"...","narration":"...","caption":"..."},
        {"block":"CLÍMAX","duration_estimate":"...","narration":"...","caption":"..."},
        {"block":"CONCLUSÃO","duration_estimate":"...","narration":"...","caption":"..."}
      ]
    }
  ],
  "scenes": [
    {
      "story": "1",
      "timestamp_in": "0:00",
      "timestamp_out": "0:20",
      "image_source": "real",
      "image_url": "direct url or empty string",
      "scene_prompt": "",
      "caption": "max 6 words",
      "effect_note": "",
      "sound_change": "dark drone — começa aqui"
    }
  ],
  "thumbnail_title": "2-5 WORD TITLE",
  "thumbnail_concept": "visual direction — mundane location made threatening, no faces, no gore",
  "midjourney_prompt": "photorealistic cinematic dark prompt of a mundane location turned ominous, written in plain descriptive sentences, ending with widescreen 16:9 cinematic photograph",
  "youtube_title": "SEO title 50-60 chars",
  "youtube_description": "200-250 word SEO description",
  "tags": ["tag1","tag2"]
}

3-4 stories per video. Each story's script: OPENING, (INTRO only for story 1), CONTEXT, INCIDENT, CLIMAX, CONCLUSION.
Each narration block: 80-160 words at 130 wpm. Total video: 20-30 min.`;

const isUrl = (s) => /^https?:\/\/.+/.test(s.trim());
const parseUrls = (text) => {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  return { urls: lines.filter(isUrl), rest: lines.filter(l => !isUrl(l)).join("\n").trim() };
};

const formatScene = (sc, i) => [
  `SCENE ${i + 1} — ${sc.timestamp_in} to ${sc.timestamp_out}`,
  sc.story ? `Story ${sc.story}` : null,
  `Caption: ${sc.caption}`,
  sc.image_source === "real"
    ? `Image: REAL — ${sc.image_url || "no direct URL, search source manually"}`
    : `Image: AI GENERATE — ${sc.scene_prompt}`,
  sc.effect_note ? `Effect: ${sc.effect_note}` : null,
  sc.sound_change ? `Sound: ${sc.sound_change}` : null,
].filter(Boolean).join("\n");

const SYS_INSTAGRAM = `You are the Instagram content creator for Dark Reflex — a true crime/horror channel. You create carousel posts that stop the scroll and drive viewers to watch the full YouTube video.

CRITICAL: Your entire response must be ONE valid JSON object and nothing else. No preamble, no markdown, no backticks. First character must be { and last must be }.

## CAROUSEL PHILOSOPHY
- 5-6 slides. Slide 1 = COVER with powerful hook. Slides 2-4 = disturbing facts/moments from the case, one per slide, numbered. Last slide = CTA.
- Write in ENGLISH. Tone: serious, investigative, disturbing. Not sensationalist.
- Each fact slide has a sequential number (1, 2, 3...) except the CTA.
- Archive label format: "FILE #0X / CASE NAME"
- Text in 2 layers: bold white main line + red impact word/phrase at the end
- Subtext: 2-3 white lines + last line in red (the most disturbing sentence)
- Write for someone who has NEVER heard of this case. Build urgency and dread.
- Cover slide: NO spoilers — tease, don't tell.
- CTA final slide: appeal to save, share and follow @thedarkreflex

## IMAGE PROMPTS
Each slide needs a photorealistic prompt for GPT/Leonardo. Mundane locations turned threatening, no faces, no explicit gore. End with "portrait 1:1 cinematic dark photograph".

## OUTPUT — valid JSON only:
{
  "carousel_title": "Short impactful case title in English",
  "instagram_caption": "Caption in English. Opens with hook. 3-4 sentences about the case. Ends with: Follow @thedarkreflex. Full story on YouTube — link in bio.",
  "hashtags": ["darkreflex", "truecrime", "coldcase", "unsolved", "horror"],
  "slides": [
    {
      "slide_number": 1,
      "type": "CAPA",
      "arquivo_label": "FILE #01 / CASE NAME",
      "text_main_white": "MAIN BOLD WHITE LINE",
      "text_main_red": "RED IMPACT WORD.",
      "subtext_white": "white subtext line 1\nwhite subtext line 2",
      "subtext_red": "most disturbing red line.",
      "image_prompt": "full prompt ending with portrait 1:1 cinematic dark photograph"
    }
  ]
}

Slide 1 = CAPA. Slides 2 to (N-1) = FACT with sequential number. Last slide = CTA.
CTA: text_main_white="IF THIS CASE DISTURBED YOU...", text_main_red="THE FILE IS STILL OPEN.", subtext_white="Save. Share with someone who needs to know.", subtext_red="Follow @thedarkreflex for more.", image_prompt use dark empty corridor or room.
5-6 slides total. All text in English.`;

const TEXT_SPECS_COPY = `ESPECIFICAÇÕES DE TEXTO — DARK REFLEX

⚡ LEGENDA DE DESTAQUE (só em cenas com peso emocional)
Fonte: Courier New Bold (ou Anton / Bebas Neue)
Tamanho: 56–64px em 1280×720
Cor: #FFFFFF
Acento: barra vermelha #8B1A1A, 18×36px, à esquerda do texto
Posição: terço superior (~15% do topo)
Fundo: faixa preta semi-transparente, opacidade ~35%
Animação: fade in 0.2s, sem bounce/zoom

🟢 LEGENDA AUTOMÁTICA (constante, toda a narração)
Fonte: Courier New Regular (ou monospace mais próxima)
Tamanho: 34–38px em 1280×720
Cor: #E8E0D0
Posição: terço inferior (~12–15% do fundo)
Fundo: faixa preta semi-transparente, opacidade ~55%
Linhas: máximo 2 linhas, 5–6 palavras por linha`;

export default function App() {
  const [phase, setPhase] = useState(0);
  const [mode, setMode] = useState("single"); // "single" | "multi"
  const [input, setInput] = useState("");
  const [storySlots, setStorySlots] = useState([{ id: 1, text: "" }, { id: 2, text: "" }, { id: 3, text: "" }]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState("");
  const [uploadedBg, setUploadedBg] = useState(null);
  const [thumbTitle, setThumbTitle] = useState("");
  const [specsOpen, setSpecsOpen] = useState(false);
  const [igLoading, setIgLoading] = useState(false);
  const [igInput, setIgInput] = useState("");
  const [igResult, setIgResult] = useState(null);
  const [igError, setIgError] = useState("");
  const [slideImages, setSlideImages] = useState({});
  const [activeSlide, setActiveSlide] = useState(0);
  const fileInputRef = useRef(null);

  const copy = (text, key) => {
    if (!text) return;
    const doFallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(key);
        setTimeout(() => setCopied(""), 2000);
      } catch (err) {
        setError("Falha ao copiar — seleciona e copia manualmente.");
        setTimeout(() => setError(""), 3000);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(key);
        setTimeout(() => setCopied(""), 2000);
      }).catch(doFallback);
    } else {
      doFallback();
    }
  };

  const reset = () => {
    setPhase(0); setResult(null); setInput(""); setError(""); setUploadedBg(null); setThumbTitle("");
    setStorySlots([{ id: 1, text: "" }, { id: 2, text: "" }, { id: 3, text: "" }]);
  };

  const addStorySlot = () => setStorySlots(s => [...s, { id: Date.now(), text: "" }]);
  const removeStorySlot = (id) => setStorySlots(s => s.length > 1 ? s.filter(x => x.id !== id) : s);
  const updateStorySlot = (id, text) => setStorySlots(s => s.map(x => x.id === id ? { ...x, text } : x));

  const fetchWithRetry = async (url, options, retries = 2) => {
    let lastErrorDetail = "";
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, options);
        let d;
        try {
          d = await res.json();
        } catch {
          d = null;
        }

        if (!res.ok) {
          lastErrorDetail = `HTTP ${res.status}${d?.error?.message ? ": " + d.error.message : ""}`;
          if (res.status >= 500 && attempt < retries) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw new Error(lastErrorDetail);
        }

        if (d?.error) {
          lastErrorDetail = d.error.message || JSON.stringify(d.error);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw new Error(lastErrorDetail);
        }

        return d;
      } catch (err) {
        lastErrorDetail = err.message || String(err);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(lastErrorDetail);
      }
    }
  };

  const fetchPage = async (url, i, total) => {
    setLoadingStep(`A OBTER PÁGINA ${i + 1} DE ${total}...`);
    const d = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "anthropic-beta": "web-fetch-2025-09-10" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", max_tokens: 4000,
        tools: [{ type: "web_fetch_20250910", name: "web_fetch", max_uses: 3, max_content_tokens: 30000 }],
        messages: [{
          role: "user",
          content: `Fetch this exact URL: ${url}\n\nIf you successfully retrieve the actual page content, respond with the raw story/case text from the page — names, dates, events, details — AND list any direct image URLs found embedded in the page (photos, screenshots) on separate lines prefixed with "IMAGE_URL: ". No commentary, no summary of what you did.\n\nIf you cannot access the page (blocked, not found, paywalled, requires login, or the fetch tool returns an error for this specific URL), respond with EXACTLY this and nothing else: FETCH_FAILED`
        }]
      })
    });
    const text = (d.content?.map(x => x.text || "").join("").trim()) || "";
    const failurePatterns = /FETCH_FAILED|I (was unable|wasn't able|am unable|couldn't|could not)|I don't have access|no search results|unable to (access|retrieve|fetch)|cannot access|isn't accessible/i;
    if (!text || failurePatterns.test(text.slice(0, 300))) {
      return "";
    }
    return text;
  };

  const resolveText = async (rawText, label) => {
    let text = rawText.trim();
    const { urls, rest } = parseUrls(text);
    if (urls.length > 0) {
      const parts = [];
      for (let i = 0; i < urls.length; i++) {
        const extracted = await fetchPage(urls[i], i, urls.length);
        if (extracted) parts.push(`--- PAGE ${i + 1} ---\n${extracted}`);
      }
      if (rest) parts.push(`--- NOTES ---\n${rest}`);
      text = parts.join("\n\n");
    }
    if (text.trim().length < 150) {
      throw new Error(`Não foi possível extrair conteúdo suficiente${label ? ` para ${label}` : ""} — a página pode estar a bloquear acesso automático. Tenta colar o texto do caso diretamente em vez do URL.`);
    }
    return text;
  };

  const extractJSON = (raw, stopReason, requiredFields = ["case_title", "youtube_title"]) => {
    if (!raw) throw new Error("Resposta vazia da API.");
    let cleaned = raw.replace(/```json|```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      const preview = cleaned.slice(0, 200).trim();
      throw new Error(preview ? `O modelo respondeu com texto em vez de JSON: "${preview}${cleaned.length > 200 ? "..." : ""}"` : "Resposta vazia do modelo. Tenta novamente.");
    }
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      if (stopReason === "max_tokens") {
        throw new Error("A resposta foi cortada (demasiado longa). Tenta uma fonte mais curta, ou menos histórias no modo multi-história.");
      }
      throw new Error("O JSON da resposta ficou mal formado. Tenta novamente.");
    }
    if (requiredFields.length > 0 && requiredFields.some(f => !parsed[f])) {
      if (stopReason === "max_tokens") {
        throw new Error("A resposta foi cortada antes de terminar (demasiado longa). Tenta uma fonte mais curta, ou menos histórias no modo multi-história.");
      }
      throw new Error("Faltam campos obrigatórios na resposta. Tenta novamente.");
    }
    return parsed;
  };

  const generate = async () => {
    if (mode === "single") {
      if (!input.trim()) return;
      setLoading(true); setError(""); setResult(null);
      try {
        const text = await resolveText(input, "case");
        setLoadingStep("A GERAR GUIÃO...");
        const d = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 8000, system: SYS_SINGLE, messages: [{ role: "user", content: `Case text:\n\n${text}` }] })
        });
        const raw = d.content?.map(x => x.text || "").join("").trim();
        const parsed = extractJSON(raw, d.stop_reason);
        setResult(parsed);
        setThumbTitle(parsed.thumbnail_title || parsed.case_title || "");
        setPhase(1);
      } catch (e) {
        setError(e.message || "Falha na geração. Verifica o teu input.");
      } finally { setLoading(false); setLoadingStep(""); }
    } else {
      const activeSlots = storySlots.filter(s => s.text.trim());
      if (activeSlots.length === 0) return;
      setLoading(true); setError(""); setResult(null);
      try {
        const parts = [];
        for (let i = 0; i < activeSlots.length; i++) {
          setLoadingStep(`A RESOLVER HISTÓRIA ${i + 1} DE ${activeSlots.length}...`);
          const text = await resolveText(activeSlots[i].text, `story ${i + 1}`);
          parts.push(`=== STORY ${i + 1} SOURCE ===\n${text}`);
        }
        const combined = parts.join("\n\n");
        setLoadingStep("A GERAR GUIÃO MULTI-HISTÓRIA...");
        const d = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 16000, system: SYS_MULTI, messages: [{ role: "user", content: `Sources for ${activeSlots.length} stories:\n\n${combined}` }] })
        });
        const raw = d.content?.map(x => x.text || "").join("").trim();
        const parsed = extractJSON(raw, d.stop_reason);
        setResult(parsed);
        setThumbTitle(parsed.thumbnail_title || parsed.case_title || "");
        setPhase(1);
      } catch (e) {
        setError(e.message || "Falha na geração. Verifica os teus inputs.");
      } finally { setLoading(false); setLoadingStep(""); }
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Try createObjectURL first (more compatible with Android webviews)
    try {
      const objectUrl = URL.createObjectURL(file);
      setUploadedBg(objectUrl);
    } catch {
      // Fallback to FileReader
      const reader = new FileReader();
      reader.onload = (ev) => setUploadedBg(ev.target.result);
      reader.onerror = () => setError("Erro ao carregar imagem. Tenta outro formato.");
      reader.readAsDataURL(file);
    }
  };

  const generateInstagram = async () => {
    if (!igInput.trim()) return;
    setIgLoading(true); setIgError(""); setIgResult(null); setSlideImages({});
    try {
      const d = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 3000,
          system: SYS_INSTAGRAM,
          messages: [{ role: "user", content: `Texto do caso:\n\n${igInput.trim()}` }]
        })
      });
      const raw = d.content?.map(x => x.text || "").join("").trim();
      const parsed = extractJSON(raw, d.stop_reason, ["carousel_title", "slides"]);
      setIgResult(parsed);
      setActiveSlide(0);
    } catch (e) {
      setIgError(e.message || "Falha ao gerar carrossel.");
    } finally { setIgLoading(false); }
  };

  const handleSlideUpload = (slideIdx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSlideImages(prev => ({ ...prev, [slideIdx]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const downloadSlide = (slide, slideIdx) => {
    const W = 1080, H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const isCTA = slide.type === "CTA";
    const totalSlides = igResult?.slides?.length || 1;

    const wrapText = (text, maxW, lineH, startY, font, color) => {
      ctx.font = font;
      ctx.fillStyle = color;
      const words = text.split(" ");
      let line = "";
      let y = startY;
      for (const word of words) {
        const test = line + (line ? " " : "") + word;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, 70, y);
          line = word;
          y += lineH;
        } else { line = test; }
      }
      if (line) { ctx.fillText(line, 70, y); y += lineH; }
      return y;
    };

    const draw = () => {
      ctx.textAlign = "left";

      // ── BASE DARK BACKGROUND ──
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, W, H);

      // ── BOTTOM OVERLAY ── (darker na zona de texto)
      const overlay = ctx.createLinearGradient(0, H * 0.35, 0, H);
      overlay.addColorStop(0, "rgba(0,0,0,0)");
      overlay.addColorStop(0.3, "rgba(0,0,0,0.75)");
      overlay.addColorStop(1, "rgba(0,0,0,0.97)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, W, H);

      if (!isCTA) {
        // ── ARQUIVO LABEL (topo esquerdo) ──
        ctx.font = "500 26px 'Courier New', monospace";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(slide.arquivo_label || `ARQUIVO #0${slideIdx + 1} / DARK REFLEX`, 70, 80);
        // linha decorativa após label
        ctx.fillStyle = "rgba(139,26,26,0.6)";
        ctx.fillRect(70, 92, 320, 1);

        // ── NÚMERO GRANDE vermelho ──
        const numFs = 260;
        ctx.font = `900 ${numFs}px 'Courier New', monospace`;
        ctx.fillStyle = "#8B1A1A";
        ctx.fillText(String(slideIdx + 1), 54, 360);
        // linha horizontal depois do número
        ctx.fillStyle = "rgba(139,26,26,0.7)";
        ctx.fillRect(70, 375, 200, 3);
        // mira decorativa (cruz vermelha pequena)
        ctx.fillRect(285, 365, 20, 3);
        ctx.fillRect(294, 356, 3, 20);

        // ── TEXTO PRINCIPAL ──
        const mainWhite = (slide.text_main_white || "").toUpperCase();
        const mainRed = (slide.text_main_red || "").toUpperCase();

        let mainFS = 88;
        ctx.font = `900 ${mainFS}px 'Courier New', monospace`;
        while (ctx.measureText(mainWhite).width > W - 140 && mainFS > 48) {
          mainFS -= 4;
          ctx.font = `900 ${mainFS}px 'Courier New', monospace`;
        }

        let curY = 470;
        // wrap white lines
        const wordsW = mainWhite.split(" ");
        let lineW = "";
        const linesWhite = [];
        for (const word of wordsW) {
          const test = lineW + (lineW ? " " : "") + word;
          if (ctx.measureText(test).width > W - 140 && lineW) {
            linesWhite.push(lineW); lineW = word;
          } else lineW = test;
        }
        if (lineW) linesWhite.push(lineW);

        for (const l of linesWhite) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(l, 70, curY);
          curY += mainFS * 1.1;
        }

        // red word
        let redFS = mainFS * 1.15;
        ctx.font = `900 ${redFS}px 'Courier New', monospace`;
        while (ctx.measureText(mainRed).width > W - 140 && redFS > 48) {
          redFS -= 4;
          ctx.font = `900 ${redFS}px 'Courier New', monospace`;
        }
        ctx.fillStyle = "#8B1A1A";
        ctx.fillText(mainRed, 70, curY);
        curY += redFS * 1.1;

        // divisor vermelho
        ctx.fillStyle = "rgba(139,26,26,0.6)";
        ctx.fillRect(70, curY, 300, 2);
        // mira
        ctx.fillRect(385, curY - 4, 20, 2);
        ctx.fillRect(394, curY - 8, 2, 16);
        curY += 30;

        // ── SUBTEXTO ──
        const subLines = (slide.subtext_white || "").split("\n");
        ctx.font = "500 30px 'Courier New', monospace";
        for (const sl of subLines) {
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.fillText(sl.toUpperCase(), 70, curY);
          curY += 38;
        }
        if (slide.subtext_red) {
          ctx.fillStyle = "#8B1A1A";
          ctx.font = "700 30px 'Courier New', monospace";
          ctx.fillText((slide.subtext_red).toUpperCase(), 70, curY);
          curY += 42;
        }

      } else {
        // ── CTA SLIDE ──
        ctx.font = `900 80px 'Courier New', monospace`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText((slide.text_main_white || "SE RECONHECESTE ISTO...").toUpperCase(), 70, 500);
        ctx.fillStyle = "#8B1A1A";
        ctx.font = `900 72px 'Courier New', monospace`;
        ctx.fillText((slide.text_main_red || "O CASO NÃO ESTÁ FECHADO.").toUpperCase(), 70, 600);

        ctx.fillStyle = "rgba(139,26,26,0.6)";
        ctx.fillRect(70, 640, 400, 2);

        ctx.font = "500 30px 'Courier New', monospace";
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        const subW = (slide.subtext_white || "Guarda. Partilha com quem precisa de saber.").split("\n");
        let cy = 700;
        for (const l of subW) { ctx.fillText(l.toUpperCase(), 70, cy); cy += 42; }
        ctx.font = "700 32px 'Courier New', monospace";
        ctx.fillStyle = "#8B1A1A";
        ctx.fillText((slide.subtext_red || "Segue @thedarkreflex").toUpperCase(), 70, cy + 8);

        // Ícones CTA
        const icons = [["🔖", "GUARDA", "para não\nesquecer"], ["📤", "PARTILHA", "com quem\nprecisa ver"], ["❤️", "CURTE", "se fez\nsentido"]];
        icons.forEach(([icon, label, sub], ii) => {
          const ix = 70 + ii * 310;
          const iy = 1100;
          ctx.font = "52px sans-serif";
          ctx.fillText(icon, ix + 40, iy);
          ctx.font = "bold 24px 'Courier New', monospace";
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(label, ix + 10, iy + 50);
          ctx.font = "18px 'Courier New', monospace";
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          sub.split("\n").forEach((l, li) => ctx.fillText(l.toUpperCase(), ix + 10, iy + 78 + li * 22));
        });
      }

      // ── LOGO DARK REFLEX (fundo, centrado) ──
      const logoY = isCTA ? 900 : H - 110;
      ctx.textAlign = "center";
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.fillStyle = "rgba(139,26,26,0.7)";
      ctx.fillRect(W/2 - 120, logoY, 240, 1);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("DARK REFLEX", W/2, logoY + 28);
      ctx.font = "14px 'Courier New', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText("@THEDARKREFLEX", W/2, logoY + 48);
      ctx.fillStyle = "rgba(139,26,26,0.7)";
      ctx.fillRect(W/2 - 120, logoY + 60, 240, 1);
      ctx.textAlign = "left";

      // ── DOWNLOAD ──
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `dark-reflex-ig-slide-${slideIdx + 1}.jpg`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/jpeg", 0.95);
    };

    const bg = slideImages[slideIdx];
    if (bg) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        ctx.drawImage(img, (W - img.naturalWidth * scale) / 2, (H - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
        draw();
      };
      img.onerror = draw;
      if (!bg.startsWith("data:")) img.crossOrigin = "anonymous";
      img.src = bg;
    } else draw();
  };

  const downloadThumb = () => {
    const canvas = document.createElement("canvas");
    // 2x resolution for crisp output
    const W = 1280, H = 720, DPR = 2;
    canvas.width = W * DPR; canvas.height = H * DPR;
    const ctx = canvas.getContext("2d");
    ctx.scale(DPR, DPR);
    const title = (thumbTitle || "DARK REFLEX").toUpperCase();

    // Helper: draw text with manual letterSpacing (like CSS letter-spacing)
    const drawSpaced = (text, x, y, spacing) => {
      let curX = x;
      for (const ch of text) {
        ctx.fillText(ch, curX, y);
        curX += ctx.measureText(ch).width + spacing;
      }
    };

    const applyTextAndSave = () => {
      // Preview div renders at ~500px wide (measured from screenshot)
      // Increase title size slightly + shift channel name up
      const SCALE = 1280 / 460;

      // Gradient: to top
      const grad = ctx.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0, "rgba(0,0,0,0.95)");
      grad.addColorStop(0.6, "rgba(0,0,0,0.4)");
      grad.addColorStop(1, "rgba(0,0,0,0.2)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Red top bar: 4px CSS → scaled
      ctx.fillStyle = "#8B1A1A";
      ctx.fillRect(0, 0, W, 4 * SCALE);

      // Padding: 20px left, 16px bottom → scaled
      const padX = 20 * SCALE;
      const padBottom = 16 * SCALE;
      const gap = 6 * SCALE;

      // Accent bar: width 40, height 3, at bottom
      const accentH = 3 * SCALE;
      const accentW = 40 * SCALE;
      const accentTop = H - padBottom - accentH;
      ctx.fillStyle = "#8B1A1A";
      ctx.fillRect(padX, accentTop, accentW, accentH);

      // Title: fontSize 28px CSS → scaled, fontWeight 900, letterSpacing 0.08em
      const measureW = (text, sp) => { let w = 0; for (const ch of text) w += ctx.measureText(ch).width + sp; return w - sp; };
      let tFS = 28 * SCALE;
      ctx.font = "900 " + tFS + "px 'Courier New', monospace";
      while (measureW(title, tFS * 0.08) > W - padX * 2 && tFS > 20) {
        tFS -= 2;
        ctx.font = "900 " + tFS + "px 'Courier New', monospace";
      }
      const tSpacing = tFS * 0.08;
      const titleBaseline = accentTop - gap - (4 * SCALE);
      ctx.fillStyle = "#FFFFFF";
      drawSpaced(title, padX, titleBaseline, tSpacing);

      // Channel name: fontSize 11px CSS → scaled, letterSpacing 0.25em
      const chanFS = 11 * SCALE;
      ctx.font = "700 " + chanFS + "px 'Courier New', monospace";
      const chanSpacing = chanFS * 0.25;
      const chanBaseline = titleBaseline - tFS * 1.05 - gap * 0.5;
      ctx.fillStyle = "#8B1A1A";
      drawSpaced("DARK REFLEX", padX, chanBaseline, chanSpacing);

      // Download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "dark-reflex-" + title.replace(/\s+/g, "-").toLowerCase() + ".jpg";
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/jpeg", 0.95);
    };

    const renderBg = (drawFn) => {
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(0, 0, W, H);
      drawFn();
      applyTextAndSave();
    };

    if (uploadedBg) {
      const img = new Image();
      img.onload = () => renderBg(() => {
        const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      });
      img.onerror = () => renderBg(() => {});
      // Only set crossOrigin for external URLs, not data URLs
      if (!uploadedBg.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.src = uploadedBg;
    } else {
      renderBg(() => {});
    }
  };

  const s = styles;
  const { urls } = parseUrls(input);

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={s.redBar} />
        <div style={s.headerInner}>
          <span style={s.caseLabel}>FICHEIRO DO CASO</span>
          <h1 style={s.title}>DARK REFLEX</h1>
          <span style={s.subtitle}>Pipeline de Produção</span>
        </div>
        <div style={s.redBar} />
      </div>

      <div style={s.tabs}>
        {PHASES.map((p, i) => (
          <div key={p} style={{ ...s.tab, ...(i === phase ? s.tabActive : {}), cursor: "pointer", opacity: i === phase ? 1 : 0.7 }}
            onClick={() => setPhase(i)}>
            <span style={s.tabNum}>{String(i + 1).padStart(2, "0")}</span>
            <span style={s.tabLabel}>{p}</span>
          </div>
        ))}
      </div>

      <div style={s.content}>

        {phase === 0 && (
          <div style={s.section}>
            <span style={s.stamp}>ENTRADA</span>

            {/* Mode toggle */}
            <div style={s.modeToggle}>
              <button style={{ ...s.modeBtn, ...(mode === "single" ? s.modeBtnActive : {}) }} onClick={() => setMode("single")}>
                CASO ÚNICO
              </button>
              <button style={{ ...s.modeBtn, ...(mode === "multi" ? s.modeBtnActive : {}) }} onClick={() => setMode("multi")}>
                MULTI-HISTÓRIA (3-4)
              </button>
            </div>

            {mode === "single" ? (
              <>
                <p style={s.desc}>Cola um ou mais URLs (um por linha) ou o texto do caso vindo do Reddit, DocumentingReality, WebSleuths.</p>
                <textarea style={s.textarea} rows={10} value={input} onChange={e => setInput(e.target.value)}
                  placeholder={"Um URL por linha para fóruns com várias páginas:\nhttps://forum.com/thread/caso\nhttps://forum.com/thread/caso/page-2\n\n— ou cola o texto do caso diretamente —"} />
                {urls.length > 0 && (
                  <div style={s.urlBadge}>
                    🔗 {urls.length} URL{urls.length > 1 ? "s" : ""} detetado{urls.length > 1 ? "s" : ""}
                    {urls.length > 1 && <div style={s.urlList}>{urls.map((u, i) => <div key={i} style={s.urlItem}><span style={{ color: "#8B1A1A", marginRight: 6 }}>PÁGINA {i + 1}</span><span style={{ color: "#888", fontSize: 10, wordBreak: "break-all" }}>{u}</span></div>)}</div>}
                  </div>
                )}
              </>
            ) : (
              <>
                <p style={s.desc}>Uma história por caixa — cola um URL ou texto para cada uma. Formato Mr. Nightmare: 3-4 histórias independentes, um só vídeo.</p>
                {storySlots.map((slot, i) => {
                  const slotUrls = parseUrls(slot.text).urls;
                  return (
                    <div key={slot.id} style={s.storySlot}>
                      <div style={s.storySlotHeader}>
                        <span style={s.storySlotLabel}>HISTÓRIA {i + 1}</span>
                        {storySlots.length > 1 && (
                          <button style={s.removeSlotBtn} onClick={() => removeStorySlot(slot.id)}>✕ REMOVER</button>
                        )}
                      </div>
                      <textarea
                        style={s.storyTextarea}
                        rows={4}
                        value={slot.text}
                        onChange={e => updateStorySlot(slot.id, e.target.value)}
                        placeholder={`URL(s) ou texto para a história ${i + 1}...`}
                      />
                      {slotUrls.length > 0 && (
                        <div style={s.urlBadgeSm}>🔗 {slotUrls.length} URL{slotUrls.length > 1 ? "s" : ""} detetado{slotUrls.length > 1 ? "s" : ""}</div>
                      )}
                    </div>
                  );
                })}
                <button style={s.addSlotBtn} onClick={addStorySlot}>+ ADICIONAR OUTRA HISTÓRIA</button>
              </>
            )}

            {error && <div style={s.error}>{error}</div>}
            <button
              style={{ ...s.btn, opacity: loading || (mode === "single" ? !input.trim() : storySlots.every(sl => !sl.text.trim())) ? 0.4 : 1 }}
              onClick={generate}
              disabled={loading || (mode === "single" ? !input.trim() : storySlots.every(sl => !sl.text.trim()))}
            >
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><span style={s.spinner} />{loadingStep || "A PROCESSAR..."}</span>
                : mode === "single" ? "GERAR PACOTE DE PRODUÇÃO →" : "GERAR VÍDEO MULTI-HISTÓRIA →"}
            </button>
          </div>
        )}

        {phase === 1 && (
          <div style={s.section}>
            {!result ? (
              <div style={s.empty}>Gera um caso na aba ENTRADA para ver o guião.</div>
            ) : (
            <>
            <div style={s.caseTitleBox}>
              <span style={s.stamp}>{result.stories ? "COMPILAÇÃO" : "CASO"}</span>
              <h2 style={s.caseTitleText}>{result.case_title}</h2>
              {result.estimated_duration && (
                <div style={s.durationBadge}>
                  <span style={s.durationLabel}>DURAÇÃO ESTIMADA</span>
                  <span style={s.durationValue}>{result.estimated_duration}</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2C2C2C", paddingBottom: 8 }}>
              <span style={s.stamp}>GUIÃO ELEVENLABS</span>
              <button style={s.copyBtn} onClick={() => copy(
                (result.stories ? result.stories.flatMap(st => st.script) : result.script || []).map(b => b.narration).join("\n\n"),
                "all"
              )}>
                {copied === "all" ? "✓ COPIADO" : "COPIAR TUDO"}
              </button>
            </div>

            {result.stories ? (
              result.stories.map((story, si) => (
                <div key={si} style={s.storyGroup}>
                  <div style={s.storyGroupHeader}>
                    <span style={s.storyGroupTag}>HISTÓRIA {si + 1}</span>
                    <span style={s.storyGroupTitle}>{story.story_title}</span>
                    <button style={s.copyBtnSm} onClick={() => copy(story.script.map(b => b.narration).join("\n\n"), "story" + si)}>
                      {copied === "story" + si ? "✓" : "COPIAR"}
                    </button>
                  </div>
                  {story.script?.map((block, i) => (
                    <div key={i} style={s.scriptBlock}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={s.blockTag}>{block.block}</span>
                        <span style={{ fontSize: 11, color: "#6B6B6B", fontFamily: "Courier New", flex: 1 }}>{block.duration_estimate}</span>
                        <button style={s.copyBtnSm} onClick={() => copy(block.narration, `s${si}b${i}`)}>{copied === `s${si}b${i}` ? "✓" : "COPIAR"}</button>
                      </div>
                      <p style={s.narration}>{block.narration}</p>
                      <div style={s.metaRow}><span style={s.metaLabel}>LEGENDA →</span><span style={s.metaVal}>{block.caption}</span></div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              result.script?.map((block, i) => (
                <div key={i} style={s.scriptBlock}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={s.blockTag}>{block.block}</span>
                    <span style={{ fontSize: 11, color: "#6B6B6B", fontFamily: "Courier New", flex: 1 }}>{block.duration_estimate}</span>
                    <button style={s.copyBtnSm} onClick={() => copy(block.narration, "b" + i)}>{copied === "b" + i ? "✓" : "COPIAR"}</button>
                  </div>
                  <p style={s.narration}>{block.narration}</p>
                  <div style={s.metaRow}><span style={s.metaLabel}>LEGENDA →</span><span style={s.metaVal}>{block.caption}</span></div>
                </div>
              ))
            )}
            </>
            )}
          </div>
        )}

        {phase === 2 && (
          <div style={s.section}>
            {!result ? (
              <div style={s.empty}>Gera um caso na aba ENTRADA para ver as cenas.</div>
            ) : (<>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={s.stamp}>GUIÃO DE PRODUÇÃO CENA A CENA</span>
            </div>
            <p style={s.desc}>Toca em COPIAR numa cena para copiar tudo — prompt, efeito, som — num bloco pronto a colar.</p>

            <div style={s.specsCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setSpecsOpen(o => !o)}>
                <span style={s.cardTitle}>📐 ESPECIFICAÇÕES DE TEXTO (fixo — configura uma vez no CapCut)</span>
                <span style={s.specsToggle}>{specsOpen ? "▲" : "▼"}</span>
              </div>
              {specsOpen && (
                <>
                  <div style={s.specsBlock}>
                    <div style={s.specsBlockHeader}>
                      <span style={s.specsBlockLabel}>⚡ LEGENDA DE DESTAQUE</span>
                      <span style={s.specsBlockSub}>só nas cenas com peso emocional</span>
                    </div>
                    <div style={s.specRow}><span style={s.specKey}>Fonte</span><span style={s.specVal}>Courier New Bold (ou Anton / Bebas Neue se não tiveres Courier no CapCut)</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Tamanho</span><span style={s.specVal}>56–64px em 1280×720 (escala proporcional ao teu projeto)</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Cor</span><span style={s.specVal}>#FFFFFF (branco puro)</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Acento</span><span style={s.specVal}>Barra vermelha #8B1A1A, 18×36px, à esquerda do texto</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Posição</span><span style={s.specVal}>Terço superior do ecrã (~15% a partir do topo)</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Fundo</span><span style={s.specVal}>Faixa preta semi-transparente atrás do texto, opacidade ~35%</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Animação</span><span style={s.specVal}>Fade in 0.2s, sem bounce/zoom</span></div>
                  </div>

                  <div style={s.specsBlock}>
                    <div style={s.specsBlockHeader}>
                      <span style={s.specsBlockLabel}>🟢 LEGENDA AUTOMÁTICA</span>
                      <span style={s.specsBlockSub}>constante, acompanha toda a narração</span>
                    </div>
                    <div style={s.specRow}><span style={s.specKey}>Fonte</span><span style={s.specVal}>Courier New Regular (ou monospace mais próxima disponível)</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Tamanho</span><span style={s.specVal}>34–38px em 1280×720</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Cor</span><span style={s.specVal}>#E8E0D0 (creme, não branco puro)</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Posição</span><span style={s.specVal}>Terço inferior, ~12–15% a partir do fundo</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Fundo</span><span style={s.specVal}>Faixa preta semi-transparente, opacidade ~55%</span></div>
                    <div style={s.specRow}><span style={s.specKey}>Linhas</span><span style={s.specVal}>Máximo 2 linhas visíveis, 5–6 palavras por linha</span></div>
                  </div>

                  <button style={{ ...s.copyBtn, width: "100%", padding: "10px 12px", marginTop: 4 }} onClick={() => copy(TEXT_SPECS_COPY, "specs")}>
                    {copied === "specs" ? "✓ COPIADO" : "COPIAR ESPECIFICAÇÕES"}
                  </button>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ ...s.copyBtn, flex: 1, padding: "10px 12px" }}
                onClick={() => copy(
                  (result.scenes || []).map((sc, i) => formatScene(sc, i)).join("\n\n— — —\n\n"),
                  "allscenes"
                )}
              >
                {copied === "allscenes" ? "✓ TODAS COPIADAS" : "COPIAR TODAS AS CENAS"}
              </button>
              {result.scenes?.some(sc => sc.image_url) && (
                <button style={{ ...s.copyBtn, flex: 1, padding: "10px 12px" }} onClick={() => result.scenes.filter(sc => sc.image_url).forEach((sc, i) => setTimeout(() => window.open(sc.image_url, "_blank"), i * 300))}>
                  ABRIR TODAS AS IMAGENS REAIS →
                </button>
              )}
            </div>

            {(result.scenes || []).map((sc, i) => {
              const sceneText = formatScene(sc, i);
              return (
                <div key={i} style={s.sceneRow}>
                  <div style={s.sceneTsCol}>
                    <span style={s.sceneTsIn}>{sc.timestamp_in}</span>
                    <span style={s.sceneTsDash}>↓</span>
                    <span style={s.sceneTsOut}>{sc.timestamp_out}</span>
                  </div>

                  <div style={s.sceneCard}>
                    <div style={s.sceneHeader}>
                      {sc.story && <span style={s.imgStoryTag}>HISTÓRIA {sc.story}</span>}
                      <span style={s.sceneSourceTag(sc.image_source)}>{sc.image_source === "real" ? "IMAGEM REAL" : "GERAR COM IA"}</span>
                      <div style={{ flex: 1 }} />
                      <button style={s.copyBtnSm} onClick={() => copy(sceneText, "scene" + i)}>{copied === "scene" + i ? "✓ COPIADO" : "COPIAR CENA"}</button>
                    </div>

                    {/* ── PREVIEW VISUAL DA CENA — estilo thumbnail ── */}
                    <div style={s.scenePreview}>
                      {/* Fundo escuro base */}
                      <div style={s.scenePreviewBg}>
                        {sc.image_source === "real" && sc.image_url
                          ? <img src={sc.image_url} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} alt="" />
                          : <div style={s.scenePreviewPlaceholder}>
                              <span style={s.scenePreviewPlaceholderText}>
                                {sc.image_source === "real" ? "📷 IMAGEM REAL" : "🎨 GERAR COM IA"}
                              </span>
                            </div>
                        }
                        {/* Gradiente igual à thumbnail — escurece de baixo */}
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.15) 100%)",
                          zIndex: 1
                        }} />
                        {/* Linha vermelha topo */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#8B1A1A", zIndex: 3 }} />

                        {/* LEGENDA DE DESTAQUE — terço superior, igual ao exemplo visual que criámos */}
                        {sc.caption && (
                          <div style={{
                            position: "absolute", top: "12%", left: "4%",
                            zIndex: 2, display: "flex", alignItems: "center", gap: 5,
                            background: "rgba(0,0,0,0.35)", padding: "4px 8px 4px 4px", borderRadius: 2
                          }}>
                            <div style={{ width: 3, height: 20, background: "#8B1A1A", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 900, color: "#FFFFFF", fontFamily: "Courier New", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                              {sc.caption}
                            </span>
                          </div>
                        )}

                        {/* LEGENDA AUTOMÁTICA — rodapé, estilo CapCut */}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, background: "rgba(0,0,0,0.55)", padding: "5px 8px", textAlign: "center" }}>
                          <span style={{ fontSize: 9, color: "#E8E0D0", fontFamily: "Courier New", letterSpacing: "0.02em" }}>
                            {(sc.caption || "").toUpperCase()}...
                          </span>
                        </div>

                        {/* Timestamp canto superior direito */}
                        <div style={{ position: "absolute", top: 5, right: 7, fontSize: 8, color: "rgba(139,26,26,0.9)", fontFamily: "Courier New", fontWeight: 700, zIndex: 3 }}>
                          {sc.timestamp_in}–{sc.timestamp_out}
                        </div>

                        {/* Tag REAL/IA canto inferior direito */}
                        <div style={{ position: "absolute", bottom: 28, right: 7, zIndex: 3 }}>
                          <span style={{ ...s.sceneSourceTag(sc.image_source), fontSize: 8 }}>
                            {sc.image_source === "real" ? "REAL" : "IA"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── INSTRUÇÕES PASSO A PASSO PARA O EDITOR ── */}
                    <div style={s.editorGuide}>
                      <span style={s.editorGuideTitle}>📋 INSTRUÇÕES PARA O EDITOR</span>
                      <div style={s.editorStep}><span style={s.editorStepNum}>1</span><span style={s.editorStepText}><strong>IMAGEM:</strong> {sc.image_source === "real" ? (sc.image_url ? `Descarrega a imagem real neste link: ${sc.image_url}` : "Procura manualmente na fonte pelo momento descrito no prompt.") : `Gera a imagem com este prompt no GPT/Leonardo: "${sc.scene_prompt}"`}</span></div>
                      <div style={s.editorStep}><span style={s.editorStepNum}>2</span><span style={s.editorStepText}><strong>COLOCAR NO CAPCUT:</strong> Importa a imagem. Ajusta duração para cobrir o tempo {sc.timestamp_in} → {sc.timestamp_out}. Usa corte seco na entrada{sc.effect_note ? "" : " (sem transição)"}.{sc.effect_note ? ` Aplica: ${sc.effect_note}` : ""}</span></div>
                      <div style={s.editorStep}><span style={s.editorStepNum}>3</span><span style={s.editorStepText}><strong>FILTRO DE COR:</strong> Dessatura a imagem para 30–40% (Ajustes → Saturação). Aplica vinheta nos cantos (Ajustes → Vinheta). Tom geral frio/escuro.</span></div>
                      <div style={s.editorStep}><span style={s.editorStepNum}>4</span><span style={s.editorStepText}><strong>LEGENDA DE DESTAQUE</strong> (texto grande, terço superior): Escreve "{sc.caption}" em maiúsculas. Fonte: Courier New Bold, 56–64px, cor branca #FFFFFF. Coloca no terço superior. Adiciona barra vermelha #8B1A1A à esquerda (18×36px). Fundo: faixa preta 35% opacidade. Animação: fade in 0.2s.</span></div>
                      <div style={s.editorStep}><span style={s.editorStepNum}>5</span><span style={s.editorStepText}><strong>LEGENDA AUTOMÁTICA</strong> (rodapé): As legendas automáticas do CapCut cobrem esta cena automaticamente. Confirmação: fonte Courier New Regular, 34–38px, cor #E8E0D0, terço inferior.</span></div>
                      {sc.sound_change && <div style={s.editorStep}><span style={s.editorStepNum}>6</span><span style={s.editorStepText}><strong>SOM:</strong> {sc.sound_change}. Para encontrar: CapCut → Áudio → pesquisa o termo em inglês indicado.</span></div>}
                    </div>

                    {/* Prompt / link */}
                    {sc.image_source === "real" ? (
                      sc.image_url
                        ? <a href={sc.image_url} target="_blank" rel="noopener noreferrer" style={s.imgLink}>🔗 ABRIR IMAGEM REAL →</a>
                        : <div style={s.emptyInline}>Sem URL direto — procura manualmente na fonte.</div>
                    ) : (
                      <div style={s.scenePromptBox}>
                        <div style={s.scenePromptHeader}>
                          <span style={s.scenePromptLabel}>PROMPT DA CENA</span>
                          <button style={s.copyBtnSm} onClick={() => copy(sc.scene_prompt, `prompt${i}`)}>{copied === `prompt${i}` ? "✓" : "COPIAR"}</button>
                        </div>
                        <p style={s.scenePromptText}>{sc.scene_prompt}</p>
                      </div>
                    )}

                    {sc.effect_note && (
                      <div style={s.effectNoteBox}>
                        <span style={s.effectNoteIcon}>⚡</span>
                        <span style={s.effectNoteText}>{sc.effect_note}</span>
                      </div>
                    )}

                    {sc.sound_change && (
                      <div style={s.soundChangeBox}>
                        <span style={s.soundChangeIcon}>🔊</span>
                        <span style={s.soundChangeText}>{sc.sound_change}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {(!result.scenes || result.scenes.length === 0) && <div style={s.empty}>Nenhum guião de cenas gerado.</div>}
            </>)}
          </div>
        )}

        {phase === 3 && (
          <div style={s.section}>
            <span style={s.stamp}>THUMBNAIL</span>
            <p style={s.desc}>Estilo Mr. Nightmare. Gera o fundo com o prompt do Leonardo, faz upload aqui, e descarrega pronto a usar.</p>
            <div style={{ ...s.thumbBg, backgroundImage: uploadedBg ? ("url(" + uploadedBg + ")") : "none", backgroundSize: "cover", backgroundPosition: "center" }}>
              <div style={s.thumbOverlay} />
              <div style={s.thumbRedTop} />
              <div style={s.thumbContent}>
                <div style={{ fontSize: 11, letterSpacing: "0.25em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700 }}>DARK REFLEX</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#FFF", fontFamily: "Courier New", letterSpacing: "0.08em", lineHeight: 1.1, textTransform: "uppercase" }}>{thumbTitle || result?.case_title || "DARK REFLEX"}</div>
                <div style={{ width: 40, height: 3, background: "#8B1A1A", marginTop: 4 }} />
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#555", fontFamily: "Courier New", textAlign: "center", fontStyle: "italic", margin: 0 }}>
              {uploadedBg ? "Pré-visualização ao vivo" : "Cola o URL da imagem para pré-visualizar"}
            </p>
            <div style={s.card}>
              <span style={s.cardTitle}>CRIAR E DESCARREGAR</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.2em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700 }}>TÍTULO DA THUMBNAIL</span>
                <input style={s.titleInput} value={thumbTitle} onChange={e => setThumbTitle(e.target.value)} placeholder="EDITAR TÍTULO..." maxLength={40} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.2em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700 }}>IMAGEM DE FUNDO</span>
                <label style={{ display: "block", background: "#1a1a1a", border: "1px dashed #444", color: "#E8E0D0", padding: "14px 16px", fontFamily: "Courier New", fontSize: 12, cursor: "pointer", letterSpacing: "0.1em", borderRadius: 2, textAlign: "center" }}>
                  {uploadedBg ? "✓ IMAGEM CARREGADA — MUDAR" : "FAZER UPLOAD DA IMAGEM →"}
                  <input type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
                </label>
              </div>
              <button style={{ ...s.btn, opacity: uploadedBg ? 1 : 0.5 }} onClick={downloadThumb}>
                {uploadedBg ? "⬇ DESCARREGAR THUMBNAIL (1280×720 JPG)" : "FAZ UPLOAD DA IMAGEM PRIMEIRO"}
              </button>
            </div>
            {result?.midjourney_prompt && (
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={s.cardTitle}>PROMPT PARA IMAGEM IA (LEONARDO / META AI)</span>
                <button style={s.copyBtn} onClick={() => copy(result.midjourney_prompt, "mj")}>{copied === "mj" ? "✓ COPIADO" : "COPIAR"}</button>
              </div>
              <p style={s.mono}>{result.midjourney_prompt}</p>
            </div>
            )}
          </div>
        )}

        {phase === 5 && (
          <div style={s.section}>
            <span style={s.stamp}>INSTAGRAM — CARROSSEL</span>
            <p style={s.desc}>Independente do YouTube. Cola o texto do caso aqui → gera o carrossel → faz upload da imagem de cada slide → descarrega PNG pronto a publicar.</p>

            <textarea
              style={s.textarea}
              rows={8}
              value={igInput}
              onChange={e => setIgInput(e.target.value)}
              placeholder={"Cola aqui o texto do caso — resumo, factos, detalhes perturbadores.\nNão precisa de ter gerado nada na aba ENTRADA.\n\nExemplo: Em outubro de 1996, uma mulher fez check-in no Hotel Vintage Park em Seattle..."}
            />

            <button
              style={{ ...s.btn, opacity: igLoading || !igInput.trim() ? 0.4 : 1 }}
              onClick={generateInstagram}
              disabled={igLoading || !igInput.trim()}
            >
              {igLoading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><span style={s.spinner} />A GERAR CARROSSEL...</span>
                : igResult ? "REGENERAR CARROSSEL" : "GERAR CARROSSEL INSTAGRAM →"}
            </button>
            {igError && <div style={s.error}>{igError}</div>}

            {igResult && (
              <>
                {/* Caption + Hashtags */}
                <div style={s.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={s.cardTitle}>CAPTION + HASHTAGS</span>
                    <button style={s.copyBtn} onClick={() => copy(`${igResult.instagram_caption}\n\n${igResult.hashtags?.map(h => `#${h}`).join(" ")}`, "igcaption")}>
                      {copied === "igcaption" ? "✓ COPIADO" : "COPIAR"}
                    </button>
                  </div>
                  <p style={s.mono}>{igResult.instagram_caption}</p>
                  <p style={{ fontSize: 11, color: "#8B1A1A", fontFamily: "Courier New", lineHeight: 1.6 }}>
                    {igResult.hashtags?.map(h => `#${h}`).join(" ")}
                  </p>
                </div>

                {/* Slide selector */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {igResult.slides?.map((sl, i) => (
                    <button key={i}
                      style={{ ...s.copyBtn, padding: "8px 14px", ...(activeSlide === i ? { background: "#8B1A1A", color: "#E8E0D0", border: "1px solid #8B1A1A" } : {}) }}
                      onClick={() => setActiveSlide(i)}
                    >
                      {sl.type} {i + 1}
                    </button>
                  ))}
                </div>

                {/* Active slide */}
                {igResult.slides?.[activeSlide] && (() => {
                  const sl = igResult.slides[activeSlide];
                  const hasBg = !!slideImages[activeSlide];
                  const isCTA = sl.type === "CTA";
                  return (
                    <div style={s.card}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={s.cardTitle}>SLIDE {activeSlide + 1} — {sl.type}</span>
                      </div>

                      {/* Preview estilo Universos Despertos */}
                      {/* Preview — cartão de texto legível */}
                      <div style={{ background: "#0a0a0a", border: "1px solid #2C2C2C", borderLeft: "3px solid #8B1A1A", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Linha topo */}
                        <div style={{ height: 3, background: "#8B1A1A", margin: "-16px -16px 0 -16px", borderRadius: "4px 4px 0 0" }} />

                        {/* Arquivo + número */}
                        {!isCTA && (
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 48, fontWeight: 900, color: "#8B1A1A", fontFamily: "Courier New", lineHeight: 1 }}>{activeSlide + 1}</span>
                            <div>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "Courier New", letterSpacing: "0.05em" }}>{sl.arquivo_label}</div>
                              <div style={{ height: 1, width: 60, background: "rgba(139,26,26,0.5)", marginTop: 3 }} />
                            </div>
                          </div>
                        )}

                        {/* Texto principal branco */}
                        <div style={{ fontSize: 20, fontWeight: 900, color: "#FFFFFF", fontFamily: "Courier New", textTransform: "uppercase", lineHeight: 1.25 }}>
                          {sl.text_main_white}
                        </div>

                        {/* Texto vermelho */}
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#8B1A1A", fontFamily: "Courier New", textTransform: "uppercase", lineHeight: 1.2 }}>
                          {sl.text_main_red}
                        </div>

                        {/* Divisor */}
                        <div style={{ height: 1, background: "rgba(139,26,26,0.4)" }} />

                        {/* Subtexto */}
                        {sl.subtext_white && (
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Courier New", textTransform: "uppercase", lineHeight: 1.6 }}>
                            {sl.subtext_white}
                          </div>
                        )}
                        {sl.subtext_red && (
                          <div style={{ fontSize: 12, color: "#8B1A1A", fontFamily: "Courier New", textTransform: "uppercase", fontWeight: 700 }}>
                            {sl.subtext_red}
                          </div>
                        )}

                        {/* Logo */}
                        <div style={{ textAlign: "center", borderTop: "1px solid rgba(139,26,26,0.2)", paddingTop: 8 }}>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "Courier New", letterSpacing: "0.2em" }}>DARK REFLEX</span>
                        </div>
                      </div>

                      {!hasBg && (
                        <div style={{ fontSize: 11, color: "#555", fontFamily: "Courier New", fontStyle: "italic", textAlign: "center" }}>
                          Faz upload da imagem para ver com fundo
                        </div>
                      )}
                      {hasBg && (
                        <img src={slideImages[activeSlide]} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 4, opacity: 0.6 }} alt="fundo" />
                      )}

                      {/* Image prompt */}
                      <div style={s.scenePromptBox}>
                        <div style={s.scenePromptHeader}>
                          <span style={s.scenePromptLabel}>PROMPT IMAGEM (GPT / LEONARDO)</span>
                          <button style={s.copyBtnSm} onClick={() => copy(sl.image_prompt, `igprompt${activeSlide}`)}>
                            {copied === `igprompt${activeSlide}` ? "✓" : "COPIAR"}
                          </button>
                        </div>
                        <p style={s.scenePromptText}>{sl.image_prompt}</p>
                      </div>

                      {/* Upload */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700 }}>IMAGEM DO SLIDE</span>
                        <label style={{ display: "block", background: "#1a1a1a", border: "1px dashed #444", color: "#E8E0D0", padding: "12px", fontFamily: "Courier New", fontSize: 12, cursor: "pointer", borderRadius: 2, textAlign: "center" }}>
                          {hasBg ? "✓ IMAGEM CARREGADA — MUDAR" : "FAZER UPLOAD DA IMAGEM →"}
                          <input type="file" accept="image/*" onChange={e => handleSlideUpload(activeSlide, e)} style={{ display: "none" }} />
                        </label>
                      </div>

                      <button
                        style={{ ...s.btn, opacity: hasBg ? 1 : 0.5 }}
                        onClick={() => downloadSlide(sl, activeSlide)}
                      >
                        {hasBg ? `⬇ DESCARREGAR SLIDE ${activeSlide + 1} (1080×1350 JPG)` : "FAZ UPLOAD DA IMAGEM PRIMEIRO"}
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {phase === 4 && (
          <div style={s.section}>
            {!result ? (
              <div style={s.empty}>Gera um caso na aba ENTRADA para ver os dados de publicação.</div>
            ) : (<>
            <span style={s.stamp}>PUBLICAR</span>
            <p style={s.desc}>Pronto a copiar e colar no YouTube Studio. Otimizado para SEO.</p>
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={s.cardTitle}>TÍTULO DO VÍDEO</span>
                <button style={s.copyBtn} onClick={() => copy(result.youtube_title, "title")}>{copied === "title" ? "✓ COPIADO" : "COPIAR"}</button>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#E8E0D0", fontFamily: "Courier New", margin: 0, lineHeight: 1.5 }}>{result.youtube_title}</p>
              <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: (result.youtube_title?.length || 0) > 50 ? "#6abf6a" : "#f39c12", width: (Math.min(100, ((result.youtube_title?.length || 0) / 60) * 100)) + "%" }} />
              </div>
              <div style={{ fontSize: 11, color: "#6B6B6B", fontFamily: "Courier New", textAlign: "right", marginTop: 4 }}>{result.youtube_title?.length}/60 carateres</div>
            </div>
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={s.cardTitle}>DESCRIÇÃO</span>
                <button style={s.copyBtn} onClick={() => copy(result.youtube_description, "desc")}>{copied === "desc" ? "✓ COPIADO" : "COPIAR"}</button>
              </div>
              <p style={s.mono}>{result.youtube_description}</p>
            </div>
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={s.cardTitle}>TAGS ({result.tags?.length || 0})</span>
                <button style={s.copyBtn} onClick={() => copy(result.tags?.join(", "), "tags")}>{copied === "tags" ? "✓ COPIADO" : "COPIAR"}</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {result.tags?.map((t, i) => <span key={i} style={s.tag}>{t}</span>)}
              </div>
            </div>
            <button style={{ ...s.btn, marginTop: 16, background: "#1a1a1a" }} onClick={reset}>← NOVO CASO</button>
            </>)}
          </div>
        )}

        <div style={s.bottomNav}>
          {phase > 0 ? <button style={s.navBtn} onClick={() => setPhase(p => p - 1)}>← ANTERIOR</button> : <div />}
          {phase < 5 ? <button style={s.navBtn} onClick={() => setPhase(p => p + 1)}>SEGUINTE →</button> : <div />}
        </div>
      </div>
    </div>
  );
}

const styles = {
  igPreview: { position: "relative", width: "100%", aspectRatio: "4/5", background: "#0a0a0a", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "flex-end", border: "1px solid #2C2C2C" },
  igPreviewBg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 1 },
  igPreviewOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.15) 100%)", zIndex: 1 },
  igPreviewContent: { position: "relative", zIndex: 2, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, width: "100%" },
  igLogoArea: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  igRedLine: { flex: 1, height: 1, background: "#8B1A1A" },
  igChannelName: { fontSize: 10, letterSpacing: "0.2em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700, flexShrink: 0 },
  igTextAccent: { width: 40, height: 3, background: "#8B1A1A", marginBottom: 4 },
  igMainText: { fontSize: 22, fontWeight: 900, color: "#FFFFFF", fontFamily: "Courier New", letterSpacing: "0.05em", lineHeight: 1.2, textTransform: "uppercase" },
  igSubText: { fontSize: 14, fontWeight: 700, color: "#E8E0D0", fontFamily: "Courier New", marginTop: 4, textTransform: "uppercase" },
  igSwipe: { fontSize: 14, color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700, marginTop: 6, textAlign: "center" },
  igNoBg: { position: "absolute", top: "40%", left: 0, right: 0, textAlign: "center", fontSize: 11, color: "#555", fontFamily: "Courier New", fontStyle: "italic", zIndex: 3 },
  specsCard: { background: "#111", border: "1px solid #2C2C2C", borderRadius: 4, padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  specsToggle: { fontSize: 12, color: "#8a8a8a", fontFamily: "Courier New" },
  specsBlock: { display: "flex", flexDirection: "column", gap: 6, background: "#0a0a0a", borderRadius: 4, padding: 10 },
  specsBlockHeader: { display: "flex", flexDirection: "column", gap: 2, marginBottom: 4, borderBottom: "1px solid #1a1a1a", paddingBottom: 6 },
  specsBlockLabel: { fontSize: 12, fontWeight: 700, color: "#E8E0D0", fontFamily: "Courier New" },
  specsBlockSub: { fontSize: 10, color: "#6B6B6B", fontFamily: "Courier New", fontStyle: "italic" },
  specRow: { display: "flex", gap: 8, alignItems: "flex-start" },
  specKey: { fontSize: 10, letterSpacing: "0.08em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700, minWidth: 64, flexShrink: 0, paddingTop: 1 },
  specVal: { fontSize: 11, color: "#C0C0C0", fontFamily: "Courier New", lineHeight: 1.5 },
  sceneRow: { display: "flex", gap: 10, alignItems: "stretch" },
  sceneTsCol: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 64, gap: 2, paddingTop: 4 },
  sceneTsIn: { fontSize: 12, fontWeight: 700, color: "#E8E0D0", fontFamily: "Courier New" },
  sceneTsDash: { fontSize: 12, color: "#8B1A1A" },
  sceneTsOut: { fontSize: 12, fontWeight: 700, color: "#8a8a8a", fontFamily: "Courier New" },
  sceneCard: { flex: 1, background: "#111", border: "1px solid #2C2C2C", borderLeft: "3px solid #8B1A1A", borderRadius: 4, padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  scenePreview: { width: "100%", aspectRatio: "16/9", position: "relative", borderRadius: 4, overflow: "hidden", background: "#0a0a0a", border: "1px solid #2C2C2C" },
  scenePreviewBg: { position: "absolute", inset: 0 },
  scenePreviewPlaceholder: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)" },
  scenePreviewPlaceholderText: { fontSize: 11, color: "#444", fontFamily: "Courier New", letterSpacing: "0.1em" },
  scenePreviewOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%)", zIndex: 1 },
  scenePreviewRedBar: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#8B1A1A", zIndex: 3 },
  scenePreviewHighlight: { position: "absolute", top: "12%", left: "4%", zIndex: 2, display: "flex", alignItems: "center", gap: 6 },
  scenePreviewHighlightBar: { width: 4, height: 22, background: "#8B1A1A", flexShrink: 0 },
  scenePreviewHighlightText: { fontSize: 13, fontWeight: 900, color: "#FFFFFF", fontFamily: "Courier New", letterSpacing: "0.05em", textShadow: "0 1px 4px rgba(0,0,0,0.8)" },
  scenePreviewAutoCaption: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: "8px 8px" },
  scenePreviewAutoCaptionBg: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" },
  scenePreviewAutoCaptionText: { position: "relative", zIndex: 1, fontSize: 10, color: "#E8E0D0", fontFamily: "Courier New", display: "block", textAlign: "center", letterSpacing: "0.03em" },
  scenePreviewTimestamp: { position: "absolute", top: 6, right: 8, fontSize: 9, color: "rgba(192,57,43,0.8)", fontFamily: "Courier New", fontWeight: 700, zIndex: 3 },
  editorGuide: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 4, padding: 12, display: "flex", flexDirection: "column", gap: 8 },
  editorGuideTitle: { fontSize: 10, letterSpacing: "0.2em", color: "#E8E0D0", fontFamily: "Courier New", fontWeight: 700, marginBottom: 4 },
  editorStep: { display: "flex", gap: 8, alignItems: "flex-start" },
  editorStepNum: { fontSize: 10, fontWeight: 700, color: "#8B1A1A", fontFamily: "Courier New", background: "#1a0000", borderRadius: 2, padding: "1px 5px", flexShrink: 0, marginTop: 1 },
  editorStepText: { fontSize: 11, color: "#C0C0C0", fontFamily: "Courier New", lineHeight: 1.6 },
  sceneHeader: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sceneTs: { fontSize: 12, fontWeight: 700, color: "#E8E0D0", fontFamily: "Courier New", flex: 1 },
  sceneSourceTag: (source) => ({
    fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "Courier New",
    padding: "3px 8px", borderRadius: 2,
    color: source === "real" ? "#0A0A0A" : "#E8E0D0",
    background: source === "real" ? "#6abf6a" : "#7a4a1a",
  }),
  sceneCaption: { fontSize: 13, color: "#E8E0D0", fontFamily: "Courier New", lineHeight: 1.5, fontStyle: "italic" },
  scenePromptBox: { background: "#0a0a0a", border: "1px dashed #444", borderRadius: 4, padding: 10, display: "flex", flexDirection: "column", gap: 6 },
  scenePromptHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  scenePromptLabel: { fontSize: 9, letterSpacing: "0.15em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700 },
  scenePromptText: { fontSize: 11, color: "#C0C0C0", fontFamily: "Courier New", lineHeight: 1.6, margin: 0 },
  effectNoteBox: { display: "flex", alignItems: "flex-start", gap: 8, background: "#1a0d0d", border: "1px solid #3a2222", borderRadius: 4, padding: "8px 10px" },
  effectNoteIcon: { fontSize: 13, flexShrink: 0 },
  effectNoteText: { fontSize: 12, color: "#e8b8a8", fontFamily: "Courier New", lineHeight: 1.5 },
  soundChangeBox: { display: "flex", alignItems: "flex-start", gap: 8, background: "#0d1a14", border: "1px solid #224a35", borderRadius: 4, padding: "8px 10px" },
  soundChangeIcon: { fontSize: 13, flexShrink: 0 },
  soundChangeText: { fontSize: 12, color: "#9adfc0", fontFamily: "Courier New", lineHeight: 1.5 },
  emptyInline: { fontSize: 11, color: "#888", fontFamily: "Courier New", fontStyle: "italic" },
  modeToggle: { display: "flex", gap: 8, marginBottom: 4 },
  modeBtn: { flex: 1, background: "#111", border: "1px solid #2C2C2C", color: "#6B6B6B", padding: "10px 12px", fontFamily: "Courier New", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", borderRadius: 2 },
  modeBtnActive: { background: "#1a0000", border: "1px solid #8B1A1A", color: "#E8E0D0" },
  storySlot: { background: "#111", border: "1px solid #2C2C2C", borderRadius: 4, padding: 12, display: "flex", flexDirection: "column", gap: 8 },
  storySlotHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  storySlotLabel: { fontSize: 10, letterSpacing: "0.2em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700 },
  removeSlotBtn: { background: "transparent", border: "1px solid #3a2222", color: "#a05050", padding: "3px 8px", fontFamily: "Courier New", fontSize: 9, cursor: "pointer", borderRadius: 2, letterSpacing: "0.05em" },
  storyTextarea: { width: "100%", background: "#0a0a0a", border: "1px solid #2C2C2C", borderRadius: 4, color: "#E8E0D0", fontFamily: "Courier New", fontSize: 12, padding: "10px", resize: "vertical", lineHeight: 1.6, outline: "none", boxSizing: "border-box" },
  urlBadgeSm: { fontSize: 10, color: "#6abf6a", fontFamily: "Courier New" },
  addSlotBtn: { background: "transparent", border: "1px dashed #444", color: "#8a8a8a", padding: "10px", fontFamily: "Courier New", fontSize: 11, cursor: "pointer", borderRadius: 2, letterSpacing: "0.08em" },
  storyGroup: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 },
  storyGroupHeader: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #2C2C2C" },
  storyGroupTag: { fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "#0A0A0A", fontFamily: "Courier New", background: "#8B1A1A", padding: "3px 8px", borderRadius: 2 },
  storyGroupTitle: { fontSize: 13, color: "#E8E0D0", fontFamily: "Courier New", fontWeight: 700, flex: 1 },
  imgStoryTag: { fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#8B1A1A", fontFamily: "Courier New" },
  root: { minHeight: "100vh", background: "#0A0A0A", color: "#E8E0D0", fontFamily: "'Inter', sans-serif", maxWidth: 720, margin: "0 auto", paddingBottom: 80 },
  header: { textAlign: "center" },
  redBar: { height: 3, background: "#8B1A1A", width: "100%" },
  headerInner: { padding: "20px 24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  caseLabel: { fontSize: 10, letterSpacing: "0.3em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700 },
  title: { fontSize: 32, fontWeight: 900, letterSpacing: "0.15em", color: "#E8E0D0", margin: 0, fontFamily: "Courier New" },
  subtitle: { fontSize: 11, color: "#6B6B6B", letterSpacing: "0.2em", fontFamily: "Courier New" },
  tabs: { display: "flex", borderBottom: "1px solid #2C2C2C", overflowX: "auto" },
  tab: { flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, borderBottom: "2px solid transparent", minWidth: 60 },
  tabActive: { borderBottom: "2px solid #8B1A1A" },
  tabNum: { fontSize: 10, color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700 },
  tabLabel: { fontSize: 9, letterSpacing: "0.1em", color: "#E8E0D0", fontFamily: "Courier New", textAlign: "center" },
  content: { padding: "24px 16px" },
  section: { display: "flex", flexDirection: "column", gap: 16 },
  stamp: { fontSize: 10, letterSpacing: "0.25em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700, display: "block", marginBottom: 4 },
  desc: { fontSize: 13, color: "#6B6B6B", margin: 0, lineHeight: 1.6 },
  textarea: { width: "100%", background: "#111", border: "1px solid #2C2C2C", borderRadius: 4, color: "#E8E0D0", fontFamily: "Courier New", fontSize: 13, padding: "14px", resize: "vertical", lineHeight: 1.7, outline: "none", boxSizing: "border-box" },
  urlBadge: { background: "#0d1a0d", border: "1px solid #2a4a2a", color: "#6abf6a", padding: "10px 14px", borderRadius: 4, fontSize: 12, fontFamily: "Courier New", display: "flex", flexDirection: "column", gap: 8, marginTop: -8 },
  urlList: { display: "flex", flexDirection: "column", gap: 4, marginTop: 4, paddingTop: 8, borderTop: "1px solid #1a3a1a" },
  urlItem: { display: "flex", alignItems: "flex-start", gap: 4, fontSize: 11, fontFamily: "Courier New" },
  error: { background: "#1a0000", border: "1px solid #8B1A1A", color: "#ff6b6b", padding: "10px 14px", borderRadius: 4, fontSize: 13, fontFamily: "Courier New" },
  btn: { background: "#8B1A1A", color: "#E8E0D0", border: "none", padding: "16px 24px", fontFamily: "Courier New", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", borderRadius: 2, width: "100%" },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2px solid #E8E0D0", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  caseTitleBox: { background: "#111", border: "1px solid #2C2C2C", borderLeft: "3px solid #8B1A1A", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column", gap: 10 },
  caseTitleText: { fontSize: 20, fontWeight: 800, fontFamily: "Courier New", margin: 0, color: "#E8E0D0", letterSpacing: "0.05em" },
  durationBadge: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1a1a1a", borderRadius: 4, padding: "10px 14px" },
  durationLabel: { fontSize: 10, letterSpacing: "0.2em", color: "#6B6B6B", fontFamily: "Courier New", fontWeight: 700 },
  durationValue: { fontSize: 22, fontWeight: 900, color: "#E8E0D0", fontFamily: "Courier New" },
  copyBtn: { background: "transparent", border: "1px solid #3a3a3a", color: "#8a8a8a", padding: "4px 10px", fontFamily: "Courier New", fontSize: 10, cursor: "pointer", borderRadius: 2, letterSpacing: "0.1em" },
  copyBtnSm: { background: "transparent", border: "1px solid #3a3a3a", color: "#8a8a8a", padding: "2px 8px", fontFamily: "Courier New", fontSize: 10, cursor: "pointer", borderRadius: 2 },
  scriptBlock: { background: "#111", border: "1px solid #2C2C2C", borderRadius: 4, padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  blockTag: { fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "#8B1A1A", fontFamily: "Courier New", background: "#1a0000", padding: "2px 8px", borderRadius: 2 },
  narration: { fontSize: 13, lineHeight: 1.8, color: "#E8E0D0", fontFamily: "Courier New", margin: 0, whiteSpace: "pre-wrap" },
  metaRow: { display: "flex", gap: 8, alignItems: "flex-start" },
  metaLabel: { fontSize: 10, color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700, letterSpacing: "0.1em", flexShrink: 0, marginTop: 1 },
  metaVal: { fontSize: 12, color: "#8a8a8a", fontFamily: "Courier New", lineHeight: 1.5 },
  card: { background: "#111", border: "1px solid #2C2C2C", borderRadius: 4, padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  cardTitle: { fontSize: 11, letterSpacing: "0.2em", color: "#8B1A1A", fontFamily: "Courier New", fontWeight: 700, display: "block", marginBottom: 8 },
  imageRow: { display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid #1a1a1a", alignItems: "flex-start" },
  imageTs: { fontSize: 13, fontWeight: 700, color: "#8B1A1A", fontFamily: "Courier New", flexShrink: 0, minWidth: 48, marginTop: 2 },
  imgLink: { display: "inline-block", fontSize: 11, color: "#0A0A0A", background: "#6abf6a", fontFamily: "Courier New", textDecoration: "none", letterSpacing: "0.1em", fontWeight: 700, padding: "4px 10px", borderRadius: 2 },
  empty: { fontSize: 12, color: "#6B6B6B", fontFamily: "Courier New", padding: "12px 0", fontStyle: "italic" },
  thumbBg: { width: "100%", aspectRatio: "16/9", background: "#0d0d0d", borderRadius: 4, position: "relative", overflow: "hidden", border: "1px solid #2C2C2C", display: "flex", alignItems: "flex-end" },
  thumbOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.2) 100%)", zIndex: 1 },
  thumbRedTop: { position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#8B1A1A", zIndex: 3 },
  thumbContent: { position: "relative", zIndex: 2, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, width: "100%" },
  titleInput: { background: "#111", border: "1px solid #2C2C2C", color: "#E8E0D0", padding: "10px 14px", fontFamily: "Courier New", fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", borderRadius: 2, outline: "none", width: "100%", boxSizing: "border-box", textTransform: "uppercase" },
  uploadInputNative: { width: "100%", background: "#1a1a1a", border: "1px dashed #444", color: "#E8E0D0", padding: "10px 12px", fontFamily: "Courier New", fontSize: 12, cursor: "pointer", borderRadius: 2, boxSizing: "border-box" },
  uploadBtnLabel: { display: "block", position: "relative", background: "#1a1a1a", border: "1px dashed #444", color: "#E8E0D0", padding: "12px 16px", fontFamily: "Courier New", fontSize: 12, cursor: "pointer", letterSpacing: "0.1em", borderRadius: 2, textAlign: "center", overflow: "hidden" },
  uploadInput: { position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", fontSize: 0 },
  mono: { fontSize: 12, color: "#C0C0C0", fontFamily: "Courier New", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" },
  tag: { background: "#1a1a1a", border: "1px solid #3a3a3a", color: "#8a8a8a", padding: "4px 10px", borderRadius: 2, fontSize: 11, fontFamily: "Courier New" },
  bottomNav: { display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid #2C2C2C" },
  navBtn: { background: "transparent", border: "1px solid #3a3a3a", color: "#E8E0D0", padding: "10px 20px", fontFamily: "Courier New", fontSize: 12, cursor: "pointer", letterSpacing: "0.1em", borderRadius: 2 },
};

if (typeof document !== "undefined") {
  const st = document.createElement("style");
  st.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(st);
}
