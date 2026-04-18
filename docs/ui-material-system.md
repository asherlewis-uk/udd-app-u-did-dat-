\# UI Material System



\*\*Status:\*\* Canonical  

\*\*Last reviewed:\*\* 2026-04-13  

\*\*Primary scope:\*\* Hosted web material system  

\*\*Source artifact:\*\* `docs/authored-source-artifacts/neo\_glass\_stained\_refraction\_spec\_v2.docx`  

\*\*Authority:\*\* This document is canonical for the UI material/rendering system. It does not override product scope, runtime, or client-surface rules defined by `AGENTS.md` and canonical docs referenced by `docs/\_INDEX.md`.



\## Purpose



This document defines the enforced material-system architecture for the hosted web surface of UDD.



It exists to prevent future UI drift toward flat CSS glass, generic SaaS styling, or ad hoc visual experimentation that conflicts with the product’s intended interaction model.



This document governs:



\- the rendering boundary between DOM, CSS, and WebGL

\- the canonical component model for transmissive material surfaces

\- required material behaviors

\- fallback and quality-tier behavior

\- accessibility and motion constraints

\- rollout expectations for adopting the material system across the product



This document does \*\*not\*\* redefine:



\- product scope

\- information architecture

\- web/iOS product positioning

\- runtime architecture

\- provider or deployment architecture



Those remain governed by the canonical docs referenced from `docs/\_INDEX.md`.



\## Product constraints this material system must preserve



The UI material system must remain consistent with the canonical product story:



\- UDD is \*\*solo-first\*\*

\- UDD is \*\*hosted-first by default\*\*

\- UDD is \*\*project-centered\*\*

\- UDD is \*\*polyglot\*\*

\- UDD is \*\*AI-native\*\*

\- \*\*Web and iOS are both first-class client surfaces\*\*

\- \*\*iOS is non-negotiable\*\*

\- \*\*Web remains the primary hosted surface\*\*

\- local development is supported, but is not the primary product mode



Nothing in this document permits:

\- turning the product into a team/workspace-first interface

\- demoting the hosted web surface

\- treating iOS as optional

\- replacing usable UI with decorative rendering

\- moving essential interaction semantics out of accessible DOM controls



\## Canonical rendering boundary



The canonical rendering boundary is:



\- \*\*React\*\* for application structure, semantic controls, routing, layout, and state

\- \*\*DOM\*\* for all essential text, labels, forms, controls, focus management, and interaction targets

\- \*\*CSS\*\* for layout, typography, spacing, fallback presentation, and non-material polish

\- \*\*react-three-fiber + Three.js + custom shaders\*\* for the transmissive material system

\- \*\*optional restrained postprocessing\*\* only where it improves material perception without harming usability or performance



\### Non-negotiable rule



UDD is a \*\*DOM-first UI with a WebGL material layer\*\*, not a canvas-first interface.



That means:



\- essential copy must remain in the DOM

\- essential controls must remain semantic HTML controls or equivalent accessible wrappers

\- WebGL renders the material behavior behind or inside the component shell

\- the canvas layer must never become the sole carrier of meaning



\## Architecture decision



The neo-glass stained-refraction system is an \*\*architectural constraint\*\*, not a later polish pass.



Future implementation work must assume:



\- the hosted web product uses a shader-driven material language for its primary glass surfaces

\- CSS-only glass is fallback behavior, not canonical behavior

\- static image-based material simulation is not canonical behavior

\- generic SaaS card styling is not an acceptable substitute for the primary UI material system



\## Definitions



\### Material system

A reusable set of visual and rendering rules that governs panels, toggles, chips, sheets, and other surfaces so they behave like one coherent interface material family.



\### Canonical hosted web surface

The main working interface for UDD. This is the primary product surface and the primary target for the material system.



\### First-class client surface

A surface that must be represented in product scope, compatibility decisions, and contract decisions. For UDD, web and iOS are both first-class. This document governs the hosted web implementation and must not undermine iOS parity expectations.



\### Fallback

A degraded but acceptable non-canonical rendering path used on constrained hardware, reduced-motion conditions, or no-WebGL environments.



\### Quality tier

A predefined rendering budget that changes how expensive the material system is allowed to be while preserving the same semantic UI and product identity.



\## Visual objective



The intended result is:



> a transmissive UI material with spectral dispersion, internal emission, soft volumetric edge behavior, and controllable refraction



The surface should feel:



\- tactile

\- dimensional

\- internally lit rather than glow-painted

\- responsive to light and input

\- restrained rather than noisy

\- engineered rather than ornamental



The target is \*\*not\*\*:

\- literal stained-glass ornament

\- excessive rainbow distortion

\- uniform blur cards

\- glow-heavy “cyber” styling

\- decorative spectacle that weakens usability



\## Core principles



1\. \*\*Material realism over CSS cleverness\*\*  

&#x20;  The primary effect comes from the shader/material layer, not stacked gradients and backdrop blur hacks.



2\. \*\*DOM semantics over canvas convenience\*\*  

&#x20;  Text and interaction remain crisp, accessible, and layout-friendly.



3\. \*\*Restraint over noise\*\*  

&#x20;  Spectral richness must remain controlled. The system should not become gaudy.



4\. \*\*State clarity over visual flourish\*\*  

&#x20;  Runtime state, preview state, AI state, provider state, and compatibility state must remain readable above the material.



5\. \*\*Fallback continuity over visual collapse\*\*  

&#x20;  Lower-quality tiers must preserve identity, hierarchy, and meaning even when expensive rendering features are removed.



\## Canonical component architecture



The canonical component model is:



\- `GlassCardShell`

\- `SpectralMaterialPlane`

\- `RefractiveToggle`

\- `LightFieldController`

\- `ForegroundContent`



This base model may be extended into panels, chips, sheets, and other surfaces, but these primitives define the system.



\## Component responsibilities



\### `GlassCardShell`

Owns:

\- bounds

\- corner radius

\- hover state

\- active state

\- focus state integration

\- shared material uniforms at the component boundary

\- relation between DOM layout and WebGL layer



Render responsibility:

\- hybrid



Accessibility responsibility:

\- must preserve semantic structure and focus visibility

\- must not swallow semantic control ownership from DOM descendants



Fallback behavior:

\- CSS glass shell with restrained gradients, border treatment, and internal contrast support



\### `SpectralMaterialPlane`

Owns:

\- transmission

\- refraction

\- spectral split

\- segmentation

\- internal illumination

\- imperfection noise

\- edge energy

\- surface response to pointer/light state



Render responsibility:

\- WebGL



Accessibility responsibility:

\- none directly; it must remain visual-only and never become the sole information carrier



Fallback behavior:

\- removed or simplified to static CSS treatment while preserving spacing, boundaries, and readability



\### `RefractiveToggle`

Owns:

\- glass track

\- refractive knob/orb behavior

\- toggle-state light response

\- state pulse and localized edge energy



Render responsibility:

\- hybrid

\- semantic input remains in DOM

\- visual shell and knob may use WebGL material treatment



Accessibility responsibility:

\- must use native or equivalent semantic switch behavior

\- keyboard and screen-reader behavior must not depend on WebGL



Fallback behavior:

\- CSS-rendered switch preserving size, semantics, and state clarity



\### `LightFieldController`

Owns:

\- pointer-driven parallax

\- smoothed highlight steering

\- interaction energy

\- caustic drift

\- motion dampening

\- reduced-motion gating

\- quality-tier adjustments for expensive interaction behavior



Render responsibility:

\- WebGL orchestration / runtime interaction logic



Accessibility responsibility:

\- must respect reduced-motion settings

\- must not introduce animation that obscures essential meaning



Fallback behavior:

\- reduced or disabled motion with static highlights



\### `ForegroundContent`

Owns:

\- iconography

\- title

\- status

\- body copy

\- semantic controls

\- focus rings

\- validation and warning text

\- runtime/preview/provider/iOS state labels



Render responsibility:

\- DOM



Accessibility responsibility:

\- full ownership of readable content and controls



Fallback behavior:

\- unchanged; this layer must remain intact in all quality tiers



\## Extended surface families



The material system may extend into these reusable surface families:



\### Glass panels

Used for:

\- project summary panels

\- runtime state panels

\- provider configuration blocks

\- AI action containers



Canonical render mode:

\- hybrid



\### Refractive toggles

Used for:

\- provider enablement

\- AI mode switches

\- runtime preferences

\- compatibility flags where a switch is semantically correct



Canonical render mode:

\- hybrid



\### Material chips / badges

Used for:

\- stack labels

\- runtime state

\- preview state

\- provider health

\- iOS readiness



Canonical render mode:

\- mostly DOM with restrained material influence

\- must not become visually louder than the parent surface



\### Sheets / modals / drawers

Used for:

\- provider setup

\- project initialization

\- deploy/export setup

\- compatibility diagnostics



Canonical render mode:

\- hybrid with reduced material intensity versus hero surfaces



\### Logs / dense data surfaces

Used for:

\- runtime logs

\- AI action history

\- provider validation history



Canonical render mode:

\- primarily DOM/plain UI

\- material treatment should recede here to preserve readability



\## Mandatory material behaviors



The following material behaviors define the canonical look.



\### 1. Base transmission

\*\*Mandatory\*\*



The surface must read as transmissive, not opaque.



Required behavior:

\- translucent body

\- frosted light diffusion

\- visible separation between center and edge behavior



Forbidden overuse:

\- heavy fogging that muddies text

\- uniform blur slab with no structural depth



\### 2. Refraction

\*\*Mandatory\*\*



The material must bend underlying imagery/light enough to feel physically thick.



Required behavior:

\- UV distortion

\- curvature-influenced distortion

\- stronger edge behavior than center behavior



Forbidden overuse:

\- exaggerated funhouse distortion

\- motion sickness-inducing magnification



\### 3. Spectral split

\*\*Mandatory\*\*

Must be present on canonical hero surfaces and primary interactive glass surfaces.



Required behavior:

\- controlled RGB separation

\- restrained color dispersion guided by surface direction and thickness

\- color behavior that feels embedded in the glass



Forbidden overuse:

\- rainbow fog

\- constantly visible chromatic fringing on all edges

\- decorative color noise unrelated to material form



\### 4. Internal illumination

\*\*Mandatory\*\*



The light must sometimes appear to exist inside the material.



Required behavior:

\- brighter seams or curvature zones

\- localized emissive energy

\- state-driven internal lift for active controls



Forbidden overuse:

\- uniform full-panel glow wash

\- overexposed bloom that destroys structure



\### 5. Segmentation influence

\*\*Mandatory on hero surfaces; optional elsewhere\*\*



The material should be internally structured, not perfectly uniform.



Required behavior:

\- softly bounded internal cells or partitions

\- localized tint/luminance variation



Forbidden overuse:

\- literal cathedral-window ornament

\- high-contrast cell boundaries everywhere

\- decorative segmentation that competes with content



\### 6. Imperfection layer

\*\*Mandatory but subtle\*\*



Required behavior:

\- micro waviness

\- uneven density

\- restrained asymmetry

\- slight surface irregularity



Forbidden overuse:

\- visible grime

\- high-amplitude wobble

\- texture noise that makes the UI feel damaged or messy



\### 7. Edge energy

\*\*Mandatory\*\*



Edges must carry more visual energy than the center.



Required behavior:

\- Fresnel-like brightening

\- curvature emphasis

\- edge thickness perception



Forbidden overuse:

\- neon outlines

\- hard glowing strokes around every element



\### 8. Pointer/light response

\*\*Mandatory on interactive surfaces\*\*



Required behavior:

\- hover feels like light reorienting through material

\- press compresses perceived depth slightly

\- interaction energy resolves quickly



Forbidden overuse:

\- large parallax swings

\- full-surface brightening on hover

\- flashy animation loops that distract from work



\### 9. Restrained bloom

\*\*Optional but allowed\*\*



Allowed use:

\- very subtle support for emissive perception

\- small state pulses

\- hero emphasis in limited areas



Forbidden overuse:

\- broad glow haze

\- bloom as the main visual trick

\- permanent overexposure



\## Material intensity rules by surface



\### High-intensity material surfaces

Allowed on:

\- flagship project workspace hero panels

\- key stateful cards

\- high-priority toggle groups

\- selected landing-page hero product frames



These may use:

\- full transmission

\- full edge energy

\- spectral split

\- internal illumination

\- restrained segmentation



\### Medium-intensity material surfaces

Allowed on:

\- provider cards

\- project summary cards

\- settings panels

\- deploy/export readiness blocks



These should use:

\- restrained transmission

\- less spectral activity

\- less motion

\- stronger emphasis on legibility



\### Low-intensity / plain surfaces

Required on:

\- logs

\- dense tables

\- heavy text regions

\- diagnostic views

\- long AI histories

\- dense form flows



These may use:

\- border rhythm

\- subtle layered backgrounds

\- limited material accents only



Legibility wins here.



\## Product-surface mapping



\### Landing page

Use material treatment to establish identity and product seriousness.



Primary material use:

\- hero product frame

\- selected callout panels

\- controlled refractive toggles or chips



Reduce material on:

\- dense explanatory copy

\- supporting sections

\- pricing-like or checklist areas if they exist



\### Project workspace

This is the primary expression of the system.



Primary material use:

\- key project shell

\- runtime/preview state panels

\- AI side panel anchors

\- first-run initialization surfaces

\- stateful toggles and chips



Reduce material on:

\- logs

\- file trees

\- long histories

\- dense structured content



\### AI panel

Use material treatment to show AI as integrated into the build loop.



Primary material use:

\- instruction composer shell

\- active-action summary

\- approval controls



Reduce material on:

\- long output text

\- long diff/history content



\### Runtime screen

Use material to reinforce that runtime is a real product surface, not hidden plumbing.



Primary material use:

\- session state block

\- health/status summary

\- start/retry controls



Reduce material on:

\- detailed logs

\- low-level diagnostics



\### Preview screen

Use material lightly around the preview container and state framing.



Primary material use:

\- preview state frame

\- preview availability indicators

\- route/status controls



Do not overpower the actual preview content.



\### Provider / secrets screen

Use material for trust and precision, not spectacle.



Primary material use:

\- provider cards

\- validation state

\- rotation success/failure emphasis



Keep secret-entry flows calm and readable.



\### Settings

Use reduced material intensity.

Settings should feel coherent with the rest of the product but more restrained than the workspace.



\### Web + iOS continuity screen

Use material to frame readiness and parity, not to dramatize the screen.



Primary material use:

\- readiness summary

\- compatibility blocks

\- parity indicators



Do not let visual treatment imply iOS is more central than web.



\## Accessibility and UX guardrails



\### DOM-first content rule

Essential copy must remain in the DOM.



This includes:

\- titles

\- descriptions

\- state text

\- validation text

\- provider labels

\- form labels

\- warnings

\- all actionable controls



\### Semantic control rule

Use native or equivalent semantic controls for:

\- switches

\- buttons

\- inputs

\- dialogs

\- focusable actions



The visual layer must never replace semantic ownership.



\### Contrast rule

Text contrast must be valid above all visual states.



Use:

\- localized backdrop support where needed

\- reduced background energy under dense text

\- clear focus and active states



\### Reduced motion rule

Respect reduced motion by:

\- disabling shimmer drift

\- reducing highlight lag

\- shortening state pulses

\- removing non-essential motion fields



Reduced motion must still preserve:

\- hierarchy

\- affordance

\- state clarity



\### Focus rule

Focus states must remain:

\- visible

\- crisp

\- semantic

\- independent of the shader layer



The material layer may respond to focus, but focus visibility must not depend on the shader.



\## Performance and quality tiers



Quality tiers are part of the canonical system, not optional implementation polish.



\### High tier

For capable desktop hardware.



Includes:

\- full transmission

\- full spectral split

\- segmentation

\- imperfection noise

\- pointer/light response

\- restrained postprocessing

\- highest quality runtime interpolation



\### Medium tier

For capable but constrained devices.



Reductions:

\- fewer blur samples

\- reduced dispersion intensity

\- simpler noise

\- reduced motion field complexity

\- lower-cost highlights

\- little or no postprocessing



Must still preserve:

\- material identity

\- edge energy

\- state clarity

\- readable hierarchy



\### Fallback tier

For constrained GPUs, battery-saving contexts, no-WebGL, or explicit accessibility constraints.



Uses:

\- DOM/CSS-only layout and surfaces

\- restrained gradients

\- layered transparency

\- border and panel logic

\- no shader-dependent meaning



Fallback must preserve:

\- layout

\- semantic UI

\- state meaning

\- overall product identity



Fallback must \*\*not\*\* become:

\- a different product aesthetic

\- a bright generic SaaS redesign

\- flat default UI with no material identity at all



\## Public API direction for reusable surfaces



Reusable material components should expose a compact public API.



Recommended shared inputs:

\- `palette`

\- `intensity`

\- `quality`

\- `interactive`

\- `disabled`

\- `status`

\- `className`



Advanced shader/material knobs must remain behind:

\- presets

\- theme registry

\- expert-only props



Do not expose arbitrary effect tuning broadly across the app.



\## Preset discipline



Allowed presets may exist, but they must remain tightly art-directed.



Example preset family:

\- `prism`

\- `aurora`

\- `opal`

\- `stained`



Preset systems must:

\- share layout semantics

\- share state treatment

\- preserve the same product identity

\- avoid gaudy drift



\## Forbidden implementation paths



The following are explicitly not canonical:



\- CSS-only glass as the primary implementation

\- static PNG or baked-image “glass” as the primary implementation

\- full-canvas UI with essential text rendered inside WebGL

\- unbounded palette experimentation by feature teams

\- global bloom wash

\- literal stained-glass ornamentation

\- generic SaaS card styling as a substitute for the material system

\- treating the shader layer as optional on primary surfaces



\## Rollout phases



\### Phase 1 — semantic shell + fallback

Deliver:

\- exact layout semantics

\- DOM content layer

\- accessible controls

\- CSS fallback

\- focus states

\- reduced-motion baseline



\### Phase 2 — baseline material layer

Deliver:

\- WebGL material plane

\- base transmission

\- edge energy

\- pointer-aware light response

\- restrained highlights



\### Phase 3 — spectral / refractive behavior

Deliver:

\- spectral split

\- segmentation influence

\- refractive toggle

\- internal illumination

\- state pulse behavior



\### Phase 4 — hardening

Deliver:

\- performance tuning

\- quality-tier logic

\- reduced-motion validation

\- device QA

\- fallback QA



\### Phase 5 — system rollout

Deliver:

\- reuse across cards, toggles, panels, chips, sheets

\- tokenization/preset discipline

\- documentation examples

\- visual regression coverage



\## Acceptance criteria



The material system is considered correctly implemented when:



\- the hosted web product visibly uses transmissive material as a coherent system

\- essential text remains crisp and DOM-rendered

\- essential controls remain semantic and accessible

\- spectral behavior is present but restrained

\- edge energy is visible

\- interaction feels tactile, not flashy

\- fallback still looks intentional

\- logs and dense information views remain readable

\- iOS-first-class status is reflected in compatibility surfaces without weakening the primary hosted web surface

\- the result feels like one authored system, not a stack of unrelated effects



\## Integration with canonical docs



This document should be read alongside:



\- `AGENTS.md`

\- `docs/\_INDEX.md`

\- `docs/product-scope.md`

\- `docs/architecture.md`

\- `docs/contracts.md`

\- `docs/runtime.md`

\- `docs/quality-gates.md`

\- `docs/implementation-gaps.md`



\## Source artifact handling



The file `docs/authored-source-artifacts/neo\_glass\_stained\_refraction\_spec\_v2.docx` is the authored-source artifact for this material system.



Rules:

\- the `.docx` is a source artifact, not the primary implementation-facing authority

\- this markdown file is the canonical implementation-facing form

\- if the source artifact and this markdown file diverge, update this markdown file deliberately and note the artifact relationship rather than treating the `.docx` as self-executing authority

