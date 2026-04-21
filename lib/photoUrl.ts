const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}
