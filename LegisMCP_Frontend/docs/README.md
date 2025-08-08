# LegisMCP Frontend Documentation

## Overview

LegisMCP Frontend is a modern Next.js 14 application that provides a user-friendly interface for accessing legislative data through the MCP server. It features Auth0 authentication, Stripe subscription management, and a responsive design.

**Production URL**: `https://app.example.com`

## Table of Contents

1. [Configuration](./configuration.md) - Environment setup and Auth0/Stripe configuration
2. [Authentication](./authentication.md) - Auth.js (NextAuth) implementation
3. [Payments](./payments.md) - Stripe integration and subscription management
4. [Components](./components.md) - UI component library and patterns
5. [Development](./development.md) - Local development setup
6. [Deployment](./deployment.md) - Production deployment guides
7. [Admin Setup](./admin-setup.md) - Admin user configuration

## Key Features

- **Modern Stack**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Authentication**: Auth0 integration via Auth.js (NextAuth)
- **Payments**: Stripe subscription with usage-based billing
- **UI/UX**: Radix UI components with custom theming
- **Real-time**: SSE integration for live updates
- **Analytics**: User tracking and usage monitoring
- **Admin Panel**: User management and system monitoring

## Architecture

```
User Browser → Next.js Frontend → API Routes → MCP Server → LegisAPI
                     ↓                   ↓
                  Auth0              Stripe Webhooks
```

## Quick Start

1. Clone and install:
```bash
cd LegisMCP_Frontend
npm install
```

2. Configure environment:
```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

3. Run development server:
```bash
npm run dev  # Runs on http://localhost:3000
```

## Project Structure

```
LegisMCP_Frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   ├── (auth)/             # Auth-protected pages
│   │   ├── dashboard/          # User dashboard
│   │   ├── admin/              # Admin panel
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── auth/               # Authentication components
│   │   ├── dashboard/          # Dashboard components
│   │   ├── layout/             # Layout components
│   │   ├── sections/           # Landing page sections
│   │   └── ui/                 # Reusable UI components
│   ├── lib/                    # Utilities and configurations
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # TypeScript definitions
├── public/                     # Static assets
└── docs/                       # Documentation
```

## Tech Stack

### Core Framework
- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **TypeScript 5**: Type safety

### Styling
- **Tailwind CSS**: Utility-first CSS
- **Radix UI**: Unstyled component primitives
- **Lucide Icons**: Icon library
- **class-variance-authority**: Component variants

### Authentication & Payments
- **Auth.js (NextAuth)**: Authentication framework
- **Auth0**: Identity provider
- **Stripe**: Payment processing

### Data & State
- **React Hook Form**: Form management
- **Zod**: Schema validation
- **React Query**: Server state management (optional)

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks

## Key Components

### Authentication
- User login/logout flows
- Protected routes and middleware
- Session management
- Role-based access control

### Dashboard
- MCP tool integration
- Usage statistics
- API key management
- Billing information

### Admin Panel
- User management
- System monitoring
- Analytics dashboard
- Configuration management

### UI Components
- Toast notifications
- Modal dialogs
- Form components
- Data tables
- Charts and graphs

## Performance

- Server-side rendering for SEO
- Static generation where possible
- Code splitting and lazy loading
- Image optimization
- Font optimization

## Security

- CSRF protection
- XSS prevention
- Secure headers
- Input validation
- API rate limiting

For detailed information, see the individual documentation pages.