# Style guide

Write for developers using and maintaining the plugin. Prefer precise instructions and useful examples over implementation history.

## Structure and ownership

- Keep the README as a quickstart: purpose, requirements, installation, first use, documentation and policy links, and license
- Keep useful product-specific material such as a legend or attribution
- Put detailed usage in `docs/usage/`, contributor guidance in `docs/contributions/`, and operations, migrations and releases in `docs/maintenance/`
- Add concepts or contracts only when the plugin needs a separate explanation
- Give each topic one owner and link to it instead of repeating it
- Keep shipped history in the changelog and unresolved work in the roadmap

## Writing and Markdown

- Use one `#` heading per file, then short `##` and `###` headings
- Prefer short paragraphs and parallel lists; number steps only when order matters
- Keep examples minimal and give fenced code blocks a language tag
- Document current behavior, supported requirements and commands that exist
- Explain permissions, persistence, destructive actions and external effects when they affect the reader's task
- Use alerts only for prerequisites, important limitations or risks
- Prefer relative links and make documentation pages reachable from their indexes
- Add a `Next:` link when there is a useful reading sequence
- Use non-breaking spaces where they improve prose, without changing code or command syntax

Implementation details belong in docs only when they explain a public contract, an extension point, an operational constraint or a non-obvious maintenance requirement. Routine test settings and accounts of past fixes belong in tests, commits or the changelog.
