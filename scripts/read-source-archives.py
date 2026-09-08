"""Read pinned documentation archives without extracting or executing their files."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import tarfile

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / 'scripts/section-sources.json').read_text())
ARCHIVES = {'mdn/content': 'mdn-content', 'dotnet/docs': 'dotnet-docs', 'github/docs': 'github-docs'}
result = []
for repo, archive in ARCHIVES.items():
    source = next(s for s in SOURCES if s['repository'] == repo)
    path = ROOT / f'artifacts/{archive}-v13.tar.gz'
    with path.open('rb') as stream:
        fingerprint = hashlib.file_digest(stream, 'sha256').hexdigest()
    files = {}
    with tarfile.open(path, 'r|gz') as entries:
        for entry in entries:
            parts = PurePosixPath(entry.name).parts
            if not entry.isfile() or len(parts) < 2 or '..' in parts:
                continue
            if not parts[0].endswith(source['revision']):
                raise ValueError(f'Unexpected archive revision: {entry.name}')
            name = '/'.join(parts[1:])
            wanted = (repo == 'mdn/content' and name.startswith('files/en-us/web/') and name.endswith('/index.md'))
            wanted |= repo == 'dotnet/docs' and name.startswith(('docs/csharp/', 'docs/core/', 'docs/standard/')) and name.endswith(('.md', '.cs', '.fs', '.vb', '.json', '.xml'))
            wanted |= repo == 'github/docs' and name.startswith('content/') and name.endswith('.md')
            if wanted and entry.size < 300_000:
                data = entries.extractfile(entry).read()
                try:
                    files[name] = data.decode('utf-16' if data.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig')
                except UnicodeDecodeError:
                    print('Skipped unsupported encoding:', name, flush=True)
    result.append({'repository': repo, 'revision': source['revision'], 'archiveSha256': fingerprint, 'files': files})
    print(repo, len(files), 'source files', flush=True)
for source in SOURCES:
    repo = source['repository']
    if repo in ARCHIVES or repo == 'git-tips/tips':
        continue
    files = {}
    for name in source['files']:
        if name.endswith('.md'):
            files[name] = (ROOT / 'artifacts/content-sources' / repo.replace('/', '--') / name).read_text(encoding='utf-8-sig')
    fingerprint = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()
    result.append({'repository': repo, 'revision': source['revision'], 'archiveSha256': fingerprint, 'files': files})
    print(repo, len(files), 'cached pinned files', flush=True)
(ROOT / 'artifacts/comprehensive-sources.json').write_text(json.dumps(result), encoding='utf-8')
