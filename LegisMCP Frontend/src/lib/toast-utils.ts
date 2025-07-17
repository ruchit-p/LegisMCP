import { toast } from "@/hooks/use-toast"

// Utility functions for common toast patterns
export const notifications = {
  // Authentication related
  auth: {
    signInSuccess: () => toast({
      title: "Welcome back!",
      description: "You have been successfully signed in.",
      variant: "success",
    }),
    signInError: (error?: string) => toast({
      title: "Sign in failed",
      description: error || "Please check your credentials and try again.",
      variant: "destructive",
    }),
    signOutSuccess: () => toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
      variant: "default",
    }),
  },

  // Subscription related
  subscription: {
    upgraded: (plan: string) => toast({
      title: "Plan upgraded!",
      description: `You've successfully upgraded to ${plan}. Enjoy your new features!`,
      variant: "success",
    }),
    downgraded: (plan: string) => toast({
      title: "Plan changed",
      description: `Your plan has been changed to ${plan}.`,
      variant: "default",
    }),
    cancelled: () => toast({
      title: "Subscription cancelled",
      description: "Your subscription has been cancelled. You'll retain access until the end of your billing period.",
      variant: "warning",
    }),
    paymentFailed: () => toast({
      title: "Payment failed",
      description: "We couldn't process your payment. Please update your payment method.",
      variant: "destructive",
    }),
  },

  // API related
  api: {
    searchSuccess: (count: number) => toast({
      title: "Search completed",
      description: `Found ${count} results for your query.`,
      variant: "success",
    }),
    searchError: () => toast({
      title: "Search failed",
      description: "Unable to complete your search. Please try again.",
      variant: "destructive",
    }),
    rateLimitExceeded: () => toast({
      title: "Rate limit exceeded",
      description: "You've reached your API limit. Consider upgrading your plan for higher limits.",
      variant: "warning",
    }),
    dataUpdated: () => toast({
      title: "Data updated",
      description: "Your settings have been saved successfully.",
      variant: "success",
    }),
  },

  // General purpose
  general: {
    success: (title: string, description?: string) => toast({
      title,
      description,
      variant: "success",
    }),
    error: (title: string, description?: string) => toast({
      title,
      description,
      variant: "destructive",
    }),
    warning: (title: string, description?: string) => toast({
      title,
      description,
      variant: "warning",
    }),
    info: (title: string, description?: string) => toast({
      title,
      description,
      variant: "default",
    }),
  },

  // Copy to clipboard
  clipboard: {
    success: (item: string = "content") => toast({
      title: "Copied!",
      description: `${item} has been copied to your clipboard.`,
      variant: "success",
    }),
    error: () => toast({
      title: "Copy failed",
      description: "Unable to copy to clipboard. Please try again.",
      variant: "destructive",
    }),
  },

  // Form related
  form: {
    validationError: (field?: string) => toast({
      title: "Validation error",
      description: field ? `Please check the ${field} field.` : "Please check your input and try again.",
      variant: "destructive",
    }),
    submitSuccess: (action: string = "form") => toast({
      title: "Success!",
      description: `Your ${action} has been submitted successfully.`,
      variant: "success",
    }),
    submitError: (action: string = "form") => toast({
      title: "Submission failed",
      description: `Unable to submit your ${action}. Please try again.`,
      variant: "destructive",
    }),
  },
}

// Export individual toast function for direct use
export { toast } 