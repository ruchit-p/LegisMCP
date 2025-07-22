# Frontend Development Guide

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Auth0 account configured
- Stripe account (test mode)
- Running MCP Server and LegisAPI

## Local Development Setup

### 1. Install Dependencies

```bash
cd LegisMCP_Frontend
npm install
```

### 2. Environment Configuration

Create `.env.local` from template:

```bash
cp .env.local.example .env.local
```

Update with your development values:

```env
# Auth.js Configuration
AUTH0_SECRET='generate-32-char-random-string'
APP_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://dev-xyz.us.auth0.com'
AUTH0_CLIENT_ID='your-dev-client-id'
AUTH0_CLIENT_SECRET='your-dev-client-secret'

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_...'
STRIPE_SECRET_KEY='sk_test_...'
STRIPE_WEBHOOK_SECRET='whsec_...'

# Development URLs
NEXT_PUBLIC_BASE_URL='http://localhost:3000'
MCP_SERVER_URL='http://localhost:8788'
```

### 3. Start Development Server

```bash
# Start all services (in separate terminals)
cd ../LegisAPI && npm run dev        # Port 8789
cd ../LegisMCP_Server && npm run dev  # Port 8788
cd ../LegisMCP_Frontend && npm run dev # Port 3000
```

### 4. Test Stripe Webhooks

```bash
# In a new terminal
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Development Workflow

### Code Organization

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth-protected pages
│   ├── dashboard/         # User dashboard
│   └── admin/             # Admin panel
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── dashboard/        # Dashboard-specific
│   └── layout/           # Layout components
├── lib/                   # Utilities
│   ├── auth/             # Auth helpers
│   ├── stripe/           # Stripe helpers
│   └── utils/            # General utilities
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types
```

### Adding New Features

#### 1. Create New Page

```typescript
// app/features/new-feature/page.tsx
import { auth } from '@/lib/auth';

export default async function NewFeaturePage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1>New Feature</h1>
      {/* Your content */}
    </div>
  );
}
```

#### 2. Create API Route

```typescript
// app/api/new-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Your logic here
  return NextResponse.json({ data: 'success' });
}
```

#### 3. Create Component

```typescript
// components/features/new-component.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface NewComponentProps {
  title: string;
  onAction?: () => void;
}

export function NewComponent({ title, onAction }: NewComponentProps) {
  const [state, setState] = useState(false);
  
  return (
    <div className="p-4 border rounded-lg">
      <h3>{title}</h3>
      <Button onClick={onAction}>Action</Button>
    </div>
  );
}
```

### State Management

#### Using React Query

```typescript
// hooks/use-bills.ts
import { useQuery } from '@tanstack/react-query';
import { fetchBills } from '@/lib/api';

export function useBills(query?: string) {
  return useQuery({
    queryKey: ['bills', query],
    queryFn: () => fetchBills(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

#### Using Zustand (if needed)

```typescript
// store/user-store.ts
import { create } from 'zustand';

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
```

### Form Handling

#### Using React Hook Form + Zod

```typescript
// Example form component
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  email: z.string().email(),
  message: z.string().min(10),
});

type FormData = z.infer<typeof formSchema>;

export function ContactForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });
  
  const onSubmit = async (data: FormData) => {
    // Handle submission
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Testing

#### Unit Tests

```typescript
// components/__tests__/button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '../ui/button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

#### Integration Tests

```typescript
// app/api/__tests__/bills.test.ts
import { GET } from '../bills/route';

describe('Bills API', () => {
  it('returns 401 without auth', async () => {
    const response = await GET(new Request('http://localhost'));
    expect(response.status).toBe(401);
  });
});
```

### Performance Optimization

#### 1. Code Splitting

```typescript
// Dynamic imports
const DashboardCharts = dynamic(
  () => import('@/components/dashboard/charts'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
);
```

#### 2. Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>
```

#### 3. Memo and Callbacks

```typescript
const MemoizedComponent = memo(ExpensiveComponent);

const handleClick = useCallback(() => {
  // Handle click
}, [dependency]);
```

### Debugging

#### Enable Debug Mode

```env
# .env.local
NEXTAUTH_DEBUG=true
NEXT_PUBLIC_DEBUG=true
```

#### Use React DevTools

1. Install React Developer Tools extension
2. Use Profiler to identify performance issues
3. Inspect component props and state

#### Console Helpers

```typescript
// lib/debug.ts
export const debug = {
  log: (...args: any[]) => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('[DEBUG]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};
```

### Common Issues

#### 1. Hydration Errors

```typescript
// Use suppressHydrationWarning for dynamic content
<div suppressHydrationWarning>
  {new Date().toLocaleString()}
</div>

// Or use client-only rendering
'use client';
import { useEffect, useState } from 'react';

export function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  return children;
}
```

#### 2. TypeScript Errors

```typescript
// Ensure proper typing
declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string;
      email: string;
      stripeCustomerId?: string;
    }
  }
}
```

#### 3. Environment Variables

```typescript
// Always check for undefined
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error('API URL not configured');
}
```

## Best Practices

### 1. Component Guidelines

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic to custom hooks
- Use TypeScript for all components

### 2. Performance

- Lazy load heavy components
- Optimize images with Next.js Image
- Use React.memo for expensive renders
- Implement proper loading states

### 3. Security

- Never expose sensitive keys in client code
- Validate all user inputs
- Use CSRF protection for forms
- Implement proper authentication checks

### 4. Accessibility

- Use semantic HTML elements
- Add proper ARIA labels
- Ensure keyboard navigation
- Test with screen readers

## Development Tools

### VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript React code snippets
- Auto Rename Tag

### Browser Extensions

- React Developer Tools
- Redux DevTools (if using Redux)
- Stripe DevTools

### CLI Tools

```bash
# Check bundle size
npm run analyze

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```