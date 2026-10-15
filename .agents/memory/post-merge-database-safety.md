---
name: Post-merge database safety
description: Why automatic task reconciliation must not apply database migrations blindly.
---

Do not apply schema migrations or recreate database structures automatically as part of task-merge preparation.

**Why:** The existing managed database contains financial records and legacy structure beyond the current schema declaration. Historical migrations intended for a new database are not evidence that they can safely be applied to this database.

**How to apply:** Keep dependency/build reconciliation separate from schema deployment. For changes requiring DDL, inspect the actual target schema and review the migration explicitly rather than adding an unconditional migration command to the post-merge hook.
