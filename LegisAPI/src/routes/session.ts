import { Hono } from 'hono';
import { SessionService } from '../services/session';
import { HTTPException } from '../utils/http-exception';
import type { Env } from '../types';

const sessionRoutes = new Hono<{ Bindings: Env }>();

// Session endpoints for Auth.js integration
sessionRoutes.get('/sessions/:token', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const token = c.req.param('token');

  try {
    const session = await sessionService.getSession(token);
    if (!session) {
      throw new HTTPException(404, { message: 'Session not found' });
    }
    return c.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    throw new HTTPException(500, { message: 'Failed to fetch session' });
  }
});

sessionRoutes.post('/sessions', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const sessionData = await c.req.json();

  try {
    const session = await sessionService.createSession(sessionData);
    return c.json(session, 201);
  } catch (error) {
    console.error('Error creating session:', error);
    throw new HTTPException(500, { message: 'Failed to create session' });
  }
});

sessionRoutes.put('/sessions/:token', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const token = c.req.param('token');
  const updates = await c.req.json();

  try {
    const session = await sessionService.updateSession(token, updates);
    if (!session) {
      throw new HTTPException(404, { message: 'Session not found' });
    }
    return c.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    throw new HTTPException(500, { message: 'Failed to update session' });
  }
});

sessionRoutes.delete('/sessions/:token', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const token = c.req.param('token');

  try {
    const success = await sessionService.deleteSession(token);
    if (!success) {
      throw new HTTPException(404, { message: 'Session not found' });
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    throw new HTTPException(500, { message: 'Failed to delete session' });
  }
});

sessionRoutes.get('/users/:userId/sessions', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const userId = c.req.param('userId');

  try {
    const sessions = await sessionService.getUserSessions(userId);
    return c.json({ sessions });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    throw new HTTPException(500, { message: 'Failed to fetch user sessions' });
  }
});

sessionRoutes.delete('/sessions/cleanup/expired', async (c) => {
  const sessionService = new SessionService(c.env.DB);

  try {
    const deletedCount = await sessionService.cleanupExpiredSessions();
    return c.json({ deletedCount });
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    throw new HTTPException(500, { message: 'Failed to cleanup expired sessions' });
  }
});

// Account endpoints for OAuth connections
sessionRoutes.get('/accounts/:provider/:providerAccountId', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const provider = c.req.param('provider');
  const providerAccountId = c.req.param('providerAccountId');

  try {
    const account = await sessionService.getAccount(provider, providerAccountId);
    if (!account) {
      throw new HTTPException(404, { message: 'Account not found' });
    }
    return c.json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    throw new HTTPException(500, { message: 'Failed to fetch account' });
  }
});

sessionRoutes.post('/accounts', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const accountData = await c.req.json();

  try {
    const account = await sessionService.createAccount(accountData);
    return c.json(account, 201);
  } catch (error) {
    console.error('Error creating account:', error);
    throw new HTTPException(500, { message: 'Failed to create account' });
  }
});

sessionRoutes.get('/users/:userId/accounts', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const userId = c.req.param('userId');

  try {
    const accounts = await sessionService.getUserAccounts(userId);
    return c.json({ accounts });
  } catch (error) {
    console.error('Error fetching user accounts:', error);
    throw new HTTPException(500, { message: 'Failed to fetch user accounts' });
  }
});

sessionRoutes.put('/accounts/:id', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const id = c.req.param('id');
  const updates = await c.req.json();

  try {
    const account = await sessionService.updateAccount(id, updates);
    if (!account) {
      throw new HTTPException(404, { message: 'Account not found' });
    }
    return c.json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    throw new HTTPException(500, { message: 'Failed to update account' });
  }
});

sessionRoutes.delete('/accounts/:provider/:providerAccountId', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const provider = c.req.param('provider');
  const providerAccountId = c.req.param('providerAccountId');

  try {
    const success = await sessionService.deleteAccount(provider, providerAccountId);
    if (!success) {
      throw new HTTPException(404, { message: 'Account not found' });
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    throw new HTTPException(500, { message: 'Failed to delete account' });
  }
});

// Verification token endpoints
sessionRoutes.get('/verification-tokens/:token', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const token = c.req.param('token');

  try {
    const verificationToken = await sessionService.getVerificationToken(token);
    if (!verificationToken) {
      throw new HTTPException(404, { message: 'Verification token not found' });
    }
    return c.json(verificationToken);
  } catch (error) {
    console.error('Error fetching verification token:', error);
    throw new HTTPException(500, { message: 'Failed to fetch verification token' });
  }
});

sessionRoutes.post('/verification-tokens', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const tokenData = await c.req.json();

  try {
    const verificationToken = await sessionService.createVerificationToken(tokenData);
    return c.json(verificationToken, 201);
  } catch (error) {
    console.error('Error creating verification token:', error);
    throw new HTTPException(500, { message: 'Failed to create verification token' });
  }
});

sessionRoutes.delete('/verification-tokens/:token', async (c) => {
  const sessionService = new SessionService(c.env.DB);
  const token = c.req.param('token');

  try {
    const success = await sessionService.deleteVerificationToken(token);
    if (!success) {
      throw new HTTPException(404, { message: 'Verification token not found' });
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting verification token:', error);
    throw new HTTPException(500, { message: 'Failed to delete verification token' });
  }
});

sessionRoutes.delete('/verification-tokens/cleanup/expired', async (c) => {
  const sessionService = new SessionService(c.env.DB);

  try {
    const deletedCount = await sessionService.cleanupExpiredVerificationTokens();
    return c.json({ deletedCount });
  } catch (error) {
    console.error('Error cleaning up expired verification tokens:', error);
    throw new HTTPException(500, { message: 'Failed to cleanup expired verification tokens' });
  }
});

export { sessionRoutes };