export type Field = 'service' | 'equipment' | 'area' | 'access' | 'window';
export type AnswerStatus = 'known' | 'unknown' | 'declined';
export type IntakeStatus = 'collecting' | 'follow-up-needed' | 'ready-for-review' | 'reviewed-draft';
export interface Answer { status: AnswerStatus; value: string; evidence: string; }
export interface CaptureArgs extends Answer { field: Field; }
export interface Report {
  revision: number;
  answers: Partial<Record<Field, Answer>>;
  missing: Field[];
  followUp: Field[];
  nextQuestion: string | null;
  status: IntakeStatus;
}
export interface Review extends Report { preparedAt: string; }
export interface Draft extends Review {
  reviewedAt: string;
  kind: 'service-request-draft';
  delivery: 'local-download-only';
  price: null;
  booking: null;
}
/** Legacy mutable state. Prefer createSession() for integrations. */
export interface IntakeState {
  revision: number;
  answers: Partial<Record<Field, Answer>>;
  transcript: string[];
  review: Review | null;
  confirmed: Draft | null;
}
export interface Session {
  addTranscript(text: string): void;
  capture(args: CaptureArgs): Report;
  inspect(): Report;
  prepareReview(): Review;
  confirmReview(revision: number, approved: true): Draft;
}
export declare const fields: Readonly<Record<Field, string>>;
export declare function createIntake(): IntakeState;
export declare function addTranscript(state: IntakeState, text: string): void;
export declare function capture(state: IntakeState, args: CaptureArgs): Report;
export declare function inspect(state: IntakeState): Report;
export declare function prepareReview(state: IntakeState): Review;
export declare function formatReview(report: Review): string;
export declare function confirmReview(state: IntakeState, revision: number, approved: true): Draft;
export declare function createSession(): Readonly<Session>;
