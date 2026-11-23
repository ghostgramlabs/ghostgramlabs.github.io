"""Build the translated app pages (e.g. /PettiBox/hi/) from each app's Play Store listing, so people searching in
their own language find the website.

    python -X utf8 tools/make_l10n_pages.py

Reads, from the app repos next to this one:
  <App>/store/play-listing/<Play language>/{title,short_description,full_description}.txt
  <App>/build/store-screenshots/<Play language>/NN.png   (the localized Play screenshots; optional)
Writes:
  PettiBox/<slug>/index.html, DirectServe/<slug>/index.html                  (this repo)
  ../SpeakAlert/docs/<slug>/index.html                                       (served at /SpeakAlert/<slug>/)
  assets/img/l10n/<app>-<slug>-N.webp                                        (screenshots, this repo)
  sitemap-l10n.xml                                                           (every translated page)
and adds hreflang links and the language list to each English page (between <!-- l10n:... --> markers).

Every page states, in its language, that GhostGram Labs is not a company and that the apps earn nothing.
"""
import html
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from l10n_strings import EMAIL, NAMES, S, SHARE  # noqa: E402
from urllib.parse import quote  # noqa: E402

SITE = pathlib.Path(__file__).resolve().parents[1]
BASE = SITE.parent
IMG = SITE / "assets" / "img" / "l10n"
SHOTS = 2  # screenshots per page

PLAY_SVG = ('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.6 1.8c-.4.2-.6.6-.6 1.1v18.2c0 '
            '.5.2.9.6 1.1l10-10.2L3.6 1.8zm11.4 8.8l2.7-2.7-11-6.3 8.3 9zm0 2.8l-8.3 9 11-6.3-2.7-2.7zm4-2.9l-2.9 1.5 2.9 '
            '1.5c.9-.5.9-2.5 0-3z"/></svg>')

APPS = {
    "PettiBox": dict(repo=BASE / "PettiBox", out=SITE / "PettiBox", package="com.ghostgramlabs.pettibox",
                     theme="theme-pettibox", css="20261122a", category="ProductivityApplication",
                     privacy="/PettiBox/privacy.html", terms="/PettiBox/terms.html",
                     code="https://github.com/ghostgramlabs/PettiBox"),
    "DirectServe": dict(repo=BASE / "DirectServe", out=SITE / "DirectServe", package="com.ghostgramlabs.directserve",
                        theme="theme-directserve", css="20261122a", category="UtilitiesApplication",
                        privacy="/directserve-privacy/", terms="/directserve-privacy/terms.html",
                        code="https://github.com/ghostgramlabs/DirectServe"),
    "SpeakAlert": dict(repo=BASE / "SpeakAlert", out=BASE / "SpeakAlert" / "docs", package="com.ghostgramlabs.speakalert",
                       theme="theme-speakalert", css="20261122a", category="ProductivityApplication",
                       privacy="/SpeakAlert/privacy.html", terms="/SpeakAlert/terms.html",
                       code="https://github.com/ghostgramlabs/SpeakAlert"),
}

# Play language -> (URL slug, hreflang). Spanish: the Latin American listing where there is one, else Spain's.
SLUGS = {"es-419": ("es", "es"), "pt-BR": ("pt-br", "pt-BR"), "pt-PT": ("pt-pt", "pt-PT"),
         "zh-CN": ("zh-hans", "zh-Hans"), "zh-TW": ("zh-hant", "zh-Hant")}
RTL = {"ar"}
END = tuple(".。!！?？:：।؟;")


def slug_of(play, langs):
    if play in SLUGS:
        return SLUGS[play]
    if play in ("es-ES", "es-US"):
        return None if "es-419" in langs else ("es", "es")
    if play == "en-US":
        return None
    p = play.split("-")[0].lower()
    return p, p


def esc(t):
    return html.escape(t, quote=True)


def is_heading(line):
    line = line.strip()
    return 0 < len(line) <= 60 and not line.endswith(END) and not line.startswith(("-", "•", "・", "*"))


def body_html(text):
    """Play description -> headings, paragraphs and lists."""
    out = []
    for para in text.strip().split("\n\n"):
        lines = [l.strip() for l in para.strip().split("\n") if l.strip()]
        if not lines:
            continue
        if is_heading(lines[0]) and (len(lines) > 1 or len(lines[0]) <= 45):
            out.append(f"<h2>{esc(lines[0].rstrip('：:'))}</h2>")
            lines = lines[1:]
        items, kind = [], None
        for l in lines:
            m = re.match(r"^(?:[-•・*]|(\d+)[.)])\s*(.*)$", l)
            if m:
                k = "ol" if m.group(1) else "ul"
                if kind and k != kind:
                    out.append(f"<{kind}>" + "".join(items) + f"</{kind}>")
                    items = []
                kind = k
                items.append(f"<li>{esc(m.group(2))}</li>")
            else:
                if items:
                    out.append(f"<{kind}>" + "".join(items) + f"</{kind}>")
                    items, kind = [], None
                out.append(f"<p>{esc(l)}</p>")
        if items:
            out.append(f"<{kind}>" + "".join(items) + f"</{kind}>")
    return "\n      ".join(out)


def shots(app, play, slug):
    from PIL import Image
    src = APPS[app]["repo"] / "build" / "store-screenshots" / play
    files = sorted(src.glob("*.png"))[:SHOTS] if src.is_dir() else []
    names = []
    IMG.mkdir(parents=True, exist_ok=True)
    for n, f in enumerate(files, 1):
        name = f"{app.lower()}-{slug}-{n}.webp"
        im = Image.open(f).convert("RGB")
        im.thumbnail((540, 960))
        im.save(IMG / name, "WEBP", quality=78, method=6)
        names.append((name, im.size))
    return names


def alternates(app, pages):
    root = "https://ghostgramlabs.com/" + app + "/"
    links = [f'<link rel="alternate" hreflang="en" href="{root}">',
             f'<link rel="alternate" hreflang="x-default" href="{root}">']
    links += [f'<link rel="alternate" hreflang="{h}" href="{root}{s}/">' for s, h in pages]
    return "\n".join(links)


def share(app, cfg, slug, short, page):
    """Share buttons. Messaging apps get the Play link (one tap to install), X and Facebook get the web page.
    Every link carries utm labels, so Play Console and Analytics can count shares by channel, never by person."""
    head, text, share_l, copy_l, done_l = SHARE[slug]

    def play(medium):
        ref = quote(f"utm_source=ghostgramlabs.com&utm_medium={medium}&utm_campaign=share", safe="")
        return f"https://play.google.com/store/apps/details?id={cfg['package']}&referrer={ref}"

    def web(medium):
        return f"{page}?utm_source=share&utm_medium={medium}&utm_campaign=share"

    def q(v):
        return quote(v, safe="")

    def msg(link):
        return f"{short}\n{link}"

    # Messaging apps first, then the networks people in this language use most, then the public ones.
    links = [
        ("WhatsApp", f"https://wa.me/?text={q(msg(play('whatsapp')))}"),
        ("Telegram", f"https://t.me/share/url?url={q(play('telegram'))}&text={q(short)}"),
    ]
    if slug in ("ja", "th", "zh-hant"):
        links.append(("LINE", f"https://social-plugins.line.me/lineit/share?url={q(play('line'))}"))
    if slug == "ru":
        links.append(("VK", f"https://vk.com/share.php?url={q(web('vk'))}"))
    if slug == "zh-hans":
        links.append(("Weibo", f"https://service.weibo.com/share/share.php?url={q(web('weibo'))}&title={q(short)}"))
    links += [
        ("Reddit", f"https://www.reddit.com/submit?url={q(web('reddit'))}&title={q(short)}"),
        ("X", f"https://x.com/intent/post?text={q(short)}&url={q(web('x'))}"),
        ("Facebook", f"https://www.facebook.com/sharer/sharer.php?u={q(web('facebook'))}"),
        ("Threads", f"https://www.threads.net/intent/post?text={q(msg(web('threads')))}"),
        ("Bluesky", f"https://bsky.app/intent/compose?text={q(msg(web('bluesky')))}"),
        ("LinkedIn", f"https://www.linkedin.com/sharing/share-offsite/?url={q(web('linkedin'))}"),
        (EMAIL[slug], f"mailto:?subject={q(app)}&body={q(msg(play('email')))}"),
    ]
    btns = "\n      ".join(f'<a class="btn btn-ghost" href="{esc(u)}" rel="noopener" target="_blank">{esc(n)}</a>'
                           for n, u in links)
    return f"""<section class="container share-band" aria-label="{esc(share_l)}" data-msg="{esc(msg(play('copy')))}">
    <h2 class="section-title">{esc(head.format(app=app))}</h2>
    <p class="section-sub">{esc(text.format(app=app))}</p>
    <div class="cta-row">
      <button class="btn btn-ghost" type="button" data-share hidden>{esc(share_l)}</button>
      {btns}
      <button class="btn btn-ghost" type="button" data-copy data-done="{esc(done_l)}">{esc(copy_l)}</button>
    </div>
    <script>(function(){{var s=document.currentScript.closest('section'),m=s.getAttribute('data-msg'),n=s.querySelector('[data-share]'),c=s.querySelector('[data-copy]');
    if(navigator.share){{n.hidden=false;n.onclick=function(){{navigator.share({{text:m}}).catch(function(){{}});}};}}
    c.onclick=function(){{navigator.clipboard.writeText(m).then(function(){{c.textContent=c.getAttribute('data-done');}});}};}})();</script>
  </section>"""


def switcher(app, pages, current, label):
    items = [("", "en")] + pages
    links = []
    for s, h in items:
        name = NAMES["en" if not s else s]
        href = f"/{app}/" + (f"{s}/" if s else "")
        cur = ' aria-current="page"' if s == current else ""
        links.append(f'<a href="{href}" hreflang="{h}" lang="{h}"{cur}>{esc(name)}</a>')
    return (f'<section class="container lang-switch" aria-label="{esc(label)}">\n'
            f'    <h2 class="section-title">{esc(label)}</h2>\n'
            f'    <p class="lang-list">' + " · ".join(links) + "</p>\n  </section>")


PAGE = """<!DOCTYPE html>
<html lang="{hl}" dir="{dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Google tag (gtag.js) with Consent Mode: analytics cookies only after the visitor accepts -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('consent', 'default', {{
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  }});
  gtag('js', new Date());
  gtag('config', 'G-RXB5Q1WX6X');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-RXB5Q1WX6X"></script>
<title>{title} | GhostGram Labs</title>
<meta name="description" content="{short}">
<meta name="author" content="GhostGram Labs">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="{url}">
{alternates}
<meta name="theme-color" content="#241a2e">
<link rel="icon" type="image/webp" href="/assets/img/{icon}-icon.webp">
<meta property="og:locale" content="{oglocale}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="GhostGram Labs">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{short}">
<meta property="og:image" content="{ogimage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=Fraunces:ital,wght@1,500;1,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css?v={css}">
<script type="application/ld+json">
{jsonld}
</script>
</head>
<body class="{theme}">
<div class="bg-glow" aria-hidden="true"></div>

<header>
  <nav class="nav" aria-label="Main navigation">
    <a class="brand" href="/"><span class="brand-mark"><img src="/assets/img/ghostgramlabs-icon.svg" alt="" width="32" height="32"></span>GhostGram Labs</a>
    <div class="nav-links">
      <a href="/PettiBox/" class="hide-sm">PettiBox</a>
      <a href="/DirectServe/" class="hide-sm">DirectServe</a>
      <a href="/SpeakAlert/" class="hide-sm">SpeakAlert</a>
    </div>
  </nav>
</header>

<main>
  <section class="app-hero container">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">{home}</a> / <a href="/{app}/">{app}</a> / {langname}</nav>
    <div class="app-icon app-icon-img">
      <img src="/assets/img/{icon}-icon.webp" alt="{app}" width="76" height="76">
    </div>
    <h1>{title}</h1>
    <p class="lead">{short}</p>
    <div class="cta-row">
      <a class="btn btn-play" href="{play}" rel="noopener" target="_blank">
        {svg}
        {playlabel}
      </a>
    </div>
  </section>
{shots}
  <section class="container">
    <div class="prose">
      {body}
    </div>
  </section>

  <section class="container">
    <div class="download-band">
      <h2>{app}</h2>
      <p>{statement}</p>
      <div class="cta-row">
        <a class="btn btn-play" href="{play}" rel="noopener" target="_blank">
          {svg}
          {playlabel}
        </a>
      </div>
    </div>
  </section>

  {share}

  {switcher}
</main>

<footer>
  <div class="container">
    <div class="footer-inner">
      <div class="f-col">
        <a class="brand" href="/"><span class="brand-mark"><img src="/assets/img/ghostgramlabs-icon.svg" alt="" width="32" height="32"></span>GhostGram Labs</a>
        <p>{statement}</p>
      </div>
      <div class="f-col">
        <h4>{app}</h4>
        <a href="{privacy}" lang="en">{privacylabel}</a>
        <a href="{terms}" lang="en">{termslabel}</a>
        <a href="mailto:ghostgramlabs@gmail.com">ghostgramlabs@gmail.com</a>
        <a href="{code}" rel="noopener" target="_blank">GitHub</a>
      </div>
    </div>
    <div class="footer-bottom">© 2026 GhostGram Labs. Google Play and the Google Play logo are trademarks of Google LLC.</div>
  </div>
</footer>
<script src="/assets/site.js?v={css}" defer></script>
</body>
</html>
"""


def jsonld(app, cfg, title, short, url, hl, statement):
    import json
    return json.dumps({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": title, "alternateName": app, "url": url, "inLanguage": hl,
        "installUrl": f"https://play.google.com/store/apps/details?id={cfg['package']}",
        "image": f"https://ghostgramlabs.com/assets/img/{app.lower()}-icon.webp",
        "operatingSystem": "Android", "applicationCategory": cfg["category"], "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "description": short,
        "author": {"@type": "Person", "name": "GhostGram Labs", "description": statement,
                   "url": "https://ghostgramlabs.com/", "email": "ghostgramlabs@gmail.com"},
    }, ensure_ascii=False, indent=2)


def mark(text, name, content, before):
    """Put content between <!-- l10n:name --> markers, replacing an earlier copy, else just before `before`."""
    block = f"<!-- l10n:{name} -->\n{content}\n<!-- /l10n:{name} -->"
    pat = re.compile(rf"<!-- l10n:{name} -->.*?<!-- /l10n:{name} -->", re.S)
    if pat.search(text):
        return pat.sub(lambda _: block, text)
    assert text.count(before) == 1, before
    return text.replace(before, block + "\n" + before)


def english(path, alt, sw, sh):
    """Link the English page to its translations: hreflang in the head, the language list at the end."""
    t = path.read_text(encoding="utf-8")
    t = mark(t, "alternates", alt, "</head>")
    t = mark(t, "switcher", "  " + sw, "</main>")
    t = mark(t, "share", "  " + sh, "<!-- l10n:switcher -->")
    path.write_text(t, encoding="utf-8", newline="\n")


def build():
    sitemap = []
    for app, cfg in APPS.items():
        listing = cfg["repo"] / "store" / "play-listing"
        langs = sorted(p.name for p in listing.iterdir() if p.is_dir())
        pages = []  # (slug, hreflang, play)
        for play in langs:
            sh = slug_of(play, langs)
            if sh:
                if sh[0] not in S:
                    sys.exit(f"{app}: no page strings for {sh[0]}")
                pages.append((*sh, play))
        pairs = [(s, h) for s, h, _ in pages]
        og = f"https://ghostgramlabs.com/assets/img/{app.lower()}-og.jpg"
        if app == "SpeakAlert":
            og = "https://ghostgramlabs.com/SpeakAlert/icon-512.png"
        for slug, hl, play in pages:
            d = listing / play
            title = (d / "title.txt").read_text(encoding="utf-8").strip()
            short = (d / "short_description.txt").read_text(encoding="utf-8").strip()
            full = (d / "full_description.txt").read_text(encoding="utf-8")
            t = S[slug]
            url = f"https://ghostgramlabs.com/{app}/{slug}/"
            imgs = shots(app, play, slug)
            shot_html = ""
            if imgs:
                tags = "\n      ".join(
                    f'<img src="/assets/img/l10n/{n}" alt="{esc(title)} — {esc(t["shots"])} {i}" width="{w}" height="{h}" '
                    f'loading="lazy">' for i, (n, (w, h)) in enumerate(imgs, 1))
                shot_html = (f'\n  <section class="container shots-section" aria-label="{esc(t["shots"])}">\n'
                             f'    <div class="shots">\n      {tags}\n    </div>\n  </section>\n')
            page = PAGE.format(
                hl=hl, dir="rtl" if slug in RTL else "ltr", title=esc(title), short=esc(short), url=url,
                alternates=alternates(app, pairs), icon=app.lower(), oglocale=play.replace("-", "_"), ogimage=og,
                css=cfg["css"], theme=cfg["theme"], home=esc(t["home"]), app=app, langname=esc(NAMES[slug]),
                play=f"https://play.google.com/store/apps/details?id={cfg['package']}&amp;hl={play.replace('-', '_')}",
                svg=PLAY_SVG,
                playlabel=esc(t["play"]), shots=shot_html, body=body_html(full), statement=esc(t["statement"]),
                switcher=switcher(app, pairs, slug, t["other"]), share=share(app, cfg, slug, short, url), privacy=cfg["privacy"], terms=cfg["terms"],
                privacylabel=esc(t["privacy"]), termslabel=esc(t["terms"]), code=cfg["code"],
                jsonld=jsonld(app, cfg, title, short, url, hl, t["statement"]))
            out = cfg["out"] / slug / "index.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(page, encoding="utf-8", newline="\n")
            sitemap.append(url)
        print(f"{app}: {len(pages)} pages")
        en_short = (listing / "en-US" / "short_description.txt").read_text(encoding="utf-8").strip()
        english(cfg["out"] / "index.html", alternates(app, pairs), switcher(app, pairs, "", S["en"]["other"]),
                share(app, cfg, "en", en_short, f"https://ghostgramlabs.com/{app}/"))
    urls = "\n".join(f"  <url><loc>{u}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>"
                     for u in sitemap)
    (SITE / "sitemap-l10n.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + urls + "\n</urlset>\n", encoding="utf-8", newline="\n")
    print(f"sitemap-l10n.xml: {len(sitemap)} URLs")


if __name__ == "__main__":
    build()
