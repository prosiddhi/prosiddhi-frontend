---
description: Regenerate the Charter and Pricing Memo PDFs from current markdown.
---

Regenerate the two stakeholder-facing PDFs from their source markdown. Both PDFs go to the Product Owner / Sponsor (Shaik Ishaq), so the file sizes are a useful sanity check (very small file = generation failed silently).

Run these two commands sequentially:

```bash
python3 docs/_context/tools/md_to_pdf.py docs/managerial/01-project-charter.md docs/managerial/01-project-charter.pdf
python3 docs/_context/tools/md_to_pdf.py docs/managerial/03-pricing-decision-memo.md docs/managerial/03-pricing-decision-memo.pdf
```

Then run `ls -lh docs/managerial/01-project-charter.pdf docs/managerial/03-pricing-decision-memo.pdf` and report:
- Both file sizes in KB
- The Last Modified timestamp
- Confirm both are larger than ~10KB (anything smaller suggests the markdown failed to render)

If either command errors, surface the full stderr — do not silently retry.
