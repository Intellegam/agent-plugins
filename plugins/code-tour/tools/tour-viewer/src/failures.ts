/** Module-level sink for reference failures and changed-line coverage during the SSR build. */

let failures: string[] = [];
let covered = new Set<string>();
let armed = false;

export function resetFailures(): void {
  failures = [];
  covered = new Set();
  armed = true;
}

export function recordFailure(message: string): void {
  if (armed) failures.push(message);
}

export function recordCoverage(keys: Iterable<string>): void {
  if (!armed) return;
  for (const key of keys) covered.add(key);
}

/** Consume and disarm the one-shot build validation state after server rendering. */
export function consumeValidation(): { failures: string[]; covered: Set<string> } {
  const result = { failures: [...failures], covered: new Set(covered) };
  armed = false;
  return result;
}
