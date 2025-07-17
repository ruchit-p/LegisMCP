# LegislativeMCP Frontend

A modern Next.js frontend for the LegislativeMCP Legislative MCP Server platform with Auth0 authentication, Stripe payments, and real-time data streaming.

## Features

- 🔐 **Auth0 Authentication** - Secure user authentication and authorization
- 💳 **Stripe Integration** - Subscription management and payments
- 🎨 **Modern UI/UX** - Built with Tailwind CSS and Radix UI components
- 🌙 **Dark/Light Mode** - Automatic theme switching
- 📱 **Responsive Design** - Mobile-first responsive layout
- ⚡ **Real-time Updates** - SSE integration with MCP server
- 🔍 **Advanced Search** - Legislative data search and analysis
- 📊 **Analytics Dashboard** - Usage tracking and insights

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives
- **Authentication**: Auth0 for Next.js
- **Payments**: Stripe React components
- **State Management**: React hooks and context
- **Type Safety**: TypeScript throughout
- **Icons**: Lucide React

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── globals.css         # Global styles and Tailwind imports
│   │   ├── layout.tsx          # Root layout with providers
│   │   └── page.tsx            # Homepage
│   ├── components/             # React components
│   │   ├── layout/             # Layout components (header, footer)
│   │   ├── providers/          # Context providers (theme, Stripe)
│   │   ├── sections/           # Page sections (hero, features, pricing)
│   │   └── ui/                 # Reusable UI components
│   ├── lib/                    # Utility functions
│   │   └── utils.ts            # Common utilities (cn function, etc.)
│   └── types/                  # TypeScript type definitions
├── package.json                # Dependencies and scripts
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── postcss.config.js           # PostCSS configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Auth0 account and application
- Stripe account and API keys
- Running MCP server (see backend documentation)

### Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Auth0 Configuration
AUTH0_SECRET='your-auth0-secret'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-domain.auth0.com'
AUTH0_CLIENT_ID='your-auth0-client-id'
AUTH0_CLIENT_SECRET='your-auth0-client-secret'

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_...'

# MCP Server Configuration
NEXT_PUBLIC_MCP_SERVER_URL='http://localhost:8080'
```

### Installation

1. **Install dependencies**:

   ```bash
   cd frontend
   npm install
   ```

2. **Run development server**:

   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Component Architecture

### Layout Components

- **Header** - Navigation with Auth0 integration and user menu
- **Footer** - Links and company information
- **Providers** - Context providers for theme and Stripe

### Page Sections

- **HeroSection** - Landing page hero with CTA
- **FeaturesSection** - Platform capabilities showcase
- **PricingSection** - Subscription tiers and pricing
- **TestimonialsSection** - User testimonials
- **CTASection** - Call-to-action for conversion

### UI Components

- **Button** - Reusable button with variants
- **Avatar** - User profile pictures
- **DropdownMenu** - Context menus and dropdowns
- **ThemeToggle** - Dark/light mode switcher
- **Toast** - Notification system with multiple variants

#### Toast System

The application uses Radix UI's toast system with custom styling:

```tsx
import { useToast } from "@/hooks/use-toast";
import { notifications } from "@/lib/toast-utils";

// Basic usage
const { toast } = useToast();
toast({
  title: "Success!",
  description: "Your action was completed.",
  variant: "success",
});

// Using predefined notifications
notifications.auth.signInSuccess();
notifications.api.searchSuccess(42);
notifications.general.error("Custom Error", "Error details");
```

**Available variants:**

- `default` - Standard information toasts
- `success` - Success confirmations (green)
- `destructive` - Error messages (red)
- `warning` - Warning notifications (yellow)

**Features:**

- Auto-dismiss with configurable duration
- Action buttons for user interaction
- Swipe to dismiss on mobile
- Accessible with screen readers
- Consistent with design system

## Styling

### Design System

The application uses a modern design system built with Tailwind CSS:

- **Colors**: Semantic color palette with light/dark mode support
- **Typography**: Inter font with consistent sizing scale
- **Spacing**: 4px base unit with consistent spacing scale
- **Shadows**: Subtle elevation system
- **Borders**: Consistent border radius and colors

### Custom CSS Classes

- `.legislative-data` - Monospace styling for API data
- `.bill-status` - Styled status badges for bills
- `.tier-badge` - Subscription tier indicators
- `.usage-progress` - Usage tracking progress bars
- `.api-response` - Formatted API response display

## Authentication Flow

1. **Login/Signup** - Redirect to Auth0 universal login
2. **Callback** - Auth0 handles callback and sets session
3. **Session Management** - Automatic token refresh
4. **Protected Routes** - Server-side session validation
5. **Logout** - Clear session and redirect

## Stripe Integration

### Subscription Flow

1. **Plan Selection** - User chooses subscription tier
2. **Checkout** - Redirect to Stripe Checkout
3. **Webhook Processing** - Server handles subscription events
4. **Dashboard Updates** - Real-time subscription status

### Components

- **PricingSection** - Plans display and selection
- **Billing Dashboard** - Subscription management
- **Usage Tracking** - API usage monitoring

## MCP Server Integration

### Real-time Features

- **SSE Connection** - Server-sent events for live updates
- **API Calls** - Authenticated requests to MCP server
- **Error Handling** - Graceful error states and retries
- **Rate Limiting** - Usage-based access control

### Tools Available

- **Legislative Search** - Advanced search across all data
- **Bill Analysis** - Comprehensive bill insights
- **Member Profiles** - Detailed member information
- **Trending Bills** - Popular and active legislation

## Deployment

### Vercel (Recommended)

1. **Connect Repository** - Link GitHub repository to Vercel
2. **Environment Variables** - Add environment variables in dashboard
3. **Build Settings** - Configure build and output settings
4. **Custom Domain** - Set up custom domain and SSL

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- **Netlify** - Static site generation with serverless functions
- **AWS Amplify** - Full-stack deployment with CI/CD
- **Railway** - Simple deployment with database integration
- **Docker** - Containerized deployment

## Development Guidelines

### Code Organization

- **Components** - One component per file, named exports
- **Hooks** - Custom hooks in separate files
- **Utils** - Pure functions for reusable logic
- **Types** - Comprehensive TypeScript definitions

### Best Practices

- **Accessibility** - ARIA labels and semantic HTML
- **Performance** - Code splitting and lazy loading
- **SEO** - Meta tags and structured data
- **Security** - Input validation and XSS prevention

### Testing Strategy

- **Unit Tests** - Component and utility testing
- **Integration Tests** - User flow testing
- **E2E Tests** - Full application testing
- **Visual Regression** - UI consistency testing

## Contributing

1. **Fork the repository**
2. **Create a feature branch** - `git checkout -b feature/amazing-feature`
3. **Commit your changes** - `git commit -m 'Add amazing feature'`
4. **Push to the branch** - `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## Support
- **Email** - Contact us at contact@example.com
