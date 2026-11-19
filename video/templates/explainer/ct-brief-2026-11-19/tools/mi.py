# Michigan's outline (US Census boundaries, via us-atlas 3.0.1 states-10m.json, a TopoJSON data file) as an SVG,
# 700 px tall. Decodes the TopoJSON arcs here (no downloaded code is run).   python3 -I mi.py <states-10m.json> <out.svg>
import json, sys, math
src, out = sys.argv[1], sys.argv[2]
tj = json.load(open(src))
sc, tr = tj['transform']['scale'], tj['transform']['translate']
arcs = []
for a in tj['arcs']:
    x = y = 0; pts = []
    for dx, dy in a:
        x += dx; y += dy; pts.append((x * sc[0] + tr[0], y * sc[1] + tr[1]))
    arcs.append(pts)
def arc(i):
    return arcs[i] if i >= 0 else arcs[~i][::-1]
def ring(ids):
    pts = []
    for i in ids:
        p = arc(i); pts.extend(p if not pts else p[1:])
    return pts
geo = next(g for g in tj['objects']['states']['geometries'] if g['id'] == '26')
polys = geo['arcs'] if geo['type'] == 'MultiPolygon' else [geo['arcs']]
rings = [ring(r) for poly in polys for r in poly]
k = math.cos(math.radians(44.5))
allp = [(x * k, -y) for r in rings for x, y in r]
x0, y0 = min(p[0] for p in allp), min(p[1] for p in allp)
s = 700 / (max(p[1] for p in allp) - y0); w = (max(p[0] for p in allp) - x0) * s
d = ''.join('M' + 'L'.join(f'{(x * k - x0) * s:.1f},{(-y - y0) * s:.1f}' for x, y in r) + 'Z' for r in rings)
open(out, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 {w + 20:.0f} 720" width="{w + 20:.0f}" height="720">'
                     f'<path d="{d}" fill="#1F5FDB" stroke="#fff" stroke-width="4" stroke-linejoin="round" fill-rule="evenodd"/></svg>')
print(geo['properties']['name'], f'{w:.0f} x 700', len(rings), 'rings')
