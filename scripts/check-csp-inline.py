#!/usr/bin/env python3
"""
CI garde -- PlanDurcissement-Securite.txt P1.4.

Échoue (exit != 0) si une page .html livrée contient :
  - un <script> sans attribut src (script inline -- bloqué par
    script-src 'self', mais silencieusement ; le but de ce garde est de
    le faire échouer bruyamment au build plutôt que de laisser la CSP
    "dériver" en silence) ;
  - un attribut on[a-z]+="..." (gestionnaire d'événement inline --
    même raison).

Basé sur html.parser (HTML-aware), pas une regex -- deux pièges déjà
rencontrés à la main pendant la conversion P1.1/P1.2 elle-même
n'existent structurellement plus ici : un commentaire HTML qui mentionne
"<script>" ou "onclick=" dans sa prose n'est jamais interprété comme une
vraie balise par le parser, et il n'y a aucun moyen de confondre un NOM
d'attribut ("onclick") avec un sous-texte dans autre chose (ex.
"...ontent=..." dans <meta content="...">) comme une regex naïve peut
le faire (piège déjà rencontré en mesurant l'ampleur P1, voir le plan).

Périmètre : chaque .html réellement servi par le site (même ensemble
que Dockerfile/nginx.conf) -- ProjetTest/, Video/ et dragons.html
(fragment jamais chargé en page autonome, voir loadDragons()/
network-dashboard.js) sont exclus exprès, même périmètre que le
comptage "83 pages" de PlanDurcissement-Securite.txt.

Usage : python3 scripts/check-csp-inline.py   (depuis la racine du dépôt,
ou n'importe où -- le chemin se déduit du script lui-même)
Exit 0 = propre. Exit 1 = au moins une violation, listée sur stderr.
"""
import os
import re
import sys
from html.parser import HTMLParser

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXCLUDE_DIRS = {"ProjetTest", "Video", ".git", "node_modules"}
EXCLUDE_FILES = {"dragons.html"}

ON_ATTR_RE = re.compile(r"^on[a-z]+$")


class Checker(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.violations = []

    def handle_starttag(self, tag, attrs):
        self._check(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self._check(tag, attrs)

    def _check(self, tag, attrs):
        line = self.getpos()[0]
        attr_names = [a[0] for a in attrs]
        if tag == "script" and "src" not in attr_names:
            self.violations.append(f"{self.path}:{line}: <script> sans src")
        for name, _value in attrs:
            if ON_ATTR_RE.match(name):
                self.violations.append(f"{self.path}:{line}: {name}=\"...\" (gestionnaire inline)")


def find_html_files():
    for root, dirs, files in os.walk(REPO):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
        for f in files:
            if f.endswith(".html") and f not in EXCLUDE_FILES:
                yield os.path.join(root, f)


def main():
    all_violations = []
    for path in sorted(find_html_files()):
        with open(path, encoding="utf-8", errors="replace") as fh:
            content = fh.read()
        rel = os.path.relpath(path, REPO)
        checker = Checker(rel)
        checker.feed(content)
        checker.close()
        all_violations.extend(checker.violations)

    if all_violations:
        print(f"check-csp-inline: {len(all_violations)} violation(s) -- <script> sans src ou on*= trouvé(s) :",
              file=sys.stderr)
        for v in all_violations:
            print(f"  {v}", file=sys.stderr)
        print("\nVoir PlanDurcissement-Securite.txt P1 -- externaliser vers assets/script/inline/ à la place.",
              file=sys.stderr)
        return 1
    print("check-csp-inline: propre -- 0 <script> inline, 0 on*=.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
