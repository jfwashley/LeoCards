/**
 * Wire shape for the native-v1 create-card endpoint (POST /api/cards).
 * Matches saveCard's existing return (src/lib/deck-actions.ts).
 */
export interface CreateCardResponse {
  id: string;
}
