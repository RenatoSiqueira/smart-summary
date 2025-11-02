import { ClientIp, extractClientIp } from '../client-ip.decorator';
import { Request } from 'express';

describe('ClientIp Decorator', () => {
  const createMockRequest = (
    ip?: string,
    headers: Record<string, string | string[]> = {},
  ): Request => {
    return {
      ip,
      headers,
    } as Request;
  };

  describe('extractClientIp function', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest('127.0.0.1', {
        'x-forwarded-for': '192.168.1.100, 10.0.0.1',
      });

      const ip = extractClientIp(request);
      expect(ip).toBe('192.168.1.100');
    });

    it('should take first IP from x-forwarded-for comma-separated list', () => {
      const request = createMockRequest('127.0.0.1', {
        'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
      });

      const ip = extractClientIp(request);
      expect(ip).toBe('203.0.113.1');
    });

    it('should trim whitespace from x-forwarded-for IP', () => {
      const request = createMockRequest('127.0.0.1', {
        'x-forwarded-for': '  192.168.1.100  , 10.0.0.1',
      });

      const ip = extractClientIp(request);
      expect(ip).toBe('192.168.1.100');
    });

    it('should fall back to x-real-ip header if x-forwarded-for is not available', () => {
      const request = createMockRequest('127.0.0.1', {
        'x-real-ip': '192.168.1.200',
      });

      const ip = extractClientIp(request);
      expect(ip).toBe('192.168.1.200');
    });

    it('should use x-real-ip header even if x-forwarded-for exists but is invalid', () => {
      const request = createMockRequest('127.0.0.1', {
        'x-forwarded-for': '',
        'x-real-ip': '192.168.1.200',
      });

      const ip = extractClientIp(request);
      expect(ip).toBe('192.168.1.200');
    });

    it('should fall back to request.ip if no proxy headers are available', () => {
      const request = createMockRequest('192.168.1.50', {});

      const ip = extractClientIp(request);
      expect(ip).toBe('192.168.1.50');
    });

    it('should return "unknown" if no IP is available', () => {
      const request = createMockRequest(undefined, {});

      const ip = extractClientIp(request);
      expect(ip).toBe('unknown');
    });

    it('should prioritize x-forwarded-for over x-real-ip', () => {
      const request = createMockRequest('127.0.0.1', {
        'x-forwarded-for': '192.168.1.100',
        'x-real-ip': '192.168.1.200',
      });

      const ip = extractClientIp(request);
      expect(ip).toBe('192.168.1.100');
    });

    it('should prioritize x-forwarded-for over request.ip', () => {
      const request = createMockRequest('127.0.0.1', {
        'x-forwarded-for': '192.168.1.100',
      });

      const ip = extractClientIp(request);
      expect(ip).toBe('192.168.1.100');
    });

    it('should handle empty x-forwarded-for header', () => {
      const request = createMockRequest('127.0.0.1', {
        'x-forwarded-for': '',
      });

      const ip = extractClientIp(request);
      expect(ip).toBe('127.0.0.1'); // Falls back to request.ip
    });

    it('should handle x-forwarded-for with only whitespace', () => {
      const request = createMockRequest('127.0.0.1', {
        'x-forwarded-for': '   ,  , ',
      });

      const ip = extractClientIp(request);
      expect(ip).toBe('127.0.0.1'); // Falls back to request.ip
    });
  });

  describe('ClientIp decorator', () => {
    it('should be defined as a decorator function', () => {
      expect(ClientIp).toBeDefined();
      expect(typeof ClientIp).toBe('function');
    });

    // Note: Testing param decorators directly requires mocking NestJS's decorator execution
    // In real usage, the decorator is applied to controller parameters like:
    // @Post() async summarize(@ClientIp() clientIp: string) { ... }
    // NestJS handles the decorator execution automatically at runtime
    it('should be usable as a parameter decorator', () => {
      // The decorator function should accept data and context
      // When used as a decorator, NestJS will execute the factory function
      // We verify it's a function that can be called
      expect(ClientIp).toBeInstanceOf(Function);

      // The actual value extraction is tested via extractClientIp function tests
      // which covers all the logic used by the decorator
    });
  });
});
