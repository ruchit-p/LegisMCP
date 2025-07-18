#!/usr/bin/env tsx
/**
 * Admin Setup Script
 * 
 * This script helps you set up admin accounts using the backend API.
 * It uses Auth0 M2M tokens for authentication.
 * 
 * Usage: npm run setup-admin <email> <role>
 * 
 * Example:
 * npm run setup-admin admin@yourdomain.com admin
 * npm run setup-admin superuser@yourdomain.com super_admin
 */

// Helper function to get Auth0 M2M token
async function getM2MToken(): Promise<string> {
  // Use the exact environment variables from DEPLOYMENT_CHECKLIST.md
  const auth0IssuerUrl = process.env.AUTH0_ISSUER_BASE_URL || 'https://your-tenant.us.auth0.com';
  const m2mClientId = process.env.AUTH0_M2M_CLIENT_ID;
  const m2mClientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
  
  if (!m2mClientId || !m2mClientSecret) {
    throw new Error('Missing Auth0 M2M credentials. Please check your environment variables:\n' +
      '- AUTH0_M2M_CLIENT_ID\n' +
      '- AUTH0_M2M_CLIENT_SECRET\n' +
      'See DEPLOYMENT_CHECKLIST.md for configuration details.');
  }

  console.log('🔑 Getting Auth0 M2M token...');
  
  const tokenResponse = await fetch(`${auth0IssuerUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: m2mClientId,
      client_secret: m2mClientSecret,
      audience: (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com') + '/api',
      grant_type: 'client_credentials',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get M2M token: ${error}`);
  }

  const { access_token } = await tokenResponse.json();
  return access_token;
}

// Helper function to get user from backend
async function getUserFromBackend(email: string, accessToken: string) {
  const workerUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com') + '/api';
  
  const response = await fetch(`${workerUrl}/admin/users/email/${encodeURIComponent(email)}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (response.ok) {
    return await response.json();
  } else if (response.status === 404) {
    return null; // User not found
  } else {
    const error = await response.text();
    throw new Error(`Backend returned ${response.status}: ${error}`);
  }
}

// Helper function to update user role in backend
async function updateUserRoleInBackend(userId: string, role: string, accessToken: string) {
  const workerUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com') + '/api';
  
  const response = await fetch(`${workerUrl}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Backend returned ${response.status}: ${error}`);
  }

  return await response.json();
}

async function setupAdmin(email: string, role: 'admin' | 'super_admin') {
  try {
    console.log(`🚀 Setting up admin account for ${email} with role ${role}...`);
    
    // Get M2M token for authentication
    const accessToken = await getM2MToken();
    console.log('✅ Successfully obtained M2M token');
    
    // Check if user exists by email
    console.log(`🔍 Looking up user: ${email}`);
    const existingUser = await getUserFromBackend(email, accessToken);
    
    if (existingUser) {
      // User exists, update their role
      console.log(`👤 User found: ${existingUser.auth0_user_id}`);
      console.log(`📝 Current role: ${existingUser.role}`);
      
      if (existingUser.role === role) {
        console.log(`✅ User already has ${role} role - no changes needed`);
        return;
      }
      
      console.log(`🔄 Updating role from ${existingUser.role} to ${role}...`);
      await updateUserRoleInBackend(existingUser.auth0_user_id, role, accessToken);
      
      console.log(`✅ Successfully updated ${email} to ${role} role`);
      console.log(`User ID: ${existingUser.auth0_user_id}`);
      console.log(`Previous role: ${existingUser.role}`);
      console.log(`New role: ${role}`);
    } else {
      // User doesn't exist in backend yet
      console.log(`⚠️  User ${email} doesn't exist in backend yet.`);
      console.log(`📋 They will be created with ${role} role when they first log in.`);
      console.log(`💡 Make sure to add ${email} to the adminEmails array in /api/user/role/route.ts for initial setup.`);
      
      // Show the code they need to add
      console.log(`\n📄 Add this to the adminEmails array in src/app/api/user/role/route.ts:`);
      console.log(`   '${email}',`);
    }
  } catch (error) {
    console.error('❌ Error setting up admin account:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Command line interface
const args = process.argv.slice(2);
const email = args[0];
const role = args[1] as 'admin' | 'super_admin';

if (!email || !role) {
  console.log('Usage: npm run setup-admin <email> <role>');
  console.log('Roles: admin, super_admin');
  console.log('Example: npm run setup-admin admin@yourdomain.com admin');
  console.log('\nRequired environment variables:');
  console.log('- AUTH0_M2M_CLIENT_ID');
  console.log('- AUTH0_M2M_CLIENT_SECRET');
  console.log('- AUTH0_ISSUER_BASE_URL (optional - defaults to https://your-tenant.us.auth0.com)');
  console.log('- NEXT_PUBLIC_API_BASE_URL (optional - defaults to https://api.example.com)');
  process.exit(1);
}

if (!['admin', 'super_admin'].includes(role)) {
  console.error('❌ Invalid role. Must be "admin" or "super_admin"');
  process.exit(1);
}

if (!email.includes('@')) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

// Run the setup
setupAdmin(email, role);