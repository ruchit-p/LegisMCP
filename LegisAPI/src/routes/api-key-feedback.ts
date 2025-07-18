import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { jwt } from '../middlewares/jwt';
import { UserService } from '../services/user';
import type { Env, JWTPayload } from '../types';

// MARK: - Types

interface ThumbsUpRequest {
    thumbs_up: boolean;
    feedback_message?: string;
}

interface FeedbackStats {
    total_feedback: number;
    positive_feedback: number;
    negative_feedback: number;
    positive_percentage: number;
    recent_feedback: Array<{
        id: number;
        thumbs_up: boolean;
        feedback_message: string | null;
        created_at: string;
        user_email: string | null;
    }>;
}

const apiKeyFeedbackRouter = new Hono<{
    Bindings: Env;
    Variables: {
        jwtPayload?: JWTPayload;
        user?: any;
    };
}>();

// Apply JWT middleware to all routes
apiKeyFeedbackRouter.use('/*', jwt());

// User middleware - converts JWT payload to user data
apiKeyFeedbackRouter.use('/*', async (c, next) => {
    const payload = c.get('jwtPayload') as JWTPayload;
    if (payload?.sub) {
        const userService = new UserService(c.env.DB);
        const user = await userService.getUserByAuth0Id(payload.sub);
        if (user) {
            c.set('user', user);
        }
    }
    await next();
});

/**
 * GET /api-key-feedback/stats
 */
apiKeyFeedbackRouter.get('/stats', async (c) => {
    try {
        const user = c.get('user');
        
        if (!user?.id) {
            throw new HTTPException(401, { message: 'User not found' });
        }

        // Get overall feedback stats
        const totalResult = await c.env.DB.prepare(`
            SELECT COUNT(*) as total_feedback,
                   SUM(CASE WHEN thumbs_up = 1 THEN 1 ELSE 0 END) as positive_feedback
            FROM api_key_feedback
        `).first();

        const total = totalResult?.total_feedback as number || 0;
        const positive = totalResult?.positive_feedback as number || 0;
        const negative = total - positive;
        const positivePercentage = total > 0 ? Math.round((positive / total) * 100) : 0;

        // Get recent feedback with user email
        const recentFeedback = await c.env.DB.prepare(`
            SELECT akf.id, akf.thumbs_up, akf.feedback_message, akf.created_at, u.email as user_email
            FROM api_key_feedback akf
            LEFT JOIN users u ON akf.user_id = u.id
            ORDER BY akf.created_at DESC
            LIMIT 10
        `).all();

        const stats: FeedbackStats = {
            total_feedback: total,
            positive_feedback: positive,
            negative_feedback: negative,
            positive_percentage: positivePercentage,
            recent_feedback: recentFeedback.results as any[]
        };

        return c.json(stats);
    } catch (error) {
        console.error('Error fetching feedback stats:', error);
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, { message: 'Failed to fetch feedback stats' });
    }
});

/**
 * POST /api-key-feedback
 */
apiKeyFeedbackRouter.post('/', async (c) => {
    try {
        const user = c.get('user');
        
        if (!user?.id) {
            throw new HTTPException(401, { message: 'User not found' });
        }

        const body = await c.req.json() as ThumbsUpRequest;
        
        if (typeof body.thumbs_up !== 'boolean') {
            throw new HTTPException(400, { message: 'thumbs_up field is required and must be boolean' });
        }

        // Insert feedback
        const result = await c.env.DB.prepare(`
            INSERT INTO api_key_feedback (user_id, thumbs_up, feedback_message, created_at)
            VALUES (?, ?, ?, datetime('now'))
        `).bind(
            user.id,
            body.thumbs_up ? 1 : 0,
            body.feedback_message || null
        ).run();

        if (!result.success) {
            throw new HTTPException(500, { message: 'Failed to save feedback' });
        }

        return c.json({ 
            message: 'Feedback saved successfully',
            feedback_id: result.meta.last_row_id 
        });
    } catch (error) {
        console.error('Error saving feedback:', error);
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, { message: 'Failed to save feedback' });
    }
});

/**
 * GET /api-key-feedback/user
 */
apiKeyFeedbackRouter.get('/user', async (c) => {
    try {
        const user = c.get('user');
        
        if (!user?.id) {
            throw new HTTPException(401, { message: 'User not found' });
        }

        // Get user's feedback history
        const userFeedback = await c.env.DB.prepare(`
            SELECT id, thumbs_up, feedback_message, created_at
            FROM api_key_feedback
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        `).bind(user.id).all();

        return c.json({
            user_id: user.id,
            feedback_history: userFeedback.results
        });
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, { message: 'Failed to fetch user feedback' });
    }
});

export { apiKeyFeedbackRouter }; 