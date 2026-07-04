function isAbortOrTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const msg = err.message.toLowerCase();
  return (
    err.name === 'AbortError' ||
    msg.includes('cancel') ||
    msg.includes('abort') ||
    msg.includes('timed out')
  );
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 30000, signal: externalSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (err) {
    if (isAbortOrTimeoutError(err)) {
      if (externalSignal?.aborted) {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        throw err;
      }
      throw new Error(
        `Could not reach server at ${url}. Check that the backend is running and the API URL is correct.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
