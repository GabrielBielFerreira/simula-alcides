<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Prototype architecture
- Keep this project frontend-only with typed fixtures in src/data; the production backend is owned by another team.
- Use file-based TanStack routes with app.tsx/admin.tsx as Outlet layouts and presentation modules under components/app, components/prova and components/admin, so the UI can be ported to Next.js.
- Keep browser storage and timers inside effects, and use the fixed demo reference date for date calculations, to preserve SSR consistency.
- Use semantic CSS tokens and existing design-system controls for all screens, including the exam's scoped dark theme.
