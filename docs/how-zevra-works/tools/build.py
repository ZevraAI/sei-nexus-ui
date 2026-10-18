#!/usr/bin/env python3
"""Builds the guide from src/ into dist/.

  python tools/build.py          -> built/how-zevra-works.html           (standalone, open in any browser)
                                    built/how-zevra-works.artifact.html  (for republishing as a claude.ai Artifact)

No dependencies beyond Python 3. See ../README.md before editing anything.
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DIST = os.path.join(ROOT, "src"), os.path.join(ROOT, "built")  # not "dist": the UI repo git-ignores dist/
JS_ORDER = ("data1.js", "data2.js", "data3.js", "engine.js")  # data1 must come first: it creates window.ZG


def read(name):
    with io.open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()


def write(name, text):
    os.makedirs(DIST, exist_ok=True)
    with io.open(os.path.join(DIST, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def main():
    head, body = read("head.html"), read("body.html")
    js = "\n".join(read(n) for n in JS_ORDER)
    if "</script" in js.lower():
        sys.exit("error: a source script contains '</script' which would end the page early")
    write("how-zevra-works.artifact.html", head + "\n" + body + "\n<script>\n" + js + "\n</script>\n")
    write("how-zevra-works.html",
          '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
          '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
          + head + "\n</head>\n<body>\n" + body + "\n<script>\n" + js + "\n</script>\n</body>\n</html>\n")
    size = os.path.getsize(os.path.join(DIST, "how-zevra-works.html")) // 1024
    print("wrote built/how-zevra-works.html and built/how-zevra-works.artifact.html (%d KB)" % size)


if __name__ == "__main__":
    main()
