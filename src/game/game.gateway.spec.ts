import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { Logger } from '@nestjs/common';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let mockServer: any;
  let mockSocket: any;

  beforeEach(async () => {
    mockServer = {
      emit: jest.fn(),
    };
    mockSocket = {
      id: 'test-socket-id',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GameGateway],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should log connection', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      gateway.handleConnection(mockSocket as any);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining(mockSocket.id));
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnection', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      gateway.handleDisconnect(mockSocket as any);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining(mockSocket.id));
    });
  });

  describe('handlePing', () => {
    it('should return pong with data', () => {
      const testData = { foo: 'bar' };
      const result = gateway.handlePing(testData);
      expect(result).toEqual({ event: 'pong', data: testData });
    });
  });
});
