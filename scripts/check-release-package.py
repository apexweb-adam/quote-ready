"""Inspect only an archive produced by npm pack; do not extract untrusted input."""
import hashlib, json, pathlib, sys, tarfile
p=pathlib.Path(sys.argv[1])
expected={'package/index.mjs','package/index.d.mts','package/package.json','package/README.md','package/LICENSE'}
with tarfile.open(p,'r:gz') as t:
    members=t.getmembers()
    if {m.name for m in members} != expected or len(members)!=len(expected) or not all(m.isfile() for m in members):
        raise SystemExit('Unexpected archive contents')
    meta=json.load(t.extractfile('package/package.json'))
    assert meta['name']=='quoteready-intake-core' and meta['version']=='0.1.0-rc.1'
    assert meta['private'] is True and meta['license']=='MIT'
    assert meta['engines']['node']=='^22.0.0 || ^24.0.0'
    for key in ['scripts','dependencies','optionalDependencies','peerDependencies']:
        assert not meta.get(key),key
    for name,expected_hash in [('index.mjs','4a181dc2ae59f06074b5f6a44626bcb62b9fd151'),('index.d.mts','211fe19e73bc8d4549b704589ce43f5fa7f3d50a'),('LICENSE','7d0a9b00a15559e286825b9dfed2ebec1781a34a')]:
        body=t.extractfile('package/'+name).read()
        actual=hashlib.sha1(f'blob {len(body)}\0'.encode()+body).hexdigest()
        assert actual==expected_hash,(name,actual)
print(json.dumps({'package':p.name,'files':sorted(expected),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'validated':True},indent=2))
