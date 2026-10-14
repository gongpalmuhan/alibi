export { fourPlayersScenario } from "./fourPlayers";
export { fivePlayersScenario } from "./fivePlayers";
export { sixPlayersScenario } from "./sixPlayers";

import type { CrimeScene } from "../../../../packages/shared/src/timeline";

import { fourPlayersScenario } from "./fourPlayers";
import { fivePlayersScenario } from "./fivePlayers";
import { sixPlayersScenario } from "./sixPlayers";

export const manualScenarios = [
  fourPlayersScenario,
  fivePlayersScenario,
  sixPlayersScenario,
];

export const manualScenarioCrimeScenes: Record<string, CrimeScene> = {
  "manual-four-mansion-1920": {
    time: "22:18",
    location: "서재",
  },
  "manual-five-snowbound-lodge": {
    time: "21:30",
    location: "식당 라운지",
  },
  "manual-six-gallery-after-hours": {
    time: "20:35",
    location: "조각 전시실",
  },
};
