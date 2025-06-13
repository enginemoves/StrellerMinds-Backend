# packages/python/nestjs_api_sdk/client.py
import asyncio
import json
import time
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin

import aiohttp
import requests
from pydantic import BaseModel


class ApiError(Exception):
    def __init__(self, message: str, status: int, code: str, details: Any = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.details = details


class ApiResponse(BaseModel):
    data: Any
    status: int
    headers: Dict[str, str]
    success: bool


class ApiClientConfig(BaseModel):
    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    retries: int = 3
    retry_delay: int = 1
    debug: bool = False


class ApiClient:
    def __init__(self, config: Union[ApiClientConfig, Dict]):
        if isinstance(config, dict):
            config = ApiClientConfig(**config)
        
        self.config = config
        self.session = requests.Session()
        self.session.timeout = config.timeout
        
        headers = {'Content-Type': 'application/json'}
        if config.api_key:
            headers['Authorization'] = f'Bearer {config.api_key}'
        
        self.session.headers.update(headers)

    def _make_request(self, method: str, url: str, **kwargs) -> ApiResponse:
        full_url = urljoin(self.config.base_url, url)
        
        for attempt in range(self.config.retries + 1):
            try:
                if self.config.debug:
                    print(f"[API Client] {method.upper()} {full_url}")
                
                response = self.session.request(method, full_url, **kwargs)
                
                if response.status_code >= 500 and attempt < self.config.retries:
                    time.sleep(self.config.retry_delay * (attempt + 1))
                    continue
                
                if not response.ok:
                    error_data = {}
                    try:
                        error_data = response.json()
                    except:
                        pass
                    
                    raise ApiError(
                        error_data.get('message', f'Request failed with status {response.status_code}'),
                        response.status_code,
                        error_data.get('code', 'UNKNOWN_ERROR'),
                        error_data
                    )
                
                try:
                    data = response.json()
                except:
                    data = response.text
                
                return ApiResponse(
                    data=data,
                    status=response.status_code,
                    headers=dict(response.headers),
                    success=True
                )
                
            except requests.RequestException as e:
                if attempt == self.config.retries:
                    raise ApiError(str(e), 0, 'NETWORK_ERROR')
                time.sleep(self.config.retry_delay * (attempt + 1))

    def get(self, url: str, params: Optional[Dict] = None) -> ApiResponse:
        return self._make_request('GET', url, params=params)

    def post(self, url: str, data: Any = None, json_data: Any = None) -> ApiResponse:
        kwargs = {}
        if data is not None:
            kwargs['data'] = data
        if json_data is not None:
            kwargs['json'] = json_data
        return self._make_request('POST', url, **kwargs)

    def put(self, url: str, data: Any = None, json_data: Any = None) -> ApiResponse:
        kwargs = {}
        if data is not None:
            kwargs['data'] = data
        if json_data is not None:
            kwargs['json'] = json_data
        return self._make_request('PUT', url, **kwargs)

    def patch(self, url: str, data: Any = None, json_data: Any = None) -> ApiResponse:
        kwargs = {}
        if data is not None:
            kwargs['data'] = data
        if json_data is not None:
            kwargs['json'] = json_data
        return self._make_request('PATCH', url, **kwargs)

    def delete(self, url: str) -> ApiResponse:
        return self._make_request('DELETE', url)

    def set_api_key(self, api_key: str):
        self.config.api_key = api_key
        self.session.headers['Authorization'] = f'Bearer {api_key}'

    def set_base_url(self, base_url: str):
        self.config.base_url = base_url


# packages/python/nestjs_api_sdk/__init__.py
from .client import ApiClient, ApiClientConfig, ApiError, ApiResponse
from .resources.users import UsersResource


class NestJSApiSDK:
    def __init__(self, config: Union[ApiClientConfig, Dict]):
        self.client = ApiClient(config)
        self.users = UsersResource(self.client)

    def get(self, url: str, params: Optional[Dict] = None) -> ApiResponse:
        return self.client.get(url, params)

    def post(self, url: str, data: Any = None, json_data: Any = None) -> ApiResponse:
        return self.client.post(url, data, json_data)

    def put(self, url: str, data: Any = None, json_data: Any = None) -> ApiResponse:
        return self.client.put(url, data, json_data)

    def patch(self, url: str, data: Any = None, json_data: Any = None) -> ApiResponse:
        return self.client.patch(url, data, json_data)

    def delete(self, url: str) -> ApiResponse:
        return self.client.delete(url)

    def set_api_key(self, api_key: str):
        self.client.set_api_key(api_key)

    def set_base_url(self, base_url: str):
        self.client.set_base_url(base_url)