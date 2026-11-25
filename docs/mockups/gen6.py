"""Mockup v6: style A (quiet canvas) with toned-down D colours. Whole map + same canvas zoomed into a deal."""
import sys, math

COL = {"money": "#c9683a", "labs": "#6b5bb8", "cloud": "#b2557d", "chips": "#3d8a57", "supply": "#4a72ad"}
BAD, WARN = "#d23b3b", "#d4900f"
LINE, INK, MUT = "#cdd3da", "#101318", "#6b7280"

# ------------------------------------------------------------------ whole map
N = {  # id: (x, y, w, h, label, layer, status)
    "big": (290, 90, 160, 42, "Big Tech profits", "money", None),
    "cust": (540, 90, 150, 42, "AI customers", "money", None),
    "vc": (760, 90, 150, 42, "Venture capital", "money", None),
    "credit": (1090, 90, 160, 42, "Private credit", "money", "warn"),
    "tpu": (280, 560, 130, 42, "Google TPU", "chips", None),
    "trn": (425, 560, 150, 42, "Amazon Trainium", "chips", None),
    "nv": (610, 552, 230, 58, "NVIDIA", "chips", "warn"),
    "amd": (1060, 560, 120, 42, "AMD", "chips", None),
    "hynix": (380, 720, 160, 42, "SK Hynix", "supply", None),
    "tsmc": (640, 720, 180, 42, "TSMC", "supply", None),
    "asml": (920, 720, 150, 42, "ASML", "supply", None),
}
G = {  # id: (x, y, w, h, title, layer, [(name, status)])
    "labs": (510, 222, 500, 78, "AI LABS", "labs", [("OpenAI", "warn"), ("Anthropic", None), ("xAI", None), ("AI startups", None)]),
    "cash": (270, 382, 494, 78, "CASH-FUNDED CLOUDS", "cloud", [("Microsoft", None), ("Google", None), ("AWS", None), ("Meta", None)]),
    "debt": (800, 382, 494, 78, "DEBT-FUNDED CLOUDS", "cloud", [("Oracle", "warn"), ("CoreWeave", "bad"), ("Nebius", "warn"), ("Lambda", None)]),
}
E = [  # (src, dst, x_out, x_in, $B, amount, state, title, t)
    ("big", "cash", 370, 370, 300, "$300B", None, "Reinvested profits", .5),
    ("cust", "labs", 615, 615, 60, "$60B", None, "Subscriptions", .5),
    ("vc", "labs", 835, 835, 90, "$90B", None, "Equity funding", .5),
    ("credit", "debt", 1170, 1170, 35, "$35B", "warn", "GPU-backed loans", .62),
    ("labs", "cash", 640, 600, 110, "$110B", None, "Rents compute", .5),
    ("labs", "debt", 900, 950, 40, "$40B", "warn", "Rents compute", .5),
    ("cash", "tpu", 345, 345, 25, "", None, "Own chips", .5),
    ("cash", "trn", 500, 500, 20, "", None, "Own chips", .5),
    ("cash", "nv", 690, 690, 200, "$200B", None, "Buys GPUs", .5),
    ("debt", "nv", 920, 800, 45, "$45B", "bad", "Buys GPUs", .45),
    ("debt", "amd", 1120, 1120, 15, "", None, "Buys GPUs", .5),
    ("tpu", "hynix", 345, 420, 8, "", None, "Buys memory", .32),
    ("trn", "hynix", 500, 480, 6, "", None, None, .5),
    ("nv", "hynix", 660, 510, 45, "$45B", None, "Buys memory", .62),
    ("nv", "tsmc", 760, 730, 40, "$40B", None, "Manufacturing", .5),
    ("amd", "tsmc", 1120, 800, 8, "", None, "Manufacturing", .55),
]
LAYERS = [("Money in", "money", 111), ("AI labs", "labs", 261), ("Clouds", "cloud", 421), ("Chip makers", "chips", 581),
          ("Supply chain", "supply", 741)]


def layer_of(i):
    return (N.get(i) or (None,) * 5 + (G[i][5],))[5] if i in N else G[i][5]


def box(i):
    if i in N:
        return N[i][:4]
    return G[i][:4]


def sw(v):
    return round(1.2 + math.sqrt(v) * .28, 2)


def node(x, y, w, h, label, layer, st, big=False, sub=None, uid=""):
    c = COL[layer]
    o = []
    if st:
        rc = BAD if st == "bad" else WARN
        o.append(f'<rect x="{x-3.5}" y="{y-3.5}" width="{w+7}" height="{h+7}" rx="11" fill="none" stroke="{rc}" '
                 f'stroke-width="2"/>')
        o.append(f'<text x="{x+w}" y="{y-10}" text-anchor="end" class="flag" fill="{rc}">● '
                 f'{"Default" if st=="bad" else "Stressed"}</text>')
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{c}"/>')
    if big:
        o.append(f'<text x="{x+16}" y="{y+27}" class="nl big">{label}</text>'
                 f'<text x="{x+16}" y="{y+45}" class="nsub">{sub}</text>')
    else:
        o.append(f'<text x="{x+w/2}" y="{y+h/2+4.5}" text-anchor="middle" class="nl">{label}</text>')
    return "".join(o)


def edge(d, v, layer, st, eid, label=None, lx=0, ly=0):
    c = BAD if st == "bad" else LINE
    dash = ' stroke-dasharray="4 5"' if st == "bad" else ""
    o = [f'<path id="{eid}" d="{d}" fill="none" stroke="{c}" stroke-width="{sw(v)}" stroke-linecap="round"{dash}/>']
    pc = BAD if st == "bad" else COL[layer]
    n = 1 if st == "bad" else max(1, min(7, round(math.sqrt(v) / 2)))
    dur = 7 if st == "bad" else (5.2 if st == "warn" else 3.4)
    for j in range(n):
        o.append(f'<circle r="{2.4 if v < 100 else 3}" fill="{pc}"><animateMotion dur="{dur}s" repeatCount="indefinite" '
                 f'begin="{-j*dur/n:.2f}s"><mpath href="#{eid}"/></animateMotion></circle>')
    if label:
        o.append(f'<text x="{lx}" y="{ly}" class="el{" bad" if st=="bad" else ""}">{label}</text>')
    return "".join(o)


def chip(x, y, title, amt, st):
    w = len(title) * 6.0 + (len(amt) * 6.4 + 10 if amt else 0) + 20
    c = BAD if st == "bad" else "#cfd5dc"
    o = (f'<g class="chip"><rect x="{x-w/2}" y="{y-11}" width="{w}" height="22" rx="6" stroke="{c}"/>'
         f'<text x="{x-w/2+10}" y="{y+4}" class="ct">{title}</text>')
    if amt:
        o += f'<text x="{x+w/2-10}" y="{y+4}" text-anchor="end" class="ca{" bad" if st=="bad" else ""}">{amt}</text>'
    return o + '</g>'


def curve(x1, y1, x2, y2):
    my = (y1 + y2) / 2
    return f"M{x1},{y1} C{x1},{my} {x2},{my} {x2},{y2}"


def map_svg():
    o = ['<svg viewBox="0 0 1440 860" class="cv"><defs><pattern id="dots" width="20" height="20" '
         'patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1.1" fill="#dfe3e8"/></pattern></defs>'
         '<rect width="1440" height="860" fill="url(#dots)"/><g transform="translate(-67,64) scale(.85)">']
    for name, lay, y in LAYERS:
        o.append(f'<circle cx="150" cy="{y-4}" r="4" fill="{COL[lay]}"/><text x="162" y="{y}" class="ll">{name}</text>')
    for gid, (x, y, w, h, t, lay, kids) in G.items():
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" class="grp"/>'
                 f'<text x="{x+w-14 if gid!="debt" else x+180}" y="{y-9}" text-anchor="{"end" if gid!="debt" else "start"}" class="gl">{t}</text>')
    chips = []
    for i, (a, b, xo, xi, v, lab, st, title, tt) in enumerate(E):
        ax, ay, aw, ah = box(a); bx, by, bw, bh = box(b)
        y1, y2 = ay + ah + (4 if a in G else 2), by - (4 if b in G else 4)
        if a in N and N[a][6]:
            y1 += 4
        if b in N and N[b][6]:
            y2 -= 4
        d = curve(xo, y1, xi, y2)
        o.append(edge(d, v, layer_of(a), st, f"m{i}"))
        if title:
            my = (y1 + y2) / 2
            px = (1-tt)**3*xo + 3*(1-tt)**2*tt*xo + 3*(1-tt)*tt**2*xi + tt**3*xi
            py = (1-tt)**3*y1 + 3*(1-tt)**2*tt*my + 3*(1-tt)*tt**2*my + tt**3*y2
            chips.append(chip(px, py, title, lab, st))
    o.append(edge("M820,741 L916,741", 30, "supply", None, "m99"))
    chips.append(chip(868, 741, "Lithography", "", None))
    o.extend(chips)
    for gid, (x, y, w, h, t, lay, kids) in G.items():
        pad, gap = 12, 10
        kw = (w - pad * 2 - gap * (len(kids) - 1)) / len(kids)
        for k, (n, st) in enumerate(kids):
            o.append(node(x + pad + k * (kw + gap), y + 18, kw, 42, n, lay, st))
    for i, (x, y, w, h, l, lay, st) in N.items():
        o.append(node(x, y, w, h, l, lay, st, big=(i == "nv"), sub="2028 revenue $250B · −18%"))
    # event callouts
    o.append(callout(1302, 392, "B", "Q3 2027", "CoreWeave can’t refinance", "$7.5B of GPU loans", side="right"))
    o.append(callout(1180, 180, "A", "Q2 2027", "Lenders cut GPU loans 30%", "as resale values fall", side="right"))
    o.append(callout(846, 622, "C", "Q4 2027", "NVIDIA pays out $6.3B", "CoreWeave capacity guarantee", side="right"))
    o.append('</g></svg>')
    return "".join(o)


def callout(x, y, k, q, a, b, side="right"):
    return (f'<g class="co"><path d="M{x},{y+20} l10,-6 v12 z" fill="#fff" stroke="#d6dbe1"/>'
            f'<rect x="{x+9}" y="{y}" width="196" height="62" rx="9" fill="#fff" stroke="#d6dbe1"/>'
            f'<rect x="{x+10}" y="{y+13}" width="2" height="14" fill="#fff"/>'
            f'<circle cx="{x+28}" cy="{y+20}" r="9" fill="{INK}"/><text x="{x+28}" y="{y+24}" class="cok">{k}</text>'
            f'<text x="{x+44}" y="{y+24}" class="coq">{q}</text>'
            f'<text x="{x+21}" y="{y+43}" class="coa">{a}</text><text x="{x+21}" y="{y+57}" class="cob">{b}</text></g>')


# ------------------------------------------------------------------ zoomed deal
def deal_svg():
    o = ['<svg viewBox="0 0 1440 860" class="cv"><defs><pattern id="dots2" width="40" height="40" '
         'patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1.6" fill="#dfe3e8"/></pattern></defs>'
         '<rect width="1440" height="860" fill="url(#dots2)"/>']
    # faded context at the edges
    o.append('<g opacity=".28">' + node(-60, 300, 220, 64, "Meta", "cloud", None) +
             node(1300, 120, 220, 64, "Nebius", "cloud", None) + node(1300, 520, 220, 64, "Lambda", "cloud", None) +
             node(560, 900, 320, 80, "TSMC", "supply", None) + '</g><g transform="translate(20,118) scale(.82)">')
    big = lambda x, y, w, label, lay, st, sub: (
        node(x, y, w, 64, label, lay, st) if not sub else
        node(x, y, w, 64, label, lay, st)[:-7] + "")
    E2 = [
        ("M470,180 L610,180", 75, "money", "warn"),
        ("M850,180 L990,180", 75, "money", None),
        ("M730,410 L730,212", 60, "cloud", "warn"),
        ("M330,640 C330,560 690,560 690,476", 40, "cloud", None),
        ("M1110,640 C1110,560 770,560 770,476", 60, "labs", "warn"),
    ]
    for i, (d, v, lay, st) in enumerate(E2):
        o.append(edge(d, v * 2.2, lay, st, f"d{i}"))
    o.append(f'<path d="M1110,212 C1110,330 1000,443 852,443" fill="none" stroke="{INK}" stroke-width="1.6" '
             f'stroke-dasharray="2 6" stroke-linecap="round"/><path d="M864,436 L852,443 L864,450" fill="none" '
             f'stroke="{INK}" stroke-width="1.6"/>')
    ents = [(230, 148, 240, "Private-credit lenders", "money", "warn"), (610, 148, 240, "GPU SPV", "money", "bad"),
            (990, 148, 240, "NVIDIA", "chips", None), (610, 410, 240, "CoreWeave", "cloud", "bad"),
            (210, 640, 240, "Microsoft", "cloud", None), (990, 640, 240, "OpenAI", "labs", "warn")]
    for x, y, w, l, lay, st in ents:
        o.append(node(x, y, w, 64, l, lay, st).replace('class="nl"', 'class="nl lg"'))
    terms = [
        (440, 56, "Loan", "$7.5B at 11%, due 2030", "Interest $0.8B a year"),
        (830, 56, "Purchase", "$7.5B of GPUs", "Paid up front"),
        (760, 272, "Lease", "CoreWeave rents the chips", "Rent repays the loan"),
        (1050, 300, "Guarantee", "NVIDIA buys unused capacity", "Up to $6.3B through 2032"),
        (370, 520, "Contract", "Microsoft · $10B over 5 yrs", "Take-or-pay: must pay"),
        (830, 560, "Contract", "OpenAI · $22B over 5 yrs", "Can be renegotiated"),
    ]
    for x, y, k, a, b in terms:
        o.append(f'<g class="term"><rect x="{x}" y="{y}" width="230" height="70" rx="10"/>'
                 f'<text x="{x+16}" y="{y+22}" class="tk">{k.upper()}</text>'
                 f'<text x="{x+16}" y="{y+42}" class="ta">{a}</text><text x="{x+16}" y="{y+59}" class="tb">{b}</text></g>')
    o.append('</g></svg>')
    return "".join(o)


def overlays(zoomed):
    crumb = ('AI capital flows <span>›</span> <b>CoreWeave ↔ NVIDIA</b>' if zoomed else
             '<b>AI capital flows</b> <span>·</span> Credit squeeze')
    side = ('''<div class="fl nv"><div class="k">If CoreWeave fails</div><div class="v">$6.3B</div>
      <div class="s">NVIDIA’s exposure through its guarantee</div>
      <div class="rows"><div><span>Paid first</span><b>Lenders take the GPUs</b></div>
      <div><span>Then</span><b>Bondholders</b></div><div><span>Then</span><b>NVIDIA’s guarantee</b></div></div></div>'''
            if zoomed else
            '''<div class="fl nv"><div class="k">NVIDIA · 2028 revenue</div>
      <div class="v">$250B <em>−18%</em></div><div class="s">vs. Wall St. $345B · 80% range $180–325B</div>
      <div class="rows"><div><span>Top-10 customer defaults</span><b class="r">18%</b></div>
      <div><span>Revenue falls a year</span><b class="a">34%</b></div>
      <div><span>Pays its suppliers</span><b class="g">99.6%</b></div></div></div>''')
    return f'''
<div class="fl tl"><span class="logo"></span><div>{crumb}</div></div>
<button class="fl cond"><span class="dot"></span>Conditions <b>4</b> <i>1 outside forecasts</i> <span class="car">▾</span></button>
<div class="fl seg"><button class="on">One path</button><button>Range of outcomes</button></div>
{side}
<div class="fl time"><button class="play">▶</button><div class="trk"><div class="fill"></div>
  <span class="ev" style="left:31%">A</span><span class="ev" style="left:40%">B</span><span class="ev" style="left:44%">C</span>
  <span class="kn"></span></div><span class="yrs">2026</span><b>Q4 2027</b><span class="yrs">2030</span></div>
<div class="fl zoom"><button>+</button><span>{"250%" if zoomed else "100%"}</span><button>−</button><button class="fit">Fit</button></div>'''


CSS = """
*{box-sizing:border-box}
body{margin:0;background:#e6e9ed;font-family:Geist,system-ui,sans-serif;color:#101318}
.wrap{max-width:1500px;margin:0 auto;padding:30px 20px 70px}
.lab{font:500 13px 'Geist Mono',monospace;color:#4b5563;margin:30px 0 10px}
.lab:first-child{margin-top:0}
.frame{position:relative;height:900px;background:#fff;border-radius:16px;overflow:hidden;
 box-shadow:0 1px 0 #d4d9df,0 24px 60px rgba(16,19,24,.12)}
.cv{position:absolute;inset:0;width:100%;height:100%}
.nl{font:600 13px Geist;fill:#fff} .nl.big{font:700 20px Geist;letter-spacing:-.01em}
.nl.lg{font:600 16px Geist}
.nsub{font:500 11.5px 'Geist Mono';fill:#e8f3ec}
.flag{font:600 11px Geist}
.ll{font:500 12.5px Geist;fill:#6b7280}
.grp{fill:#f7f8fa;stroke:#e4e7eb}
.gl{font:600 10.5px 'Geist Mono';letter-spacing:.06em;fill:#8a93a0}
.chip rect{fill:#fff;stroke-width:1} .ct{font:500 11.5px Geist;fill:#101318}
.ca{font:500 10.5px 'Geist Mono';fill:#8a93a0} .ca.bad{fill:#d23b3b}
.co rect{filter:drop-shadow(0 4px 10px rgba(16,19,24,.07))}
.cok{font:700 10.5px 'Geist Mono';fill:#fff;text-anchor:middle} .coq{font:500 11px 'Geist Mono';fill:#6b7280}
.coa{font:600 13px Geist;fill:#101318} .cob{font:400 12px Geist;fill:#6b7280}
.term rect{fill:#fff;stroke:#d9dee4;filter:drop-shadow(0 4px 12px rgba(16,19,24,.06))}
.tk{font:600 10.5px 'Geist Mono';letter-spacing:.06em;fill:#8a93a0} .ta{font:600 14px Geist;fill:#101318}
.tb{font:400 12.5px Geist;fill:#6b7280}
.fl{position:absolute;background:#fff;border:1px solid #dde1e6;border-radius:12px;
 box-shadow:0 6px 20px rgba(16,19,24,.07);font-family:Geist}
.tl{top:18px;left:18px;display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:14px;color:#6b7280}
.tl b{color:#101318;font-weight:600} .tl span{color:#b0b7c1;margin:0 2px}
.logo{width:18px;height:18px;border-radius:5px;background:conic-gradient(#c9683a 0 25%,#6b5bb8 0 50%,#b2557d 0 75%,#3d8a57 0)}
.cond{top:72px;left:18px;display:flex;align-items:center;gap:8px;padding:9px 14px;font:500 13.5px Geist;color:#101318;cursor:pointer}
.cond b{font-weight:600;background:#f1f3f5;border-radius:6px;padding:1px 7px;font-size:12px}
.cond i{font-style:normal;color:#a06a00;font-size:12.5px} .cond .dot{width:7px;height:7px;border-radius:50%;background:#d4900f}
.cond .car{color:#9aa2ad;font-size:11px}
.seg{top:18px;right:18px;display:flex;padding:4px;gap:2px}
.seg button{border:0;background:none;font:500 13px Geist;padding:7px 13px;border-radius:8px;color:#6b7280}
.seg button.on{background:#101318;color:#fff}
.nv{top:72px;right:18px;width:270px;padding:16px 18px}
.nv .k{font:500 12px Geist;color:#6b7280} .nv .v{font:700 34px Geist;letter-spacing:-.02em;margin:4px 0 2px}
.nv .v em{font:600 15px Geist;color:#d23b3b;font-style:normal;margin-left:4px}
.nv .s{font:400 12px Geist;color:#6b7280;line-height:1.4}
.rows{margin-top:12px;border-top:1px solid #eef0f3}
.rows div{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #eef0f3;font-size:12.5px}
.rows span{color:#4b5563} .rows b{font:600 12.5px 'Geist Mono'} .rows b.r{color:#d23b3b} .rows b.a{color:#a06a00}
.rows b.g{color:#2f7d4a}
.time{bottom:18px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:14px;padding:9px 16px 9px 9px;width:620px}
.time .play{width:34px;height:34px;border-radius:9px;border:0;background:#101318;color:#fff;font-size:12px;flex:none}
.trk{position:relative;flex:1;height:3px;background:#e4e7eb;border-radius:2px;order:2}
.fill{position:absolute;left:0;width:44%;height:3px;background:#101318;border-radius:2px}
.ev{position:absolute;top:-22px;transform:translateX(-50%);font:600 9.5px 'Geist Mono';width:16px;height:16px;border-radius:50%;
 background:#101318;color:#fff;display:grid;place-items:center}
.kn{position:absolute;left:44%;top:-6px;width:15px;height:15px;margin-left:-7px;border-radius:50%;background:#fff;border:2.5px solid #101318}
.time .yrs{font:500 11px 'Geist Mono';color:#9aa2ad;order:1} .time .yrs:last-of-type{order:3}
.time b{font:600 14px Geist;order:4;white-space:nowrap;margin-left:6px}
.zoom{bottom:18px;right:18px;display:flex;align-items:center;padding:4px;gap:2px}
.zoom button{border:0;background:none;width:30px;height:30px;border-radius:7px;font:500 16px Geist;color:#101318}
.zoom .fit{width:auto;padding:0 10px;font-size:12.5px;border-left:1px solid #eef0f3;border-radius:0}
.zoom span{font:500 11.5px 'Geist Mono';color:#6b7280;width:44px;text-align:center}
"""

html = f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Capital Flows Canvas</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body><div class="wrap">
<div class="lab">Zoomed out · the whole chain at Q4 2027</div>
<div class="frame">{map_svg()}{overlays(False)}</div>
<div class="lab">Same canvas, zoomed in on the CoreWeave → NVIDIA link · the deal unfolds in place</div>
<div class="frame">{deal_svg()}{overlays(True)}</div>
</div></body></html>'''
open(sys.argv[1], "w").write(html)
print("ok")
