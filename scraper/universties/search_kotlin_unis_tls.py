"""Inspect the saved google_debug.html to identify what Google actually served."""
import re
import sys

html = open("google_debug.html", encoding="utf-8", errors="ignore").read()
low = html.lower()

print(f"size: {len(html)} bytes\n")

markers = [
    ("consent.google.com", "COOKIE CONSENT WALL"),
    ("before you continue", "consent interstitial"),
    ("enable javascript", "JS-only shell (no-JS client can't see results)"),
    ("/sorry/", "/sorry/ block page"),
    ("unusual traffic", "unusual-traffic CAPTCHA"),
    ("recaptcha", "reCAPTCHA present"),
    ("did not match any documents", "genuinely zero results"),
    ("noscript", "noscript block present"),
    ("this page checks to see", "bot-check page"),
]
print("page identity markers found:")
hit = False
for m, label in markers:
    if m in low:
        print(f"  >> {label}   (matched '{m}')")
        hit = True
if not hit:
    print("  (none of the known markers — unusual)")

# title tag tells a lot
t = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
print(f"\n<title>: {t.group(1).strip()[:120] if t else '(none)'}")

# first visible text chunk
text = re.sub(r"<script.*?</script>", " ", html, flags=re.I | re.S)
text = re.sub(r"<style.*?</style>", " ", text, flags=re.I | re.S)
text = re.sub(r"<[^>]+>", " ", text)
text = re.sub(r"\s+", " ", text).strip()
print(f"\nfirst 300 chars of visible text:\n  {text[:300]}")