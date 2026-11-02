#!/usr/bin/env python3
"""Choose verification work from the complete checked-out change, failing closed."""

import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys


def git(*args):
    return subprocess.check_output(['git', *args], stderr=subprocess.PIPE)


def documentation(path):
    name = PurePosixPath(path)
    return name.suffix.lower() == '.md' and (
        len(name.parts) == 1 or name.parts[0] in {'docs', '.github'}
    )


def publishable(subject):
    match = re.match(r'([a-z]+)(?:\(([^)]+)\))?!?: ', subject)
    if not match:
        return False  # Merge messages and non-conventional history do not publish.
    kind, scope = match.groups()
    return kind not in {'ci', 'chore', 'docs', 'style', 'test', 'build'} and not (
        scope == 'ci' or (scope or '').startswith('deps')
    )


def pending_release():
    try:
        tag = git('describe', '--tags', '--match', 'v[0-9]*', '--abbrev=0', 'HEAD').decode().strip()
    except subprocess.CalledProcessError:
        tag = ''
    history = [tag + '..HEAD'] if tag else ['HEAD']
    subjects = git('log', '--format=%s', *history).decode().splitlines()
    return any(publishable(subject) for subject in subjects)


def classify(event_name, event):
    fallback = {'full': True, 'release': True, 'deploy': True, 'base': '', 'head': '', 'paths': []}
    if event_name == 'workflow_dispatch':
        try:
            force = (event.get('inputs') or {}).get('force_release') in {True, 'true'}
            fallback['release'] = force or pending_release()
        except (OSError, subprocess.CalledProcessError, UnicodeError):
            pass
        return fallback
    try:
        head = git('rev-parse', 'HEAD').decode().strip()
        if event_name == 'pull_request':
            base = event['pull_request']['base']['sha']
        elif event_name == 'push':
            base = event['before']
        else:
            return fallback
        if not re.fullmatch(r'[0-9a-f]{40}', base) or base == '0' * 40:
            return fallback
        git('cat-file', '-e', base + '^{commit}')
        paths = git('diff', '--name-only', '--no-renames', '-z', base, head, '--').decode().split('\0')
        paths = [path for path in paths if path]
        if not paths:
            return fallback
        full = any(not documentation(path) for path in paths)
        deploy = full and any(
            not documentation(path) and not path.startswith('.github/') for path in paths
        )
        return {
            'full': full,
            'release': full and pending_release(),
            'deploy': deploy,
            'base': base,
            'head': head,
            'paths': paths,
        }
    except (KeyError, OSError, subprocess.CalledProcessError, UnicodeError):
        return fallback


def check_documentation(result):
    if not result['base'] or not result['head']:
        raise RuntimeError('Documentation checks require a known Git comparison.')
    subprocess.run(['git', 'diff', '--check', result['base'], result['head'], '--'], check=True)
    for path in result['paths']:
        file = Path(path)
        if documentation(path) and file.is_file() and not file.read_text(encoding='utf-8').strip():
            raise RuntimeError(f'Documentation must not be empty: {path}')
    # Reuse existing dependency-free documentation checks without installing build tooling.
    if Path('tools/check-docs.mjs').is_file():
        subprocess.run(['node', 'tools/check-docs.mjs'], check=True)
    elif Path('tools/check-docs.php').is_file():
        subprocess.run(['php', 'tools/check-docs.php'], check=True)
    print('Documentation checks passed; build, browser, release and deployment work is unnecessary.')


def validate_update_schedule():
    file = Path('.github/dependabot.yml')
    if not file.is_file():
        return
    # Quoted times remain strings for both YAML 1.1 and YAML 1.2 readers.
    for value in re.findall(r'^\s*time:[ \t]*([^\n]+)', file.read_text(), re.MULTILINE):
        if not re.fullmatch(r"(['\"])(?:[01]\d|2[0-3]):[0-5]\d\1[ \t]*(?:#.*)?", value):
            raise RuntimeError('Dependabot schedule time must be a quoted HH:MM string')


def main():
    validate_update_schedule()
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    result = classify(os.environ['GITHUB_EVENT_NAME'], event)
    if len(sys.argv) > 1 and sys.argv[1] == 'docs':
        check_documentation(result)
        return
    with Path(os.environ['GITHUB_OUTPUT']).open('a') as output:
        for name in ['full', 'release', 'deploy']:
            print(f'{name}={str(result[name]).lower()}', file=output)
    print(json.dumps({name: result[name] for name in ['full', 'release', 'deploy']}))


if __name__ == '__main__':
    main()
