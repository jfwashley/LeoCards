/**
 * Wire shape for the native-v1 create-deck endpoint (POST /api/decks).
 * Matches createDeck's existing return (src/lib/deck-actions.ts).
 */
export interface CreateDeckResponse {
  id: string;
  name: string;
  language: string;
}
