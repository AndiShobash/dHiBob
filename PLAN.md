# Implementation Plan: Profile GL/TL + Currency

## Task 1 — Rename "Reports To" → "Team Leader (TL)" and add "Group Leader (GL)"

### 1a. Relabel ManagerPicker (frontend only)

**File:** `src/app/(dashboard)/people/[id]/page.tsx`

- Line 1103: Change `label="Reports To"` → `label="Team Leader (TL)"`
- Line 933 (header subtitle): Change the text `Reports to` → `TL:` in the summary line under the employee name

### 1b. Remove "Team" field from Role section

**File:** `src/app/(dashboard)/people/[id]/page.tsx`

- Line 1108: Delete `<F label="Team" value={team} onSave={wi('team')} />`
- Line 812: The `team` variable declaration (`const team = workInfo.team || '';`) can stay — it's harmless and may be used elsewhere. But remove it if it's only referenced in the deleted field (it is only used on line 1108, so remove it too for cleanliness).

### 1c. Add GL field (skip-level manager, read-only)

**Backend change — `src/server/routers/employee.ts`:**

The `getById` query currently uses `manager: true` (line 80), which returns the full manager record including `managerId`. But we also need the manager's manager's **name** for the GL display.

Change line 80 from:
```ts
manager: true,
```
to:
```ts
manager: {
  include: {
    manager: { select: { id: true, firstName: true, lastName: true } },
  },
},
```

This nests one more level so `employee.manager.manager` gives us the GL (skip-level).

**Frontend change — `src/app/(dashboard)/people/[id]/page.tsx`:**

After the ManagerPicker for TL in the Role section grid (around line 1103-1107), add a read-only `FieldCell`:

```tsx
<FieldCell
  label="Group Leader (GL)"
  value={
    (employee.manager as any)?.manager
      ? `${(employee.manager as any).manager.firstName} ${(employee.manager as any).manager.lastName}`
      : null
  }
/>
```

This is read-only (no `onSave`), auto-derived, and shows "—" when TL has no manager.

Also update the header subtitle (line 933 area) — optionally show GL there too. Based on the task description, GL only needs to appear in the Role section, so this is optional.

**Grid column count:** Currently `grid-cols-6` with fields: Job, Reports To, Team, Office, HR, Worker Type. After removing Team and adding GL: Job, TL, GL, Office, HR, Worker Type — still 6 columns. No grid change needed.

### 1d. Header subtitle text

Line ~933: Change `Reports to` text to `TL:` for consistency with the new label.

```tsx
// Before:
<span className="text-gray-400"> • Reports to <a ...>{managerDisplay}</a></span>

// After:
<span className="text-gray-400"> • TL: <a ...>{managerDisplay}</a></span>
```

---

## Task 2 — Add ILS to currency dropdowns

### Audit results

| Location | File | Current currencies | ILS present? |
|---|---|---|---|
| Profile page `CURRENCY_OPTIONS` | `people/[id]/page.tsx:193` | USD, EUR, GBP, **ILS**, CAD, AUD, CHF, JPY, INR, BRL | Yes |
| Expenses page submit form | `expenses/page.tsx:329` | USD, EUR, GBP, **ILS**, CAD, AUD | Yes |
| Compensation page | `compensation/page.tsx` | No currency dropdown (just `$` display) | N/A |
| Payroll page | `payroll/page.tsx` | No currency dropdown (uses `formatCurrency` display) | N/A |
| Workforce planning page | `workforce-planning/page.tsx` | Has `currency` in state defaulting to USD but **no dropdown rendered** — the form only shows title, department, site, salary, status | No dropdown |
| Reports page | `reports/page.tsx` | No editable currency dropdown (read-only columns) | N/A |

**Result: ILS is already present in all user-facing currency dropdowns.** No changes needed for Task 2.

The workforce planning page has a currency field in state but no visible dropdown in the form UI — this is a separate UX issue (no currency selector at all), not a missing ILS issue. Out of scope for this task.

---

## Tests

**File:** `tests/unit/components/employee-profile.test.tsx`

### Existing test updates

1. **"shows manager name in Work tab (Role section)"** (line 128): Update assertion text — currently checks for `Bob Manager` text. Also verify label `Team Leader (TL)` appears instead of `Reports To`.

2. **"Work tab contains Role section and manager name"** (line 209): Same — update to check for `Team Leader (TL)` label.

### New tests

3. **"Role section shows Team Leader (TL) label instead of Reports To"**: Navigate to Work tab, assert `screen.getByText('Team Leader (TL)')` exists, assert `screen.queryByText('Reports To')` is null.

4. **"Team field is removed from Role section"**: Navigate to Work tab, assert `screen.queryByText('Team')` does not appear as a field label in the Role section. (Use `queryByText` with exact match for the label.)

5. **"GL shows skip-level manager name"**: Create a mock employee where `manager.manager = { id: 'gl-1', firstName: 'Grace', lastName: 'Leader' }`. Render, go to Work tab, assert `screen.getByText('Grace Leader')` and `screen.getByText('Group Leader (GL)')`.

6. **"GL shows dash when TL has no manager"**: Create a mock employee where `manager` exists but `manager.manager` is null. Render, go to Work tab, assert `Group Leader (GL)` label exists and its value is `—`.

7. **"ILS appears in profile currency options"**: Navigate to Work tab, click on salary currency badge in compensation history, assert `ILS` option is visible. (This just validates the existing `CURRENCY_OPTIONS` array — a quick sanity check.)

### Mock data changes

- The existing `mockEmployee` has `manager: { id: 'mgr-1', firstName: 'Bob', lastName: 'Manager', ... }`. For GL tests, add `manager: { ...existing, manager: { id: 'gl-1', firstName: 'Grace', lastName: 'Leader' } }` in the specific test cases.

---

## File change summary

| File | Change |
|---|---|
| `src/server/routers/employee.ts` | Nest manager include to get skip-level manager |
| `src/app/(dashboard)/people/[id]/page.tsx` | Relabel TL, remove Team, add GL FieldCell, update header text |
| `tests/unit/components/employee-profile.test.tsx` | Update 2 existing tests, add ~5 new tests |

Total: 3 files changed.
