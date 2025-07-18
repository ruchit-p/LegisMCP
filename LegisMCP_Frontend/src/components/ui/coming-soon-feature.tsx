'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, Users, Clock, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// MARK: - Types

interface FeedbackStats {
    total_feedback: number;
    total_thumbs_up: number;
    total_thumbs_down: number;
    thumbs_up_percentage: number;
    user_has_voted: boolean;
    user_vote?: boolean;
}

interface ComingSoonFeatureProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    className?: string;
    showDetailedStats?: boolean;
}

// MARK: - Coming Soon Feature Component

/**
 * Reusable component for showing coming soon features with thumbs up feedback
 */
export function ComingSoonFeature({
    title,
    description,
    icon,
    className = '',
    showDetailedStats = false
}: ComingSoonFeatureProps) {
    const [stats, setStats] = useState<FeedbackStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // MARK: - Load feedback statistics

    /**
     * Loads the current feedback statistics from the API
     */
    const loadStats = async () => {
        try {
            const response = await fetch('/api/api-key-feedback');
            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            } else {
                console.error('Failed to load feedback stats');
            }
        } catch (error) {
            console.error('Error loading feedback stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load stats on component mount
    useEffect(() => {
        loadStats();
    }, []);

    // MARK: - Handle thumbs up/down

    /**
     * Handles submitting feedback (thumbs up/down)
     */
    const handleFeedback = async (thumbsUp: boolean) => {
        if (stats?.user_has_voted) {
            toast({
                title: "Already voted",
                description: "You have already provided feedback for this feature.",
                variant: "default",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/api-key-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    thumbs_up: thumbsUp,
                    feedback_message: `User ${thumbsUp ? 'is excited' : 'has concerns'} about API key feature`
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
                toast({
                    title: "Thank you!",
                    description: thumbsUp 
                        ? "Thanks for the positive feedback! We'll prioritize this feature."
                        : "Thanks for the feedback. We'll take your concerns into consideration.",
                    variant: "default",
                });
            } else {
                const errorData = await response.json();
                if (response.status === 409) {
                    toast({
                        title: "Already voted",
                        description: "You have already provided feedback for this feature.",
                        variant: "default",
                    });
                } else {
                    throw new Error(errorData.error || 'Failed to submit feedback');
                }
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast({
                title: "Error",
                description: "Failed to submit feedback. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // MARK: - Helper functions

    /**
     * Gets the appropriate badge variant based on user vote status
     */
    const getBadgeVariant = () => {
        if (!stats?.user_has_voted) return 'secondary';
        return stats.user_vote ? 'default' : 'destructive';
    };

    /**
     * Gets the badge text based on user vote status
     */
    const getBadgeText = () => {
        if (!stats?.user_has_voted) return 'Coming Soon';
        return stats.user_vote ? 'You liked this' : 'You didn\'t like this';
    };

    return (
        <Card className={`relative overflow-hidden ${className}`}>
            {/* Coming Soon Overlay */}
            <div className="absolute top-0 right-0 z-10">
                <Badge variant={getBadgeVariant()} className="rounded-none rounded-bl-lg">
                    <Clock className="h-3 w-3 mr-1" />
                    {getBadgeText()}
                </Badge>
            </div>

            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    {icon}
                    {title}
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                </CardTitle>
                <CardDescription>
                    {description}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Feature Coming Soon Message */}
                <div className="text-center py-6 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">Feature In Development</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        We&apos;re working hard to bring you this feature. Let us know if you&apos;re excited about it!
                    </p>

                    {/* Feedback Buttons */}
                    <div className="flex items-center justify-center gap-3">
                        <Button
                            onClick={() => handleFeedback(true)}
                            disabled={isSubmitting || stats?.user_has_voted}
                            variant={stats?.user_vote === true ? "default" : "outline"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <ThumbsUp className="h-4 w-4" />
                            {stats?.user_vote === true ? 'Liked' : 'Excited'}
                        </Button>
                        
                        <Button
                            onClick={() => handleFeedback(false)}
                            disabled={isSubmitting || stats?.user_has_voted}
                            variant={stats?.user_vote === false ? "destructive" : "outline"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <ThumbsDown className="h-4 w-4" />
                            {stats?.user_vote === false ? 'Not interested' : 'Not needed'}
                        </Button>
                    </div>
                </div>

                {/* Community Interest Stats */}
                {!isLoading && stats && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Community Interest</span>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                    {stats.total_feedback} {stats.total_feedback === 1 ? 'person' : 'people'} voted
                                </span>
                            </div>
                        </div>

                        {stats.total_feedback > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-600 flex items-center gap-1">
                                        <ThumbsUp className="h-3 w-3" />
                                        {stats.total_thumbs_up} excited
                                    </span>
                                    <span className="text-muted-foreground">
                                        {Math.round(stats.thumbs_up_percentage)}% positive
                                    </span>
                                </div>
                                
                                {/* Progress bar */}
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div 
                                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                                        style={{ width: `${stats.thumbs_up_percentage}%` }}
                                    />
                                </div>

                                {showDetailedStats && (
                                    <div className="text-xs text-muted-foreground text-center">
                                        {stats.total_thumbs_down} not interested
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {isLoading && (
                    <div className="text-center text-sm text-muted-foreground">
                        Loading community feedback...
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 