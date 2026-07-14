/**
 * Module-level failure sink for the one remaining build check: broken diff references.
 *
 * The build arms collection with {@link resetFailures}, renders the tour once with
 * `react-dom/server`, then reads {@link getFailures}. Each `<Diff>` that cannot resolve its
 * reference records a message here (and renders a visible error box). Collection is disarmed
 * by default, so the shipped page's re-renders never touch this.
 */

let failures: string[] = [];
let armed = false;

export function resetFailures(): void {
  failures = [];
  armed = true;
}

export function recordFailure(message: string): void {
  if (armed) failures.push(message);
}

export function getFailures(): string[] {
  return failures;
}
