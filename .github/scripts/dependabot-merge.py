#!/usr/bin/env python3
"""Merge verified Dependabot updates after exact-commit CI, without polling."""
import io
import json
import os
import re
import subprocess
import sys
import urllib.parse
import zipfile
from pathlib import Path

BOT = 'dependabot[bot]'
CI_PATH = '.github/workflows/ci.yml'
METADATA_PATH = '.github/workflows/dependabot-metadata.yml'
MINOR_TOOLS = {'autoprefixer', 'crittr', 'postcss', 'postcss-lab-function', 'sass'}
PATCH = 'version-update:semver-patch'
MINOR = 'version-update:semver-minor'
TITLE = re.compile(r'^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([^\r\n()]+\))?!?: [^\r\n]+$')


def api(path, method='GET', data=None, binary=False):
    command = ['gh', 'api', '--method', method, path]
    if data is not None:
        command += ['--input', '-']
    result = subprocess.run(command, input=json.dumps(data).encode() if data is not None else None,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return result.stdout if binary else json.loads(result.stdout or b'{}')


def output(name, value):
    with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as stream:
        stream.write(name + '=' + str(value) + '\n')


def eligible(pr, repo, branch, sha):
    return (pr.get('user', {}).get('login') == BOT and not pr.get('draft', True)
            and pr.get('head', {}).get('repo', {}).get('full_name') == repo
            and pr.get('base', {}).get('repo', {}).get('full_name') == repo
            and pr.get('base', {}).get('ref') == branch
            and pr.get('head', {}).get('sha') == sha
            and bool(re.fullmatch(r'[0-9a-f]{40}', sha))
            and pr.get('head', {}).get('ref', '').startswith('dependabot/')
            and TITLE.fullmatch(pr.get('title', '')) is not None)


def allowed(metadata, dev_dependencies):
    """Every dependency must qualify; a mixed group never bypasses manual review."""
    if not isinstance(metadata, dict) or metadata.get('maintainer-changes') != 'false':
        return False
    try:
        dependencies = json.loads(metadata.get('updated-dependencies-json', 'null'))
    except (ValueError, TypeError):
        return False
    if not isinstance(dependencies, list) or not dependencies:
        return False
    if metadata.get('update-type') not in {PATCH, MINOR}:
        return False
    for dependency in dependencies:
        if not isinstance(dependency, dict) or dependency.get('maintainerChanges') is not False:
            return False
        kind = dependency.get('updateType')
        if kind == PATCH:
            continue
        if (kind != MINOR or dependency.get('packageEcosystem') != 'npm_and_yarn'
                or dependency.get('directory') != '/'
                or dependency.get('dependencyType') != 'direct:development'
                or dependency.get('dependencyName') not in MINOR_TOOLS & set(dev_dependencies)):
            return False
    return True


def receipt_name(number, sha):
    return 'dependabot-metadata-' + str(number) + '-' + sha


def read_receipt(repo, artifact):
    if artifact.get('expired') or artifact.get('size_in_bytes', 100001) > 100000:
        raise ValueError('Missing or oversized Dependabot receipt')
    run = api('repos/' + repo + '/actions/runs/' + str(artifact['workflow_run']['id']))
    if (run.get('path') != METADATA_PATH or run.get('event') != 'pull_request_target'
            or run.get('status') != 'completed' or run.get('conclusion') != 'success'
            or run.get('head_repository', {}).get('full_name') != repo):
        raise ValueError('Receipt was not produced by successful trusted metadata verification')
    data = api('repos/' + repo + '/actions/artifacts/' + str(artifact['id']) + '/zip', binary=True)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if len(archive.infolist()) != 1:
            raise ValueError('Unexpected receipt archive entries')
        entry = archive.infolist()[0]
        if entry.filename != 'dependabot.json' or entry.file_size > 64000:
            raise ValueError('Unexpected receipt file')
        receipt = json.loads(archive.read(entry))
    if (receipt.get('version') != 1 or receipt.get('repository') != repo
            or receipt.get('metadata_run_id') != run['id']
            or type(receipt.get('pr')) is not int
            or not isinstance(receipt.get('sha'), str)
            or not re.fullmatch(r'[0-9a-f]{40}', receipt['sha'])
            or artifact['name'] != receipt_name(receipt['pr'], receipt['sha'])):
        raise ValueError('Receipt identity mismatch')
    return receipt


def verified_receipt(repo, number, sha):
    query = urllib.parse.urlencode({'name': receipt_name(number, sha), 'per_page': 100})
    artifacts = api('repos/' + repo + '/actions/artifacts?' + query)['artifacts']
    for artifact in artifacts:
        if artifact['name'] != receipt_name(number, sha):
            continue
        try:
            return read_receipt(repo, artifact)
        except ValueError:
            continue
    return None


def successful_ci(repo, pr, sha):
    query = urllib.parse.urlencode({'head_sha': sha, 'event': 'pull_request', 'per_page': 100})
    runs = api('repos/' + repo + '/actions/workflows/ci.yml/runs?' + query)['workflow_runs']
    # The newest attempt must pass; an older green run cannot hide a failed rerun.
    runs.sort(key=lambda run: (run['run_number'], run['run_attempt']), reverse=True)
    if not runs:
        return False
    run = runs[0]
    return (run.get('path') == CI_PATH and run.get('head_sha') == sha
            and run.get('head_repository', {}).get('full_name') == repo
            and run.get('event') == 'pull_request'
            and run.get('status') == 'completed' and run.get('conclusion') == 'success'
            and ((pr.get('merged') and not run.get('pull_requests'))
                 or any(item.get('number') == pr['number']
                    and item.get('head', {}).get('sha') == sha
                    and item.get('base', {}).get('sha') == pr['base']['sha']
                    for item in run.get('pull_requests', []))))


def dispatch_main(repo, branch):
    sha = api('repos/' + repo + '/commits/' + urllib.parse.quote(branch, safe=''))['sha']
    query = urllib.parse.urlencode({'head_sha': sha, 'per_page': 100})
    runs = api('repos/' + repo + '/actions/workflows/ci.yml/runs?' + query)['workflow_runs']
    if any(run.get('head_branch') == branch and run.get('event') in {'push', 'workflow_dispatch'}
           and (run.get('status') != 'completed' or run.get('conclusion') == 'success') for run in runs):
        print('Main CI already exists for ' + sha)
        return
    api('repos/' + repo + '/actions/workflows/ci.yml/dispatches', 'POST', {'ref': branch})
    print('Dispatched main CI for ' + sha)


def merge_one(repo, branch, number, sha, dev_dependencies):
    pr = api('repos/' + repo + '/pulls/' + str(number))
    if not eligible(pr, repo, branch, sha):
        return
    receipt = verified_receipt(repo, number, sha)
    if not receipt or not allowed(receipt['metadata'], dev_dependencies):
        print('Keeping update manual: no eligible verified metadata for #' + str(number))
        return
    if not successful_ci(repo, pr, sha):
        print('Leaving #' + str(number) + ' open until current-commit CI succeeds')
        return
    if pr.get('merged'):
        # A failed dispatch can be retried safely after the exact merge succeeded.
        if pr.get('merge_commit_sha') == api('repos/' + repo + '/commits/' + branch)['sha']:
            dispatch_main(repo, branch)
        return
    if pr.get('state') != 'open':
        return
    current = api('repos/' + repo + '/pulls/' + str(number))
    if not eligible(current, repo, branch, sha) or current.get('state') != 'open':
        return
    if current['base']['sha'] != pr['base']['sha']:
        return
    merged = api('repos/' + repo + '/pulls/' + str(number) + '/merge', 'PUT', {
        'sha': sha, 'merge_method': 'squash',
        'commit_title': current['title'] + ' (#' + str(number) + ')', 'commit_message': ''})
    if not merged.get('merged'):
        raise ValueError('GitHub did not merge the verified update')
    print('Merged verified update #' + str(number))
    # GITHUB_TOKEN merges suppress push-triggered workflows. Dispatch is intentional.
    dispatch_main(repo, branch)


def main():
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    repo = os.environ['GITHUB_REPOSITORY']
    branch = event['repository']['default_branch']
    if sys.argv[1] == 'title':
        pr = api('repos/' + repo + '/pulls/' + str(event['pull_request']['number']))
        if TITLE.fullmatch(pr.get('title', '')) is None:
            raise ValueError('Use a Conventional Commit PR title, for example chore(deps): update dependencies')
        return
    if sys.argv[1] == 'receipt':
        pr = event['pull_request']
        if not eligible(pr, repo, branch, pr['head']['sha']):
            raise ValueError('Unexpected pull request identity or non-conventional title')
        metadata = json.loads(os.environ['DEPENDABOT_METADATA'])
        path = Path(os.environ['RUNNER_TEMP']) / 'dependabot.json'
        path.write_text(json.dumps({'version': 1, 'repository': repo, 'pr': pr['number'],
                                   'sha': pr['head']['sha'], 'metadata': metadata,
                                   'metadata_run_id': int(os.environ['GITHUB_RUN_ID'])}))
        output('artifact_name', receipt_name(pr['number'], pr['head']['sha']))
        return
    trigger = event['workflow_run']
    if (trigger.get('conclusion') != 'success'
            or trigger.get('head_repository', {}).get('full_name') != repo):
        return
    candidates = []
    if trigger.get('path') == CI_PATH and trigger.get('event') == 'pull_request':
        pulls = api('repos/' + repo + '/commits/' + trigger['head_sha'] + '/pulls?per_page=100')
        candidates = [(pr['number'], trigger['head_sha']) for pr in pulls]
    elif trigger.get('path') == METADATA_PATH and trigger.get('event') == 'pull_request_target':
        artifacts = api('repos/' + repo + '/actions/runs/' + str(trigger['id']) + '/artifacts')['artifacts']
        for artifact in artifacts:
            if artifact['name'].startswith('dependabot-metadata-'):
                receipt = read_receipt(repo, artifact)
                candidates.append((receipt['pr'], receipt['sha']))
    dev_dependencies = json.loads(Path('package.json').read_text()).get('devDependencies', {})
    for number, sha in candidates:
        merge_one(repo, branch, number, sha, dev_dependencies)


if __name__ == '__main__':
    main()
