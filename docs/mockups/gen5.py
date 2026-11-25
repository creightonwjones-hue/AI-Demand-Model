"""Style sheet: four visual directions on the same small slice of the map."""
import sys

NODES = {  # id: (x, y, w, h, label, layer, status)
    "credit": (30, 40, 160, 46, "Private credit", "money", "warn"),
    "oai": (260, 40, 160, 46, "OpenAI", "labs", "warn"),
    "big": (490, 40, 160, 46, "Big Tech profits", "money", None),
    "cw": (140, 175, 160, 46, "CoreWeave", "cloud", "bad"),
    "msft": (400, 175, 160, 46, "Microsoft", "cloud", None),
    "nv": (250, 305, 200, 56, "NVIDIA", "chips", "warn"),
}
EDGES = [("credit", "cw", 4, "bad"), ("oai", "cw", 3, None), ("oai", "msft", 6, None), ("big", "msft", 10, None),
         ("cw", "nv", 4, "bad"), ("msft", "nv", 12, None)]

STYLES = [
    dict(key="quiet", name="Quiet product", font="Geist", mono="Geist Mono",
         gfont="Geist:wght@400..700&family=Geist+Mono:wght@400..600",
         blurb="Like Figma or Linear. White canvas with a faint dot grid, small cards, thin lines. Colour only "
               "marks the layer and the problems.",
         bg="#ffffff", grid="#e4e7eb", ink="#0f1115", mut="#6b7280", line="#c9ced6",
         layer={"money": "#f47230", "labs": "#6a4ce2", "cloud": "#e24d8b", "chips": "#008a17"},
         node="card", edge="curve"),
    dict(key="finance", name="Annual report", font="Libre Franklin", mono="Libre Franklin",
         gfont="Libre+Franklin:wght@400..800",
         blurb="Classic finance. No boxes: company names set in type with a coloured rule, navy lines. "
               "Calm and serious, like an investor-day exhibit.",
         bg="#fbfcfd", grid="#eef1f5", ink="#0b2545", mut="#5c6b80", line="#8da0b8",
         layer={"money": "#c8651b", "labs": "#5a3fc0", "cloud": "#b83a6e", "chips": "#1d7a3a"},
         node="rule", edge="ortho"),
    dict(key="bands", name="Layer bands", font="Schibsted Grotesk", mono="JetBrains Mono",
         gfont="Schibsted+Grotesk:wght@400..800&family=JetBrains+Mono:wght@400..600",
         blurb="Each layer of the chain is a soft colour band across the canvas, so you always know where you are. "
               "Lines take the payer's colour.",
         bg="#ffffff", grid="#ffffff", ink="#16181d", mut="#666d78", line="#b8bec8",
         layer={"money": "#f47230", "labs": "#6a4ce2", "cloud": "#e24d8b", "chips": "#008a17"},
         node="pill", edge="curve-col"),
    dict(key="bold", name="Bold blocks", font="Manrope", mono="Manrope",
         gfont="Manrope:wght@400..800",
         blurb="Built for a big screen. Solid colour blocks with white type, thick lines. Readable from "
               "the back of the room.",
         bg="#f2f4f7", grid="#e3e7ec", ink="#101318", mut="#5b6472", line="#9aa3b0",
         layer={"money": "#e8590c", "labs": "#5f3dc4", "cloud": "#c2255c", "chips": "#2b8a3e"},
         node="block", edge="ortho-thick"),
]
BAD, WARN = "#d92d2d", "#d48806"
BAND_Y = {"money": (20, 86), "cloud": (155, 86), "chips": (290, 86)}


def path(a, b, kind):
    ax, ay, aw, ah = NODES[a][:4]; bx, by, bw, bh = NODES[b][:4]
    x1, y1, x2, y2 = ax + aw / 2, ay + ah, bx + bw / 2, by
    if kind.startswith("ortho"):
        my = (y1 + y2) / 2; r = 10 if x1 != x2 else 0
        s = 1 if x2 > x1 else -1
        if r == 0:
            return f"M{x1},{y1} L{x2},{y2}"
        return (f"M{x1},{y1} L{x1},{my-r} Q{x1},{my} {x1+s*r},{my} L{x2-s*r},{my} Q{x2},{my} {x2},{my+r} L{x2},{y2}")
    my = (y1 + y2) / 2
    return f"M{x1},{y1} C{x1},{my} {x2},{my} {x2},{y2}"


def snippet(S):
    k = S["key"]
    o = [f'<svg viewBox="0 0 680 390" class="snip">',
         f'<defs><pattern id="dots-{k}" width="18" height="18" patternUnits="userSpaceOnUse">'
         f'<circle cx="1.5" cy="1.5" r="1.2" fill="{S["grid"]}"/></pattern></defs>',
         f'<rect width="680" height="390" fill="{S["bg"]}"/><rect width="680" height="390" fill="url(#dots-{k})"/>']
    if S["node"] == "pill":
        for lay, (y, h) in BAND_Y.items():
            o.append(f'<rect x="0" y="{y}" width="680" height="{h}" fill="{S["layer"][lay]}" opacity=".07"/>'
                     f'<text x="12" y="{y+16}" class="bandl" fill="{S["layer"][lay]}">'
                     f'{ {"money":"MONEY IN","cloud":"CLOUDS","chips":"CHIPS"}[lay] }</text>')
    # edges
    for i, (a, b, w, st) in enumerate(EDGES):
        d = path(a, b, S["edge"])
        lay = NODES[a][5]
        if S["edge"] == "curve":
            col = S["line"]
        elif S["edge"] == "ortho":
            col = S["line"]
        else:
            col = S["layer"][lay]
        sw = {"curve": 1 + w * .25, "ortho": 1.2 + w * .22, "curve-col": 1.5 + w * .45, "ortho-thick": 2 + w * .7}[S["edge"]]
        if st == "bad":
            col = BAD
        dash = ' stroke-dasharray="5 5"' if st == "bad" else ""
        o.append(f'<path id="e-{k}-{i}" d="{d}" fill="none" stroke="{col}" stroke-width="{sw:.1f}" '
                 f'stroke-linecap="round" stroke-opacity="{.95 if S["edge"]!="curve-col" else .55}"{dash}/>')
        # particles
        pc = S["layer"][lay] if S["edge"] in ("curve", "ortho") else ("#fff" if S["edge"] == "ortho-thick" else S["layer"][lay])
        if st == "bad":
            pc = BAD
        n = 1 if st == "bad" else max(2, w // 3)
        dur = 6 if st == "bad" else 3.2
        r = {"curve": 2.6, "ortho": 2.4, "curve-col": 3.2, "ortho-thick": 2.8}[S["edge"]]
        for j in range(n):
            o.append(f'<circle r="{r}" fill="{pc}"><animateMotion dur="{dur}s" repeatCount="indefinite" '
                     f'begin="{-j*dur/n:.2f}s"><mpath href="#e-{k}-{i}"/></animateMotion></circle>')
    # nodes
    for nid, (x, y, w, h, label, lay, st) in NODES.items():
        c = S["layer"][lay]
        big = nid == "nv"
        flag = ""
        if st:
            fc = BAD if st == "bad" else WARN
            word = "Default" if st == "bad" else "Stressed"
            flag = (f'<text x="{x+w}" y="{y-7}" text-anchor="end" class="flag" fill="{fc}">● {word}</text>')
        if S["node"] == "card":
            o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="#fff" stroke="{S["line"] if not st else (BAD if st=="bad" else WARN)}" '
                     f'stroke-width="{1 if not st else 1.6}"/>'
                     f'<circle cx="{x+16}" cy="{y+h/2}" r="4" fill="{c}"/>'
                     f'<text x="{x+28}" y="{y+h/2+5}" class="nl{" big" if big else ""}" fill="{S["ink"]}">{label}</text>')
        elif S["node"] == "rule":
            o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{S["bg"]}"/>'
                     f'<rect x="{x}" y="{y+h-3}" width="{w}" height="3" fill="{c}"/>'
                     f'<text x="{x}" y="{y+h/2+4}" class="nl{" big" if big else ""}" fill="{S["ink"]}">{label}</text>')
            if st:
                o.append(f'<rect x="{x}" y="{y+h-3}" width="{w}" height="3" fill="{BAD if st=="bad" else WARN}"/>')
        elif S["node"] == "pill":
            o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="#fff" stroke="{c}" stroke-width="1.6"/>'
                     f'<text x="{x+w/2}" y="{y+h/2+5}" text-anchor="middle" class="nl{" big" if big else ""}" fill="{S["ink"]}">{label}</text>')
            if st:
                o.append(f'<circle cx="{x+w-4}" cy="{y+4}" r="6" fill="{BAD if st=="bad" else WARN}" stroke="#fff" stroke-width="2"/>')
        else:
            o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{c}"/>'
                     f'<text x="{x+14}" y="{y+h/2+5}" class="nl{" big" if big else ""}" fill="#fff">{label}</text>')
            if st:
                o.append(f'<rect x="{x-3}" y="{y-3}" width="{w+6}" height="{h+6}" rx="8" fill="none" '
                         f'stroke="{BAD if st=="bad" else WARN}" stroke-width="3"/>')
        o.append(flag)
    # floating NVIDIA card + zoom controls
    o.append(f'<g class="float"><rect x="480" y="300" width="186" height="76" rx="10" fill="#fff" stroke="{S["line"]}"/>'
             f'<text x="494" y="322" class="fl-k" fill="{S["mut"]}">NVIDIA · 2028 revenue</text>'
             f'<text x="494" y="352" class="fl-v" fill="{S["ink"]}">$250B</text>'
             f'<text x="582" y="352" class="fl-d" fill="{BAD}">−18%</text>'
             f'<text x="494" y="368" class="fl-k" fill="{S["mut"]}">vs. Wall St. $345B</text></g>')
    o.append(f'<g><rect x="14" y="320" width="34" height="56" rx="8" fill="#fff" stroke="{S["line"]}"/>'
             f'<text x="31" y="342" text-anchor="middle" class="zm" fill="{S["ink"]}">+</text>'
             f'<line x1="20" x2="42" y1="348" y2="348" stroke="{S["line"]}"/>'
             f'<text x="31" y="368" text-anchor="middle" class="zm" fill="{S["ink"]}">−</text></g>')
    o.append('</svg>')
    return "".join(o)


def card(S, letter):
    k = S["key"]
    return f'''
<div class="opt" style="--f:'{S["font"]}';--m:'{S["mono"]}'">
  <style>
   .opt[data-k="{k}"] .snip text{{font-family:'{S["font"]}',sans-serif}}
  </style>
  <div class="snipwrap" data-k="{k}">{snippet(S)}</div>
  <div class="meta">
    <div class="ttl"><span class="lt">{letter}</span><span style="font-family:'{S["font"]}';font-weight:700">{S["name"]}</span></div>
    <p>{S["blurb"]}</p>
    <div class="spec" style="font-family:'{S["font"]}'">
      <span class="s1">AI demand is real.</span>
      <span class="s2">$250B</span>
      <span class="s3">Font: {S["font"]}</span>
    </div>
  </div>
</div>'''


fonts = "&family=".join(S["gfont"] for S in STYLES)
html = f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Style Directions</title>
<link href="https://fonts.googleapis.com/css2?family={fonts}&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box}}
body{{margin:0;background:#e9ecf0;font-family:Geist,system-ui,sans-serif;color:#111}}
.wrap{{max-width:1500px;margin:0 auto;padding:36px 20px 70px}}
h1{{font:700 26px Geist,sans-serif;margin:0 0 6px}} .lead{{font:400 15px/1.5 Geist;color:#4b5563;margin:0 0 26px;max-width:820px}}
.grid{{display:grid;grid-template-columns:1fr 1fr;gap:26px}}
.opt{{background:#fff;border-radius:14px;overflow:hidden;border:1px solid #d6dbe1}}
.snipwrap{{border-bottom:1px solid #e3e7ec}} .snip{{display:block;width:100%}}
.meta{{padding:18px 22px 22px}}
.ttl{{display:flex;align-items:center;gap:12px;font-size:20px}}
.lt{{font:700 13px Geist Mono,monospace;width:26px;height:26px;border-radius:6px;background:#111;color:#fff;display:grid;place-items:center}}
.meta p{{font:400 14px/1.5 Geist;color:#4b5563;margin:8px 0 14px}}
.spec{{display:flex;align-items:baseline;gap:18px;flex-wrap:wrap;border-top:1px solid #eef0f3;padding-top:14px}}
.s1{{font-size:24px;font-weight:700;letter-spacing:-.01em}} .s2{{font-size:24px;font-weight:500;font-variant-numeric:tabular-nums}}
.s3{{font-size:12px;color:#6b7280}}
.snip .nl{{font-size:14px;font-weight:600}} .snip .nl.big{{font-size:19px;font-weight:800}}
.snip .flag{{font-size:11px;font-weight:600}} .snip .bandl{{font-size:10px;font-weight:700;letter-spacing:.1em}}
.snip .fl-k{{font-size:10.5px}} .snip .fl-v{{font-size:24px;font-weight:700}} .snip .fl-d{{font-size:13px;font-weight:700}}
.snip .zm{{font-size:17px;font-weight:500}}
@media(max-width:1000px){{.grid{{grid-template-columns:1fr}}}}
</style></head><body><div class="wrap">
<h1>Pick a look</h1>
<p class="lead">The same small piece of the map in four styles. Each one is a canvas you'd zoom and drag around,
with small dots flowing along the lines to show money moving. Tell me which is closest, or mix them:
“A’s layout with D’s font”.</p>
<div class="grid">{"".join(card(S, L) for S, L in zip(STYLES, "ABCD"))}</div>
</div></body></html>'''
html = html.replace('class="opt" style', 'class="opt" data-k="x" style')
for S in STYLES:
    html = html.replace('data-k="x"', f'data-k="{S["key"]}"', 1)
open(sys.argv[1], "w").write(html)
print("ok")
