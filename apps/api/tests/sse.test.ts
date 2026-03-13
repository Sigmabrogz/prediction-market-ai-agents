import { describe, it, expect, vi, beforeEach } from 'vitest';
import { broker } from '../src/services/sse-broker';

describe('SSE Broker', () => {
  beforeEach(() => {
    // Reset internal state
    (broker as any).clients.clear();
  });

  it('should add and remove clients cleanly', () => {
    const mockRes = { write: vi.fn() } as any;
    broker.addClient('client-1', mockRes);
    expect((broker as any).clients.size).toBe(1);

    broker.removeClient('client-1');
    expect((broker as any).clients.size).toBe(0);
  });

  it('should format and broadcast normalized events to all clients', () => {
    const mockRes1 = { write: vi.fn() } as any;
    const mockRes2 = { write: vi.fn() } as any;
    
    broker.addClient('client-1', mockRes1);
    broker.addClient('client-2', mockRes2);

    broker.broadcast('test.event', { status: 'OK' });

    const expectedString = `event: test.event\ndata: {"status":"OK"}\n\n`;
    expect(mockRes1.write).toHaveBeenCalledWith(expectedString);
    expect(mockRes2.write).toHaveBeenCalledWith(expectedString);
  });

  it('should remove a client if writing fails (dead connection)', () => {
    const mockRes1 = { 
      write: vi.fn().mockImplementation(() => {
        throw new Error('Connection closed by peer');
      }) 
    } as any;

    broker.addClient('client-1', mockRes1);
    broker.broadcast('test.event', { status: 'OK' });

    // The broker should catch the error and auto-evict the dead client
    expect((broker as any).clients.size).toBe(0);
  });
});
