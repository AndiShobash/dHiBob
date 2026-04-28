# Test Plan: Profile GL/TL + Currency

**File:** `tests/unit/components/employee-profile.test.tsx`

---

## Mock data

### Existing `mockEmployee` (no changes needed to base object)

The existing mock already has:
```ts
manager: {
  id: 'mgr-1',
  firstName: 'Bob',
  lastName: 'Manager',
  displayName: 'Bob Manager',
  email: 'bob.manager@test.corp',
  status: 'ACTIVE',
  startDate: new Date('2020-01-01'),
  employmentType: 'FULL_TIME',
  companyId: 'co-1',
}
```

### Per-test overrides

**`mockEmployeeWithGL`** — for GL tests where TL has a manager:
```ts
const mockEmployeeWithGL = {
  ...mockEmployee,
  manager: {
    ...mockEmployee.manager,
    manager: { id: 'gl-1', firstName: 'Grace', lastName: 'Leader' },
  },
}
```

**`mockEmployeeWithNoGL`** — for GL "shows dash" test where TL has no manager:
```ts
const mockEmployeeWithNoGL = {
  ...mockEmployee,
  manager: {
    ...mockEmployee.manager,
    manager: null,
  },
}
```

**`mockEmployeeNoManager`** — for GL test where employee has no TL at all:
```ts
const mockEmployeeNoManager = {
  ...mockEmployee,
  manager: null,
  managerId: null,
}
```

---

## Test cases

### 1. UPDATE existing: "shows manager name in Work tab (Role section)" (line 128)

- **What changes:** Add assertion that the label `Team Leader (TL)` is present. The existing assertion (`screen.getAllByText(/Bob Manager/)`) stays the same since the manager name doesn't change.
- **Mock data:** Default `mockEmployee` (unchanged).
- **New assertions:**
  - `expect(screen.getByText('Team Leader (TL)')).toBeInTheDocument()`
- **Existing assertions kept:**
  - `expect(screen.getAllByText(/Bob Manager/).length).toBeGreaterThanOrEqual(1)`

### 2. UPDATE existing: "Work tab contains Role section and manager name" (line 209)

- **What changes:** Add assertion that `Team Leader (TL)` label appears and `Reports To` does not.
- **Mock data:** Default `mockEmployee` (unchanged).
- **New assertions:**
  - `expect(screen.getByText('Team Leader (TL)')).toBeInTheDocument()`
  - `expect(screen.queryByText('Reports To')).not.toBeInTheDocument()`
- **Existing assertions kept:**
  - `expect(screen.getByText('Role')).toBeInTheDocument()`
  - `expect(screen.getAllByText(/Bob Manager/).length).toBeGreaterThanOrEqual(1)`

### 3. NEW: "header subtitle shows TL: instead of Reports to"

- **Test name:** `header subtitle shows TL: prefix instead of Reports to`
- **Mock data:** Default `mockEmployee`.
- **Steps:** Render page (no tab switch needed, header is always visible).
- **Assertions:**
  - `expect(screen.getByText(/TL:/)).toBeInTheDocument()`
  - `expect(screen.queryByText(/Reports to/)).not.toBeInTheDocument()`

### 4. NEW: "Team field is removed from Role section"

- **Test name:** `Team field is removed from Role section`
- **Mock data:** Default `mockEmployee` with `workInfo: JSON.stringify({ team: 'Alpha Squad' })` to make sure even if data exists, the field isn't rendered.
- **Steps:** Click Work tab.
- **Assertions:**
  - Within the Role section, assert the "Team" label field is gone:
    - `expect(screen.queryByText('Alpha Squad')).not.toBeInTheDocument()` (the team value should not render)
  - Verify Role section itself still renders: `expect(screen.getByText('Role')).toBeInTheDocument()`

### 5. NEW: "GL shows skip-level manager name when TL has a manager"

- **Test name:** `Role section shows Group Leader (GL) derived from TL manager`
- **Mock data:** `mockEmployeeWithGL` (manager.manager = `{ id: 'gl-1', firstName: 'Grace', lastName: 'Leader' }`).
- **Steps:** Click Work tab.
- **Assertions:**
  - `expect(screen.getByText('Group Leader (GL)')).toBeInTheDocument()`
  - `expect(screen.getByText('Grace Leader')).toBeInTheDocument()`

### 6. NEW: "GL shows dash when TL has no manager"

- **Test name:** `Role section shows dash for GL when TL has no manager`
- **Mock data:** `mockEmployeeWithNoGL` (manager exists, manager.manager = null).
- **Steps:** Click Work tab.
- **Assertions:**
  - `expect(screen.getByText('Group Leader (GL)')).toBeInTheDocument()`
  - The FieldCell renders `value || '—'`, so when value is null it renders an em-dash. Assert:
    - Find the GL label element, then check its sibling/next element contains `—`
    - Alternatively: `expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)` (less precise but functional since other empty fields also show dash)
    - Better approach: use a container query scoped near the GL label text

### 7. NEW: "GL label not shown when employee has no TL"

- **Test name:** `Role section shows dash for GL when employee has no TL`
- **Mock data:** `mockEmployeeNoManager` (manager = null, managerId = null).
- **Steps:** Click Work tab.
- **Assertions:**
  - `expect(screen.getByText('Group Leader (GL)')).toBeInTheDocument()` (the label still renders)
  - The GL FieldCell value should be null/falsy, rendering `—`

### 8. NEW: "ILS is present in CURRENCY_OPTIONS (sanity check)"

- **Test name:** `ILS appears in currency options on profile page`
- **Mock data:** Default `mockEmployee` with salary history containing a currency field, e.g.:
  ```ts
  workInfo: JSON.stringify({
    salaryHistory: [
      { effectiveDate: '2023-01-01', salaryAmount: '5000', salaryCurrency: 'ILS' }
    ]
  })
  ```
- **Steps:** Click Work tab. Find the compensation history section. Look for the ILS badge rendered from salary history data.
- **Assertions:**
  - `expect(screen.getByText('ILS')).toBeInTheDocument()`
- **Note:** This is a sanity check confirming ILS already works. No code change needed for this test to pass.

---

## Summary

| # | Test name | Type | Mock variant |
|---|-----------|------|--------------|
| 1 | shows manager name in Work tab (Role section) | Update | default |
| 2 | Work tab contains Role section and manager name | Update | default |
| 3 | header subtitle shows TL: prefix instead of Reports to | New | default |
| 4 | Team field is removed from Role section | New | default + team workInfo |
| 5 | Role section shows Group Leader (GL) derived from TL manager | New | mockEmployeeWithGL |
| 6 | Role section shows dash for GL when TL has no manager | New | mockEmployeeWithNoGL |
| 7 | Role section shows dash for GL when employee has no TL | New | mockEmployeeNoManager |
| 8 | ILS appears in currency options on profile page | New | default + salaryHistory |

**Total: 2 existing test updates + 6 new tests = 8 test cases.**
