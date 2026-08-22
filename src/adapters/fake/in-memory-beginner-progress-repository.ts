import type {
  BeginnerProgressRepository,
  BeginnerWordEvidence,
} from "@/modules/learning/ports/beginner-progress-repository";

/**
 * The beginner evidence store for development and CI.
 *
 * It reproduces the one rule that matters and is easy to lose: proof of
 * independence only moves forward. A fake that let a supported attempt clear
 * `lastIndependentAt` would make tests pass against behaviour the database
 * refuses, and the difference would only show up in production.
 */
export class InMemoryBeginnerProgressRepository
  implements BeginnerProgressRepository
{
  private readonly rows = new Map<string, BeginnerWordEvidence>();

  private key(ownerUserId: string, word: string): string {
    return `${ownerUserId}::${word.toLocaleLowerCase("en-US")}`;
  }

  async knownWords(ownerUserId: string): Promise<string[]> {
    const prefix = `${ownerUserId}::`;
    return [...this.rows.entries()]
      .filter(([key, row]) => key.startsWith(prefix) && row.lastIndependentAt)
      .map(([, row]) => row.word)
      .sort();
  }

  async recordWordEvidence(input: {
    ownerUserId: string;
    word: string;
    independent: boolean;
  }): Promise<BeginnerWordEvidence> {
    const word = input.word.toLocaleLowerCase("en-US");
    const key = this.key(input.ownerUserId, word);
    const existing = this.rows.get(key);
    const next: BeginnerWordEvidence = {
      word,
      successfulRetrievals:
        (existing?.successfulRetrievals ?? 0) + (input.independent ? 1 : 0),
      lastIndependentAt: input.independent
        ? new Date().toISOString()
        : (existing?.lastIndependentAt ?? null),
    };
    this.rows.set(key, next);
    return next;
  }
}
