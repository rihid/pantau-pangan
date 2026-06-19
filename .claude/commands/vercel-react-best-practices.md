Apply Vercel React and Next.js performance best practices to the provided code or current file.

Read the full rules from `.agents/skills/vercel-react-best-practices/AGENTS.md` before proceeding. That file contains 70 rules across 8 priority categories:

1. **CRITICAL** — Eliminating Waterfalls (`async-*`)
2. **CRITICAL** — Bundle Size Optimization (`bundle-*`)
3. **HIGH** — Server-Side Performance (`server-*`)
4. **MEDIUM-HIGH** — Client-Side Data Fetching (`client-*`)
5. **MEDIUM** — Re-render Optimization (`rerender-*`)
6. **MEDIUM** — Rendering Performance (`rendering-*`)
7. **LOW-MEDIUM** — JavaScript Performance (`js-*`)
8. **LOW** — Advanced Patterns (`advanced-*`)

For individual rule details and code examples, read `.agents/skills/vercel-react-best-practices/rules/<rule-name>.md`.

## Steps

1. Read the target file(s) or accept `$ARGUMENTS` as file paths
2. Read the AGENTS.md rules document
3. Identify applicable violations, ordered by priority (CRITICAL first)
4. Report each finding: rule ID, what's wrong, and the fix
5. Apply fixes unless the user asked for review-only

If `$ARGUMENTS` is empty, apply to the file most recently discussed in the conversation.
