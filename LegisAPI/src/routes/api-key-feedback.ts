import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { jwt } from '../middlewares/jwt';
import { AuthConfigService } from '../services/auth-config';

// MARK: - Types

interface ThumbsUpRequest {
    thumbs_up: boolean;
    feedback_message?: string;
}

interface FeedbackStatsResponse {
    total_feedback: number;
    total_thumbs_up: number;
    total_thumbs_down: number;
    thumbs_up_percentage: number;
    user_has_voted: boolean;
    user_vote?: boolean;
}

// MARK: - API Key Feedback Router

const apiKeyFeedbackRouter = new Hono();

/**
 * Get feedback statistics for API key feature
 * GET /api-key-feedback/stats
 */
apiKeyFeedbackRouter.get('/stats', jwt, async (c) => {
    try {
        const db = AuthConfigService.getDatabase(c.env);
        const user = c.get('user');
        
        if (!user?.id) {
            throw new HTTPException(401, { message: 'User not authenticated' });
        }

        // Get overall feedback statistics
        const statsQuery = `
            SELECT 
                total_feedback,
                total_thumbs_up,
                total_thumbs_down,
                thumbs_up_percentage
            FROM api_key_feedback_stats
        `;
        
        const stats = await db.prepare(statsQuery).first() || {
            total_feedback: 0,
            total_thumbs_up: 0,
            total_thumbs_down: 0,
            thumbs_up_percentage: 0
        };

        // Check if current user has voted
        const userVoteQuery = `
            SELECT thumbs_up 
            FROM api_key_feedback 
            WHERE user_id = ?
        `;
        
        const userVote = await db.prepare(userVoteQuery).bind(user.id).first();

        const response: FeedbackStatsResponse = {
            ...stats,
            user_has_voted: !!userVote,
            user_vote: userVote?.thumbs_up
        };

        return c.json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error fetching API key feedback stats:', error);
        
        if (error instanceof HTTPException) {
            throw error;
        }
        
        throw new HTTPException(500, { 
            message: 'Failed to fetch feedback statistics' 
        });
    }
});

/**
 * Submit thumbs up/down feedback for API key feature
 * POST /api-key-feedback
 */
apiKeyFeedbackRouter.post('/', jwt, async (c) => {
    try {
        const db = AuthConfigService.getDatabase(c.env);
        const user = c.get('user');
        
        if (!user?.id) {
            throw new HTTPException(401, { message: 'User not authenticated' });
        }

        const body = await c.req.json<ThumbsUpRequest>();
        
        // Validate request body
        if (typeof body.thumbs_up !== 'boolean') {
            throw new HTTPException(400, { 
                message: 'Invalid request: thumbs_up must be a boolean' 
            });
        }

        // Check if user has already voted
        const existingFeedback = await db.prepare(`
            SELECT id FROM api_key_feedback WHERE user_id = ?
        `).bind(user.id).first();

        if (existingFeedback) {
            throw new HTTPException(409, { 
                message: 'You have already provided feedback for this feature' 
            });
        }

        // Insert new feedback
        const insertQuery = `
            INSERT INTO api_key_feedback (user_id, thumbs_up, feedback_message)
            VALUES (?, ?, ?)
        `;
        
        await db.prepare(insertQuery).bind(
            user.id,
            body.thumbs_up,
            body.feedback_message || null
        ).run();

        // Get updated statistics
        const updatedStats = await db.prepare(`
            SELECT 
                total_feedback,
                total_thumbs_up,
                total_thumbs_down,
                thumbs_up_percentage
            FROM api_key_feedback_stats
        `).first();

        return c.json({
            success: true,
            message: 'Feedback recorded successfully',
            data: {
                ...updatedStats,
                user_has_voted: true,
                user_vote: body.thumbs_up
            }
        });
    } catch (error) {
        console.error('Error submitting API key feedback:', error);
        
        if (error instanceof HTTPException) {
            throw error;
        }
        
        throw new HTTPException(500, { 
            message: 'Failed to submit feedback' 
        });
    }
});

/**
 * Get user's feedback (for admin purposes)
 * GET /api-key-feedback/user
 */
apiKeyFeedbackRouter.get('/user', jwt, async (c) => {
    try {
        const db = AuthConfigService.getDatabase(c.env);
        const user = c.get('user');
        
        if (!user?.id) {
            throw new HTTPException(401, { message: 'User not authenticated' });
        }

        const userFeedback = await db.prepare(`
            SELECT thumbs_up, feedback_message, created_at, updated_at
            FROM api_key_feedback 
            WHERE user_id = ?
        `).bind(user.id).first();

        return c.json({
            success: true,
            data: userFeedback || null
        });
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        
        if (error instanceof HTTPException) {
            throw error;
        }
        
        throw new HTTPException(500, { 
            message: 'Failed to fetch user feedback' 
        });
    }
});

export { apiKeyFeedbackRouter }; 