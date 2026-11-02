"""Bundle src/ into one self-contained HTML file (dist/rythu-mitra.html)."""
import re, pathlib
src = pathlib.Path("src")
html = (src / "index.html").read_text()
html = html.replace('<link rel="stylesheet" href="styles.css">', "<style>\n" + (src / "styles.css").read_text() + "</style>")
def inline(m):
    return "<script>\n" + (src / m.group(1)).read_text() + "</script>"
html = re.sub(r'<script src="([a-z0-9]+\.js)"></script>', inline, html)
out = pathlib.Path("dist"); out.mkdir(exist_ok=True)
(out / "rythu-mitra.html").write_text(html)
print("built", len(html), "bytes")
