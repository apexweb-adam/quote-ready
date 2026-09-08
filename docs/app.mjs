import { fields, createIntake, addTranscript, capture, inspect, prepareReview, formatReview, confirmReview, agentConfig } from './intake.mjs';
import { flushToolResults } from './tool-results.mjs';
import { startDemoRecording } from './recording.mjs';
const $ = id => document.getElementById(id);
let state = createIntake(), configured = false, active = false, ws, context, stream, worklet;
let requiresInvite = false, maxSessionSeconds = 300;
let guidedMode = false, guidedStep = 0, guidedTimer, guidedSource, guidedAudio = [], recording, videoUrl, recordingLines = [];
let playbackAt = 0, sources = new Set(), pending = [], lastTurn = '', calls = new Map(), generation = 0;
let readyTimer, endTimer;
const notice = text => { $('notice').textContent = text; };
function line(speaker, text) {
  recordingLines.push({speaker,text}); if(recordingLines.length>8)recordingLines.shift();
  $('transcript').querySelector('.empty')?.remove();
  const p = document.createElement('p'), label = document.createElement('span');
  label.className = 'speaker'; label.textContent = speaker;
  p.append(label, document.createTextNode(text)); $('transcript').append(p);
  $('transcript').scrollTop = $('transcript').scrollHeight;
}
function render() {
  const info = inspect(state);
  $('answers').replaceChildren();
  for (const [key, label] of Object.entries(fields)) {
    const a = info.answers[key], row = document.createElement('div'); row.className = 'answer';
    const title = document.createElement('div'); title.className = 'answer-title';
    const name = document.createElement('span'), status = document.createElement('span');
    name.textContent = label; status.textContent = a ? a.status : 'Not yet asked'; title.append(name, status);
    const value = document.createElement('p'); value.textContent = a ? a.value || (a.status === 'declined' ? 'Caller chose not to share' : 'Needs clarification') : '—';
    row.append(title, value);
    if (a) { const evidence = document.createElement('blockquote'); evidence.textContent = a.evidence; row.append(evidence); }
    $('answers').append(row);
  }
  $('progress').textContent = `${5 - info.missing.length} / 5 captured`;
  $('readiness').textContent = info.missing.length ? `Next detail: ${fields[info.missing[0]]}` : info.followUp.length ? 'All fields addressed. Some details need a professional’s follow-up.' : 'Details captured. Review before downloading.';
  $('review').disabled = Boolean(info.missing.length || active);
  $('review-box').hidden = !state.review;
  if (!state.review) { $('approve').checked = false; $('download').disabled = true; }
  $('invite-box').hidden = !requiresInvite;
  $('start').disabled = active || !configured || !$('consent').checked || (requiresInvite && !$('invite').value.trim());
  $('stop').disabled = !active;
  $('sample').disabled = active;
  for (const id of ['guided','record-guided']) $(id).disabled = active || !configured || (requiresInvite && !$('invite').value.trim());
}
function silence() { for (const src of sources) { try { src.stop(); } catch {} } sources.clear(); playbackAt = context?.currentTime || 0; }
async function finish(text = 'Conversation ended. Review your captured details.') {
  generation++; active = false; clearTimeout(readyTimer); clearTimeout(endTimer); silence();
  clearTimeout(guidedTimer); try {guidedSource?.stop();}catch{} guidedSource=null;
  $('consent').checked = false;
  stream?.getTracks().forEach(t => t.stop()); stream = null;
  if (recording) {
    const current=recording;recording=null;
    try {
      const result=await current.stop();
      if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl=URL.createObjectURL(result.blob);
      $('video-download').href=videoUrl;$('video-download').download=`quoteready-live-demo.${result.extension}`;$('video-download').hidden=false;
    } catch {text+=' Video export could not be completed.';}
  }
  worklet?.disconnect(); worklet = null;
  if (context && context.state !== 'closed') await context.close(); context = null;
  const socket = ws; ws = null;
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'session.end' }));
    setTimeout(() => socket.close(), 1000);
  } else socket?.close();
  pending = []; calls.clear(); $('connection').textContent = 'Not connected'; notice(text); render();
}
function flush() {
  if (lastTurn !== 'reply.done' || ws?.readyState !== WebSocket.OPEN || !pending.length) return;
  return flushToolResults(pending, lastTurn, event => ws.send(JSON.stringify(event)));
}
function play(base64) {
  if (!context) return;
  const raw = atob(base64);
  if (raw.length % 2) throw Error('Invalid audio frame');
  const buffer = context.createBuffer(1, raw.length / 2, 24000), channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) { const unsigned = raw.charCodeAt(i * 2) | raw.charCodeAt(i * 2 + 1) << 8; channel[i] = (unsigned > 32767 ? unsigned - 65536 : unsigned) / 32768; }
  const node = context.createBufferSource(); node.buffer = buffer; node.connect(context.destination);
  if(recording)node.connect(recording.audio);
  sources.add(node); node.onended = () => sources.delete(node);
  playbackAt = Math.max(playbackAt, context.currentTime); node.start(playbackAt); playbackAt += buffer.duration;
}
function advanceGuided(run) {
  if (!guidedMode || run!==generation || !context || pending.length) return;
  const complete=inspect(state).missing.length===0;
  const next=guidedStep===0?0:guidedStep===1&&complete?1:guidedStep===2&&/monday/i.test(state.answers.window?.value||'')?2:null;
  if(next===null)return;
  guidedStep++;clearTimeout(guidedTimer);
  const wait=Math.max(0,playbackAt-context.currentTime)*1000+700;
  guidedTimer=setTimeout(async()=>{
    if(run!==generation||!context)return;
    if(next===2){
      // Keep the final real state visible briefly before closing the recording.
      await finish('Guided live demo complete. Review the actual captured details before downloading the draft.');
      $('review-text').textContent=formatReview(prepareReview(state));render();return;
    }
    const original=guidedAudio[next], padded=context.createBuffer(1,original.length+Math.ceil(context.sampleRate*1.8),context.sampleRate);
    padded.copyToChannel(original.getChannelData(0),0);
    guidedSource=context.createBufferSource();guidedSource.buffer=padded;guidedSource.connect(worklet);guidedSource.connect(context.destination);
    if(recording)guidedSource.connect(recording.audio);
    guidedSource.start();
  },wait);
}
async function start({guided=false,record=false}={}) {
  if (active || !configured || (!guided && !$('consent').checked)) return;
  state = createIntake(); $('transcript').replaceChildren();
  guidedMode=guided;guidedStep=0;recordingLines=[];
  $('recording-preview').hidden=!record;$('video-download').hidden=true;
  active = true; const run = ++generation;
  pending = []; calls.clear(); lastTurn = ''; render(); notice('Preparing your voice session…');
  try {
    context = new AudioContext(); await context.resume();
    const headers = { 'X-QuoteReady': 'voice' };
    if (requiresInvite) headers['X-QuoteReady-Invite'] = $('invite').value.trim();
    const r = await fetch('/api/token', { method: 'POST', headers });
    const body = await r.json(); if (!r.ok) throw Error(body.error);
    if (run !== generation) return;
    if(guided){
      notice('Loading the synthesized demonstration caller…');
      guidedAudio=await Promise.all(['intake','correction'].map(async name=>{
        const response=await fetch(`/fixtures/${name}.wav`);if(!response.ok)throw Error('Demonstration audio is unavailable.');
        return context.decodeAudioData(await response.arrayBuffer());
      }));
      if(run!==generation)return;
    } else {
      notice('Connecting your microphone…');
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      if (run !== generation) { media.getTracks().forEach(t => t.stop()); return; }
      stream = media;
    }
    await context.audioWorklet.addModule('/audio-worklet.js');
    if (run !== generation) return;
    worklet = new AudioWorkletNode(context, 'intake-capture');
    if(stream)context.createMediaStreamSource(stream).connect(worklet);
    const mute = context.createGain(); mute.gain.value = 0; worklet.connect(mute).connect(context.destination);
    if(record)recording=startDemoRecording($('demo-canvas'),context,()=>({fields,answers:state.answers,lines:recordingLines,ready:inspect(state).missing.length===0}));
    ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(body.token)}`);
    let ready = false;
    worklet.port.onmessage = ({ data }) => {
      if (ready && run === generation && ws?.readyState === WebSocket.OPEN) {
        let binary = ''; for (const byte of new Uint8Array(data)) binary += String.fromCharCode(byte);
        ws.send(JSON.stringify({ type: 'input.audio', audio: btoa(binary) }));
      }
    };
    readyTimer = setTimeout(() => { if (run === generation) finish('Voice service did not become ready. Please try again.'); }, 20000);
    ws.onopen = () => { if (run === generation) ws.send(JSON.stringify({ type: 'session.update', session: agentConfig() })); };
    ws.onmessage = ({ data }) => {
      if (run !== generation) return;
      try {
        const e = JSON.parse(data);
        if (e.type === 'session.ready') {
          ready = true; clearTimeout(readyTimer); $('connection').textContent = 'Voice connected'; $('mode').textContent = guided?'Live demo · synthetic caller':'Live voice session';
          notice(guided?'Running the real voice service with synthesized test speech. Your microphone is closed.':`Listening. You can interrupt or correct an answer. Sessions end after ${maxSessionSeconds / 60} minutes.`);
          endTimer = setTimeout(() => finish('Session time limit reached. Your details remain available for review.'), maxSessionSeconds * 1000);
        } else if (e.type === 'transcript.user') { addTranscript(state, e.text); line(guided?'SYNTHETIC CALLER':'YOU', e.text); }
        else if (e.type === 'transcript.agent') line('QUOTEREADY', e.text);
        else if (e.type === 'reply.audio') play(e.data);
        else if (e.type === 'input.speech.started' || e.type === 'reply.started') { lastTurn = e.type; if (e.type === 'input.speech.started') silence(); }
        else if (e.type === 'reply.done') {
          lastTurn = e.type;
          if (e.status === 'interrupted') { pending = []; silence(); }
          else {const sent=flush();if(!sent)advanceGuided(run);}
        } else if (e.type === 'tool.call') {
          if (calls.has(e.call_id)) return;
          let result;
          try {
            const args = typeof e.arguments === 'string' ? JSON.parse(e.arguments) : e.arguments;
            if (e.name === 'capture_answer') result = capture(state, args);
            else if (e.name === 'inspect_intake') result = inspect(state);
            else throw Error('Unsupported tool');
          } catch (error) { result = { error: error.message }; }
          calls.set(e.call_id, result); pending.push({ id: e.call_id, result }); render(); flush();
        } else if (['session.error', 'error'].includes(e.type)) finish('Voice service reported an error. Your captured details are preserved.');
        else if (e.type === 'session.ended') finish();
      } catch { finish('A voice event could not be processed. Your captured details are preserved.'); }
    };
    ws.onerror = () => { if (run === generation) finish('Voice connection failed. Check AssemblyAI access and retry.'); };
    ws.onclose = () => { if (run === generation) finish(); };
  } catch (error) { if (run === generation) await finish(error.message || 'Could not start the voice session.'); }
}
$('start').onclick = () => start();
$('guided').onclick = () => start({guided:true});
$('record-guided').onclick = () => start({guided:true,record:true});
$('stop').onclick = () => finish();
$('consent').onchange = render;
$('invite').oninput = render;
$('sample').onclick = () => {
  state = createIntake(); $('transcript').replaceChildren(); $('mode').textContent = 'Fictional sample';
  const examples = [
    ['service', 'I need a quote to install a kitchen extractor fan.'],
    ['equipment', 'It is a wall-mounted cooker hood in a flat.'],
    ['area', 'The property is in Gyula.'],
    ['access', 'It is on the second floor, with no lift.'],
    ['window', 'Friday afternoon would be best.']
  ];
  for (const [field, text] of examples) { addTranscript(state, text); line('SAMPLE CALLER', text); capture(state, { field, value: text, status: 'known', evidence: text }); }
  notice('Fictional sample loaded. This did not use a microphone or AssemblyAI. Try correcting a detail, then prepare the review.'); render();
};
$('reset').onclick = async () => { await finish('Session cleared.'); state = createIntake(); $('transcript').replaceChildren(); $('mode').textContent = document.documentElement.dataset.mode==='sample'?'Interactive sample':requiresInvite?'Live voice prototype':'Local prototype'; render(); };
for (const [key, label] of Object.entries(fields)) { const option = document.createElement('option'); option.value = key; option.textContent = label; $('field').append(option); }
$('correction').onsubmit = e => {
  e.preventDefault(); if (active) return notice('End the conversation before making a manual correction.');
  try { const text = $('value').value.trim(); addTranscript(state, text); capture(state, { field: $('field').value, status: 'known', value: text, evidence: text }); line('MANUAL CORRECTION', text); $('value').value = ''; render(); notice('Correction applied. Review the new version before downloading.'); }
  catch (error) { notice(error.message); }
};
$('review').onclick = () => { try { const review = prepareReview(state); $('review-text').textContent = formatReview(review); $('approve').checked = false; $('download').disabled = true; render(); } catch (error) { notice(error.message); } };
$('approve').onchange = () => { $('download').disabled = !$('approve').checked; };
$('download').onclick = () => {
  try {
    const draft = confirmReview(state, state.review?.revision, $('approve').checked);
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'quoteready-request-draft.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice('Reviewed draft downloaded. No request has been sent and no booking has been made.');
  } catch (error) { notice(error.message); }
};
window.addEventListener('pagehide', () => { stream?.getTracks().forEach(t => t.stop()); if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'session.end' })); ws?.close(); });
try {
  if (document.documentElement.dataset.mode === 'sample') {
    $('mode').textContent = 'Interactive sample';
    document.querySelector('.guided-controls').hidden=true;
    $('consent').closest('label').hidden = true; $('start').hidden = true; $('stop').hidden = true;
    notice('Public sample: try the fictional example, correct a detail and download a reviewed draft. Live voice runs from the repository with your own AssemblyAI access.');
  } else {
    const r = await fetch('/api/config'), config = await r.json();
    configured = config.liveConfigured; requiresInvite = config.requiresInvite === true;
    if(requiresInvite)$('mode').textContent='Live voice prototype';
    maxSessionSeconds = Number.isFinite(config.maxSessionSeconds) ? Math.min(300,Math.max(60,config.maxSessionSeconds)) : 300;
    notice(configured ? 'Voice access is configured. Consent and microphone permission are required to start.' : 'Live voice is not configured yet. Explore the fictional example and review workflow.');
  }
}
catch { notice('Local server unavailable. Restart the app.'); }
render();
