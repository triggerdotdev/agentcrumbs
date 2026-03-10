# CLAUDE.md

## Changesets

Never run `changeset version` — that happens in CI. Only add changeset files via `pnpm changeset` or by creating a markdown file in `.changeset/`.

## Skills

After modifying any `SKILL.md` files, validate before committing:

```bash
cd packages/agentcrumbs && npx @tanstack/intent@latest validate
```

This also runs automatically via `prepublishOnly` in the package.
