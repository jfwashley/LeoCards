// Minimal RN entry proving Metro resolves @leocards/domain across the workspace
// boundary (28.1-08). 28.2 replaces this entry with the real navigation shell.
import { registerRootComponent } from "expo";
import { createElement } from "react";
import { Text, View } from "react-native";
import { LEVEL_THRESHOLDS, habitatLevel } from "@leocards/domain/habitat";

const CARD_COUNT = 42;
const level = habitatLevel(CARD_COUNT);
const label = `Habitat level ${level} at ${CARD_COUNT} cards (thresholds: ${LEVEL_THRESHOLDS.join(",")})`;

function App() {
  return createElement(View, null, createElement(Text, null, label));
}

registerRootComponent(App);
