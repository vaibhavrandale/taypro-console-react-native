import { apiFetch } from './client';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function summarizeText(text: string): Promise<string> {
  const response = await apiFetch('/openai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const errorPayload = isRecord(payload) ? payload : {};
    throw new Error(
      String(errorPayload.message ?? errorPayload.error ?? 'Failed to improve text'),
    );
  }

  if (isRecord(payload) && typeof payload.summarizedText === 'string') {
    return payload.summarizedText;
  }

  throw new Error('No improved text returned');
}
