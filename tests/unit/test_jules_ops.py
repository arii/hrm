
import unittest
from unittest.mock import patch, MagicMock
import sys
import os
import requests

# Add the script's directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.github/scripts')))

from jules_ops import create_jules_session, delete_jules_session, main

class TestJulesOps(unittest.TestCase):

    @patch('jules_ops.requests.post')
    @patch('jules_ops.os.environ.get')
    def test_create_jules_session_success(self, mock_environ_get, mock_post):
        mock_environ_get.return_value = "test_key"

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"id": "session_123"}
        mock_post.return_value = mock_response

        session_id = create_jules_session("prompt", "branch", "title", "owner", "repo", "https://api.jules.ai/v1/sessions")
        self.assertEqual(session_id, "session_123")

    @patch('jules_ops.os.environ.get', return_value=None)
    def test_create_jules_session_no_api_key(self, mock_environ_get):
        with self.assertRaises(SystemExit):
            create_jules_session("prompt", "branch", "title", "owner", "repo", "https://api.jules.ai/v1/sessions")

    @patch('jules_ops.requests.post')
    @patch('jules_ops.os.environ.get')
    def test_create_jules_session_api_failure(self, mock_environ_get, mock_post):
        mock_environ_get.return_value = "test_key"
        mock_post.side_effect = requests.exceptions.RequestException("API Error")
        with self.assertRaises(SystemExit):
            create_jules_session("prompt", "branch", "title", "owner", "repo", "https://api.jules.ai/v1/sessions")

    @patch('jules_ops.requests.post')
    @patch('jules_ops.os.environ.get')
    def test_create_jules_session_no_session_id_in_response(self, mock_environ_get, mock_post):
        mock_environ_get.return_value = "test_key"
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"other_key": "other_value"}
        mock_post.return_value = mock_response
        with self.assertRaises(SystemExit):
            create_jules_session("prompt", "branch", "title", "owner", "repo", "https://api.jules.ai/v1/sessions")

    @patch('jules_ops.requests.delete')
    @patch('jules_ops.os.environ.get')
    def test_delete_jules_session_success(self, mock_environ_get, mock_delete):
        mock_environ_get.return_value = "test_key"

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_delete.return_value = mock_response

        delete_jules_session("session_123", "https://api.jules.ai/v1/sessions")
        mock_delete.assert_called_with("https://api.jules.ai/v1/sessions/session_123", headers={"Authorization": "Bearer test_key"})

    @patch('jules_ops.os.environ.get', return_value=None)
    def test_delete_jules_session_no_api_key(self, mock_environ_get):
        with self.assertRaises(SystemExit):
            delete_jules_session("session_123", "https://api.jules.ai/v1/sessions")

    def test_delete_jules_session_no_session_id(self):
        with self.assertRaises(SystemExit):
            delete_jules_session(None, "https://api.jules.ai/v1/sessions")

    @patch('jules_ops.requests.delete')
    @patch('jules_ops.os.environ.get')
    def test_delete_jules_session_api_failure(self, mock_environ_get, mock_delete):
        mock_environ_get.return_value = "test_key"
        mock_delete.side_effect = requests.exceptions.RequestException("API Error")
        with self.assertRaises(SystemExit):
            delete_jules_session("session_123", "https://api.jules.ai/v1/sessions")

    @patch('jules_ops.create_jules_session')
    def test_main_new_command(self, mock_create_jules_session):
        sys.argv = [
            'jules_ops.py', '--command', 'new', '--prompt', 'p', '--branch', 'b',
            '--title', 't', '--owner', 'o', '--repo-name', 'r', '--jules-api-url', 'https://test.com'
        ]
        main()
        mock_create_jules_session.assert_called_with(prompt='p', branch='b', title='t', owner='o', repo_name='r', jules_api_url='https://test.com')

    @patch('jules_ops.delete_jules_session')
    def test_main_delete_command(self, mock_delete_jules_session):
        sys.argv = ['jules_ops.py', '--command', 'delete', '--session-id', 'session_123', '--jules-api-url', 'https://test.com']
        main()
        mock_delete_jules_session.assert_called_with(session_id='session_123', jules_api_url='https://test.com')

    def test_main_missing_args_new(self):
        sys.argv = ['jules_ops.py', '--command', 'new']
        with self.assertRaises(SystemExit):
            main()

if __name__ == '__main__':
    unittest.main()
