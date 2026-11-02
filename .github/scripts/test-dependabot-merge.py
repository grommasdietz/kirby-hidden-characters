#!/usr/bin/env python3
"""Acceptance tests for privileged dependency merging and main-CI dispatch."""
import copy
import importlib.util
import io
import json
import unittest
import zipfile
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('dependency_merge', __file__.replace('test-dependabot-merge.py', 'dependabot-merge.py'))
merge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(merge)
REPO = 'example/site'
SHA = 'a' * 40
BASE = 'b' * 40
MERGED = 'c' * 40


def pull():
    return {'number': 7, 'user': {'login': merge.BOT}, 'draft': False, 'state': 'open',
            'merged': False, 'title': 'chore(deps): update dependencies',
            'head': {'sha': SHA, 'ref': 'dependabot/npm_and_yarn/tools', 'repo': {'full_name': REPO}},
            'base': {'sha': BASE, 'ref': 'main', 'repo': {'full_name': REPO}}}


def metadata(kind=merge.PATCH, name='postcss', ecosystem='npm_and_yarn', dependency_type='direct:development'):
    return {'maintainer-changes': 'false', 'update-type': kind,
            'updated-dependencies-json': json.dumps([{
                'dependencyName': name, 'dependencyType': dependency_type, 'updateType': kind,
                'packageEcosystem': ecosystem, 'directory': '/', 'maintainerChanges': False,
                'prevVersion': '1.0.0', 'newVersion': '1.1.0' if kind == merge.MINOR else '1.0.1'}])}


def run():
    return {'path': merge.CI_PATH, 'event': 'pull_request', 'head_sha': SHA, 'head_branch': 'dependabot/tools',
            'head_repository': {'full_name': REPO}, 'status': 'completed', 'conclusion': 'success',
            'run_number': 1, 'run_attempt': 1,
            'pull_requests': [{'number': 7, 'head': {'sha': SHA}, 'base': {'sha': BASE}}]}


class PolicyTests(unittest.TestCase):
    def test_patches_and_stable_minors_cover_runtime_development_and_playgrounds(self):
        for ecosystem in ['npm_and_yarn', 'composer', 'github_actions']:
            for kind in [merge.PATCH, merge.MINOR]:
                for dep_type in ['direct:development', 'direct:production', 'indirect']:
                    with self.subTest(ecosystem=ecosystem, kind=kind, dep_type=dep_type):
                        data = metadata(kind, 'package', ecosystem, dep_type)
                        self.assertTrue(merge.allowed(data))
                        deps = json.loads(data['updated-dependencies-json'])
                        deps[0]['directory'] = '/playground'
                        data['updated-dependencies-json'] = json.dumps(deps)
                        self.assertTrue(merge.allowed(data))

    def test_major_unstable_unknown_and_inconsistent_metadata_remain_manual(self):
        self.assertFalse(merge.allowed(metadata('version-update:semver-major')))
        self.assertFalse(merge.allowed(metadata('')))
        self.assertFalse(merge.allowed(metadata(ecosystem='unknown')))
        for before, after in [('0.2.0', '0.3.0'), ('1.0.0', '2.0.0'),
                              ('1.0.0', '1.1.0-beta.1'), ('1.0.0-rc.1', '1.1.0'),
                              ('1.0.0', ''), ('', '1.1.0'), ('dev-main', 'dev-main'),
                              ('1.1.0', '1.0.0'), ('1.1.0', '1.1.1')]:
            with self.subTest(before=before, after=after):
                data = metadata(merge.MINOR)
                deps = json.loads(data['updated-dependencies-json'])
                deps[0].update(prevVersion=before, newVersion=after)
                data['updated-dependencies-json'] = json.dumps(deps)
                self.assertFalse(merge.allowed(data))
        data = metadata()
        deps = json.loads(data['updated-dependencies-json'])
        deps[0].update(prevVersion='1.0.0-beta.1', newVersion='1.0.0-beta.2')
        data['updated-dependencies-json'] = json.dumps(deps)
        self.assertFalse(merge.allowed(data))
        data = metadata(merge.MINOR)
        data['update-type'] = merge.PATCH
        self.assertFalse(merge.allowed(data))

    def test_mixed_group_and_maintainer_change_are_manual(self):
        data = metadata(merge.MINOR)
        deps = json.loads(data['updated-dependencies-json'])
        deps.append(dict(deps[0], dependencyName='other', updateType=merge.PATCH))
        data['updated-dependencies-json'] = json.dumps(deps)
        self.assertTrue(merge.allowed(data))
        deps[-1]['updateType'] = 'version-update:semver-major'
        data['updated-dependencies-json'] = json.dumps(deps)
        self.assertFalse(merge.allowed(data))
        data = metadata()
        data['maintainer-changes'] = 'true'
        self.assertFalse(merge.allowed(data))
        data = metadata()
        deps = json.loads(data['updated-dependencies-json'])
        deps[0]['maintainerChanges'] = True
        data['updated-dependencies-json'] = json.dumps(deps)
        self.assertFalse(merge.allowed(data))

    def test_malformed_metadata_is_manual(self):
        for data in [None, {}, metadata() | {'updated-dependencies-json': 'oops'},
                     metadata() | {'updated-dependencies-json': '[]'}, metadata() | {'updated-dependencies-json': '[null]'}]:
            self.assertFalse(merge.allowed(data))

    def test_identity_requires_bot_same_repository_current_commit_and_title(self):
        self.assertTrue(merge.eligible(pull(), REPO, 'main', SHA))
        for mutate in [lambda p: p['user'].update(login='someone'), lambda p: p.update(draft=True),
                       lambda p: p['head']['repo'].update(full_name='fork/site'),
                       lambda p: p['base'].update(ref='other'), lambda p: p['head'].update(sha=BASE),
                       lambda p: p['head'].update(ref='feature/tools'), lambda p: p.update(title='Bump tools')]:
            pr = pull()
            mutate(pr)
            self.assertFalse(merge.eligible(pr, REPO, 'main', SHA))


class CiTests(unittest.TestCase):
    def test_only_latest_successful_exact_commit_and_base_is_accepted(self):
        self.assert_ci([run()], True)
        for key, value in [('conclusion', 'failure'), ('conclusion', 'cancelled'), ('status', 'in_progress'),
                           ('head_sha', BASE), ('path', '.github/workflows/other.yml'), ('event', 'push'),
                           ('head_repository', {'full_name': 'fork/site'}), ('pull_requests', [])]:
            self.assert_ci([run() | {key: value}], False)
        self.assert_ci([], False)
        self.assert_ci([run(), run() | {'run_attempt': 2, 'conclusion': 'failure'}], False)
        pr = pull()
        pr['base']['sha'] = MERGED
        with patch.object(merge, 'api', return_value={'workflow_runs': [run()]}):
            self.assertFalse(merge.successful_ci(REPO, pr, SHA))

    def test_deleted_branch_only_allows_dispatch_recovery_for_already_merged_pr(self):
        pr = pull() | {'merged': True}
        with patch.object(merge, 'api', return_value={'workflow_runs': [run() | {'pull_requests': []}]}):
            self.assertTrue(merge.successful_ci(REPO, pr, SHA))

    def assert_ci(self, runs, expected):
        with patch.object(merge, 'api', return_value={'workflow_runs': runs}):
            self.assertEqual(merge.successful_ci(REPO, pull(), SHA), expected)


class WorkflowTests(unittest.TestCase):
    def test_nonstandard_ci_workflow_is_verified_and_dispatched(self):
        for path in ['.github/workflows/verify.yml', '.github/workflows/commitlint.yml']:
            with self.subTest(path=path), patch.object(merge, 'CI_PATH', path):
                with patch.object(merge, 'api', return_value={'workflow_runs': [run()]}) as api:
                    self.assertTrue(merge.successful_ci(REPO, pull(), SHA))
                    self.assertIn('/workflows/' + path.rsplit('/', 1)[-1] + '/runs?', api.call_args.args[0])
                with patch.object(merge, 'api', side_effect=[{'sha': MERGED}, {'workflow_runs': []}, {}]) as api:
                    merge.dispatch_main(REPO, 'main')
                    self.assertTrue(api.call_args.args[0].endswith('/workflows/' + path.rsplit('/', 1)[-1] + '/dispatches'))


class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.artifact = {'id': 12, 'workflow_run': {'id': 8}, 'expired': False,
                         'size_in_bytes': 1000, 'name': merge.receipt_name(7, SHA)}
        self.source = {'id': 8, 'path': merge.METADATA_PATH, 'event': 'pull_request_target',
                       'status': 'completed', 'conclusion': 'success', 'head_repository': {'full_name': REPO}}
        self.receipt = {'version': 1, 'repository': REPO, 'pr': 7, 'sha': SHA,
                        'metadata_run_id': 8, 'metadata': metadata()}

    def archive(self, name='dependabot.json', data=None):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w') as archive:
            archive.writestr(name, json.dumps(data or self.receipt))
        return stream.getvalue()

    def test_successful_trusted_receipt(self):
        with patch.object(merge, 'api', side_effect=[self.source, self.archive()]):
            self.assertEqual(merge.read_receipt(REPO, self.artifact), self.receipt)

    def test_forged_receipt_workflow_event_failure_and_repository_rejected(self):
        for key, value in [('path', merge.CI_PATH), ('event', 'pull_request'), ('conclusion', 'failure'),
                           ('status', 'in_progress'), ('head_repository', {'full_name': 'fork/site'})]:
            with patch.object(merge, 'api', return_value=self.source | {key: value}), self.assertRaises(ValueError):
                merge.read_receipt(REPO, self.artifact)

    def test_archive_paths_oversize_and_identity_mismatch_rejected(self):
        for archive in [self.archive('../dependabot.json'), self.archive(data=self.receipt | {'sha': BASE}),
                        self.archive(data=self.receipt | {'metadata_run_id': 9}),
                        self.archive(data=self.receipt | {'repository': 'fork/site'})]:
            with patch.object(merge, 'api', side_effect=[self.source, archive]), self.assertRaises(ValueError):
                merge.read_receipt(REPO, self.artifact)
        for artifact in [self.artifact | {'expired': True}, self.artifact | {'size_in_bytes': 100001}]:
            with self.assertRaises(ValueError):
                merge.read_receipt(REPO, artifact)


class MergeTests(unittest.TestCase):
    def test_conflicts_and_required_review_do_not_attempt_merge(self):
        for state in ['dirty', 'blocked', 'behind']:
            with self.subTest(state=state):
                pr = pull() | {'mergeable_state': state}
                with patch.object(merge, 'api', return_value=pr) as api, patch.object(merge, 'verified_receipt', return_value={'metadata': metadata()}), patch.object(merge, 'successful_ci', return_value=True):
                    merge.merge_one(REPO, 'main', 7, SHA)
                    self.assertFalse(any(call.args[0].endswith('/merge') for call in api.call_args_list))

    def test_exact_sha_merge_then_explicit_dispatch(self):
        calls = []
        def api(path, method='GET', data=None):
            calls.append((path, method, data))
            if path.endswith('/pulls/7'): return pull()
            if path.endswith('/merge'): return {'merged': True}
            if '/commits/' in path: return {'sha': MERGED}
            if '/runs?' in path: return {'workflow_runs': []}
            if path.endswith('/dispatches'): return {}
            self.fail(path)
        with patch.object(merge, 'api', side_effect=api), patch.object(merge, 'verified_receipt', return_value={'metadata': metadata()}), patch.object(merge, 'successful_ci', return_value=True):
            merge.merge_one(REPO, 'main', 7, SHA)
        self.assertEqual(calls[2][1:], ('PUT', {'sha': SHA, 'merge_method': 'squash',
                                               'commit_title': 'chore(deps): update dependencies (#7)', 'commit_message': ''}))
        self.assertEqual(calls[-1][1:], ('POST', {'ref': 'main'}))

    def test_ci_missing_or_failed_receipt_missing_or_ineligible_never_merge(self):
        for receipt, ci in [(None, True), ({'metadata': metadata('version-update:semver-major')}, True),
                            ({'metadata': metadata()}, False)]:
            with patch.object(merge, 'api', return_value=pull()) as api, patch.object(merge, 'verified_receipt', return_value=receipt), patch.object(merge, 'successful_ci', return_value=ci):
                merge.merge_one(REPO, 'main', 7, SHA)
                self.assertEqual(api.call_count, 1)

    def test_pr_changed_while_job_started_never_merges(self):
        pr = pull()
        changed = copy.deepcopy(pr)
        changed['head']['sha'] = BASE
        with patch.object(merge, 'api', side_effect=[pr, changed]) as api, patch.object(merge, 'verified_receipt', return_value={'metadata': metadata()}), patch.object(merge, 'successful_ci', return_value=True):
            merge.merge_one(REPO, 'main', 7, SHA)
            self.assertEqual(api.call_count, 2)

    def test_failed_dispatch_is_recoverable_after_merge(self):
        pr = pull() | {'merged': True, 'state': 'closed', 'merge_commit_sha': MERGED}
        with patch.object(merge, 'api', side_effect=[pr, {'sha': MERGED}]), patch.object(merge, 'verified_receipt', return_value={'metadata': metadata()}), patch.object(merge, 'successful_ci', return_value=True), patch.object(merge, 'dispatch_main') as dispatch:
            merge.merge_one(REPO, 'main', 7, SHA)
            dispatch.assert_called_once_with(REPO, 'main')

    def test_retry_does_not_duplicate_main_ci(self):
        for state, conclusion in [('queued', None), ('in_progress', None), ('completed', 'success')]:
            runs = [{'head_branch': 'main', 'event': 'workflow_dispatch', 'status': state, 'conclusion': conclusion}]
            with patch.object(merge, 'api', side_effect=[{'sha': MERGED}, {'workflow_runs': runs}]) as api:
                merge.dispatch_main(REPO, 'main')
                self.assertEqual(api.call_count, 2)


if __name__ == '__main__':
    unittest.main()
