<sub-agent-model-policy>
# Sub-agent model choice

Select an explicit, economical model for sub-agent work instead of inheriting
the main agent's model. For instance:

- GPT delegation: Astra main agent -> Sol sub-agents.
- Claude delegation: Fable main agent -> Opus sub-agents.

Review sub-agents must never use Astra or Fable unless the user explicitly
authorizes that model for the review. If no permitted model is available, stop
and report the limitation; do not inherit or silently substitute a prohibited
model.

External MCP sessions are not sub-agent launches and keep their own host
adapter contracts.
</sub-agent-model-policy>
