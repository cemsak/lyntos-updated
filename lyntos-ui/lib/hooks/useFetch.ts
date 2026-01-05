export async function authFetch<T>(
  url: string,
  smmm: string = 'HKOZKAN',
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'DEV_' + smmm,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }

  return response.json();
}
