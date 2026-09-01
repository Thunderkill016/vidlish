import { createHash } from "node:crypto";

import { ELICITED_IMITATION_ITEMS } from "./elicited-imitation-items";

/**
 * Identifies the exact bank a sitting was taken against.
 *
 * Two sittings are only comparable if the sentences were the same, and the bank
 * will change — items get added, a badly-recorded one gets replaced. Stamping
 * the version means a later reader can tell "you improved" from "the test
 * changed", which is the difference between a measurement and a claim.
 *
 * Derived from the items rather than typed by hand, because a version somebody
 * has to remember to bump is a version that is wrong.
 */
export function imitationBankVersion(): string {
  const fingerprint = createHash("sha256")
    .update(
      ELICITED_IMITATION_ITEMS.map((item) => `${item.id}:${item.text}`).join("\n"),
    )
    .digest("hex")
    .slice(0, 12);
  return `ei:${fingerprint}`;
}
