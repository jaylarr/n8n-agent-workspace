# Section templates

Copy-ready sticky contents and SDK code for the `n8n-workflow-sections` skill.

## API or local JSON

Sticky nodes use the same saved workflow JSON as the canvas. For example:

```json
{
  "id": "section-01",
  "name": "01 Receive and check",
  "type": "n8n-nodes-base.stickyNote",
  "typeVersion": 1,
  "position": [0, 0],
  "parameters": {
    "content": "## 01 — RECEIVE + CHECK\n\n**What happens here:**\nThe request is checked before processing.",
    "width": 720,
    "height": 424,
    "color": 5
  }
}
```

This illustrative height assumes the full rendered node bottom is y = 384 (a row at y = 240
with a measured 144 px footprint) and the text ends above it:
`ceil((384 - 0 + 40) / 8) * 8 = 424`. Recompute from the actual rendered nodes and text;
neither this height nor this node footprint is a minimum or a universal node size.

Place working nodes inside the section rectangle; retain their existing IDs and connections.
Use the installed version's accepted workflow write schema rather than posting the entire GET
response. Read back positions, dimensions, content and connections after an authorized save.
SDK examples below apply only when the optional MCP/SDK path is available.

## Main section

```markdown
## 01 — RECEIVE + FIND

**What happens here:**  
Site staff submit the completed milestone, project, photos, note, and name.

**System check:**  
The workflow finds the matching project record in the database.

**If something goes wrong:**  
An unknown project is sent to a clear completion page instead of continuing.
```

Title ideas by stage: `RECEIVE + FIND`, `INTAKE + CHECK`, `REQUEST RECEIVED`, `CHECK + PROTECT`,
`CHECK + PREPARE`, `UNDERSTAND THE REQUEST`, `SAVE + SUMMARIZE`, `SAVE BUSINESS UPDATE`,
`SAFETY + GUIDANCE`, `COMPANY WIKI`, `SAVE + RESPOND`, `FOLLOW-UP + CLOSE`, `INFORM + CLOSE`.

## EXCEPTIONS

```markdown
## EXCEPTIONS

Normal business exceptions stay below the main flow:
- project not found
- milestone name not valid
- milestone already completed

These paths stop safely without changing project state or sending a duplicate customer email.
```

## SETUP BEFORE GO-LIVE

```markdown
## SETUP BEFORE GO-LIVE

1. Select credentials for:
- Supabase
- Gmail

2. Replace:
- `YOUR_GOOGLE_DOC_ID`

3. Run the supplied Supabase SQL setup.

4. In `Check Service Hours`, confirm timezone and set demo mode to false.
```

## DEMO BOUNDARY

```markdown
## DEMO BOUNDARY

Simulated in this demo:
- 4 sample equipment/error-code entries
- On-call destination is a placeholder number

Production replacement:
- Retrieve guidance from the real knowledge base
- Connect the real dispatch/ticketing destination

The demo is concept-complete, but these integrations must be replaced before go-live.
```

## Warning callout (inside a section, optional)

```markdown
### ⚠ Demo switch
`DEMO_FORCE_AFTER_HOURS = true` forces the after-hours path. Set to false before go-live.
```

## SDK example

`sticky(content, nodes, config)` sizes and anchors the note around `nodes`. Every node **and** every
sticky must still be added to the workflow. Build the content with `\n` string concatenation (no
backtick template literals).

```ts
const receive = trigger({ /* form trigger, name: 'Receive Milestone' */ });
const findProject = node({ /* name: 'Find Project' */ });
const projectFound = ifElse({ /* name: 'Project Found?' */ });
const prepare = node({ /* name: 'Prepare Milestone Update' */ });
const notFound = node({ /* name: 'Project Not Found' (form completion) */ });

const s01 = sticky(
  '## 01 — RECEIVE + FIND\n\n' +
  '**What happens here:**  \nSite staff submit the completed milestone.\n\n' +
  '**System check:**  \nThe workflow finds the matching project record.\n\n' +
  '**If something goes wrong:**  \nAn unknown project is sent to a clear completion page.',
  [receive, findProject],
  { color: 5 },
);
const s02 = sticky(
  '## 02 — CHECK + PREPARE\n\n' +
  '**What happens here:**  \nThe selected milestone is checked against the project plan.\n\n' +
  '**What happens next:**  \nA clean customer update is prepared.',
  [projectFound, prepare],
  { color: 6 },
);
const exceptions = sticky(
  '## EXCEPTIONS\n\nNormal business exceptions stay below the main flow:\n- project not found\n\n' +
  'These paths stop safely without changing project state.',
  [notFound],
  { color: 2 },
);

export default workflow('id', '[project-slug] Record completed milestone')
  .add(receive.to(findProject).to(projectFound))
  .add(projectFound.onTrue(prepare))
  .add(projectFound.onFalse(notFound))
  .add(s01).add(s02).add(exceptions);
```

Check the exact `sticky` config keys (e.g. `width`, `height`, `position`) in the live
`get_workflow_sdk_reference` before relying on them, because the SDK changes. If auto-sizing leaves
nodes outside their notes or excess empty space below them, fit complete rendered bounds after
creation with `setNodePosition` + `setNodeParameter`
(`/width`, `/height`) and re-check (SKILL.md steps 5–6).

## Column layout: worked coordinates

Five sections, positions set with `setNodePosition` after the create (auto-layout ignores them).
Main column at `x = 0`, `width = 1400`. Nodes ~240 px apart, the first node row at `sy + 260`.
For this illustration only, each node has a measured 144 px full footprint and the section text
ends above the nodes. One row therefore needs `ceil((260 + 144 + 40) / 8) * 8 = 448` px;
two rows, 160 px apart, need `ceil((420 + 144 + 40) / 8) * 8 = 608` px.
The SETUP and DEMO text-only examples assume measured text bottoms 280 px and 360 px below
their note tops, respectively; their heights are 320 px and 400 px.

| Sticky | position [x, y] | width × height | Node rows inside |
|---|---|---|---|
| `01 — REQUEST RECEIVED` (5) | [0, 0] | 1400 × 448 | y = 260, x = 64, 304, 544 … |
| `02 — CHECK + PROTECT` (6) | [0, 496] | 1400 × 448 | y = 756 |
| `03 — UNDERSTAND THE REQUEST` (4) | [0, 992] | 1400 × 608 | y = 1252 (main), 1412 (branch) |
| `04 — SAFETY + GUIDANCE` (3) | [0, 1648] | 1400 × 608 | y = 1908, 2068 |
| `05 — SAVE + RESPOND` (5) | [0, 2304] | 1400 × 608 | y = 2564, 2724 |
| `SETUP BEFORE GO-LIVE` (1) | [1448, 0] | 700 × 320 | — |
| `EXCEPTIONS` (2) | [1448, 496] | 700 × 448 | exception endings, y = 756 |
| `DEMO BOUNDARY` (7) | [1448, 992] | 700 × 400 | — |

For a new Column, each section's y = previous y + previous height + 48. These coordinates are
illustrative; recompute every height from rendered content, especially text-only notes. A sizing-only
edit preserves existing positions.

## Reference workflows (the house style)

Three workflows chosen as the standard (2026-09-27):

| Workflow | Main sections | Extra notes | Colors |
|---|---|---|---|
| Milestone update (form → Supabase → email) | 01 RECEIVE + FIND · 02 CHECK + PREPARE · 03 SAVE BUSINESS UPDATE · 04 INFORM + CLOSE | EXCEPTIONS below the main row | 5, 6, 4, 3 · exceptions 2 |
| Project micro-retro (form → Supabase → Claude → Docs → Gmail) | 01 INTAKE + CHECK · 02 SAVE + SUMMARIZE · 03 COMPANY WIKI · 04 FOLLOW-UP + CLOSE | SETUP — DEMO / PRODUCTION above | mixed |
| After-hours WhatsApp support (WhatsApp → Supabase → Claude) | 01 REQUEST RECEIVED · 02 CHECK + PROTECT · 03 UNDERSTAND THE REQUEST · 04 SAFETY + GUIDANCE · 05 SAVE + RESPOND | DEMO BOUNDARY + SETUP BEFORE GO-LIVE in the lower row | all 7 · demo 5 · setup 6 |

The palette in SKILL.md standardizes the colors of the first example for all future workflows.

Historical reference geometry: the main row shares `y` and `height` (430 / 456 / 520). These are
examples, not minimums or a requirement for equal heights. Widths run 600–1290.
Gaps between sections are 16–48 px. Nodes sit ~240–280 px below the note's top edge. The lower row
starts ~48 px below the main row.
