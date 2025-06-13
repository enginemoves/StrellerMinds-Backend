# tests/python/test_client.py
import pytest
import responses
from nestjs_api_sdk import NestJSApiSDK, ApiError


class TestNestJSApiSDK:
    def setup_method(self):
        self.sdk = NestJSApiSDK({
            'base_url': 'https://api.example.com',
            'api_key': 'test-api-key',
            'debug': False
        })

    @responses.activate
    def test_authentication(self):
        responses.add(
            responses.GET,
            'https://api.example.com/test',
            json={'message': 'success'},
            status=200
        )

        response = self.sdk.get('/test')
        
        assert len(responses.calls) == 1
        assert responses.calls[0].request.headers['Authorization'] == 'Bearer test-api-key'
        assert response.success is True

    @responses.activate
    def test_error_handling(self):
        responses.add(
            responses.GET,
            'https://api.example.com/error',
            json={
                'message': 'Bad Request',
                'code': 'VALIDATION_ERROR',
                'details': {'field': 'email'}
            },
            status=400
        )

        with pytest.raises(ApiError) as exc_info:
            self.sdk.get('/error')
        
        assert exc_info.value.status == 400
        assert exc_info.value.code == 'VALIDATION_ERROR'

    @responses.activate
    def test_users_list(self):
        mock_users = [
            {'id': '1', 'name': 'John Doe', 'email': 'john@example.com'}
        ]
        
        responses.add(
            responses.GET,
            'https://api.example.com/users',
            json=mock_users,
            status=200
        )

        response = self.sdk.users.list()
        assert response.data == mock_users