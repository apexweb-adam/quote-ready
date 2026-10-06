import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { createIntake, addTranscript, capture, inspect, prepareReview, confirmReview } from '../public/intake.mjs';

export class RequestStore {
  constructor(file) {
    this.file = file;
    this.requests = file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  }
  save(next) {
    if (this.file) {
      mkdirSync(dirname(this.file), { recursive: true });
      writeFileSync(`${this.file}.tmp`, JSON.stringify(next), { mode: 0o600 });
      renameSync(`${this.file}.tmp`, this.file);
    }
    this.requests = next;
  }
  get(id) {
    if (!Object.hasOwn(this.requests, id)) throw Error('Unknown request');
    return structuredClone(this.requests[id]);
  }
  change(id, action) {
    const request = this.get(id);
    const result = action(request);
    this.save({ ...this.requests, [id]: request });
    return structuredClone(result);
  }
  start(label) {
    if (Object.keys(this.requests).length >= 100) throw Error('Local demo request limit reached');
    const id = randomUUID();
    this.save({ ...this.requests, [id]: { id, label, intake: createIntake(), offers: [], offerRevision: 0, prepared: null, approved: null } });
    return this.report(id);
  }
  report(id) {
    const r = this.get(id);
    return { id, label: r.label, ...inspect(r.intake), offers: r.offers.map(o => ({ ...o, stale: o.requestRevision !== r.intake.revision })),
      snapshot: `${r.intake.revision}:${r.offerRevision}`, reviewed: r.approved === `${r.intake.revision}:${r.offerRevision}`,
      evidenceSource: 'Client-supplied text, requiring human review', delivery: 'local-document-only', booking: null };
  }
  answer(id, args) {
    this.change(id, r => {
      if (args.expectedRevision !== r.intake.revision) throw Error('Request changed; inspect the current revision');
      const before = r.intake.revision;
      addTranscript(r.intake, args.utterance);
      capture(r.intake, { field: args.field, status: args.status, value: args.value, evidence: args.utterance });
      if (r.intake.revision !== before) { r.prepared = null; r.approved = null; }
    });
    return this.report(id);
  }
  offer(id, args) {
    this.change(id, r => {
      if (args.expectedRevision !== r.intake.revision) throw Error('Request changed; inspect the current revision');
      if (inspect(r.intake).missing.length) throw Error('Complete the request before adding an offer');
      if (r.offers.length >= 10) throw Error('Offer limit reached');
      r.offers.push({ id: randomUUID(), requestRevision: r.intake.revision, supplier: args.supplier,
        amountMinor: args.amountMinor, currency: args.currency, includesParts: args.includesParts,
        sourceText: args.sourceText, source: 'Client-supplied offer, not independently verified' });
      r.offerRevision++;
      r.prepared = null;
      r.approved = null;
      r.intake.confirmed = null;
    });
    return this.report(id);
  }
  prepare(id) {
    return this.change(id, r => {
      const intake = prepareReview(r.intake);
      const offers = r.offers.map(o => ({ ...o, stale: o.requestRevision !== r.intake.revision }));
      const warnings = [];
      if (intake.followUp.length) warnings.push('Some request fields require follow-up.');
      if (offers.some(o => o.stale)) warnings.push('The request changed after these offers. Ask suppliers for updated offers.');
      if (offers.some(o => o.includesParts !== true)) warnings.push('Parts are excluded or unspecified. Listed amounts are not comparable total costs.');
      if (new Set(offers.map(o => o.currency)).size > 1) warnings.push('Currencies differ; no currency conversion or cheapest-offer claim is made.');
      r.prepared = { requestId: id, label: r.label, snapshot: `${r.intake.revision}:${r.offerRevision}`, intake, offers, warnings,
        purpose: 'A request and offer comparison for human review. No supplier contacted, price verified, payment made or appointment booked.' };
      r.approved = null;
      return r.prepared;
    });
  }
  approve(id, snapshot) {
    return this.change(id, r => {
      if (!r.prepared || r.prepared.snapshot !== snapshot || snapshot !== `${r.intake.revision}:${r.offerRevision}`) throw Error('The draft changed. Prepare and review the current version first');
      confirmReview(r.intake, r.intake.revision, true);
      r.approved = snapshot;
      return { reviewed: true, snapshot };
    });
  }
  export(id) {
    const r = this.get(id);
    if (!r.prepared || r.approved !== `${r.intake.revision}:${r.offerRevision}`) throw Error('Human screen review is required for the current draft');
    return { ...structuredClone(r.prepared), reviewed: true, delivery: 'local-document-only', booking: null, payment: null };
  }
}
