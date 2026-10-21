"""Fetch primary Cloudflare/OpenNext docs and extract the constraint facts we need."""
import html
import pathlib
import re
import urllib.request

PAGES = {
    "d1-limits": "https://developers.cloudflare.com/d1/platform/limits/",
    "d1-time-travel": "https://developers.cloudflare.com/d1/reference/time-travel/",
    "d1-sql-statements": "https://developers.cloudflare.com/d1/sql-api/sql-statements/",
    "d1-database-api": "https://developers.cloudflare.com/d1/worker-api/d1-database/",
    "workers-limits": "https://developers.cloudflare.com/workers/platform/limits/",
    "r2-presigned": "https://developers.cloudflare.com/r2/api/s3/presigned-urls/",
    "r2-data-location": "https://developers.cloudflare.com/r2/reference/data-location/",
    "workers-webcrypto": "https://developers.cloudflare.com/workers/runtime-apis/web-crypto/",
    "d1-drizzle": "https://developers.cloudflare.com/d1/examples/d1-and-drizzle/",
}

KEYWORDS = [
    "foreign key", "batch", "transaction", "commit", "rollback", "pragma",
    "bound", "parameter", "statement", "sqlite_version", "returning",
    "time travel", "restore", "export", "day", "cpu", "argon", "pbkdf2",
    "scrypt", "presign", "signature", "expires", "body size", "jurisdiction",
    "location hint", "read replication", "row", "database size", "column",
]

out_dir = pathlib.Path(__file__).resolve().parent / "docs"
out_dir.mkdir(exist_ok=True)
summary = []

for name, url in PAGES.items():
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 docs-fetch"})
        raw = urllib.request.urlopen(req, timeout=30).read().decode("utf8", "replace")
    except Exception as exc:  # noqa: BLE001
        summary.append(f"\n### {name} ({url})\n  FETCH FAILED: {exc}")
        continue
    body = re.sub(r"(?is)<(script|style|nav|footer|head)[^>]*>.*?</\1>", " ", raw)
    body = re.sub(r"(?is)<br\s*/?>|</(p|li|tr|h[1-6]|div|td|th)>", "\n", body)
    text = html.unescape(re.sub(r"(?s)<[^>]+>", " ", body))
    text = re.sub(r"[ \t\u00a0]+", " ", text)
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if len(ln) > 2]
    payload = "\n".join(lines)
    (out_dir / f"{name}.txt").write_text(payload, encoding="utf8")

    hits = []
    seen = set()
    for i, ln in enumerate(lines):
        low = ln.lower()
        if any(k in low for k in KEYWORDS) and ln not in seen:
            seen.add(ln)
            hits.append(ln[:400])
    summary.append(f"\n### {name} :: {url} :: {len(lines)} lines")
    summary += [f"  - {h}" for h in hits[:60]]

print("\n".join(summary))
