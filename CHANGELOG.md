# Changelog

All notable changes to the LegisMCP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation consolidation and organization
- Moved service-specific documentation to respective docs folders
- Created unified changelog to track project evolution

## [1.3.0] - 2025-07-21

### Changed
- **Breaking**: Migrated from `@cloudflare/workers-types` to generated runtime types for better type safety
- Updated pricing structure to match new subscription plans
- Improved API response structure for bill subresources (actions, text, cosponsors, committees, amendments, related bills, subjects, summaries)

### Added
- Production API URL documentation (`https://api.example.com`)
- Comprehensive database documentation with `user_subscription_details` view

### Fixed
- API response structure consistency across all bill subresources
- Database schema synchronization between local and remote environments

## [1.2.0] - 2025-07-18

### Changed
- **Major**: Migrated authentication from Auth0 SDK to Auth.js (NextAuth) for better integration
- Complete subscription data flow between frontend and backend services
- Enhanced mobile UI responsiveness

### Added
- API Key Feedback feature for user experience improvement
- "Coming Soon" features in dashboard for future development
- User account deletion functionality with proper subscription cleanup
- Debug logging in development mode for authentication

### Fixed
- Auth0 client ID configuration in wrangler
- NextAuth callback error handling
- Build issues with authentication migration
- Conflicting vercel.json configurations

### Removed
- Legacy Auth0 integration components
- Duplicate authentication dependencies

## [1.1.0] - 2025-07-17

### Added
- **Admin Dashboard**: Comprehensive admin panel with user management and analytics
- **Analytics Integration**: Event tracking and form submission analytics
- **Rate Limiting**: Improved rate limiting logic with better error handling
- **Zod Validation**: Schema validation for API endpoints
- **User Activity Tracking**: Monitor user behavior and API usage
- **Landing Page Redesign**: Modern, responsive landing page design

### Changed
- Migrated back to Vercel for frontend hosting
- Refactored authentication to use next-auth throughout
- Updated logo and branding
- Enhanced error handling across all services

### Database Changes
- Added user roles system (user, admin, super_admin)
- Added subscription billing cycle tracking
- Added comprehensive monitoring events table
- Added sessions table for better session management
- Added API key feedback table for user feedback

## [1.0.0] - 2025-07-16

### Initial Release
- **LegisAPI**: Protected REST API for congress.gov data
- **LegisMCP Server**: Model Context Protocol server for AI agents
- **LegisMCP Frontend**: Full-featured SaaS platform
- **Authentication**: Auth0 integration with JWT tokens
- **Payments**: Stripe subscription management
- **Database**: Cloudflare D1 for user management
- **MCP Tools**: Comprehensive legislative research tools

### Core Features
- Bill analysis and tracking
- Member search and details
- Committee information
- Vote tracking
- Trending bills analysis
- Natural language congressional queries
- OAuth2/OIDC authentication flow
- Tiered subscription plans (Free, Developer, Professional, Enterprise)
- API usage tracking and limits
- Real-time legislative data from congress.gov

### Infrastructure
- Cloudflare Workers for backend services
- Cloudflare Pages for frontend hosting
- Cloudflare D1 for database
- Cloudflare KV for caching
- Cloudflare Analytics Engine for monitoring
- Durable Objects for session management

## Migration History

### Database Migrations
1. **001_add_user_roles.sql** - Added role-based access control
2. **002_add_subscription_billing_cycle.sql** - Added billing cycle tracking
3. **003_add_monitoring_events.sql** - Added system monitoring capabilities
4. **004_add_sessions_table.sql** - Added session management
5. **005_add_api_key_feedback_table.sql** - Added user feedback system

---

## Notes

- The project follows a microservices architecture with three main components
- All services use Cloudflare infrastructure for global edge deployment
- Authentication is centralized through Auth0 with JWT tokens
- Database access is exclusively through LegisAPI for security
- MCP protocol enables AI agent integration
