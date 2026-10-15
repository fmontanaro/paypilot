---
name: Replit Git backup recovery
description: Recovering app files when origin/main has been force-reset to an incomplete snapshot.
---

When `origin/main` has been force-reset to an incomplete or README-only commit, inspect available Replit backup refs before merging or resetting. `refs/remotes/gitsafe-backup/main` can retain the previous app tree and its `.replit` workflow configuration. Checking that tree out restores files without moving the current branch pointer; when the remote is README-only, the restored app files appear as staged additions.

**Why:** A hard reset to an incomplete remote removed the app from the workspace and prevented publishing; the backup ref still held the source and workflow configuration.

**How to apply:** Before destructive Git reconciliation in a Replit workspace, compare the remote tree with the current app and inspect `gitsafe-backup` refs. If restoring files without moving the branch, verify the run workflow returns and build the app.

An absent commit in branch history is not proof that GitHub no longer has it. Request the SHA or commit URL and try a direct fetch before substituting an older backup.

**Why:** A newer app rewrite was retrievable by its SHA even while the advertised remote branch had only an initial commit.

**How to apply:** Compare the supplied commit tree with the current workspace and preserve a local reference to it before applying its files.

Do not run package installation or workflow restarts concurrently with database preparation or production builds.

**Why:** During recovery, parallel environment-changing operations reported successful schema/build changes that were not present in the active runtime afterward.

**How to apply:** Complete environment-changing operations in order, then verify the active schema through the application's own connection and inspect the final build outputs.
