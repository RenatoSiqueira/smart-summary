import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extracts client IP from request.
 * Checks in order:
 * 1. x-forwarded-for header (takes first IP if comma-separated)
 * 2. x-real-ip header
 * 3. request.ip
 * 4. 'unknown' if none available
 */
function extractClientIp(request: Request): string {
  // Check x-forwarded-for header (for proxy/load balancer scenarios)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor && typeof forwardedFor === 'string') {
    // Take the first IP if it's a comma-separated list
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  // Check x-real-ip header
  const realIp = request.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }

  // Fall back to request.ip
  if (request.ip) {
    return request.ip;
  }

  // Default to 'unknown' if no IP is available
  return 'unknown';
}

/**
 * Decorator to extract client IP from request.
 * Usage: @ClientIp() ip: string
 */
export const ClientIp = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return extractClientIp(request);
  },
);

export { extractClientIp };
