import { Test, TestingModule } from '@nestjs/testing';
import { GameModule } from './game.module';
import { GameGateway } from './game.gateway';

describe('GameModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [GameModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide GameGateway', () => {
    const gateway = module.get<GameGateway>(GameGateway);
    expect(gateway).toBeDefined();
    expect(gateway).toBeInstanceOf(GameGateway);
  });
});
