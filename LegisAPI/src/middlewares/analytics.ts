import { Context, Next } from 'hono';
import { HTTPException } from '../utils/http-exception';
import { UserService } from '../services/user';
import { JWTPayload } from 'jose';

export const analytics = () => {
  return async (c: Context, next: Next) => {
    const startTime = Date.now();
    const env = c.env as any;
    
    console.log('Analytics middleware - env.DB available:', !!env.DB);
    
    const userService = new UserService(env.DB);

    try {
      const claims = c.get('jwtPayload') as JWTPayload;
      console.log('Analytics middleware - JWT claims:', {
        sub: claims?.sub,
        email: claims?.email,
        name: claims?.name
      });
      
      if (!claims?.sub) {
        throw new HTTPException(401, { message: 'Unauthorized' });
      }

      let user = await userService.getUserByAuth0Id(claims.sub);
      console.log('Analytics middleware - Existing user:', user ? 'Found' : 'Not found');
      
      if (!user) {
        // Auto-register new users
        console.log('Analytics middleware - Creating new user');
        
        // Extract email and name from claims, with fallbacks
        const email = claims.email as string || `${claims.sub}@auth0.local`;
        const name = claims.name as string || claims.nickname as string || claims.sub || 'Unknown User';
        
        console.log('Analytics middleware - Creating user with:', { sub: claims.sub, email, name });
        
        user = await userService.findOrCreateUser(
          claims.sub,
          email,
          name
        );
        console.log('Analytics middleware - New user created:', user);
      }

      const hasQuota = await userService.checkApiLimit(user.id);
      if (!hasQuota && user.plan !== 'enterprise') {
        throw new HTTPException(429, { message: 'API quota exceeded' });
      }

      c.set('user', user);

      await next();

      const responseTime = Date.now() - startTime;
      // Get status code from the response - handle case where it might not be set yet
      const statusCode = c.res ? (c.res.status || 200) : 200;

      console.log('Recording API usage:', {
        userId: user.id,
        path: c.req.path,
        method: c.req.method,
        statusCode,
        responseTime
      });

      await userService.recordApiUsage(
        user.id,
        c.req.path,
        c.req.method,
        statusCode,
        responseTime
      );

      if (env.ANALYTICS) {
        env.ANALYTICS.writeDataPoint({
          blobs: [user.plan, c.req.method, c.req.path],
          doubles: [responseTime, statusCode],
          indexes: [user.auth0_user_id]
        });
      }
    } catch (error) {
      console.error('Analytics middleware error:', error);
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error('Unexpected error in analytics:', error);
      throw new HTTPException(500, { message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };
};