import json, sys

parts = [json.loads(line) for line in sys.stdin if line.strip()]
r = {k: sum(p[k] for p in parts) for k in ('pass', 'fail', 'total')}
print(f"pass {r['pass']} / fail {r['fail']} / total {r['total']}")
for f in [f for p in parts for f in p['failed']]:
    print('FAIL', f['name'])
    for m in f['failures']:
        print('   -', m.splitlines()[0] if m else m)
sys.exit(1 if r['fail'] or not parts else 0)
