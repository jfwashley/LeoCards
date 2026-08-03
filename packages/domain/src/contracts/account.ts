/**
 * Wire shape for the native-v1 account-basics endpoint (GET /api/account).
 *
 * Two presentation strings the web account page computes locally — a
 * formatted join-date string and a localized display label for the native
 * language code — are deliberately not part of this contract. Both are
 * derived in the RSC via Intl.DateTimeFormat and a label lookup map; the
 * API returns only raw values (createdAt as an ISO string, nativeLanguage
 * as its bare code) so a native client formats and localises for itself.
 */
export interface AccountResponse {
  name: string;
  email: string;
  createdAt: string;
  nativeLanguage: string;
  pendingEmail: string | null;
}
