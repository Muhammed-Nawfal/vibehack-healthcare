/**
 * Mira backend API client.
 *
 * Base URL comes from VITE_API_BASE_URL if set (Vercel env var). Otherwise it
 * falls back to a hard-coded default per environment: localhost in dev, the
 * deployed Render backend in production. Hard-coding the prod fallback avoids
 * depending on Vercel's per-environment env var scoping being set correctly.
 * The intake interpretation returned here is INTERNAL routing data
 * (cluster classification) -- it must never be shown to the patient.
 */

const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8080/api'
  : 'https://mira-backend-b8ol.onrender.com/api';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL
).replace(/\/$/, '');

export type TriageCluster = 'RFM' | 'PREECLAMPSIA' | 'BLEEDING' | 'OTHER';

export interface IntakeInterpretation {
  primaryCluster: TriageCluster;
  additionalClusters: string[];
  extractedSignals: Record<string, unknown>;
  extractedAnswers: Record<string, string>;
  urgent999Suspected: boolean;
}

export interface CreateSessionResponse {
  sessionId: string;
  interpretation: IntakeInterpretation;
}

export type UrgencyLevel =
  | 'NHS_111'
  | 'EPU'
  | 'MAT_TRIAGE_NOW'
  | 'EMERGENCY_999';

export type PathwayAction = 'call' | 'self_monitor' | 'visit';

export interface TrustSummary {
  id: string;
  name: string;
}

export interface Contact {
  trustName: string;
  phoneNumber: string;
}

export interface Disposition {
  urgencyLevel: UrgencyLevel;
  pathwayName: string;
  pathwayAction: PathwayAction;
  patientMessage: string;
  safetyNetting: string;
  primaryContact: Contact;
  nearbyContacts: Contact[];
}

export interface AnswerEntry {
  questionId: string;
  answer: string;
}

export interface SubmitAnswersRequest {
  gestationWeeks: number;
  isPostnatal: boolean;
  trustId: string;
  global999Triggered: boolean;
  primaryCluster: TriageCluster;
  answers: AnswerEntry[];
  sweepAnswers: AnswerEntry[];
}

export interface ClinicianSummary {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  urgencyLevel: UrgencyLevel;
  recommendedAction: string;
  timestamp: string;
}

/** Context captured on the gestation screen and persisted in sessionStorage. */
export interface MiraContext {
  gestationWeeks: number;
  isPostnatal: boolean;
  trustId: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Creates a triage session from the patient's free-text concern. The backend
 * runs the LLM intake interpretation and returns the routing cluster.
 */
export async function createSession(
  freeText: string,
): Promise<CreateSessionResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/triage/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freeText }),
    });
  } catch {
    throw new ApiError(
      "We couldn't reach the service. Please check your connection and try again.",
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      'Something went wrong on our side. Please try again.',
      response.status,
    );
  }

  return (await response.json()) as CreateSessionResponse;
}

/** Fetches the synthetic trust list to populate the maternity-unit picker. */
export async function getTrusts(): Promise<TrustSummary[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/trusts`);
  } catch {
    throw new ApiError(
      "We couldn't load maternity units. Please check your connection and try again.",
      0,
    );
  }
  if (!response.ok) {
    throw new ApiError('Could not load maternity units.', response.status);
  }
  return (await response.json()) as TrustSummary[];
}

/**
 * Submits the completed (client-side) question flow. The backend's
 * deterministic rules engine returns the patient-facing disposition.
 */
export async function submitAnswers(
  sessionId: string,
  body: SubmitAnswersRequest,
): Promise<Disposition> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/triage/sessions/${encodeURIComponent(sessionId)}/answers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
  } catch {
    throw new ApiError(
      "We couldn't reach the service. Please check your connection and try again.",
      0,
    );
  }
  if (!response.ok) {
    throw new ApiError(
      'Something went wrong on our side. Please try again.',
      response.status,
    );
  }
  const data = (await response.json()) as { disposition: Disposition };
  return data.disposition;
}

/**
 * Fetches the clinician-only SBAR summary for a completed session. Used solely
 * by the separate /clinician route -- never from the patient flow.
 */
export async function getClinicianSummary(
  sessionId: string,
): Promise<ClinicianSummary> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/triage/sessions/${encodeURIComponent(sessionId)}/clinician-summary`,
    );
  } catch {
    throw new ApiError(
      "We couldn't reach the service. Please check your connection and try again.",
      0,
    );
  }
  if (response.status === 404) {
    throw new ApiError('No session found with that ID.', 404);
  }
  if (response.status === 409) {
    throw new ApiError('This triage session is not complete yet.', 409);
  }
  if (!response.ok) {
    throw new ApiError('Could not load the clinician summary.', response.status);
  }
  return (await response.json()) as ClinicianSummary;
}
