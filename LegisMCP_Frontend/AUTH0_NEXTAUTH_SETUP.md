# Auth0 + NextAuth.js Setup Guide

This guide explains how to configure Auth0 with NextAuth.js for your Vercel deployment.

## 🚀 Quick Setup Overview

Your app uses **NextAuth.js with Auth0 provider** for authentication. This provides:

- ✅ Server-side session management
- ✅ Automatic token handling
- ✅ Built-in CSRF protection
- ✅ Easy integration with Next.js API routes

## 📋 **Required Environment Variables for Vercel**

### **1. NextAuth.js Core Variables**

```bash
NEXTAUTH_SECRET=<generate-with-openssl-rand-hex-32>
NEXTAUTH_URL=https://your-app-name.vercel.app
```

### **2. Auth0 Application Credentials**

```bash
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your_regular_web_app_client_id
AUTH0_CLIENT_SECRET=your_regular_web_app_client_secret
```

### **3. Auth0 Machine-to-Machine (for server operations)**

```bash
AUTH0_M2M_CLIENT_ID=your_m2m_client_id
AUTH0_M2M_CLIENT_SECRET=your_m2m_client_secret
```

### **4. Public Auth0 Variables (for frontend)**

```bash
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_regular_web_app_client_id
NEXT_PUBLIC_AUTH0_AUDIENCE=urn:legis-api
```

## 🔧 **Auth0 Dashboard Configuration**

### **Step 1: Create Regular Web Application**

1. **Go to Auth0 Dashboard** → Applications → Create Application
2. **Choose:** "Regular Web Applications" (NOT Single Page Application)
3. **Name:** "LegisMCP Frontend" or similar
4. **Technology:** Next.js

### **Step 2: Configure Application Settings**

In your Auth0 application settings:

#### **Basic Information**

- Copy **Client ID** → use for `AUTH0_CLIENT_ID` and `NEXT_PUBLIC_AUTH0_CLIENT_ID`
- Copy **Client Secret** → use for `AUTH0_CLIENT_SECRET`
- Copy **Domain** → use for Auth0 domain variables

#### **Application URIs**

For Vercel deployment, update these URLs:

**Allowed Callback URLs:**

```
https://your-app-name.vercel.app/api/auth/callback/auth0,
http://localhost:3000/api/auth/callback/auth0
```

**Allowed Logout URLs:**

```
https://your-app-name.vercel.app,
http://localhost:3000
```

**Allowed Web Origins:**

```
https://your-app-name.vercel.app,
http://localhost:3000
```

#### **Advanced Settings**

- **Grant Types:** Ensure "Authorization Code" is enabled
- **Token Endpoint Authentication Method:** "Post"

### **Step 3: Create Machine-to-Machine Application**

1. **Create M2M App:** Applications → Create Application → Machine to Machine
2. **Authorize APIs:** Select your API (`urn:legis-api`)
3. **Scopes:** Grant necessary permissions for user management
4. **Copy Credentials:** Use for `AUTH0_M2M_CLIENT_ID` and `AUTH0_M2M_CLIENT_SECRET`

### **Step 4: Create/Configure API**

1. **Go to APIs** → Create API (if not exists)
2. **Identifier:** `urn:legis-api` (must match `NEXT_PUBLIC_AUTH0_AUDIENCE`)
3. **Signing Algorithm:** RS256

## 🔑 **Setting Variables in Vercel**

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add each variable** with appropriate values:
   - Set environment to "Production, Preview, Development"
   - Mark sensitive variables as **encrypted**

### **Priority Order for Setup:**

```bash
# 1. Essential for basic auth (5 variables)
NEXTAUTH_SECRET=<generate-new>
NEXTAUTH_URL=https://your-app.vercel.app
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=<from-regular-web-app>
AUTH0_CLIENT_SECRET=<from-regular-web-app>

# 2. Required for frontend (3 variables)
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=<same-as-AUTH0_CLIENT_ID>
NEXT_PUBLIC_AUTH0_AUDIENCE=urn:legis-api

# 3. Required for admin/webhook features (2 variables)
AUTH0_M2M_CLIENT_ID=<from-m2m-app>
AUTH0_M2M_CLIENT_SECRET=<from-m2m-app>
```

## 🧪 **Testing Authentication**

### **After Deployment:**

1. **Visit your Vercel app** → Click "Login"
2. **Should redirect** to Auth0 Universal Login
3. **After login** → Should redirect back to your app
4. **Check session** → User info should display in header

### **Troubleshooting Common Issues:**

#### **Login Redirect Fails**

- ✅ Check callback URLs in Auth0 match your Vercel domain exactly
- ✅ Ensure `NEXTAUTH_URL` matches your deployed domain
- ✅ Verify application is "Regular Web Application" not SPA

#### **"Invalid Request" Error**

- ✅ Check `AUTH0_ISSUER_BASE_URL` includes `https://`
- ✅ Verify `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET` are from same app
- ✅ Ensure NEXTAUTH_SECRET is set and sufficiently long

#### **Session Not Persisting**

- ✅ Check `NEXTAUTH_SECRET` is set in production
- ✅ Verify domain settings don't have conflicts
- ✅ Check browser cookies are not being blocked

## 📱 **Login Flow**

Your users will experience:

1. **Click "Login"** → Redirects to Auth0 Universal Login
2. **Auth0 Login Page** → Enter credentials or sign up
3. **Redirect to App** → Back to your app with session established
4. **Authenticated State** → User dropdown shows profile

## 🔐 **Security Best Practices**

- ✅ Use strong `NEXTAUTH_SECRET` (32+ characters)
- ✅ Keep Auth0 secrets encrypted in Vercel
- ✅ Restrict callback URLs to your domains only
- ✅ Enable security features in Auth0 dashboard
- ✅ Monitor Auth0 logs for suspicious activity

## 📞 **Support**

If you encounter issues:

1. Check Vercel function logs for error details
2. Check Auth0 dashboard logs for authentication errors
3. Verify all environment variables are set correctly
4. Ensure Auth0 application type is "Regular Web Application"

Your authentication is now ready for production! 🎉
