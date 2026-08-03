// ============================================================
// Branded types — prevent ID mix-ups at the TypeScript level
// ============================================================

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type UserId = Brand<string, "UserId">;
export type DeckId = Brand<string, "DeckId">;
export type CardId = Brand<string, "CardId">;
export type RecallEventId = Brand<string, "RecallEventId">;
export type RecallDirection = "n2t" | "t2n";
