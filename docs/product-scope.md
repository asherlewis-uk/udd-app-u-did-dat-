# Product Scope

Back to [docs/_INDEX.md](./_INDEX.md).

## Thesis

UDD is a solo-first, hosted-first, polyglot, AI-native development product. The default user experience is hosted: the user signs in, opens or creates a project, uses AI to scaffold or edit it, runs it in the hosted environment, previews it through the hosted surface, and exports or deploys elsewhere only when needed.

Local development is supported for builders and operators, but it is not the default product story.

## Target Users

- Solo builders who want a hosted development surface without adopting a team-first workspace product model
- Product-minded developers who move between stacks and want AI assistance across web, backend, automation, and app code
- Builders who need both a hosted web surface and a first-class iOS surface for the same product

## Primary Jobs To Be Done

- Start a new project from an idea with hosted AI assistance
- Open an existing repo or hosted project and continue work
- Run code in the hosted environment and inspect logs, previews, and state
- Use AI to edit, refactor, and maintain a project across multiple stacks
- Use the hosted web surface for full product operation
- Use the iOS surface as a first-class client for the same hosted product
- Develop locally when debugging, contributing, or validating changes outside the hosted path

## Required Client Surfaces

- Web is a required first-class client surface and remains the primary hosted product surface.
- iOS is a required first-class client surface.
- iOS must not be used as a reason to demote, remove, or reframe the hosted web surface unless an explicit ADR says so.

## Non-Goals

- Making organizations, workspaces, or RBAC the canonical product center
- Reframing the product as a team collaboration suite
- Treating deployment or infrastructure ownership as the product core
- Pretending every desired platform boundary already exists in code
- Downgrading web in order to elevate iOS

## Anti-Scope Creep

- Do not add new canonical product concepts around orgs, workspaces, or collaboration without an ADR.
- Do not describe deployment targets as product-defining core unless the code and docs both support that claim.
- Do not let hosted operations detail become the product definition. The product is about the build loop, not about exposing every internal control surface as user-facing scope.

## What Makes This Different From Replit

- The product is solo-first, not team-first.
- The canonical product model is project-centered, not workspace-centered.
- AI-native operation is central across hosted web and iOS surfaces.
- Hosted execution is the default experience, but the product does not need to own every enterprise collaboration or org-admin surface to be complete.

## What We Intentionally Do Not Own

- Team collaboration as the canonical product center
- Organization and workspace administration as the product identity model
- Customer infrastructure as a required product surface beyond what the hosted runtime needs
- Deployment as the primary value proposition
