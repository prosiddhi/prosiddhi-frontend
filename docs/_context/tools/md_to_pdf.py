#!/usr/bin/env python3
"""Convert a markdown file to a styled PDF via Chrome headless."""
import sys
import os
import subprocess
import tempfile
import markdown

CSS = """
@page {
  size: A4;
  margin: 18mm 16mm 18mm 16mm;
}
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: -apple-system, "Helvetica Neue", "Segoe UI", Roboto, sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #222;
  max-width: 100%;
}
h1 { font-size: 22pt; color: #164e65; border-bottom: 2px solid #5cc2ed; padding-bottom: 6pt; margin-top: 0; page-break-after: avoid; }
h2 { font-size: 15pt; color: #164e65; margin-top: 18pt; padding-top: 4pt; page-break-after: avoid; }
h3 { font-size: 12.5pt; color: #2a5a73; margin-top: 14pt; page-break-after: avoid; }
h4 { font-size: 11pt; color: #444; }
p, li { margin: 6pt 0; }
strong { color: #164e65; }
a { color: #1976a8; text-decoration: none; word-break: break-word; }
hr { border: 0; border-top: 1px solid #ccc; margin: 14pt 0; }
blockquote {
  border-left: 3px solid #5cc2ed;
  background: #f5fafd;
  padding: 8pt 12pt;
  margin: 10pt 0;
  color: #444;
  font-size: 10pt;
}
code {
  font-family: "Menlo", "Consolas", monospace;
  font-size: 9.5pt;
  background: #f4f4f4;
  padding: 1pt 4pt;
  border-radius: 3px;
}
pre {
  background: #f4f4f4;
  padding: 10pt;
  border-radius: 4px;
  font-size: 9pt;
  overflow-x: auto;
  page-break-inside: avoid;
}
pre code { background: none; padding: 0; }
table {
  border-collapse: collapse;
  width: 100%;
  margin: 10pt 0;
  font-size: 9.5pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #ccc;
  padding: 6pt 8pt;
  text-align: left;
  vertical-align: top;
}
th {
  background: #eef6fb;
  color: #164e65;
  font-weight: 600;
}
tr:nth-child(even) td { background: #fafbfc; }
ul, ol { padding-left: 22pt; margin: 6pt 0; }
li > ul, li > ol { margin: 2pt 0; }
del { color: #888; }
.footer-meta { font-size: 8.5pt; color: #888; margin-top: 24pt; border-top: 1px solid #eee; padding-top: 6pt; }
"""

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def md_to_html(md_text, title):
    html_body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "sane_lists", "toc"],
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>{CSS}</style>
</head>
<body>
{html_body}
</body>
</html>
"""


def html_to_pdf(html_path, pdf_path):
    # Chrome headless print-to-pdf
    cmd = [
        CHROME,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        f"file://{html_path}",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Chrome stderr: {result.stderr}", file=sys.stderr)
        sys.exit(result.returncode)


def convert(md_path, pdf_path):
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()
    title = os.path.basename(md_path).replace(".md", "")
    html = md_to_html(md_text, title)

    # Save HTML to a temp file (Chrome needs a real path)
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".html", delete=False, encoding="utf-8"
    ) as tf:
        tf.write(html)
        tmp_html = tf.name

    try:
        html_to_pdf(tmp_html, pdf_path)
        size = os.path.getsize(pdf_path)
        print(f"  ✓ {pdf_path}  ({size // 1024} KB)")
    finally:
        os.unlink(tmp_html)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.md> <output.pdf>", file=sys.stderr)
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
