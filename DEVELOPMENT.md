# Development

## Environment Variables

### `QUALITY_GATE_BOT_USERNAMES`

This variable is used in the `decide-review-strategy.sh` script to identify comments that contain quality gate results. It can be a single username or a space-separated list of usernames.

**Example:**

```
QUALITY_GATE_BOT_USERNAMES="github-actions[bot] my-custom-bot"
```
