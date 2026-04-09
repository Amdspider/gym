# SPIDE-OS

## Navigation Notes

- Calendar tab is supported in Router and can be deep-linked via URL hash, for example `#calendar`.
- The last opened section is remembered and restored on next app load.
- If a nav button/page mapping is broken, the app logs a router warning in console.

## Quick Nav Integrity Check

Run this before deployment to verify nav button IDs, page sections, and router pages are aligned:

```bash
node scripts/verify-nav.mjs
```