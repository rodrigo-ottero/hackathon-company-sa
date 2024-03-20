const { handler } = require('./lambda-authorizer'); // Replace with the path to your Lambda function file
const AWSMock = require('aws-sdk-mock');

describe('Lambda Authorizer', () => {
  beforeAll(() => {
    AWSMock.mock(
      'CognitoIdentityServiceProvider',
      'initiateAuth',
      (params, callback) => {
        // Mock a successful authentication response
        callback(null, { AuthenticationResult: { IdToken: 'mockedToken' } });
      }
    );
    process.env.CLIENT_ID = 'testClientId';
    process.env.CLIENT_SECRET = 'testClienteSecret';
  });

  afterAll(() => {
    AWSMock.restore('CognitoIdentityServiceProvider');
  });

  it('should return token when authentication is successful', async () => {
    const event = {
      body: JSON.stringify({ username: 'testUser', password: 'testPassword' }),
    };
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('mockedToken');
  });

  it('should return 400 for invalid request', async () => {
    const event = { body: '{}', headers: {} };
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('Parâmetros mandatórios não encontrados');
  });

  it('should return 500 for error during authentication', async () => {
    AWSMock.remock(
      'CognitoIdentityServiceProvider',
      'initiateAuth',
      (params, callback) => {
        // Simulate an error during authentication
        callback(new Error('Authentication failed'));
      }
    );

    const event = {
      body: JSON.stringify({ username: 'testUser', password: 'testPassword' }),
    };
    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Authentication failed');
  });

  it('should return 500 for error during authentication without custom message', async () => {
    AWSMock.remock(
      'CognitoIdentityServiceProvider',
      'initiateAuth',
      (params, callback) => {
        // Simulate an error during authentication
        callback(new Error());
      }
    );

    const event = {
      body: JSON.stringify({ username: 'testUser', password: 'testPassword' }),
    };
    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Não foi possível autenticar o usuário');
  });
});
