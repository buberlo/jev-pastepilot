#!/usr/bin/env python3
"""Validate specification fixtures and local file links; this is not a model evaluation."""
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

def validate() -> int:
    required = ['README.md', 'AGENTS.md', 'docs/MVP.md', 'docs/ARCHITECTURE.md',
                'docs/EVALUATION.md', 'docs/SOURCES.md', 'prompts/IMPLEMENT.md',
                'examples/cases.json', 'project.json', '.gitignore']
    errors = [f'Missing file: {name}' for name in required if not (ROOT / name).is_file()]
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    data = json.loads((ROOT / 'examples/cases.json').read_text(encoding='utf-8'))
    seen = set()
    for item in data['cases']:
        cid = item['id']
        if cid in seen:
            errors.append(f'Duplicate case ID: {cid}')
        seen.add(cid)
        actions = item['available_actions']
        if not isinstance(actions, list) or len(set(actions)) != len(actions):
            errors.append(f'{cid}: invalid action catalogue')
        expected = item['expected']
        if expected['status'] not in {'select', 'clarify', 'abstain', 'failed'}:
            errors.append(f'{cid}: unknown status')
        if expected['status'] == 'select' and expected['action_id'] not in actions:
            errors.append(f'{cid}: expected action was not offered')
        if expected['status'] != 'select' and expected['action_id'] is not None:
            errors.append(f'{cid}: non-selection must not contain an action ID')
        if expected['status'] == 'failed' and not expected.get('failure'):
            errors.append(f'{cid}: failed cases must name an operational failure')
        scenario = item.get('scenario')
        if scenario is not None and scenario not in {'timeout', 'malformed', 'stale', 'unknown_action', 'select_without_id', 'quota', 'low_confidence', 'mid_confidence'}:
            errors.append(f'{cid}: unknown scenario')
    skip_parts = {'.git', 'node_modules', 'dist', 'coverage'}
    sdk_skip = skip_parts | {'server', 'test'}
    for page in (ROOT / 'src').rglob('*'):
        if not page.is_file() or page.suffix not in {'.ts', '.tsx'}:
            continue
        if sdk_skip.intersection(page.parts):
            continue
        text = page.read_text(encoding='utf-8')
        if '@typesafe-ai/sdk' in text:
            errors.append(f'{page.relative_to(ROOT)}: TypeSafe SDK must stay server-side')
    for page in ROOT.rglob('*.md'):
        if skip_parts.intersection(page.parts):
            continue
        for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', page.read_text(encoding='utf-8')):
            if '://' in target or target.startswith('#') or target.startswith('mailto:'):
                continue
            target = target.split('#', 1)[0]
            if target and not (page.parent / target).exists():
                errors.append(f'{page.relative_to(ROOT)}: broken local link {target}')
    if (ROOT / '.github/workflows').exists():
        errors.append('GitHub Actions workflows are not part of this scaffold.')
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(f'PASS: {len(seen)} fixture structures and local documentation links. No model calls made.')
    return 0

if __name__ == '__main__':
    raise SystemExit(validate())
