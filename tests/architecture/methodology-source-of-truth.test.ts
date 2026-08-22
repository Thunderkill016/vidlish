import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const rootUrl = new URL("../../", import.meta.url);
const atRoot = (...parts: string[]) => new URL(parts.join("/"), rootUrl);

describe("development methodology source of truth", () => {
  it("keeps Spec Kit active and BMAD framework paths retired", () => {
    const forbidden = [
      "_bmad",
      "_bmad-output",
      "install-bmad.sh",
      "install-bmad.ps1",
      ".github/workflows/install-bmad.yml",
    ];

    for (const path of forbidden) {
      expect(existsSync(atRoot(path)), `${path} must stay retired`).toBe(false);
    }

    expect(existsSync(atRoot(".specify/memory/constitution.md"))).toBe(true);
    expect(existsSync(atRoot("specs/001-adopt-spec-kit/spec.md"))).toBe(true);
    expect(existsSync(atRoot("docs/archive/bmad/README.md"))).toBe(true);
  });

  it("keeps only repository-specific active agent skills", () => {
    const skillsDirectory = fileURLToPath(atRoot(".agents/skills"));
    const activeSkills = readdirSync(skillsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(activeSkills.filter((name) => name.startsWith("bmad-"))).toEqual([]);
    expect(activeSkills).toContain("vidlish-hard-gate");
  });

  it("does not expose BMAD package commands", () => {
    const packageJson = JSON.parse(
      readFileSync(fileURLToPath(atRoot("package.json")), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(
      Object.keys(packageJson.scripts ?? {}).filter((name) => name.startsWith("bmad:")),
    ).toEqual([]);
  });
});
