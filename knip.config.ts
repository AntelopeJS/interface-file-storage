import { antelopeKnipConfig } from "@antelopejs/tooling-configs/knip";

export default antelopeKnipConfig({
  entry: ["test/*.test.mjs", "src/tests/**/*.test.ts"],
  project: ["test/*.test.mjs"],
});
