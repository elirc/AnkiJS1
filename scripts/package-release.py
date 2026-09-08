"""Package an existing production build with portable ZIP paths."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
RELEASE = ROOT / "release"

def package_release():
    required = {"index.html", "sw.js", "manifest.webmanifest"}
    if any(not (DIST / name).is_file() for name in required):
        raise SystemExit("Build the complete production app with npm run build first.")
    html = (DIST / "index.html").read_text(encoding="utf-8")
    required.update(path.lstrip("/") for path in re.findall(r'(?:src|href)="(/assets/[^"]+)"', html))
    files = sorted(path for path in DIST.rglob("*") if path.is_file())
    for path in files:
        if not path.resolve().is_relative_to(DIST.resolve()):
            raise SystemExit(f"Build asset resolves outside dist: {path.name}")
    names = {path.relative_to(DIST).as_posix() for path in files}
    if not required <= names:
        raise SystemExit(f"Missing build assets: {sorted(required - names)}")
    RELEASE.mkdir(exist_ok=True)
    archive_path = RELEASE / "recall-web.zip"
    with ZipFile(archive_path, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, path.relative_to(DIST).as_posix())
    with ZipFile(archive_path) as archive:
        assert required <= set(archive.namelist())
        assert all(chr(92) not in name for name in archive.namelist())
        assert archive.testzip() is None
    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    (RELEASE / "recall-web.zip.sha256").write_text(f"{digest}  recall-web.zip\n", encoding="ascii")
    print(f"Packaged and verified {len(files)} files: {archive_path}")
    print(f"SHA-256: {digest}")

if __name__ == "__main__":
    package_release()
