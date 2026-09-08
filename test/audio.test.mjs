import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../public/audio-worklet.js', import.meta.url), 'utf8');
for (const sampleRate of [24000, 44100, 48000]) {
  test(`capture emits one second of 24 kHz PCM from ${sampleRate} Hz input`, () => {
    let Processor; const output = [];
    class AudioWorkletProcessor { constructor() { this.port = { postMessage: packet => output.push(packet) }; } }
    vm.runInNewContext(source, { AudioWorkletProcessor, sampleRate, registerProcessor: (_name, p) => { Processor = p; } });
    const processor = new Processor();
    for (let n=0;n<sampleRate + 128;n+=128) {
      const samples = new Float32Array(128).fill(0.5); processor.process([[samples]]);
    }
    assert.equal(output.length, 50);
    assert.ok(output.every(packet => packet.byteLength === 960));
    assert.equal(new DataView(output[0]).getInt16(0, true), 16384);
  });
}
test('capture handles silence without generating packets and clips out-of-range input', () => {
  let Processor; const output=[];
  class AudioWorkletProcessor { constructor() { this.port={postMessage:p=>output.push(p)}; } }
  vm.runInNewContext(source, {AudioWorkletProcessor,sampleRate:24000,registerProcessor:(_name,p)=>{Processor=p;}});
  const p=new Processor(); p.process([]); assert.equal(output.length,0);
  for(let i=0;i<4;i++) p.process([[new Float32Array(128).fill(-2)]]);
  assert.equal(new DataView(output[0]).getInt16(0,true),-32768);
});
