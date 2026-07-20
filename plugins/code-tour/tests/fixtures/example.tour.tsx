/**
 * Minimal fictional fixture for the e2e build test (tests/build.test.ts).
 *
 * This is NOT a real PR. `example.diff` is a small, hand-written diff for an imaginary
 * `notifier` package. The only purpose of this pair is to exercise every reference component
 * — whole-hunk <Diff>, line-slice <Diff>, <Annotation>, <Graph>, <FileTree>, and `collapsed` —
 * so the build produces a self-contained tour.html. The build test asserts only that it builds
 * and is offline-clean, nothing about this content, so the fixture stays deliberately small.
 */

import { Diff, Annotation, FileTree, Graph, Section, Tour } from "tour-viewer";

export default function ExampleTour() {
  return (
    <Tour
      title="Add retry-with-backoff to the notification sender"
      meta="fictional demo · base main · head retry-backoff"
    >
      <Section id="overview" title="What this PR does">
        <p>
          The <code>notifier</code> package delivers a message through a flaky{" "}
          <code>Client</code>. Today a single failure loses the message; this change wraps
          delivery in a bounded retry loop with linear backoff and moves the tuning knobs into a
          new <code>config.py</code>.
        </p>
        <Graph
          source={`flowchart TD
  A[send message] --> B{deliver}
  B -->|ok| C[return True]
  B -->|TransientError| D[sleep backoff]
  D --> B
  B -->|attempts exhausted| E[log and return False]`}
        />
        <FileTree>{`notifier/
  send.py — the retry loop
  config.py — new: MAX_RETRIES, BACKOFF

tests/
  test_send.py — covers the retry path`}</FileTree>
      </Section>

      <Section id="config" title="config.py">
        <p>
          The knobs live in one place so the loop reads declaratively. <code>BACKOFF</code> is
          multiplied by the attempt number, so the waits grow 0s, 0.5s, 1s, and so on.
        </p>
        <Diff file="notifier/config.py" hunk={1} />
      </Section>

      <Section id="send" title="send.py">
        <p>
          First the new imports: <code>time</code> for the backoff sleep, and the two knobs from{" "}
          <code>config.py</code>.
        </p>
        <Diff file="notifier/send.py" lines={{ side: "new", start: 2, end: 4 }}>
          <Annotation line={4} side="new">
            Pulls the loop bounds in from the new config module.
          </Annotation>
        </Diff>
        <h3>The retry loop</h3>
        <p>
          Delivery is attempted up to <code>MAX_RETRIES</code> times. A transient failure sleeps
          and retries; exhausting every attempt logs an error and returns <code>False</code>{" "}
          rather than raising, so callers always see a clean boolean.
        </p>
        <Diff file="notifier/send.py" hunk={2}>
          <Annotation line={17} side="new">The success path returns from inside the loop.</Annotation>
        </Diff>
      </Section>

      <Section id="tests" title="tests/test_send.py">
        <p>One test drives the happy-retry path: fail twice, then succeed on the third call.</p>
        <Diff file="tests/test_send.py" hunk={1} collapsed />
      </Section>
    </Tour>
  );
}
