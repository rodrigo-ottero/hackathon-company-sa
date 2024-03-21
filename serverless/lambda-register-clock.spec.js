const { MongoClient } = require('mongodb');
const { decomposeUnverifiedJwt } = require('aws-jwt-verify/jwt');
const moment = require('moment-timezone');
const lambdaFunction = require('./lambda-register-clock');

jest.mock('mongodb');
jest.mock('aws-jwt-verify/jwt');
jest.mock('moment-timezone');

describe('Lambda Function', () => {
  let mockEvent;
  let mockContext;

  beforeAll(() => {
    process.env.DOCUMENTDB_URL = 'testDocumentDbURL';
    process.env.DATABASE_NAME = 'testDataBaseName';
    process.env.COLLECTION_NAME = 'testCollectionName';
  });

  beforeEach(() => {
    mockEvent = {
      headers: {
        Authorization: 'Bearer your_jwt_token_here',
      },
    };

    mockContext = {};
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully register clock - entrada', async () => {
    const mockPayload = {
      'custom:matricula': '123456',
      'cognito:username': 'testuser',
    };
    const mockPreviousClock = { ocorrencia: 'saida' };

    decomposeUnverifiedJwt.mockReturnValue({ payload: mockPayload });

    const mockDatabase = {
      collection: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([mockPreviousClock]),
      insertOne: jest.fn().mockResolvedValue({}),
    };

    const mockClose = jest.fn();
    const mockClient = {
      db: jest.fn().mockReturnValue(mockDatabase),
      connect: jest.fn().mockResolvedValue({
        db: jest.fn().mockResolvedValue(mockDatabase),
        close: mockClose,
      }),
    };

    MongoClient.mockImplementation(() => mockClient);
    moment.mockImplementation(() => ({
      tz: jest.fn().mockReturnValue({
        format: jest.fn(() => '2024-03-20T12:00:00'),
      }),
    }));

    const expectedClock = {
      username: 'testuser',
      matricula: '123456',
      ocorrencia: 'entrada',
      timestamp: '2024-03-20T12:00:00',
    };

    const result = await lambdaFunction.handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual(JSON.stringify(expectedClock));
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockDatabase.insertOne).toHaveBeenCalledWith(expectedClock);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('should successfully register clock - saida', async () => {
    const mockPayload = {
      'custom:matricula': '123456',
      'cognito:username': 'testuser',
    };
    const mockPreviousClock = { ocorrencia: 'entrada' };

    decomposeUnverifiedJwt.mockReturnValue({ payload: mockPayload });

    const mockDatabase = {
      collection: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([mockPreviousClock]),
      insertOne: jest.fn().mockResolvedValue({}),
    };

    const mockClose = jest.fn();
    const mockClient = {
      db: jest.fn().mockReturnValue(mockDatabase),
      connect: jest.fn().mockResolvedValue({
        db: jest.fn().mockResolvedValue(mockDatabase),
        close: mockClose,
      }),
    };

    MongoClient.mockImplementation(() => mockClient);
    moment.mockImplementation(() => ({
      tz: jest.fn().mockReturnValue({
        format: jest.fn(() => '2024-03-20T12:00:00'),
      }),
    }));

    const expectedClock = {
      username: 'testuser',
      matricula: '123456',
      ocorrencia: 'saida',
      timestamp: '2024-03-20T12:00:00',
    };

    const result = await lambdaFunction.handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual(JSON.stringify(expectedClock));
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockDatabase.insertOne).toHaveBeenCalledWith(expectedClock);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    const errorMessage = 'Mock Error';
    decomposeUnverifiedJwt.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    const result = await lambdaFunction.handler(mockEvent);

    expect(result.statusCode).toBe(500);
    expect(result.body).toEqual(
      JSON.stringify({ message: 'Erro ao registrar o ponto.' })
    );
  });
});
