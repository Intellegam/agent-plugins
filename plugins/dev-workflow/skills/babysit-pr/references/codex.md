# OpenAI Codex adapter

Use these mechanics only after reading the shared `babysit-pr` skill.

1. Start the waiter through a persistent terminal/command session and retain
   its process or session handle.
2. Keep the current Codex task active while the waiter is armed. Poll or wait on
   the retained handle in intervals no longer than 60 seconds so progress can
   still be reported. Do not send a final response merely because the process
   is waiting.
3. A supported recurring monitor can own the process only if it explicitly
   reactivates this same task; otherwise the terminal session remains owned by
   the current task.
4. Consume completed output through the retained process/session handle.
5. Terminate an armed process/session whenever the shared process says to
   replace or stop the waiter.
6. Prefix every PR reply with `[from Codex]: `.
