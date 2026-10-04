@AGENTS.md

# Working rules (cost and speed)

These override any skill's default process.

- **Resume** from the "Now" block of `docs/rebuild/PROGRESS.md`. Don't re-read finished specs, plans or ledgers.
- **Execute inline.** No subagents unless the user asks. No per-task brief or ledger files: tick the plan's checkboxes and update PROGRESS.md at the end of each workflow step.
- **Skills:** use a process skill only to design a new part (brainstorming, writing-plans) or to debug a real failure. Not for status, docs, small fixes or reviews.
- **Small parts** (no visual redesign, or about 5 files or fewer): audit and plan go in `docs/rebuild/parts/<id>.md`; no separate spec or plan doc; one approval message.
- **Mockups / artifacts** only when the visual design changes materially.
- **Reading:** grep or read line ranges. Don't print whole directories or files longer than ~300 lines.
- **Tests while building:** `npx vitest run <files or dir you touched>`. Run `npm run test:unit` once before pushing.
- **CI does the heavy checks** (lint, build, bundle check, deps audit, e2e, screenshots). Don't run `next build`, Playwright or Lighthouse locally; push and read `gh pr checks <n> --watch` once.
- **Final review:** one inline pass over hand-written source in the diff. Skip codemod output, generated dictionaries and pure file moves.
- **Commits:** one per task; push when CI is needed or the part is done.
- **Replies:** short. What changed, what's next, anything the user must decide.
