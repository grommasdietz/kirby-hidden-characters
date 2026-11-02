#!/usr/bin/env python3
"""Exercise real Git ranges so documentation skips cannot hide runtime changes."""

import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('ci_changes', Path(__file__).with_name('ci-changes.py'))
changes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(changes)


class ChangeSelection(unittest.TestCase):
    def setUp(self):
        self.previous = Path.cwd()
        self.folder = tempfile.TemporaryDirectory()
        os.chdir(self.folder.name)
        self.git('init', '-q')
        self.git('config', 'user.name', 'CI test')
        self.git('config', 'user.email', 'ci@example.invalid')
        self.commit({'index.php': '<?php\n', 'README.md': '# Plugin\n'}, 'feat: start plugin')
        self.base = self.git('rev-parse', 'HEAD').strip()
        self.git('tag', 'v1.0.0')

    def tearDown(self):
        os.chdir(self.previous)
        self.folder.cleanup()

    def git(self, *args):
        return subprocess.check_output(['git', *args], stderr=subprocess.PIPE).decode()

    def commit(self, files, message):
        for name, text in files.items():
            path = Path(name)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
        self.git('add', '.')
        self.git('commit', '-qm', message)

    def result(self, name='push', event=None):
        return changes.classify(name, event or {'before': self.base})

    def test_documentation_only_uses_light_checks(self):
        self.commit({'README.md': '# Updated\n', 'docs/setup.md': '# Setup\n'}, 'docs: improve setup')
        result = self.result()
        self.assertFalse(result['full'])
        self.assertFalse(result['release'])
        self.assertFalse(result['deploy'])
        changes.check_documentation(result)

    def test_runtime_fix_requires_verification_and_release(self):
        self.commit({'index.php': '<?php // fixed\n'}, 'fix: register extension')
        result = self.result()
        self.assertTrue(result['full'] and result['release'] and result['deploy'])

    def test_workflow_maintenance_verifies_without_publishing_or_deployment(self):
        self.commit({'.github/workflows/ci.yml': 'name: CI\n'}, 'ci: improve verification')
        result = self.result()
        self.assertTrue(result['full'])
        self.assertFalse(result['release'] or result['deploy'])

    def test_dependency_updates_verify_without_publishing(self):
        self.commit({'package.json': '{}\n'}, 'fix(deps): update library')
        self.assertTrue(self.result()['full'])
        self.assertFalse(self.result()['release'])

    def test_draft_content_is_not_documentation(self):
        self.commit({'playground/content/home/home.md': 'Title: Changed\n'}, 'fix: update fixture')
        self.assertTrue(self.result()['full'])

    def test_docs_code_and_configuration_require_full_checks(self):
        self.commit({'docs/example.php': '<?php\n'}, 'docs: update example')
        self.assertTrue(self.result()['full'])

    def test_renaming_runtime_code_into_documentation_keeps_full_checks(self):
        self.git('mv', 'index.php', 'implementation.md')
        self.git('commit', '-qm', 'refactor: move implementation')
        self.assertTrue(self.result()['full'])

    def test_pull_request_compares_the_entire_change(self):
        self.commit({'index.php': '<?php // changed\n'}, 'fix: update extension')
        self.commit({'README.md': '# Updated\n'}, 'docs: explain change')
        self.assertTrue(self.result('pull_request', {'pull_request': {'base': {'sha': self.base}}})['full'])

    def test_unknown_base_fails_closed(self):
        self.assertTrue(self.result(event={'before': 'f' * 40})['full'])

    def test_initial_push_fails_closed(self):
        self.assertTrue(self.result(event={'before': '0' * 40})['full'])

    def test_manual_verification_is_always_full(self):
        self.commit({'README.md': '# Updated\n'}, 'docs: improve setup')
        self.assertTrue(self.result('workflow_dispatch')['full'])

    def test_automated_main_dispatch_does_not_publish_dependency_maintenance(self):
        self.commit({'package.json': '{}\n'}, 'chore(deps): update tooling')
        self.assertFalse(self.result('workflow_dispatch')['release'])

    def test_explicit_release_retry_can_publish_after_maintenance(self):
        self.commit({'package.json': '{}\n'}, 'chore(deps): update tooling')
        self.assertTrue(self.result('workflow_dispatch', {'inputs': {'force_release': 'true'}})['release'])

    def test_breaking_runtime_change_can_publish(self):
        self.commit({'index.php': '<?php // changed\n'}, 'feat!: revise extension')
        self.assertTrue(self.result()['release'])

    def test_earlier_feature_is_not_hidden_by_last_maintenance_commit(self):
        self.commit({'index.php': '<?php // changed\n'}, 'feat: add extension')
        self.commit({'.github/settings.yml': 'enabled: true\n'}, 'ci: update settings')
        self.assertTrue(self.result()['release'])

    def test_pending_feature_is_released_after_a_later_maintenance_push(self):
        self.commit({'index.php': '<?php // changed\n'}, 'feat: add extension')
        self.base = self.git('rev-parse', 'HEAD').strip()
        self.commit({'.github/settings.yml': 'enabled: true\n'}, 'ci: repair verification')
        self.assertTrue(self.result()['release'])

    def test_published_feature_does_not_restart_publishing(self):
        self.commit({'index.php': '<?php // changed\n'}, 'feat: add extension')
        self.git('tag', 'v1.1.0')
        self.base = self.git('rev-parse', 'HEAD').strip()
        self.commit({'.github/settings.yml': 'enabled: true\n'}, 'ci: improve checks')
        self.assertFalse(self.result()['release'])

    def test_dependency_merge_messages_do_not_force_a_release(self):
        self.commit({'package.json': '{}\n'}, 'Merge pull request #1 from dependabot/tooling')
        self.assertFalse(self.result()['release'])

    def test_schedule_times_stay_strings_in_yaml_readers(self):
        Path('.github').mkdir()
        for value in ["'05:00'", '"05:00"']:
            Path('.github/dependabot.yml').write_text('schedule:\n  time: ' + value + '\n')
            changes.validate_update_schedule()

    def test_unquoted_yaml_numeric_time_is_rejected(self):
        Path('.github').mkdir()
        Path('.github/dependabot.yml').write_text('schedule:\n  time: 05:00\n')
        with self.assertRaises(RuntimeError):
            changes.validate_update_schedule()

    def test_invalid_schedule_hour_is_rejected(self):
        Path('.github').mkdir()
        Path('.github/dependabot.yml').write_text("schedule:\n  time: '25:00'\n")
        with self.assertRaises(RuntimeError):
            changes.validate_update_schedule()

    def test_documentation_checks_reject_empty_pages(self):
        self.commit({'README.md': ''}, 'docs: change readme')
        with self.assertRaises(RuntimeError):
            changes.check_documentation(self.result())


if __name__ == '__main__':
    unittest.main()
