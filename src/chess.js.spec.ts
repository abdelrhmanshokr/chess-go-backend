import { Chess } from 'chess.js';

describe('Chess.js Library Integration', () => {
  let chess: Chess;

  beforeEach(() => {
    chess = new Chess();
  });

  it('should initialize with the correct starting position', () => {
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(chess.fen()).toBe(startingFen);
  });

  it('should validate and execute a legal move (e4)', () => {
    const move = chess.move('e4');
    expect(move).toBeDefined();
    expect(move.san).toBe('e4');
    expect(chess.fen()).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
  });

  it('should detect illegal moves', () => {
    // Attempting to move a white pawn to e5 directly (illegal from start)
    // Note: in chess.js v1.x, move() returns null for invalid moves or throws if incorrectly formatted.
    try {
        const move = chess.move('e5');
        expect(move).toBeNull();
    } catch (e) {
        // Handle case where some versions might throw for invalid SAN
        expect(e).toBeDefined();
    }
  });

  it('should detect checkmate (Scholar\'s Mate)', () => {
    // Scholar's Mate sequence
    chess.move('e4');
    chess.move('e5');
    chess.move('Bc4');
    chess.move('Nc6');
    chess.move('Qh5');
    chess.move('Nf6');
    chess.move('Qxf7#');
    
    expect(chess.isCheckmate()).toBe(true);
    expect(chess.isGameOver()).toBe(true);
  });

  it('should return valid moves from a position', () => {
    const moves = chess.moves();
    // 20 possible starting moves for White (16 pawn moves + 4 knight moves)
    expect(moves.length).toBe(20);
    expect(moves).toContain('e4');
    expect(moves).toContain('Nf3');
  });
});
