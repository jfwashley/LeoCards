// Every native-v1 endpoint's wire shape, plus the single core-function error
// convention (DR-03). Pure TypeScript types and one small constant map —
// deliberately zero runtime dependencies (no schema-validation library) so a
// native or web client can import a response type at zero bundle cost.
export * from "./account";
export * from "./cards";
export * from "./dashboard";
export * from "./decks";
export * from "./errors";
export * from "./study";
