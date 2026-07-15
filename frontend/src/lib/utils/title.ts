export function buildDetailTitle(prefix?: string | null, value?: string | number | null) {
  const normalizedPrefix = prefix?.toString().trim();
  const normalizedValue = value?.toString().trim();

  if (normalizedPrefix && normalizedValue) {
    return `${normalizedPrefix} ${normalizedValue}`;
  }

  if (normalizedPrefix) {
    return normalizedPrefix;
  }

  if (normalizedValue) {
    return normalizedValue;
  }

  return 'Detail';
}
