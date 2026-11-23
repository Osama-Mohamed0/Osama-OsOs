# TerraMind Studio → Blender: builds a cinematic "virtual site visit" of a mine project and renders it.
#
# Use inside Blender (4.2 LTS or newer): Scripting tab → Open → build_scene.py → Run Script.
#   The scene is built next to the exported data (scene.json, labels/, overlays/). Render with Render → Render Animation,
#   or switch to the scenes "Final_AR" / "Final_EN" (3D + Arabic/English titles) and render those.
# Headless (no window):  blender -b -P build_scene.py -- --render [--quality preview|final] [--engine eevee|cycles]
#                        [--res 720|1080|2160] [--lang ar,en] [--stills 8] [--data <folder>]
#                        [--frames a:b] [--scale 50]
# Output: <folder>/output/<project>_AR.mp4 and _EN.mp4 (and stills/ with --stills).
import bpy, bmesh, json, base64, math, os, sys, array, time
from mathutils import Vector

# ---------------------------------------------------------------- arguments & data
ARGV = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if name in ARGV:
        i = ARGV.index(name)
        return ARGV[i + 1] if i + 1 < len(ARGV) and not ARGV[i + 1].startswith('--') else True
    return default

def find_data_dir():
    cands = [arg('--data')]
    try: cands.append(os.path.dirname(os.path.abspath(__file__)))
    except NameError: pass
    try:
        for t in bpy.data.texts:
            if t.filepath: cands.append(os.path.dirname(bpy.path.abspath(t.filepath)))
    except Exception: pass
    cands += [os.getcwd()]
    for c in cands:
        if c and os.path.isfile(os.path.join(c, 'scene.json')): return c
    raise SystemExit('scene.json not found — keep build_scene.py inside the exported folder or pass --data <folder>')

DIR = find_data_dir()
D = json.load(open(os.path.join(DIR, 'scene.json'), encoding='utf-8'))
OPT = D.get('options', {})
FPS = int(OPT.get('fps', 24)); DUR = float(OPT.get('duration', 84)); NF = int(round(FPS * DUR))
VE = float(D.get('ve', 1.0)); SIZE = float(D['size'])
def log(*a): print('[TerraMind]', *a, flush=True)
def f32(s): a = array.array('f'); a.frombytes(base64.b64decode(s)); return a
def u32(s): a = array.array('I'); a.frombytes(base64.b64decode(s)); return a
def P(p): return Vector((p[0], p[1], p[2] * VE))
def sec(t): return max(1, int(round(t * FPS)) + 1)

# ---------------------------------------------------------------- compatibility helpers (Blender 4.2 … 5.x)
def set_enum(obj, prop, values):
    for v in values:
        try: setattr(obj, prop, v); return v
        except Exception: pass
def transparent(mat):
    for prop, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
        try: setattr(mat, prop, val)
        except Exception: pass
    try: mat.use_transparency_overlap = True
    except Exception: pass
def new_strip(fn, *a):
    # scale title cards / the clean render to the output frame whatever their pixel size
    try: return fn(*a, fit_method='FIT')
    except TypeError: return fn(*a)
def strips(se): return se.strips if hasattr(se, 'strips') else se.sequences
def eevee_id(): return set_enum(bpy.context.scene.render, 'engine', ['BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'])

# ---------------------------------------------------------------- reset
def reset():
    # remove everything from a previous run (works inside the Blender window, unlike read_factory_settings)
    for sc in list(bpy.data.scenes)[1:]: bpy.data.scenes.remove(sc)
    for coll_ in (bpy.data.objects, bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.images, bpy.data.worlds, bpy.data.collections):
        for b in list(coll_):
            try: coll_.remove(b)
            except Exception: pass
    try:
        import addon_utils; addon_utils.enable('cycles', default_set=True)
    except Exception: pass
reset()
SC = bpy.data.scenes[0]; SC.name = 'Site_3D'
if bpy.context.window: bpy.context.window.scene = SC
SC.render.fps = FPS; SC.frame_start = 1; SC.frame_end = NF
SC.unit_settings.system = 'METRIC'
COL = {}
def coll(name):
    if name not in COL:
        c = bpy.data.collections.new(name); SC.collection.children.link(c); COL[name] = c
    return COL[name]
def link(obj, cname): coll(cname).objects.link(obj); return obj

# ---------------------------------------------------------------- materials
def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    return m, nt, nt.nodes, nt.links, nt.nodes.get('Principled BSDF'), nt.nodes.get('Material Output')
def set_in(node, names, value):
    for n in names:
        if n in node.inputs:
            try: node.inputs[n].default_value = value; return
            except Exception: pass
def simple_mat(name, color, rough=0.8, metal=0.0, alpha=1.0, emit=None, emit_strength=0.0):
    m, nt, N, Lk, bsdf, out = node_mat(name)
    set_in(bsdf, ['Base Color'], (*color, 1)); set_in(bsdf, ['Roughness'], rough); set_in(bsdf, ['Metallic'], metal)
    if emit: set_in(bsdf, ['Emission Color', 'Emission'], (*emit, 1)); set_in(bsdf, ['Emission Strength'], emit_strength)
    if alpha < 1: set_in(bsdf, ['Alpha'], alpha); transparent(m)
    return m
def hexc(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

# terrain: procedural desert sand with darker rocks on slopes, exposed benches below the original ground,
# and an animated "x-ray" transparency value
def terrain_material():
    m, nt, N, Lk, bsdf, out = node_mat('Terrain_Desert')
    tc = N.new('ShaderNodeTexCoord'); noise = N.new('ShaderNodeTexNoise'); set_in(noise, ['Scale'], 0.02); set_in(noise, ['Detail'], 8.0)
    Lk.new(tc.outputs['Object'], noise.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); r = ramp.color_ramp
    r.elements[0].color = (*hexc(D['style']['sand_dark']), 1); r.elements[1].color = (*hexc(D['style']['sand_light']), 1)
    Lk.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    # slope → rock
    geo = N.new('ShaderNodeNewGeometry'); sep = N.new('ShaderNodeSeparateXYZ'); Lk.new(geo.outputs['Normal'], sep.inputs['Vector'])
    slope = N.new('ShaderNodeMapRange'); set_in(slope, ['From Min'], 0.97); set_in(slope, ['From Max'], 0.85); Lk.new(sep.outputs['Z'], slope.inputs['Value'])
    rockmix = N.new('ShaderNodeMix'); rockmix.data_type = 'RGBA'
    Lk.new(slope.outputs['Result'], rockmix.inputs['Factor']); Lk.new(ramp.outputs['Color'], rockmix.inputs[6]); rockmix.inputs[7].default_value = (*hexc(D['style']['rock']), 1)
    # excavated depth (original z stored as attribute z0) → bench colour
    at = N.new('ShaderNodeAttribute'); at.attribute_name = 'z0'
    sub = N.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; Lk.new(at.outputs['Fac'], sub.inputs[0])
    sepp = N.new('ShaderNodeSeparateXYZ'); Lk.new(geo.outputs['Position'], sepp.inputs['Vector']); Lk.new(sepp.outputs['Z'], sub.inputs[1])
    dig = N.new('ShaderNodeMapRange'); set_in(dig, ['From Min'], 0.3); set_in(dig, ['From Max'], 1.5); Lk.new(sub.outputs['Value'], dig.inputs['Value'])
    benchmix = N.new('ShaderNodeMix'); benchmix.data_type = 'RGBA'
    Lk.new(dig.outputs['Result'], benchmix.inputs['Factor']); Lk.new(rockmix.outputs[2], benchmix.inputs[6]); bc = hexc(D['style']['bench'])
    bvar = N.new('ShaderNodeMix'); bvar.data_type = 'RGBA'; Lk.new(noise.outputs['Fac'], bvar.inputs['Factor'])
    bvar.inputs[6].default_value = (bc[0] * 0.62, bc[1] * 0.6, bc[2] * 0.6, 1); bvar.inputs[7].default_value = (min(1, bc[0] * 1.15), min(1, bc[1] * 1.12), min(1, bc[2] * 1.1), 1)
    Lk.new(bvar.outputs[2], benchmix.inputs[7])
    Lk.new(benchmix.outputs[2], bsdf.inputs['Base Color']); set_in(bsdf, ['Roughness'], 0.95)
    bump = N.new('ShaderNodeBump'); set_in(bump, ['Strength'], 0.25); Lk.new(noise.outputs['Fac'], bump.inputs['Height']); Lk.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    # x-ray
    tr = N.new('ShaderNodeBsdfTransparent'); mix = N.new('ShaderNodeMixShader'); val = N.new('ShaderNodeValue'); val.name = 'XRAY'; val.outputs[0].default_value = 0.0
    Lk.new(val.outputs[0], mix.inputs['Fac']); Lk.new(bsdf.outputs[0], mix.inputs[1]); Lk.new(tr.outputs[0], mix.inputs[2]); Lk.new(mix.outputs[0], out.inputs['Surface'])
    transparent(m); return m, val

def grade_material():
    m, nt, N, Lk, bsdf, out = node_mat('Ore_Blocks')
    at = N.new('ShaderNodeVertexColor'); at.layer_name = 'grade_col'
    Lk.new(at.outputs['Color'], bsdf.inputs['Base Color']); set_in(bsdf, ['Roughness'], 0.45)
    set_in(bsdf, ['Emission Strength'], 0.35); Lk.new(at.outputs['Color'], bsdf.inputs['Emission Color'] if 'Emission Color' in bsdf.inputs else bsdf.inputs['Emission'])
    return m

def image_material(name, path, strength=1.0):
    m, nt, N, Lk, bsdf, out = node_mat(name)
    for n in list(N):
        if n.type == 'BSDF_PRINCIPLED': N.remove(n)
    img = N.new('ShaderNodeTexImage'); img.image = bpy.data.images.load(path, check_existing=True)
    em = N.new('ShaderNodeEmission'); set_in(em, ['Strength'], strength); tr = N.new('ShaderNodeBsdfTransparent'); mix = N.new('ShaderNodeMixShader')
    Lk.new(img.outputs['Color'], em.inputs['Color']); Lk.new(img.outputs['Alpha'], mix.inputs['Fac']); Lk.new(tr.outputs[0], mix.inputs[1]); Lk.new(em.outputs[0], mix.inputs[2]); Lk.new(mix.outputs[0], out.inputs['Surface'])
    transparent(m); return m, img.image

# ---------------------------------------------------------------- world: sky + sun
def build_world():
    w = bpy.data.worlds.new('Sky'); SC.world = w; w.use_nodes = True; N = w.node_tree.nodes; Lk = w.node_tree.links
    bg = N.get('Background'); sky = N.new('ShaderNodeTexSky')
    set_enum(sky, 'sky_type', ['NISHITA', 'MULTIPLE_SCATTERING', 'SINGLE_SCATTERING', 'HOSEK_WILKIE'])
    for p, v in (('sun_elevation', math.radians(D['style']['sun_elevation'])), ('sun_rotation', math.radians(D['style']['sun_azimuth'])), ('altitude', 900.0), ('air_density', 1.2), ('dust_density', 2.5)):
        try: setattr(sky, p, v)
        except Exception: pass
    Lk.new(sky.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = float(D['style'].get('sky_strength', 0.07))
    sun = bpy.data.lights.new('Sun', 'SUN'); sun.energy = float(D['style'].get('sun_energy', 3.2)); sun.angle = math.radians(0.8); sun.color = (1.0, 0.94, 0.85)
    so = bpy.data.objects.new('Sun', sun); link(so, 'Lights')
    so.rotation_euler = (math.radians(90 - D['style']['sun_elevation']), 0, math.radians(D['style']['sun_azimuth'] + 180))
    return so

# ---------------------------------------------------------------- geometry builders
def mesh_from(name, pos, idx):
    v = [(pos[i] , pos[i + 1], pos[i + 2] * VE) for i in range(0, len(pos), 3)]; f = [(idx[i], idx[i + 1], idx[i + 2]) for i in range(0, len(idx), 3)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update(); return me

def curve_obj(name, pts, closed, width, mat, cname):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = width; cu.bevel_resolution = 1; sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): q = P(p); sp.points[i].co = (q.x, q.y, q.z + 0.4, 1)
    sp.use_cyclic_u = closed; o = bpy.data.objects.new(name, cu); o.data.materials.append(mat); return link(o, cname)

def key_hide(obj, frame_on, frame_off=None):
    obj.hide_render = True; obj.hide_viewport = False; obj.keyframe_insert('hide_render', frame=1)
    obj.hide_render = False; obj.keyframe_insert('hide_render', frame=frame_on)
    if frame_off: obj.hide_render = True; obj.keyframe_insert('hide_render', frame=frame_off)

def key_scale(obj, f0, f1, s0, s1):
    obj.scale = s0; obj.keyframe_insert('scale', frame=f0); obj.scale = s1; obj.keyframe_insert('scale', frame=f1)

# ---------------------------------------------------------------- timeline (seconds) from the exporter
TL = {k: (v[0], v[1]) for k, v in D['timeline'].items()}
def F(name, which=0): return sec(TL[name][which]) if name in TL else None

# ---------------------------------------------------------------- build
t0 = time.time(); log('building', D['project']['name'], f'{NF} frames @ {FPS} fps, VE ×{VE}')
sun = build_world()
terr_mat, xray = terrain_material()

# terrain with one shape key per production year (pit deepening). The surveyed grid is padded with an
# apron that grows outward geometrically (to ~20x the site size) and eases to the regional ground level,
# so the site sits seamlessly in a desert landscape and nothing covers the excavated pit.
T = D['terrain']; z0 = f32(T['z']); NX0, NY0 = T['nx'], T['ny']
_edge_vals = sorted([z0[i] for i in range(NX0)] + [z0[i + NX0 * (NY0 - 1)] for i in range(NX0)] + [z0[NX0 * j] for j in range(NY0)] + [z0[NX0 - 1 + NX0 * j] for j in range(NY0)])
BASE_Z = _edge_vals[len(_edge_vals) // 2]
def _apron(n, step):
    offs, d, s = [], 0.0, step
    while d < SIZE * 8 and len(offs) < 40: s *= 1.45; d += s; offs.append(d)
    return offs
_ax, _ay = _apron(NX0, T['dx']), _apron(NY0, T['dy']); PX, PY = len(_ax), len(_ay)
XS = [T['x0'] - o for o in reversed(_ax)] + [T['x0'] + i * T['dx'] for i in range(NX0)] + [T['x0'] + (NX0 - 1) * T['dx'] + o for o in _ax]
YS = [T['y0'] - o for o in reversed(_ay)] + [T['y0'] + j * T['dy'] for j in range(NY0)] + [T['y0'] + (NY0 - 1) * T['dy'] + o for o in _ay]
NXP, NYP = len(XS), len(YS)
def padded(zs):
    out = []
    for j in range(NYP):
        cj = min(max(j - PY, 0), NY0 - 1); oy = _ay[PY - 1 - j] if j < PY else (_ay[j - PY - NY0] if j >= PY + NY0 else 0.0)
        for i in range(NXP):
            ci = min(max(i - PX, 0), NX0 - 1); ox = _ax[PX - 1 - i] if i < PX else (_ax[i - PX - NX0] if i >= PX + NX0 else 0.0)
            z = zs[ci + NX0 * cj]; d = math.hypot(ox, oy)
            if d > 0: t = min(1.0, d / (SIZE * 0.6)); t = t * t * (3 - 2 * t); z = z * (1 - t) + BASE_Z * t
            out.append(z * VE)
    return out
def terrain_mesh(name, zs):
    verts = [(XS[i], YS[j], zs[i + NXP * j]) for j in range(NYP) for i in range(NXP)]
    faces = [(i + NXP * j, i + 1 + NXP * j, i + 1 + NXP * (j + 1), i + NXP * (j + 1)) for j in range(NYP - 1) for i in range(NXP - 1)]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons)); return me
ZB = padded(z0); me = terrain_mesh('Terrain', ZB)
at = me.attributes.new('z0', 'FLOAT', 'POINT'); at.data.foreach_set('value', ZB)
terrain = bpy.data.objects.new('Terrain', me); terrain.data.materials.append(terr_mat); link(terrain, 'Site')
years = D.get('pitYears', [])
if years:
    terrain.shape_key_add(name='Basis', from_mix=False); keys = []
    for y in years:
        k = terrain.shape_key_add(name=f'Year_{y["year"]}', from_mix=False); zz = padded(f32(y['z']))
        co = [0.0] * (3 * len(k.data)); k.data.foreach_get('co', co); co[2::3] = zz; k.data.foreach_set('co', co)
        keys.append(k)
    a, b = TL.get('mine', (DUR * 0.6, DUR * 0.8)); step = (b - a) / max(1, len(keys))
    for n, k in enumerate(keys):
        fa, fb = sec(a + n * step), sec(a + (n + 1) * step)
        k.value = 0.0; k.keyframe_insert('value', frame=max(1, fa - 1)); k.value = 1.0; k.keyframe_insert('value', frame=fb)
        if n + 1 < len(keys): k.keyframe_insert('value', frame=sec(a + (n + 1) * step) + 1)
        if n > 0: pk = keys[n - 1]; pk.value = 1.0; pk.keyframe_insert('value', frame=fa); pk.value = 0.0; pk.keyframe_insert('value', frame=fb)
    # keep the final year after the mining section
    keys[-1].value = 1.0; keys[-1].keyframe_insert('value', frame=NF)
    log('pit stages', len(keys))

# x-ray (ground turns see-through) during the geology / underground sections
for ga, gb, lvl in D.get('xray', []):
    for f, v in ((sec(ga) - 1, 0.0), (sec(ga + 1.5), lvl), (sec(gb - 1.5), lvl), (sec(gb), 0.0)):
        xray.outputs[0].default_value = v; xray.outputs[0].keyframe_insert('default_value', frame=max(1, f))

# drillholes
hole_mat = simple_mat('Drillhole', hexc('#F2C94C'), 0.4, emit=hexc('#F2C94C'), emit_strength=0.6)
for h in D.get('holes', []):
    if len(h['pts']) < 2: continue
    o = curve_obj('DH_' + h['id'], h['pts'], False, max(0.5, SIZE / 900), hole_mat, 'Drillholes')
    # collars are visible from the site tour (the "Drillholes" stop) until the end of the geology section
    a = TL.get('tour', TL.get('geology')); b = TL.get('geology', a)
    if a: key_hide(o, sec(a[0]), sec(b[1]) + 1)

# ore blocks (coloured by grade, visible in the geology section)
B = D.get('blocks')
if B:
    c = f32(B['centers']); g = f32(B['colors']); dx, dy, dz = B['size'][0] / 2 * 0.96, B['size'][1] / 2 * 0.96, B['size'][2] / 2 * VE * 0.96
    verts, faces, cols = [], [], []
    for n in range(len(c) // 3):
        x, y, z = c[3 * n], c[3 * n + 1], c[3 * n + 2] * VE; base = len(verts)
        verts += [(x - dx, y - dy, z - dz), (x + dx, y - dy, z - dz), (x + dx, y + dy, z - dz), (x - dx, y + dy, z - dz), (x - dx, y - dy, z + dz), (x + dx, y - dy, z + dz), (x + dx, y + dy, z + dz), (x - dx, y + dy, z + dz)]
        faces += [(base, base + 3, base + 2, base + 1), (base + 4, base + 5, base + 6, base + 7), (base, base + 1, base + 5, base + 4), (base + 1, base + 2, base + 6, base + 5), (base + 2, base + 3, base + 7, base + 6), (base + 3, base, base + 4, base + 7)]
        cols += [g[3 * n], g[3 * n + 1], g[3 * n + 2], 1.0] * 8
    bm_me = bpy.data.meshes.new('OreBlocks'); bm_me.from_pydata(verts, [], faces); bm_me.update()
    ca = bm_me.color_attributes.new('grade_col', 'FLOAT_COLOR', 'POINT'); ca.data.foreach_set('color', cols)
    ob = bpy.data.objects.new('OreBlocks', bm_me); ob.data.materials.append(grade_material()); link(ob, 'Geology')
    if 'geology' in TL: key_hide(ob, sec(TL['geology'][0] + 1), sec(TL['geology'][1]) + 1)
    log('ore blocks', len(c) // 3)

# solids
SOL = {'ore': ('#F2B740', 0.55, 0.35), 'waste': ('#8B5E34', 0.9, 1.0), 'dump': ('#C8A27A', 0.95, 1.0), 'stope': ('#F59E0B', 0.5, 0.85), 'tunnel': ('#9CA3AF', 0.7, 1.0), 'other': ('#A78BFA', 0.6, 0.6)}
dump_objs = []
for s in D.get('solids', []):
    col, rough, alpha = SOL.get(s['kind'], SOL['other']); mat = simple_mat('M_' + s['name'], hexc(s.get('color') or col), rough, alpha=alpha, emit=hexc(col) if s['kind'] in ('ore', 'stope') else None, emit_strength=0.3)
    o = bpy.data.objects.new(s['name'], mesh_from(s['name'], f32(s['pos']), u32(s['idx']))); o.data.materials.append(mat); link(o, 'Solids')
    if s['kind'] == 'dump': dump_objs.append(o)
    if s['kind'] in ('ore', 'waste') and 'geology' in TL: key_hide(o, sec(TL['geology'][0] + 1), sec(TL['geology'][1]) + 1)
    if s['kind'] in ('stope', 'tunnel') and 'underground' in TL: key_hide(o, sec(TL['underground'][0]))
# the dump grows with the mine life
if dump_objs and 'mine' in TL:
    for o in dump_objs:
        zmin = min(v.co.z for v in o.data.vertices)
        for v in o.data.vertices: v.co.z -= zmin
        o.location.z = zmin; key_scale(o, sec(TL['mine'][0]), sec(TL['mine'][1]), (1, 1, 0.02), (1, 1, 1))

# strings (licence boundary, pit outlines, roads …)
STR = {'boundary': ('#F472B6', 2.2, 2.5), 'pit': ('#34D399', 1.0, 1.2), 'road': ('#4B5563', 3.0, 0.0), 'ramp': ('#F97316', 1.4, 1.0), 'dump': ('#F2B740', 0.9, 0.8), 'ug': ('#38BDF8', 1.2, 1.5), 'other': ('#F59E0B', 0.8, 0.8)}
path_for_trucks = None
for s in D.get('strings', []):
    col, w, glow = STR.get(s['kind'], STR['other']); mat = simple_mat('S_' + s['kind'], hexc(col), 0.5, emit=hexc(col), emit_strength=glow)
    o = curve_obj(s['name'], s['pts'], s['closed'], w * max(1, SIZE / 1500), mat, 'Strings')
    if s['kind'] in ('road', 'ramp') and (path_for_trucks is None or len(s['pts']) > len(path_for_trucks['pts'])): path_for_trucks = s

# facility props: closed outlines become buildings, a bunkered magazine, water ponds, pads or a fan
PROP_M = {'building': simple_mat('Prop_Building', hexc('#D9D4C7'), 0.55, 0.1), 'roof': simple_mat('Prop_Roof', hexc('#5B6B7A'), 0.35, 0.6),
          'bunker': simple_mat('Prop_Bunker', hexc('#8A6B4E'), 0.9), 'pad': simple_mat('Prop_Pad', hexc('#9C7A55'), 0.95),
          'water': simple_mat('Prop_Water', hexc('#2E6F8E'), 0.06), 'berm': simple_mat('Prop_Berm', hexc('#A47F55'), 0.95), 'fan': simple_mat('Prop_Fan', hexc('#9CA3AF'), 0.3, 0.8)}
def ground(x, y):
    # bilinear terrain height (real metres, before VE) from the surveyed grid
    fx = min(max((x - T['x0']) / T['dx'], 0), NX0 - 1.001); fy = min(max((y - T['y0']) / T['dy'], 0), NY0 - 1.001); i, j = int(fx), int(fy); u, v = fx - i, fy - j
    a, b, c, d = z0[i + NX0 * j], z0[i + 1 + NX0 * j], z0[i + NX0 * (j + 1)], z0[i + 1 + NX0 * (j + 1)]
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
def prism(name, pts, z0_, h, mat, roof=None):
    bm = bmesh.new(); vs = [bm.verts.new((P(p).x, P(p).y, z0_)) for p in pts]
    if (vs[0].co - vs[-1].co).length < 0.01: bm.verts.remove(vs.pop())
    try: f = bm.faces.new(vs)
    except Exception: bm.free(); return None
    if f.normal.z < 0: f.normal_flip()
    if h > 0:
        r = bmesh.ops.extrude_face_region(bm, geom=[f]); top = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, vec=(0, 0, h), verts=top); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    if roof:
        me.materials.append(roof)
        for pg in me.polygons: pg.material_index = 1 if pg.normal.z > 0.9 else 0
    return link(bpy.data.objects.new(name, me), 'Facilities')
for s in D.get('strings', []):
    pr = s.get('prop')
    if not pr: continue
    typ, h = pr[0], pr[1] * VE; gz = [ground(p[0], p[1]) for p in s['pts']]
    if min(p[2] for p in s['pts']) < min(gz) - 15: continue          # outline drawn underground (e.g. an RL level) → no surface prop
    zb, zt = min(gz) * VE, max(gz) * VE                                   # sits level on sloping ground
    if typ == 'water':
        prism(s['name'] + '_berm', s['pts'], zb - 0.3, zt - zb + 1.5 * VE, PROP_M['berm']); w = prism(s['name'] + '_water', s['pts'], zt + 1.5 * VE + 0.08, 0, PROP_M['water'])
        if w: w.scale = (0.9, 0.9, 1); c = sum((P(p) for p in s['pts']), Vector()) / len(s['pts']); w.location = (c.x * 0.1, c.y * 0.1, 0)
    elif typ == 'fan':
        c = sum((P(p) for p in s['pts']), Vector()) / len(s['pts']); r = max(2.5, max((P(p) - c).length for p in s['pts']) * 0.5)
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(c.x, c.y, zt + h / 2 - 0.3)); o = bpy.context.active_object; o.data.materials.append(PROP_M['fan'])
        for cc in o.users_collection: cc.objects.unlink(o)
        link(o, 'Facilities')
    else: prism(s['name'] + '_3d', s['pts'], zb - 0.3, zt - zb + h, PROP_M[typ], PROP_M['roof'] if typ == 'building' else None)

# haul trucks following the ramp/road during the mining section
if path_for_trucks and 'mine' in TL:
    cu = bpy.data.curves.new('TruckPath', 'CURVE'); cu.dimensions = '3D'; sp = cu.splines.new('POLY'); pts = path_for_trucks['pts']; sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): q = P(p); sp.points[i].co = (q.x, q.y, q.z + 2.2, 1)
    path = bpy.data.objects.new('TruckPath', cu); link(path, 'Equipment'); cu.path_duration = NF; cu.use_path = True
    body_m = simple_mat('Truck_Yellow', hexc('#FACC15'), 0.35, 0.2); bed_m = simple_mat('Truck_Bed', hexc('#374151'), 0.6, 0.5)
    sc = max(1.0, SIZE / 1200)
    for n in range(3):
        bpy.ops.mesh.primitive_cube_add(size=1); body = bpy.context.active_object; body.scale = (9 * sc, 4.5 * sc, 3.5 * sc); body.data.materials.append(body_m)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(-2.5 * sc, 0, 2.6 * sc)); bed = bpy.context.active_object; bed.scale = (6 * sc, 4.6 * sc, 1.8 * sc); bed.data.materials.append(bed_m); bed.parent = body
        for o in (body, bed):
            for c in o.users_collection: c.objects.unlink(o)
            link(o, 'Equipment')
        body.name = f'HaulTruck_{n + 1}'; con = body.constraints.new('FOLLOW_PATH'); con.target = path; con.use_curve_follow = True; con.forward_axis = 'FORWARD_X'; con.use_fixed_location = True
        a, b = TL['mine']; con.offset_factor = (n / 3.0) % 1; con.keyframe_insert('offset_factor', frame=sec(a)); con.offset_factor = (n / 3.0 + 1.6) % 1 + 0.0; con.keyframe_insert('offset_factor', frame=sec(b))
        key_hide(body, sec(a), sec(b) + 1); key_hide(bed, sec(a), sec(b) + 1)

# blast: flash, dust cloud and flying rock
if D.get('blast') and 'blast' in TL:
    a, b = TL['blast']; c = P(D['blast']['center']); r = D['blast']['radius']
    lt = bpy.data.lights.new('BlastFlash', 'POINT'); lo = bpy.data.objects.new('BlastFlash', lt); lo.location = c + Vector((0, 0, 4)); link(lo, 'Blast'); lt.color = (1, 0.6, 0.25)
    for f, e in ((sec(a + 1) - 1, 0), (sec(a + 1), 5e6 * max(1, r / 20) ** 2), (sec(a + 1.6), 0)): lt.energy = e; lt.keyframe_insert('energy', frame=f)
    dust_m = simple_mat('Dust', hexc('#C8A27A'), 1.0, alpha=0.55)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=c); dust = bpy.context.active_object; dust.name = 'DustCloud'; dust.data.materials.append(dust_m)
    for cc in dust.users_collection: cc.objects.unlink(dust)
    link(dust, 'Blast'); key_scale(dust, sec(a + 1), sec(b), (0.01, 0.01, 0.01), (r * 1.8, r * 1.8, r * 1.1)); key_hide(dust, sec(a + 1), sec(b) + 1)
    rock_m = simple_mat('Rock', hexc('#6B4F3A'), 0.9)
    import random; random.seed(7)
    for n in range(40):
        bpy.ops.mesh.primitive_cube_add(size=max(0.6, r / 18), location=c); rk = bpy.context.active_object; rk.data.materials.append(rock_m)
        for cc in rk.users_collection: cc.objects.unlink(rk)
        link(rk, 'Blast'); ang = random.uniform(0, 2 * math.pi); v = random.uniform(0.6, 1.0) * r * 1.6; h = random.uniform(0.5, 1.0) * r * 1.2
        for k in range(6):
            t = k / 5; rk.location = c + Vector((math.cos(ang) * v * t, math.sin(ang) * v * t, 4 * h * t * (1 - t))); rk.keyframe_insert('location', frame=sec(a + 1 + t * 1.8))
        rk.rotation_euler = (random.random() * 6, random.random() * 6, 0); rk.keyframe_insert('rotation_euler', frame=sec(a + 2.8)); key_hide(rk, sec(a + 1), sec(b) + 1)
    for h in D['blast'].get('holes', []):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.25 * max(1, r / 25), depth=1.5, location=P(h) + Vector((0, 0, 0.6))); hc = bpy.context.active_object; hc.data.materials.append(simple_mat('BlastHole', hexc('#F472B6'), 0.4, emit=hexc('#F472B6'), emit_strength=2))
        for cc in hc.users_collection: cc.objects.unlink(hc)
        link(hc, 'Blast'); key_hide(hc, sec(a - 0.5), sec(a + 1.2))

# facility labels: bilingual billboards with a leader line, facing the camera
cam_data = bpy.data.cameras.new('Camera'); cam = bpy.data.objects.new('Camera', cam_data); link(cam, 'Camera'); SC.camera = cam
cam_data.lens = 28; cam_data.clip_start = 1.0; cam_data.clip_end = SIZE * 30
target = bpy.data.objects.new('CamTarget', None); link(target, 'Camera'); tt = cam.constraints.new('TRACK_TO'); tt.target = target; tt.track_axis = 'TRACK_NEGATIVE_Z'; tt.up_axis = 'UP_Y'
lead_m = simple_mat('Leader', (1, 1, 1), 0.5, emit=(1, 1, 1), emit_strength=1.5)
LH = SIZE * 0.045
for f in D.get('facilities', []):
    path = os.path.join(DIR, f['label'])
    if not os.path.isfile(path): continue
    mat, img = image_material('L_' + f['key'], path, 1.4); w, h = img.size; hgt = SIZE * 0.022; wid = hgt * w / max(1, h)
    bpy.ops.mesh.primitive_plane_add(size=1); pl = bpy.context.active_object; pl.name = 'Label_' + f['key']; pl.scale = (wid, hgt, 1); pl.data.materials.append(mat)
    for cc in pl.users_collection: cc.objects.unlink(pl)
    link(pl, 'Labels'); base = P(f['pos']); pl.location = base + Vector((0, 0, LH + hgt * 0.6))
    con = pl.constraints.new('TRACK_TO'); con.target = cam; con.track_axis = 'TRACK_Z'; con.up_axis = 'UP_Y'
    bpy.ops.mesh.primitive_cylinder_add(radius=SIZE / 2500, depth=LH, location=base + Vector((0, 0, LH / 2))); ld = bpy.context.active_object; ld.data.materials.append(lead_m)
    for cc in ld.users_collection: cc.objects.unlink(ld)
    link(ld, 'Labels')
    on = sec(f.get('show', [0, DUR])[0]); off = sec(f.get('show', [0, DUR])[1])
    if f.get('ug'): ld.hide_render = True; ld.hide_viewport = True                 # underground: no leader through the rock
    for o in ((pl,) if f.get('ug') else (pl, ld)):
        o.visible_shadow = False; key_hide(o, on, off if off < NF else None)

# camera: shots from the exporter (positions relative to the site; z already in metres → apply VE)
for s in D['camera']:
    fa, fb = sec(s['t'][0]), sec(s['t'][1])
    for fr, pos, tgt in ((fa, s['from'], s['look'][0]), (fb, s['to'], s['look'][1])):
        cam.location = P(pos); cam.keyframe_insert('location', frame=fr); target.location = P(tgt); target.keyframe_insert('location', frame=fr)
    if s.get('lens'): cam_data.lens = s['lens']; cam_data.keyframe_insert('lens', frame=fa)
for o in (cam, target):
    if o.animation_data and o.animation_data.action:
        try:
            for fc in o.animation_data.action.fcurves:
                for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'; kp.easing = 'EASE_IN_OUT'
        except Exception: pass
log('scene built in', round(time.time() - t0, 1), 's')

# ---------------------------------------------------------------- render settings
def setup_render(scene, engine, res, quality):
    r = scene.render; w = {'720': 1280, '1080': 1920, '2160': 3840}.get(str(res), 1920); r.resolution_x = w; r.resolution_y = w * 9 // 16; r.resolution_percentage = 100
    if engine == 'cycles':
        r.engine = 'CYCLES'; scene.cycles.samples = 24 if quality == 'preview' else 128; scene.cycles.use_denoising = True
        try: scene.cycles.device = 'GPU'
        except Exception: pass
    else:
        eevee_id(); e = scene.eevee
        for p, v in (('taa_render_samples', 8 if quality == 'preview' else 64), ('use_shadows', True), ('use_raytracing', quality != 'preview'), ('use_gtao', True), ('shadow_pool_size', '1024')):
            try: setattr(e, p, v)
            except Exception: pass
    # Khronos PBR Neutral keeps the sand colours true (Blender 4.2+); AgX / Filmic as fallbacks
    for vt, looks in (('Khronos PBR Neutral', ('None',)), ('AgX', ('AgX - Punchy', 'AgX - Medium High Contrast')), ('Filmic', ('Medium High Contrast',))):
        try: scene.view_settings.view_transform = vt
        except Exception: continue
        for look in looks:
            try: scene.view_settings.look = look; break
            except Exception: pass
        break
    scene.view_settings.exposure = float(D['style'].get('exposure', -0.6))
def set_video(scene, path):
    s = scene.render.image_settings
    try: s.media_type = 'VIDEO'
    except Exception: pass
    s.file_format = 'FFMPEG'; ff = scene.render.ffmpeg; ff.format = 'MPEG4'; ff.codec = 'H264'
    try: ff.constant_rate_factor = 'HIGH'
    except Exception: pass
    ff.audio_codec = 'NONE'; scene.render.filepath = path

ENGINE = arg('--engine', OPT.get('engine', 'eevee')); RES = arg('--res', OPT.get('res', '1080')); QUALITY = arg('--quality', OPT.get('quality', 'final'))
setup_render(SC, ENGINE, RES, QUALITY)

# ---------------------------------------------------------------- titles: one compositing scene per language (3D + transparent overlays)
def final_scene(lang, source):
    sc = bpy.data.scenes.new('Final_' + lang.upper()); sc.render.fps = FPS; sc.frame_start = 1; sc.frame_end = NF
    sc.render.resolution_x, sc.render.resolution_y = SC.render.resolution_x, SC.render.resolution_y; sc.render.resolution_percentage = SC.render.resolution_percentage
    se = sc.sequence_editor_create(); st = strips(se)
    if source == 'scene': base = st.new_scene('3D', SC, 1, 1)
    else: base = new_strip(st.new_movie, '3D', source, 1, 1)
    base.frame_final_end = NF + 1
    for k, ov in enumerate(D.get('overlays', [])):
        p = os.path.join(DIR, ov['files'][lang])
        if not os.path.isfile(p): continue
        a, b = sec(ov['t'][0]), sec(ov['t'][1]); im = new_strip(st.new_image, f'ov{k}', p, 2 + (k % 6), a); im.frame_final_end = b
        try: im.blend_type = 'ALPHA_OVER'
        except Exception: pass
        fade = min(int(FPS * 0.5), max(1, (b - a) // 4))
        for fr, v in ((a, 0.0), (a + fade, 1.0), (b - fade, 1.0), (b, 0.0)): im.blend_alpha = v; im.keyframe_insert('blend_alpha', frame=fr)
    return sc

LANGS = [l for l in str(arg('--lang', ','.join(OPT.get('langs', ['ar', 'en'])))).split(',') if l]
if not arg('--render'):
    for l in LANGS: final_scene(l, 'scene')
    if bpy.context.window: bpy.context.window.scene = SC
    log('done. Render "Site_3D" for the clean flight, or "Final_AR" / "Final_EN" for the version with titles.')
else:
    OUT = os.path.join(DIR, 'output'); os.makedirs(OUT, exist_ok=True); name = D['project']['file']
    stills = arg('--stills')
    if stills:
        n = int(stills); os.makedirs(os.path.join(OUT, 'stills'), exist_ok=True)
        for k in range(n):
            fr = max(1, int((k + 0.5) / n * NF)); SC.frame_set(fr); SC.render.image_settings.file_format = 'PNG'; SC.render.filepath = os.path.join(OUT, 'stills', f'frame_{fr:05d}.png')
            t = time.time(); bpy.ops.render.render(write_still=True); log(f'TMPROGRESS {k + 1}/{n} still frame {fr} ({round(time.time() - t, 1)} s)')
        fr_range = arg('--frames')
        if not fr_range: sys.exit(0)
    fr_range = arg('--frames')
    if fr_range: a, b = map(int, str(fr_range).split(':')); SC.frame_start, SC.frame_end = a, b
    if arg('--scale'): SC.render.resolution_percentage = int(arg('--scale'))   # quick drafts, e.g. --scale 50
    clean = os.path.join(OUT, f'{name}_3D.mp4'); set_video(SC, clean)
    log('rendering 3D', SC.frame_start, '→', SC.frame_end, ENGINE, RES, QUALITY); t = time.time()
    def on_frame(scene, *_): log(f'TMPROGRESS {scene.frame_current}/{SC.frame_end} 3D')
    bpy.app.handlers.render_write.append(on_frame)
    bpy.ops.render.render(animation=True, scene=SC.name); bpy.app.handlers.render_write.clear()
    log('3D render', round(time.time() - t), 's')
    for l in LANGS:
        fs = final_scene(l, clean); fs.frame_start, fs.frame_end = SC.frame_start, SC.frame_end; set_video(fs, os.path.join(OUT, f'{name}_{l.upper()}.mp4'))
        try: fs.render.use_sequencer = True
        except Exception: pass
        bpy.ops.render.render(animation=True, scene=fs.name); log('wrote', fs.render.filepath)
    log('TMDONE', OUT)
