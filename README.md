# Iapacte

**Spanish**: For the Spanish version of this README, see [`README`](./docs/README_es.md).

Iapacte is building the Operating System for regional governments: a shared platform where city councils, public workers, and citizens collaborate with modern tooling, real-time AI assistants, and governed data. Everything we design is anchored in what administrations told us they struggle with today—duplication of work, brittle tooling, disconnected data, and no common base to build on.

## Why Iapacte now?

- **Public impact first**: 8,000+ municipalities in Spain alone manage billions in annual spend, yet still rely on spreadsheets, email chains, and bespoke vendors. We are giving them a cohesive workspace they actually control.
- **Reusable knowledge and processes**: Councils redo the same procedures every day. We package best practices so they can be shared, remixed, and executed safely across municipalities.
- **Extensible core**: By treating Iapacte as an API-first OS, every department, vendor, or civic hacker can plug in workflows, data, and vertical apps without starting from scratch.

## Strategic pillars

1. **Knowledge sharing and transfer**  
   City halls reuse checklists, templates, workflows, and lessons learned from their peers instead of rebuilding them from scratch. A built-in discovery engine searches and recommends relevant experiences and projects from other organizations—articles, blogs, and case studies—across the country and abroad, helping teams learn fast and spark new collaborations.  
   _Example: When Manresa needs a flood-response plan, it starts from Girona's approved template, swaps contact names, and ships the plan in minutes._

2. **Dropbox-like document space**  
   Institutional files, case folders, and archives live in one secure library with the right permissions baked in and instant links to workflows.  
   _Example: The culture department drops the latest grant dossier into a shared folder and the inter-municipal review board can open it without chasing email attachments._

3. **Workflow automation for processes**  
   Visual, reusable flows handle approvals, validations, and reminders so people focus on the meaningful steps.  
   _Example: A social services caseworker triggers an onboarding flow that pre-fills paperwork, routes signatures to the secretary, and pings finance when funds must be released._

4. **Governed and accessible data**  
   Spreadsheet-like tables feel familiar but connect to internal and external sources, track every change, and stay ready for AI.  
   _Example: The mobility team merges traffic sensor feeds with manual counts in one table to auto-generate weekly dashboards for council meetings._

5. **Suite of specialized applications**  
   Vertical apps sit on the shared core—tender writers, procurement comparators, contextual chats, or tools for contracting, urban planning, and social services.  
   _Example: An urban planning squad uses the zoning comparison app to review how similar municipalities handled new tower proposals before they make a recommendation._

6. **API-first foundation**  
   Every capability is exposed through APIs with fine-grained, ReBAC-style permissions so departments, contractors, and civic partners can extend the platform safely.  
   _Example: A regional consortium plugs its citizen portal into Iapacte's permissions, letting contractors upload updates without creating extra logins._

7. **AI as a transversal layer**  
   Intelligent assistance appears inside every module—drafting text, spotting missing steps, and suggesting next actions while respecting governance rules.  
   _Example: While drafting a procurement report, the assistant suggests compliant language, links to referenced documents, and flags missing attachments before submission._

_Summary: shared knowledge + documents + automation + governed data + vertical apps + API-first + AI everywhere._

## First wave of applications

### AI-powered procurement suite

We started with public procurement because it impacts every department and exposes the gaps above.

- **Guided workflows**: Suggests approval paths, deadlines, and documentation packs so teams can move faster while staying auditable.
- **Tender writer**: Generates compliant documents (specifications, evaluation criteria, award reports) using best-in-class municipal templates and aligned with Spanish procurement law.

### Upcoming vertical experiences

- Context-aware chat for staff and citizens, grounded on governed organizational data.
- Collaborative knowledge spaces for policy drafts, grant applications, or shared municipal programs.
- Automation kits for urban planning, social services, and infrastructure maintenance.

## Architecture & tech stack

- **Clean Architecture + DDD** to keep municipal, infrastructure, and AI concerns decoupled.
- **TypeScript everywhere** (Node ≥22, pnpm v9) with Effect 3 for structured concurrency and LangChain/LangGraph for agentic flows.
- **Frontend**: React 19 + Vite 6 + TanStack Router (file-based) with Tailwind MD3 tokens, Base UI primitives, Motion.dev animations, and Effect Atom state stores.
- **Backend**: Fastify services, governed storage, Qdrant/PostgreSQL for semantic + relational workloads, and ReBAC-ready auth.
- **DevX**: Nix Flake pins the toolchain, Turbo powers multi-package builds, Biome enforces formatting/linting, and Paraglide manages localization across shared packages.

## Getting started

1. `nix develop` (or `direnv allow`) to enter the pinned toolchain.  
2. `pnpm install && pnpm prepare` to install dependencies and Lefthook hooks.  
3. Explore `apps/server`, `apps/web`, and the shared packages under `packages/` for domain logic, UI, and infrastructure.  
4. Run `pnpm web` or `pnpm server` for local development, and `pnpm lint`, `pnpm check-types`, `pnpm build` before opening a PR.  
5. Read the [Contributing Guide](./CONTRIBUTING.md) for coding standards, DDD boundaries, and PR expectations.

## License

Licensed under the GNU Affero General Public License v3.0. See [LICENSE](./LICENSE.md) for full details.
