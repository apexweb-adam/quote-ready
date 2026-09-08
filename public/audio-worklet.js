// Original streaming linear resampler. Input follows the device sample rate;
// output is mono PCM16 at the provider's 24 kHz rate in 20 ms packets.
class IntakeCapture extends AudioWorkletProcessor {
  constructor() { super(); this.samples = []; this.position = 0; this.packet = []; }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (const sample of channel) this.samples.push(sample);
    const step = sampleRate / 24000;
    while (this.position + 1 < this.samples.length) {
      const left = Math.floor(this.position), mix = this.position - left;
      const value = this.samples[left] * (1 - mix) + this.samples[left + 1] * mix;
      this.packet.push(Math.round(Math.max(-1, Math.min(1, value)) * (value < 0 ? 32768 : 32767)));
      this.position += step;
      if (this.packet.length === 480) {
        const bytes = new ArrayBuffer(960), view = new DataView(bytes);
        this.packet.forEach((v, i) => view.setInt16(i * 2, v, true));
        this.port.postMessage(bytes, [bytes]); this.packet = [];
      }
    }
    const consumed = Math.floor(this.position);
    this.samples.splice(0, consumed); this.position -= consumed;
    return true;
  }
}
registerProcessor('intake-capture', IntakeCapture);
