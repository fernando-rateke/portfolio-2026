"""Monta public/vale a partir de vale-src/.
Uso (na raiz do repositório): python3 vale-src/build.py
O HTML vem de vale-src/index.html; vale.js, mundos.js e i18n.js são minificados com terser
(vale-src/tools: npm install). gltf.js já vem minificado. Mídia (audio, nos, perfil, grim, trem,
modelos) e three.min.js já moram em public/vale e não são tocados."""
import os, re, shutil, subprocess, json, html as H
here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.dirname(here)
out = os.path.join(repo, "public", "vale")
html = open(os.path.join(here, "index.html")).read()
i = html.index("</style>") + len("</style>")
head, body = html[:i], html[i:]
head = re.sub(r"<title>[^<]*</title>\n", "", head, count=1)
head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
body = body.replace('<script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"></script>', '<script src="/vale/three.min.js"></script>')
body = re.sub(r'<script src="(vale|mundos|i18n|gltf)\.js"></script>', r'<script src="/vale/\1.js"></script>', body)
body = re.sub(r'(src|href)="(audio|nos|perfil|grim|trem)/', r'\1="/vale/\2/', body)
doc = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Rateke · Portfólio 2026</title>
<meta name="description" content="Portfólio de Fernando Rateke: um vale para atravessar, com o castelo andante, a Torre dos Grimórios, o Templo do Sino (AcousticBuild) e o mundo do Nós.">
<meta property="og:title" content="Rateke · Portfólio 2026">
<meta property="og:description" content="Fernando Rateke · Portfólio 2026">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:image" content="/og.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script>window.VALE_BASE = "/vale/";</script>
<script>(function(){{var d=new Date(),m=d.getHours()*60+d.getMinutes(),t=m<=300||m>1140?"dark":m<=840?"light":"dusk";try{{var s=sessionStorage.getItem("vale-tema");if(s)t=s;}}catch(e){{}}document.documentElement.setAttribute("data-theme",t);}})();</script>
<style>body{{margin:0}}[hidden]{{display:none!important}}img{{max-width:100%}}</style>
<noscript><style>.textual{{position:static!important;width:auto!important;height:auto!important;clip-path:none!important;overflow:visible!important}}.hero,.seal-fab{{display:none!important}}</style></noscript>
{head}
</head>
<body>
{body}
</body>
</html>
"""
# matérias da versão em texto, geradas a partir dos grimórios
import json, html as H
m = re.search(r'<script type="application/json" id="grimorios">(.*?)</script>', doc, re.S)
if m and "<!--MATERIAS-->" in doc:
    parts = []
    for sub in json.loads(m.group(1)):
        cat = "Curso Técnico" if sub.get("cat") == "curso-tecnico" else "Ensino Médio"
        items = []
        for a in sub["acts"]:
            links = " · ".join(f'<a href="{H.escape(u)}">{H.escape(t)}</a>' for t, u in (a.get("l") or []))
            items.append(f'<li><b>{H.escape(a["t"])}</b> ({H.escape(a["s"])}). {H.escape(a.get("r", ""))}{" " + links if links else ""}</li>')
        parts.append(f'<h3>{H.escape(sub["name"])} · {cat}</h3><p>{H.escape(sub.get("desc", ""))}</p><ul>{"".join(items)}</ul>')
    doc = doc.replace("<!--MATERIAS-->", "\n".join(parts))
os.makedirs(out, exist_ok=True)
open(os.path.join(out, "index.html"), "w").write(doc)
TERSER = os.path.join(here, "tools", "node_modules", ".bin", "terser")
if not os.path.exists(TERSER):
    raise SystemExit("rode antes: cd vale-src/tools && npm install")
for f in ("vale.js", "mundos.js", "i18n.js"):
    subprocess.run([TERSER, os.path.join(here, f), "--compress", "passes=2", "--mangle", "--ecma", "2020", "--comments", "false", "-o", os.path.join(out, f)], check=True)
shutil.copy(os.path.join(here, "gltf.js"), os.path.join(out, "gltf.js"))
# Biblioteca Infinita: página própria em /biblioteca, com as atividades tiradas do mesmo conteúdo do vale
lib_src, lib_out = os.path.join(here, "biblioteca"), os.path.join(repo, "public", "biblioteca")
os.makedirs(lib_out, exist_ok=True)
shutil.copy(os.path.join(lib_src, "index.html"), os.path.join(lib_out, "index.html"))
subprocess.run([TERSER, os.path.join(lib_src, "biblioteca.js"), "--compress", "passes=2", "--mangle", "--ecma", "2020", "--comments", "false", "-o", os.path.join(lib_out, "biblioteca.js")], check=True)
mg = re.search(r'<script type="application/json" id="grimorios">(.*?)</script>', html, re.S)
atividades = json.loads(mg.group(1)) if mg else []
json.dump([{"id": s.get("id"), "name": s["name"], "cat": s.get("cat"), "desc": s.get("desc", ""), "acts": s["acts"]} for s in atividades], open(os.path.join(lib_out, "atividades.json"), "w"), ensure_ascii=False)
shutil.copy(os.path.join(lib_src, "notas.json"), os.path.join(lib_out, "notas.json"))
# o controle pelo celular (página própria em /controle)
ctl_out = os.path.join(repo, "public", "controle"); os.makedirs(ctl_out, exist_ok=True)
shutil.copy(os.path.join(here, "controle", "index.html"), os.path.join(ctl_out, "index.html"))
print("ok:", out, "+", lib_out, "+", ctl_out)
