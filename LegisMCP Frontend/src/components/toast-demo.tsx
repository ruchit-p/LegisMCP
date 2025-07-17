"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

export function ToastDemo() {
  const { toast } = useToast()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Button
          variant="outline"
          onClick={() => {
            toast({
              title: "Scheduled: Catch up",
              description: "Friday, February 10, 2023 at 5:57 PM",
            })
          }}
        >
          Show Toast
        </Button>
        
        <Button
          variant="outline"
          onClick={() => {
            toast({
              title: "Uh oh! Something went wrong.",
              description: "There was a problem with your request.",
              variant: "destructive",
            })
          }}
        >
          Show Error Toast
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            toast({
              title: "Success!",
              description: "Your action was completed successfully.",
              variant: "success",
            })
          }}
        >
          Show Success Toast
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            toast({
              title: "Warning",
              description: "Please review your input before proceeding.",
              variant: "warning",
            })
          }}
        >
          Show Warning Toast
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            toast({
              title: "Are you absolutely sure?",
              description: "This action cannot be undone. This will permanently delete your account and remove your data from our servers.",
              action: (
                <ToastAction altText="Goto schedule to undo">
                  Undo
                </ToastAction>
              ),
            })
          }}
        >
          Show Toast with Action
        </Button>
      </div>
    </div>
  )
}

// Utility functions for easier usage throughout the app
export const showToast = {
  success: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      variant: "success",
    })
  },
  error: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      variant: "destructive",
    })
  },
  warning: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      variant: "warning",
    })
  },
  info: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      variant: "default",
    })
  },
} 