# Claude Code adapter

Use these mechanics only after reading the shared `babysit-pr` skill.

1. Start the waiter with Claude Code's `Monitor` capability and retain its task
   id. The monitor may notify the session asynchronously, so other work or a
   user-facing turn may happen while it is armed.
2. Observe the streamed `armed` stdout line in the Monitor notification without
   waiting for task completion or stopping the monitor. Later, consume the
   terminal event through the same retained task id.
3. Terminate an armed monitor with `TaskStop` whenever the shared process says
   to replace or stop the waiter.
4. Prefix every PR reply with `[from Claude]: `.
