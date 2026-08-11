# Dashboard Feedback Tasks

## 1. Filter Rail Fixes
- [x] Fix filter chip initialization: chips show as active when array is empty (all-selected)
- [x] Remove ghost `primary_only` and `min_stars` from ActiveFilters
- [x] Capitalize display labels: "Primary", "Secondary", "Formal", "Non-formal"
- [x] Add ⓘ tooltip on "Signal tier" group label explaining the term
- [x] Add ⓘ tooltip on "Kotlin confidence" group label explaining the term
- [x] Add note near Country filter: "Map and table filtering applies to universities only"

## 2. DataTable Fixes
- [x] Fix sticky header + horizontal scroll sync (header now lives inside same scroll container as rows)
- [x] Display "non-formal" instead of "informal" in Learning column

## 3. Histogram Improvement
- [x] Increase bins from 10 to 20
- [x] Center bars on tick marks (tickValues at bin midpoints)

## 4. Section Structure in index.tsx
- [x] Add SectionDivider component
- [x] Add dataset timestamp to page header
- [x] Add section: General (stat cards + source/tier/learning charts + providers)
- [x] Add section: Formal Education (map + university table + top countries + formal/non-formal stacked)
- [x] Add section: MOOCs (platform distribution)
- [x] Add section: GitHub (repo types + stars)
- [x] Add section: Search Statistics (methodology blurb + histogram + funnel + outcomes)
- [x] Add methodology blurb before Search Statistics

## 5. Terminology / dataset.ts
- [x] Add JSDoc to Course type (signal_tier, learning_type, kotlin_confidence)
- [x] Fix formalInformal stacked bar to use "non-formal" display key (data value "informal" → display "non-formal")
- [x] learningCounts maps "informal" → "Non-formal" for donuts

## 6. Verification
- [x] npm run build — clean ✅
- [x] npm run lint — 0 new errors (pre-existing prettier issues unrelated to our changes) ✅
