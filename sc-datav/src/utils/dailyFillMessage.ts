export const MANUAL_FILL_MESSAGE = "需要手动填写";

export function resolveDailyTrendMessage(
  statusMessage: string | null,
  data?: { manualRequired?: boolean; labels?: string[] } | null,
  fallback?: string
): string | null {
  if (statusMessage) return statusMessage;
  if (data?.manualRequired) return MANUAL_FILL_MESSAGE;
  if (!data?.labels?.length) return fallback ?? MANUAL_FILL_MESSAGE;
  return null;
}
