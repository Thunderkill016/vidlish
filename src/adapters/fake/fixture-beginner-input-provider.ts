import type {
  BeginnerInputProvider,
  BeginnerInputResult,
  DraftBeginnerInputRequest,
} from "@/modules/learning/ports/beginner-input-provider";

/**
 * Beginner sentences for development and CI, with no model behind them.
 *
 * Without this the A0 path could not be exercised end to end anywhere except
 * against a paid provider: retrieval covers almost nothing until a learner has
 * dozens of words, so every test of the sentence phase fell back to the
 * single-word introduction and the sentence code never ran. A path that only
 * production executes is a path nobody has tested.
 *
 * What it returns is **not English**, and it must never be mistaken for the
 * model's job. It composes the target with words the learner already has, in a
 * fixed order, so that the gate downstream sees exactly what it would see from
 * a real provider: sentences whose only new word is the target. Naturalness is
 * the one property this fixture deliberately does not have — which is also why
 * it is unreachable outside a fixture provider setting.
 */
export class FixtureBeginnerInputProvider implements BeginnerInputProvider {
  async draft(request: DraftBeginnerInputRequest): Promise<BeginnerInputResult> {
    const known = [...request.known].sort();
    const target = request.target;

    // Deterministic, so a failing CI run can be reproduced exactly. Shapes vary
    // so the composer's duplicate rule is exercised rather than sidestepped.
    const shapes: ((support: string) => string)[] = [
      (support) => `${support} ${target}`,
      (support) => `${target} ${support}`,
      (support) => `${support} ${target} ${support}`,
    ];

    const sentences: string[] = [];
    for (let index = 0; sentences.length < request.count; index += 1) {
      // A learner with no words at all cannot be served a sentence, and the
      // caller decides that before reaching a provider. Guarding here too means
      // this returns nothing rather than inventing a support word.
      if (known.length === 0) break;
      const support = known[index % known.length];
      const shape = shapes[index % shapes.length];
      const sentence = shape(support);
      if (!sentences.includes(sentence)) sentences.push(sentence);
      if (index > request.count * shapes.length) break;
    }

    return {
      sentences,
      modelId: "fixture:beginner-input",
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}
