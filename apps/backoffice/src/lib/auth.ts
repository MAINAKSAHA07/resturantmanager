'use client';

import { createPocketBaseClient } from '@restaurant/lib';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pb_auth_token');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pb_auth_token', token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('pb_auth_token');
}

export function getAuthenticatedClient() {
  const token = getAuthToken();
  if (!token) return null;
  return createPocketBaseClient(token);
}

export async function checkAuth(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const pb = createPocketBaseClient(token);
    // Verify token is valid by checking auth
    pb.authStore.loadFromCookie(document.cookie);
    return pb.authStore.isValid;
  } catch {
    return false;
  }
}

