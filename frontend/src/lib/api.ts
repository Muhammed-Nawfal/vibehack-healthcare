/**
 * Mira backend API client.
 *
 * Base URL comes from VITE_API_BASE_URL. In dev, it defaults to the local
 * Spring Boot API. In production, it defaults to same-origin `/api` so a reverse
 * proxy or single-domain deployment can route API traffic without localhost.
 * The intake interpretation returned here is INTERNAL routing data
 * (cluster classification) -- it must never be shown to the patient.
 */

const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8080/api'
  : '/api';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL
).replace(/\/$/, '');

export type TriageCluster = 'RFM' | 'PREECLAMPSIA' | 'BLEEDING' | 'OTHER';

export interface IntakeInterpretation {
  primaryCluster: TriageCluster;
  additionalClusters: string[];
  extractedSignals: Record<string, unknown>;
  urgent999Suspected: boolean;
}

export interface CreateSessionResponse {
  sessionId: string;
  interpretation: IntakeInterpretation;
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
