# examples/python/basic_usage.py
from nestjs_api_sdk import NestJSApiSDK, ApiError

def main():
    # Initialize SDK
    sdk = NestJSApiSDK({
        'base_url': 'https://api.yourapp.com',
        'api_key': 'your-api-key',
        'debug': True
    })

    try:
        # List users
        users = sdk.users.list({'page': 1, 'limit': 10})
        print('Users:', users.data)

        # Create a user
        new_user = sdk.users.create({
            'name': 'John Doe',
            'email': 'john@example.com',
            'password': 'securepassword'
        })
        print('Created user:', new_user.data)

        # Update user
        updated_user = sdk.users.update(new_user.data['id'], {
            'name': 'John Smith'
        })
        print('Updated user:', updated_user.data)

        # Custom request
        custom_data = sdk.get('/custom-endpoint')
        print('Custom data:', custom_data.data)

    except ApiError as e:
        print(f'API Error {e.status}: {e.message}')
        print('Error code:', e.code)
        print('Details:', e.details)
    except Exception as e:
        print('Unexpected error:', e)

if __name__ == '__main__':
    main()