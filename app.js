// Small modular front-end app implementing a local-only deferred repetition demo.
// Lots of comments follow so you (a backend dev) can understand the front-end flow.

// We use ES modules (type=module in the HTML script tag). All data is stored in
// localStorage under two keys:
// - 'phb_profile'  : user profile (name, native, priorities)
// - 'phb_progress' : per-language per-phrase progress for scheduling

// This file contains four main areas:
// 1) Utilities and data-loading
// 2) Onboarding UI and profile management
// 3) Session flow and SRS-like scheduler
// 4) Exercise generator and reporting

const PROFILE_KEY = 'phb_profile'
const PROGRESS_KEY = 'phb_progress'

// --- Utilities --------------------------------------------------------------
function qs(sel){return document.querySelector(sel)}
function qsa(sel){return Array.from(document.querySelectorAll(sel))}

// load JSON file with phrases. It's static and kept local.
async function loadPhrases(){
  const res = await fetch('phrases.json')
  if(!res.ok) throw new Error('Failed to load phrases.json')
  const data = await res.json()
  return data.languages
}

function saveProfile(profile){ localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)) }
function loadProfile(){ const v = localStorage.getItem(PROFILE_KEY); return v?JSON.parse(v):null }

function saveProgress(progress){ localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)) }
function loadProgress(){ const v = localStorage.getItem(PROGRESS_KEY); return v?JSON.parse(v):{} }

// get today's date in YYYY-MM-DD so scheduling is simple
function todayStr(){ return new Date().toISOString().slice(0,10) }

// Simple spaced-repetition step updater.
// We track per phrase an object: {interval: number (days), lastSeen: 'YYYY-MM-DD', ef: number}
// On correct: increase interval; on wrong: reset to 1 day.
function updateLearningState(state, correct){
  // state may be undefined initially
  if(!state){
    state = {interval:1,lastSeen:todayStr(),ef:2.5}
    if(!correct) state.interval = 1
    return state
  }
  if(correct){
    // very simplified SM-2 like update
    state.ef = Math.max(1.3, state.ef + 0.1)
    state.interval = Math.round(state.interval * state.ef) || 1
    state.lastSeen = todayStr()
  } else {
    state.ef = Math.max(1.3, state.ef - 0.2)
    state.interval = 1
    state.lastSeen = todayStr()
  }
  return state
}

// Determine whether an item is due based on its state and today's date.
function isDue(state){
  if(!state) return true
  const last = new Date(state.lastSeen)
  const next = new Date(last)
  next.setDate(next.getDate() + (state.interval||1))
  return (new Date()) >= next
}

// --- Onboarding / UI wiring -----------------------------------------------
let LANGS = [] // loaded from phrases.json

async function init(){
  LANGS = await loadPhrases()
  setupOnboarding(LANGS)
  // if a profile exists, directly show session
  const profile = loadProfile()
  if(profile){
    showSession(profile)
  }
}

function setupOnboarding(langs){
  const selectNative = qs('#select-native')
  const priorityList = qs('#priority-list')
  // populate select and checkboxes. For now translations are English-based.
  langs.forEach(l=>{
    const opt = document.createElement('option')
    opt.value = l.code
    opt.textContent = l.name
    selectNative.appendChild(opt)

    const lbl = document.createElement('label')
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.value = l.code
    lbl.appendChild(cb)
    lbl.appendChild(document.createTextNode(l.name))
    priorityList.appendChild(lbl)
  })

  // wire start button
  qs('#btn-start').addEventListener('click', ()=>{
    const name = qs('#input-name').value.trim() || 'Learner'
    const native = selectNative.value || 'en'
    const selected = qsa('#priority-list input:checked').map(i=>i.value)
    // ensure 3-5: if user chose fewer, fill with top languages
    let priorities = selected.slice(0,5)
    if(priorities.length < 3){
      // pick from LANGS until we have 3 (skip native)
      for(const l of LANGS){
        if(priorities.length>=3) break
        if(l.code===native) continue
        if(!priorities.includes(l.code)) priorities.push(l.code)
      }
    }

    // save profile
    const profile = {name, native, priorities}
    saveProfile(profile)
    // ensure progress structure contains entries for all language/phrases
    initializeProgress()
    showSession(profile)
  })

  qs('#btn-reset').addEventListener('click', ()=>{
    localStorage.removeItem(PROFILE_KEY)
    // keep progress, but return to onboarding
    location.reload()
  })
}

function initializeProgress(){
  const progress = loadProgress()
  LANGS.forEach(lang=>{
    if(!progress[lang.code]){
      progress[lang.code] = {}
    }
    // each phrase is represented by its token index (0..n-1)
    lang.full_tokens.forEach((tok, idx)=>{
      if(!progress[lang.code][idx]){
        progress[lang.code][idx] = null // not seen yet
      }
    })
  })
  saveProgress(progress)
}

// --- Session flow ---------------------------------------------------------
function showSession(profile){
  qs('#onboarding').classList.add('hidden')
  qs('#session').classList.remove('hidden')
  qs('#user-greeting').textContent = `${profile.name} — native: ${profile.native}`
  qs('#session-title').textContent = `Today's session — ${todayStr()}`

  // Choose a language for today's session. We'll pick one language from
  // priorities more frequently but also include others across days.
  runSession(profile)
}

function chooseLanguageForSession(profile){
  // Weighted choice: priorities get weight 3, others weight 1. But ensure all languages
  // appear across sessions by using a small chance for others.
  const pool = []
  LANGS.forEach(l=>{
    const weight = profile.priorities.includes(l.code) ? 3 : 1
    for(let i=0;i<weight;i++) pool.push(l)
  })
  // simple random pick
  return pool[Math.floor(Math.random()*pool.length)]
}

async function runSession(profile){
  const progress = loadProgress()
  const lang = chooseLanguageForSession(profile)

  // step 1: show full phrase and translation
  const idxs = lang.full_tokens.map((t,i)=>i)
  const full = lang.translations_en.join(' \u00A0•\u00A0 ')
  qs('#full-phrase').textContent = lang.translations_en.join('   ')
  // We show the English translations as the 'native' translation for demo purposes.
  qs('#full-translation').textContent = `(${profile.native}) — English shown here for demo: ${full}`

  // audio button: speak the phrase in the target language using SpeechSynthesis
  qs('#btn-play-tts').onclick = ()=>{
    speakText(lang.translations_en.join(', '), lang.code)
  }

  // generate exercises — at least 10
  const exercises = generateExercises(lang, profile, progress, 10)
  renderExercises(exercises, lang.code, progress)
}

// Use Web Speech Synthesis to speak target text. We attempt to pick a voice
// that roughly matches the language code. This is browser-dependent.
function speakText(text, langCode){
  if(!('speechSynthesis' in window)) return alert('Speech synthesis not supported in this browser')
  const utter = new SpeechSynthesisUtterance(text)
  // choose a voice that matches the lang code if possible
  const voices = speechSynthesis.getVoices()
  const match = voices.find(v=>v.lang && v.lang.startsWith(langCode))
  if(match) utter.voice = match
  utter.rate = 0.95
  speechSynthesis.speak(utter)
}

// --- Exercise generation -----------------------------------------------
// Each exercise object will be: {id, prompt, answer, direction, tokenIndex}
// direction: 'to_native' (target -> native) or 'from_native' (native -> target)
function generateExercises(lang, profile, progress, minCount){
  const exs = []
  const tokens = lang.full_tokens
  // We'll create exercises that ask for a translation of one token (or short phrase)
  // in either direction. We prefer tokens that are due (isDue) but ensure variety.

  // prepare candidate indices
  const candidates = tokens.map((t,i)=>i)
  // sort candidates by due-ness: due items first
  candidates.sort((a,b)=>{
    const sa = progress[lang.code] && progress[lang.code][a]
    const sb = progress[lang.code] && progress[lang.code][b]
    const da = isDue(sa) ? 0 : 1
    const db = isDue(sb) ? 0 : 1
    return da - db
  })

  // fill exercises preferring due tokens
  while(exs.length < minCount && candidates.length){
    const idx = candidates.shift()
    // add two variants for each token (target->native and native->target) if possible
    exs.push({id: `${lang.code}-${idx}-t2n`, tokenIndex: idx, prompt: lang.translations_en[idx], answer: lang.full_tokens[idx], direction:'to_native'})
    if(exs.length < minCount) exs.push({id: `${lang.code}-${idx}-n2t`, tokenIndex: idx, prompt: lang.full_tokens[idx], answer: lang.translations_en[idx], direction:'from_native'})
  }

  // if still short, repeat random tokens until minCount
  while(exs.length < minCount){
    const idx = Math.floor(Math.random()*tokens.length)
    const dir = Math.random() < 0.5 ? 'to_native' : 'from_native'
    if(dir==='to_native') exs.push({id:`${lang.code}-${idx}-t2n`,tokenIndex:idx,prompt:lang.translations_en[idx],answer:lang.full_tokens[idx],direction:dir})
    else exs.push({id:`${lang.code}-${idx}-n2t`,tokenIndex:idx,prompt:lang.full_tokens[idx],answer:lang.translations_en[idx],direction:dir})
  }

  // shuffle to avoid predictable pairs
  for(let i=exs.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1)); [exs[i],exs[j]]=[exs[j],exs[i]]
  }
  return exs
}

function renderExercises(exs, langCode, progress){
  const container = qs('#exercise-list')
  container.innerHTML = ''
  const answers = []

  exs.forEach((e, idx)=>{
    const div = document.createElement('div')
    div.className = 'exercise'
    const prompt = document.createElement('div')
    prompt.className = 'prompt'
    // highlight the token to translate
    prompt.innerHTML = `${idx+1}. <span class="muted">${e.direction==='to_native' ? 'Translate to native' : 'Translate to target'}</span> — <strong>${escapeHtml(e.prompt)}</strong>`
    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'Type your translation and press Enter'
    input.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Enter'){
        const val = input.value.trim()
        handleAnswer(e, val, div, langCode, progress)
        input.disabled = true
      }
    })

    // optional 'play' button for the prompt (speak the prompt in the appropriate language)
    const play = document.createElement('button')
    play.textContent = 'Play prompt'
    play.onclick = ()=>{
      // if direction is to_native (target->native) we speak the target; otherwise speak native prompt
      const speakLang = e.direction==='to_native' ? langCode : 'en'
      speakText(e.prompt, speakLang)
    }

    div.appendChild(prompt)
    div.appendChild(input)
    div.appendChild(play)
    container.appendChild(div)
  })

  // show finish button once user has attempted all answers
  const finishBtn = qs('#btn-finish')
  finishBtn.classList.remove('hidden')
  finishBtn.onclick = ()=>{
    // compute summary
    showSummary(progress)
  }
}

function handleAnswer(ex, userText, containerEl, langCode, progress){
  const correct = sanitize(userText) === sanitize(ex.answer)
  const res = document.createElement('div')
  res.className = correct ? 'result-correct' : 'result-wrong'
  res.textContent = correct ? 'Correct' : `Expected: ${ex.answer}`
  containerEl.appendChild(res)

  // update progress state for this token
  if(!progress[langCode]) progress[langCode] = {}
  const state = progress[langCode][ex.tokenIndex]
  progress[langCode][ex.tokenIndex] = updateLearningState(state, correct)
  saveProgress(progress)
}

function showSummary(progress){
  qs('#exercises').classList.add('hidden')
  qs('#summary').classList.remove('hidden')
  // compute simple stats for today's session
  let total=0, correct=0
  // for demo, read all languages' progress and count items lastSeen == today
  Object.keys(progress).forEach(lang=>{
    Object.values(progress[lang]).forEach(s=>{
      if(s){
        total++
        if(s.lastSeen === todayStr() && s.interval>1) correct++
      }
    })
  })
  qs('#summary-stats').textContent = `Updated ${total} learned items; ${correct} showed progress (quick heuristic).` 

  qs('#btn-next-day').onclick = ()=>{
    // simulate next day by subtracting 1 day from each lastSeen (for quick testing)
    const p = loadProgress()
    Object.keys(p).forEach(lang=>{
      Object.keys(p[lang]).forEach(idx=>{
        const s = p[lang][idx]
        if(s && s.lastSeen){
          const d = new Date(s.lastSeen)
          d.setDate(d.getDate()-1)
          s.lastSeen = d.toISOString().slice(0,10)
        }
      })
    })
    saveProgress(p)
    alert('Simulated moving to the next day. You can run another session now.')
  }

  qs('#btn-back-home').onclick = ()=>{
    // go back to onboarding/session home
    qs('#summary').classList.add('hidden')
    qs('#exercises').classList.remove('hidden')
  }
}

// small helpers
function sanitize(s){
  return String(s||'').toLowerCase().replace(/[\s]+/g,' ').trim()
}
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

// start app
init().catch(err=>{
  console.error(err)
  alert('Failed to start app: '+err.message)
})
