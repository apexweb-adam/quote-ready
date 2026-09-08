function wrap(ctx, text, x, y, width, lineHeight, maxLines) {
  const words = String(text).split(/\s+/); let line = '', lines = 0;
  for (let i = 0; i < words.length; i++) {
    const candidate = `${line} ${words[i]}`.trim();
    if (ctx.measureText(candidate).width > width && line) {
      ctx.fillText(line, x, y + lines++ * lineHeight); line = words[i];
      if (lines === maxLines - 1) { line = `${words.slice(i).join(' ')}`; break; }
    } else line = candidate;
  }
  if (line && lines < maxLines) {
    while (ctx.measureText(line).width > width && line.length > 1) line = line.slice(0,-2);
    ctx.fillText(line, x, y + lines * lineHeight);
  }
}

export function startDemoRecording(canvas, audioContext, snapshot) {
  if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') throw Error('This browser cannot export a session video. The guided demo remains available.');
  const type = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(t => MediaRecorder.isTypeSupported(t));
  if (!type) throw Error('No supported recording format. Run the guided demo without recording.');
  const audio = audioContext.createMediaStreamDestination();
  const videoStream = canvas.captureStream(25);
  const combined = new MediaStream([...videoStream.getVideoTracks(), ...audio.stream.getAudioTracks()]);
  const recorder = new MediaRecorder(combined,{mimeType:type,videoBitsPerSecond:2200000,audioBitsPerSecond:128000});
  const chunks = [], ctx = canvas.getContext('2d'), started = performance.now(); let frame, stopping = false, resolveStop, rejectStop;
  const finished = new Promise((resolve,reject) => { resolveStop=resolve;rejectStop=reject; });
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onerror = () => rejectStop(Error('The browser could not finish the recording.'));
  recorder.onstop = () => {
    cancelAnimationFrame(frame); combined.getTracks().forEach(t=>t.stop());
    resolveStop({blob:new Blob(chunks,{type}),extension:type.includes('mp4')?'mp4':'webm'});
  };
  function draw() {
    const data = snapshot(), elapsed = Math.floor((performance.now()-started)/1000);
    ctx.fillStyle='#101b24';ctx.fillRect(0,0,1280,720);
    ctx.fillStyle='#c4f28e';ctx.font='700 36px Arial';ctx.fillText('Q / QuoteReady',40,62);
    ctx.font='16px Arial';ctx.fillText('LIVE ASSEMBLYAI  ·  SYNTHETIC TEST CALLER',40,96);
    ctx.fillStyle='#a5b6be';ctx.textAlign='right';ctx.fillText(`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`,1240,60);ctx.fillText('quote-ready-voice.netlify.app',1240,96);ctx.textAlign='left';
    ctx.fillStyle='#f1f5f4';ctx.font='700 22px Arial';ctx.fillText('Recorded conversation',40,149);
    let y=193;
    for (const item of data.lines.slice(-2)) {
      ctx.fillStyle='#c4f28e';ctx.font='700 15px Arial';ctx.fillText(item.speaker,40,y);
      ctx.fillStyle='#f1f5f4';ctx.font='22px Arial';wrap(ctx,item.text,40,y+34,655,29,5);y+=208;
    }
    if (!data.lines.length) {ctx.fillStyle='#a5b6be';ctx.font='24px Arial';ctx.fillText('Connecting the live voice session…',40,218);}
    let row=141;
    for (const [key,label] of Object.entries(data.fields)) {
      const a=data.answers[key];ctx.fillStyle='#1b2c37';ctx.fillRect(755,row,485,93);
      ctx.fillStyle='#a5b6be';ctx.font='15px Arial';ctx.fillText(label.toUpperCase(),773,row+23);
      ctx.fillStyle=a?'#f1f5f4':'#7c939c';ctx.font='700 20px Arial';wrap(ctx,a?.value || a?.status || 'Waiting for caller',773,row+52,446,24,2);row+=101;
    }
    ctx.fillStyle='#c4f28e';ctx.font='700 18px Arial';ctx.fillText(`${Object.keys(data.answers).length} / 5 captured  ·  ${data.ready?'Ready for caller review':'Capturing actual tool results'}`,40,670);
    ctx.fillStyle='#a5b6be';ctx.font='14px Arial';ctx.fillText('A service-request draft. No price, booking or message is sent to a business.',40,702);
    if (!stopping) frame=requestAnimationFrame(draw);
  }
  draw();recorder.start(1000);
  return {
    audio,
    stop() { if(!stopping){stopping=true;recorder.stop();}return finished; }
  };
}
