# Documentation

Keep documentation useful, current and organized by the reader's task. Follow the repository [style guide](../../STYLE_GUIDE.md).

## Ownership

- The [README](../../README.md) explains purpose, requirements, installation and first use, then links to detailed guidance
- `usage/` explains configuration, public APIs and workflows
- `contributions/` explains setup, development and tests
- `maintenance/` explains operations, compatibility, migrations and releases
- Optional concepts or contracts explain durable architecture and integration boundaries
- The changelog records shipped changes; a roadmap records unresolved work

Use one canonical page per topic. Fold durable information from work notes into that page rather than adding handovers, completed cycle reports or acceptance diaries. Keep development requirements separate from installation requirements.

## Verification

```bash
pnpm run docs:verify
```

Check Markdown style where configured, local links and anchors, navigation reachability and documented package scripts. Verify options, APIs and examples against source and tests as well; automated checks do not establish their accuracy.
