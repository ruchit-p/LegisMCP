# LegisMCP - Legislative Data Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

LegisMCP is a comprehensive legislative data platform that provides real-time access to U.S. legislative data from congress.gov through a modern SaaS architecture with AI agent integration via the Model Context Protocol (MCP).

## 🚀 Features

- **Real-time Legislative Data**: Access bills, members, committees, votes, and more from congress.gov
- **AI Agent Integration**: MCP server enables AI agents to perform legislative research
- **Tiered Subscriptions**: Free, Developer ($19/mo), Professional ($49/mo), Enterprise ($199/mo)
- **Secure Authentication**: Auth0 integration with JWT tokens and OAuth2/OIDC
- **Usage Analytics**: Comprehensive tracking and monitoring
- **Global Edge Deployment**: Powered by Cloudflare Workers for low latency
- **Admin Dashboard**: User management, analytics, and system monitoring

## 📋 Architecture

The platform consists of three integrated services:

1. **LegisAPI** - Protected REST API service (Port 8789)
   - Direct interface with congress.gov
   - JWT authentication with Auth0
   - D1 database for user management
   - Usage tracking and rate limiting

2. **LegisMCP Server** - MCP Protocol server (Port 8788)
   - OAuth2 authentication flow
   - AI agent tool integration
   - Durable Objects for session management
   - Natural language query processing

3. **LegisMCP Frontend** - Next.js SaaS platform (Port 3000)
   - User dashboard and billing
   - Stripe subscription management
   - Auth.js (NextAuth) authentication
   - Admin panel for management

## 🛠️ Tech Stack

- **Backend**: Cloudflare Workers, Durable Objects, D1 Database
- **Frontend**: Next.js 14, React, Tailwind CSS, Radix UI
- **Authentication**: Auth0, Auth.js (NextAuth)
- **Payments**: Stripe
- **Language**: TypeScript
- **Deployment**: Cloudflare Pages & Workers

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account
- Auth0 account
- Stripe account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/LegisMCP.git
cd LegisMCP
```

2. Install dependencies for all services:
```bash
# Install root dependencies
npm install

# Install service dependencies
cd LegisAPI && npm install && cd ..
cd LegisMCP_Server && npm install && cd ..
cd LegisMCP_Frontend && npm install && cd ..
```

3. Set up environment variables (see [Configuration](#configuration))

4. Set up the database:
```bash
cd LegisAPI
wrangler d1 create legis-db
wrangler d1 execute legis-db --file=./schema.sql

# Run migrations
for file in ./migrations/*.sql; do
  wrangler d1 execute legis-db --file="$file"
done
```

5. Start development servers:
```bash
# Terminal 1 - LegisAPI
cd LegisAPI && npm run dev

# Terminal 2 - MCP Server  
cd LegisMCP_Server && npm run dev

# Terminal 3 - Frontend
cd LegisMCP_Frontend && npm run dev
```

### Configuration

See individual service documentation:
- [LegisAPI Configuration](./LegisAPI/docs/configuration.md)
- [MCP Server Configuration](./LegisMCP_Server/docs/configuration.md)
- [Frontend Configuration](./LegisMCP_Frontend/docs/configuration.md)

## 📚 Documentation

- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [MCP Tools Reference](./docs/mcp-tools.md)
- [Database Schema](./docs/database.md)
- [Deployment Guide](./docs/deployment.md)
- [Security Guide](./docs/security.md)
- [Changelog](./CHANGELOG.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Deploy to Cloudflare:

```bash
# Deploy all services
npm run deploy:all

# Or deploy individually
cd LegisAPI && npm run deploy
cd LegisMCP_Server && npm run deploy
cd LegisMCP_Frontend && npm run cf:deploy
```

See [Deployment Guide](./docs/deployment.md) for detailed instructions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Congress.gov for legislative data
- Cloudflare for infrastructure
- Auth0 for authentication
- Stripe for payment processing

## 📞 Support

- Documentation: [docs.example.com](https://docs.example.com)
- Issues: [GitHub Issues](https://github.com/yourusername/LegisMCP/issues)
- Email: contact@example.com

---

**Production API**: `https://api.example.com`

*Built with ❤️ for legislative transparency and AI-powered research*