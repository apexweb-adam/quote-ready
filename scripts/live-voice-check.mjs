import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { agentConfig, createIntake, addTranscript, capture, inspect, prepareReview } from '../public/intake.mjs';
import { flushToolResults } from '../public/tool-results.mjs';

// Explicit live integration check using fictional, synthesized speech. No microphone.
// Usage: node scripts/live-voice-check.mjs PORT intake.wav correction.wav evidence.json
const [port, firstPath, correctionPath, outputPath] = process.argv.slice(2);
if (!port || !firstPath || !correctionPath || !outputPath) throw Error('Missing check arguments');
async function pcm(path) {
  const wav = await readFile(path);
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') throw Error('WAV required');
  let valid = false;
  for (let p = 12; p + 8 <= wav.length;) {
    const kind = wav.toString('ascii', p, p + 4), size = wav.readUInt32LE(p + 4), start = p + 8;
    if (kind === 'fmt ') valid = wav.readUInt16LE(start) === 1 && wav.readUInt16LE(start + 2) === 1 && wav.readUInt32LE(start + 4) === 24000 && wav.readUInt16LE(start + 14) === 16;
    if (kind === 'data') { if (!valid) throw Error('Expected mono PCM16 at 24kHz'); return wav.subarray(start, start + size); }
    p = start + size + size % 2;
  }
  throw Error('WAV has no audio data');
}
const audio = [await pcm(firstPath), await pcm(correctionPath)];
const origin = `http://127.0.0.1:${port}`;
const response = await fetch(`${origin}/api/token`, { method: 'POST', headers: { Origin: origin, 'X-QuoteReady': 'voice' } });
const body = await response.json();
if (!response.ok) throw Error(body.error || 'Token unavailable');
const ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(body.token)}`);
const state = createIntake(), evidence = { at: new Date().toISOString(), mode: 'live-api-synthetic-speech', ready: false, audioBytesReceived: 0, transcripts: [], tools: [], errors: [], events: [] };
let pending = [], lastTurn = '', phase = 0, sending = false, ending = false, initialReviewRevision;
const calls = new Set();
function flush() {
  if (ending) return 0;
  return flushToolResults(pending, lastTurn, event => ws.send(JSON.stringify(event)));
}
async function sendAudio(index) {
  sending = true;
  for (let p = 0; p < audio[index].length && !ending; p += 2400) {
    ws.send(JSON.stringify({ type: 'input.audio', audio: audio[index].subarray(p, p + 2400).toString('base64') }));
    await delay(50);
  }
  for (let p = 0; p < 30 && !ending; p++) { ws.send(JSON.stringify({ type: 'input.audio', audio: Buffer.alloc(2400).toString('base64') })); await delay(50); }
  sending = false;
}
function end(reason) {
  if (ending) return;
  ending = true; evidence.reason = reason;
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'session.end' }));
  setTimeout(() => ws.close(), 1000);
}
const timer = setTimeout(() => end('time-limit'), 110000);
ws.onopen = () => ws.send(JSON.stringify({ type: 'session.update', session: agentConfig() }));
ws.onmessage = ({ data }) => {
  try {
    const e = JSON.parse(data);
    if (!evidence.events.includes(e.type)) evidence.events.push(e.type);
    if (e.type === 'session.ready') evidence.ready = true;
    if (e.type === 'reply.audio') evidence.audioBytesReceived += Buffer.from(e.data, 'base64').length;
    if (e.type === 'transcript.user') { addTranscript(state, e.text); evidence.transcripts.push({ speaker: 'synthetic-caller', text: e.text }); }
    if (e.type === 'transcript.agent') evidence.transcripts.push({ speaker: 'live-agent', text: e.text });
    if (e.type === 'reply.started' || e.type === 'input.speech.started') lastTurn = e.type;
    if (e.type === 'tool.call' && !calls.has(e.call_id)) {
      calls.add(e.call_id); let result;
      try {
        const args = typeof e.arguments === 'string' ? JSON.parse(e.arguments) : e.arguments;
        result = e.name === 'capture_answer' ? capture(state, args) : e.name === 'inspect_intake' ? inspect(state) : { error: 'Unsupported tool' };
        evidence.tools.push({ name: e.name, args, error: result.error });
      } catch (error) { result = { error: error.message }; evidence.errors.push(result.error); }
      pending.push({ id: e.call_id, result }); flush();
    }
    if (e.type === 'reply.done') {
      lastTurn = e.type;
      if (e.status === 'interrupted') pending = [];
      const flushed = flush();
      if (!flushed && !pending.length && lastTurn === 'reply.done' && !sending && !ending) {
        if (phase === 0) { phase = 1; sendAudio(0).catch(error => { evidence.errors.push(error.message); end('audio-error'); }); }
        else if (phase === 1 && inspect(state).missing.length === 0) {
          initialReviewRevision = prepareReview(state).revision; phase = 2;
          sendAudio(1).catch(error => { evidence.errors.push(error.message); end('audio-error'); });
        } else if (phase === 2 && /monday/i.test(state.answers.window?.value || '')) end('capture-and-correction-complete');
      }
    }
    if (e.type === 'session.error' || e.type === 'error') { evidence.errors.push({ code: e.code, message: e.message }); end('provider-error'); }
  } catch (error) { evidence.errors.push(error.message); end('event-error'); }
};
ws.onerror = () => { evidence.errors.push('WebSocket transport error'); end('transport-error'); };
ws.onclose = async () => {
  clearTimeout(timer); evidence.result = inspect(state);
  evidence.correctionInvalidatedReview = initialReviewRevision !== undefined && state.revision > initialReviewRevision && state.review === null;
  evidence.passed = evidence.ready && evidence.audioBytesReceived > 0 && !evidence.result.missing.length && /monday/i.test(state.answers.window?.value || '') && evidence.correctionInvalidatedReview && !evidence.errors.length;
  await writeFile(outputPath, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ passed: evidence.passed, reason: evidence.reason, fields: Object.keys(state.answers), correctionInvalidatedReview: evidence.correctionInvalidatedReview, errors: evidence.errors }));
  process.exitCode = evidence.passed ? 0 : 1;
};
