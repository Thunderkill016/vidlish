import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Vercel deployment budget policy", () => {
  it("only auto-deploys main and explicitly named preview branches", () => {
    const configPath = resolve(process.cwd(), "vercel.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      git?: {
        deploymentEnabled?: Record<string, boolean>;
      };
      ignoreCommand?: string;
    };

    expect(config.git?.deploymentEnabled).toEqual({
      "**": false,
      main: true,
      "preview/**": true,
    });
    expect(config.ignoreCommand).toBe(
      "bash scripts/vercel-should-build.sh",
    );
  });
});
