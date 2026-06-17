# Learning - PostgreSQL schema design basics

*Reviewed for the Phase 1 checklist and tied to our `db/schema.sql` (10 tables).*

## Core ideas
- **Normalisation** - store each fact once. Separate entities (manufacturers,
  contacts, SKUs, reorder thresholds, production runs, communication log, users…)
  into their own tables and link them, rather than repeating data. This avoids
  update anomalies (changing a manufacturer's name in one place, not twenty).
- **Primary keys** - every table has a stable unique id (we use surrogate keys).
- **Foreign keys** - enforce referential integrity: a SKU-to-manufacturer assignment
  can't point at a manufacturer that doesn't exist, and `ON DELETE` rules decide what
  happens to children when a parent is removed.
- **Indexing** - add indexes on columns you filter/join on (foreign keys, SKU codes,
  lookup fields). They speed reads at a small write cost; don't index everything.
- **Constraints** - `NOT NULL`, `UNIQUE`, `CHECK` push data rules into the database so
  bad rows can't be written even if app code has a bug.

## Types & money
- Use `numeric`/`decimal` for money and stock, never floats (rounding errors).
- Use `timestamptz` for times; store UTC, convert on display.

## The project-specific concern: row-level scoping
The **Partner/Ambassador** role must see **only their own rows**, not just be limited
to certain modules. Two ways to enforce this:
1. **Query-level scoping** - every query for that role includes a `WHERE owner_id =
   :currentUser` filter, applied centrally so it can't be forgotten.
2. **Postgres Row-Level Security (RLS)** - policies on the table restrict rows by the
   current user/role at the database layer, so even a missed filter can't leak data.
RLS is the stronger guarantee; whichever we pick, the schema needs an **owner column**
on the partner-scoped tables.

## Open decision with a schema impact
Whether **Operations Manager** sees full or restricted **financial** data changes
whether financial columns/tables are exposed to that role - still pending Shontayvia.
Resolve before finalising the financial tables and any RLS policies.

## How this maps to our build
`db/schema.sql` already models the manufacturer/reorder domain and the user/role
tables; this review confirms the keys, indexes, and the owner-column requirement for
partner scoping are in place before live data lands.
