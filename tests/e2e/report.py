import json, sys

r = json.load(sys.stdin)
print(f"pass {r['pass']} / fail {r['fail']} / total {r['total']}")
for f in r['failed']:
    print('FAIL', f['name'])
    for m in f['failures']:
        print('   -', m.splitlines()[0] if m else m)
sys.exit(1 if r['fail'] else 0)
