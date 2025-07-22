# Component Library Documentation

## Overview

LegisMCP Frontend uses a modern component architecture built with React, TypeScript, and Radix UI primitives. All components follow consistent patterns for styling, accessibility, and reusability.

## UI Components

### Button

**Location**: `components/ui/button.tsx`

Versatile button component with multiple variants and sizes.

```tsx
import { Button } from '@/components/ui/button';

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>
```

### Card

**Location**: `components/ui/card.tsx`

Container component for grouped content.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Dialog

**Location**: `components/ui/dialog.tsx`

Modal dialog for important interactions.

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <div>Dialog content</div>
  </DialogContent>
</Dialog>
```

### Toast

**Location**: `components/ui/toast.tsx`

Notification system with variants.

```tsx
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

// Success
toast({
  title: "Success!",
  description: "Your action was completed.",
  variant: "success",
});

// Error
toast({
  title: "Error",
  description: "Something went wrong.",
  variant: "destructive",
});

// With action
toast({
  title: "Undo action",
  action: {
    label: "Undo",
    onClick: () => console.log("Undo"),
  },
});
```

### Form Components

**Location**: `components/ui/form.tsx`

Integrated with React Hook Form.

```tsx
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input placeholder="email@example.com" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

### Select

**Location**: `components/ui/select.tsx`

Accessible dropdown select.

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Table

**Location**: `components/ui/table.tsx`

Responsive data table.

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>Active</TableCell>
      <TableCell>
        <Button size="sm">Edit</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Dashboard Components

### MCP Tools

**Location**: `components/dashboard/mcp-tools.tsx`

Interface for legislative data tools.

```tsx
import { MCPTools } from '@/components/dashboard/mcp-tools';

<MCPTools userId={session.user.id} />
```

Available tools:
- Bill Search
- Member Lookup
- Committee Information
- Voting Records
- Trending Analysis

### Usage Stats

**Location**: `components/dashboard/usage-stats.tsx`

Displays API usage metrics.

```tsx
import { UsageStats } from '@/components/dashboard/usage-stats';

<UsageStats
  used={1250}
  limit={5000}
  resetDate="2025-02-01"
/>
```

### Billing Info

**Location**: `components/dashboard/billing-info.tsx`

Subscription and payment management.

```tsx
import { BillingInfo } from '@/components/dashboard/billing-info';

<BillingInfo
  plan="Professional"
  status="active"
  nextBillingDate="2025-02-01"
/>
```

## Layout Components

### Navbar

**Location**: `components/layout/navbar.tsx`

Main navigation with auth integration.

```tsx
import { Navbar } from '@/components/layout/navbar';

<Navbar />
```

Features:
- Responsive mobile menu
- User authentication state
- Theme toggle
- User dropdown menu

### Footer

**Location**: `components/layout/footer.tsx`

Site footer with links.

```tsx
import { Footer } from '@/components/layout/footer';

<Footer />
```

### Page Layout

**Location**: `components/layout/page-layout.tsx`

Consistent page wrapper.

```tsx
import { PageLayout } from '@/components/layout/page-layout';

<PageLayout
  title="Page Title"
  description="Page description"
>
  {children}
</PageLayout>
```

## Section Components

### Hero Section

**Location**: `components/sections/hero-section.tsx`

Landing page hero.

```tsx
import { HeroSection } from '@/components/sections/hero-section';

<HeroSection
  title="Welcome to LegisMCP"
  subtitle="AI-powered legislative intelligence"
  ctaText="Get Started"
  ctaHref="/signup"
/>
```

### Features Section

**Location**: `components/sections/features-section.tsx`

Feature showcase grid.

```tsx
import { FeaturesSection } from '@/components/sections/features-section';

<FeaturesSection features={[
  {
    icon: <SearchIcon />,
    title: "Advanced Search",
    description: "Search across all legislative data"
  },
  // more features...
]} />
```

### Pricing Section

**Location**: `components/sections/pricing-section.tsx`

Subscription tiers display.

```tsx
import { PricingSection } from '@/components/sections/pricing-section';

<PricingSection
  plans={[
    {
      name: "Developer",
      price: 19,
      features: ["5,000 API calls", "Email support"],
      priceId: "price_developer"
    },
    // more plans...
  ]}
/>
```

## Utility Components

### Loading States

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

// Skeleton loader
<Skeleton className="h-4 w-[250px]" />
<Skeleton className="h-4 w-[200px]" />

// Spinner
<Spinner size="sm" />
<Spinner size="lg" />
```

### Empty States

```tsx
import { EmptyState } from '@/components/ui/empty-state';

<EmptyState
  icon={<InboxIcon />}
  title="No results found"
  description="Try adjusting your search criteria"
  action={
    <Button onClick={clearFilters}>Clear filters</Button>
  }
/>
```

### Error Boundary

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary fallback={<ErrorFallback />}>
  <YourComponent />
</ErrorBoundary>
```

## Component Patterns

### Composition

```tsx
// Compound components
export const Card = ({ children }) => <div>{children}</div>;
Card.Header = ({ children }) => <div>{children}</div>;
Card.Body = ({ children }) => <div>{children}</div>;
Card.Footer = ({ children }) => <div>{children}</div>;

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

### Render Props

```tsx
interface RenderPropComponentProps {
  render: (data: Data) => React.ReactNode;
}

export function DataProvider({ render }: RenderPropComponentProps) {
  const data = useData();
  return <>{render(data)}</>;
}
```

### Custom Hooks

```tsx
// hooks/use-debounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}
```

## Styling Guidelines

### Using Tailwind CSS

```tsx
// Utility-first approach
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  Content
</div>

// Using cn() for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  "p-4 rounded-lg",
  isActive && "bg-blue-500",
  isDisabled && "opacity-50 cursor-not-allowed"
)} />
```

### Component Variants with CVA

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-input bg-background",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);
```

## Accessibility

### ARIA Labels

```tsx
<Button aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</Button>

<Input
  aria-label="Search bills"
  aria-describedby="search-help"
/>
<span id="search-help" className="sr-only">
  Search by bill number or keyword
</span>
```

### Keyboard Navigation

```tsx
// Proper focus management
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [onClose]);
```

### Screen Reader Support

```tsx
// Announce dynamic changes
<div role="status" aria-live="polite" aria-atomic="true">
  {loading ? 'Loading results...' : `${results.length} results found`}
</div>

// Skip links
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

## Testing Components

### Unit Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Component Stories

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'ghost'],
    },
  },
};

export default meta;

export const Default: StoryObj<typeof Button> = {
  args: {
    children: 'Button',
  },
};
```