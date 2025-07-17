#!/usr/bin/env tsx
/**
 * Admin Setup Script
 * 
 * This script helps you set up admin accounts in the database.
 * Usage: npm run setup-admin <email> <role>
 * 
 * Example:
 * npm run setup-admin admin@yourdomain.com admin
 * npm run setup-admin superuser@yourdomain.com super_admin
 */

import { db } from '../lib/database';

async function setupAdmin(email: string, role: 'admin' | 'super_admin') {
  try {
    console.log(`Setting up admin account for ${email} with role ${role}...`);
    
    // Check if user exists by email
    const existingUser = await db.getUserByEmail(email);
    
    if (existingUser.success && existingUser.data) {
      // User exists, update their role
      const updatedUser = await db.updateUserRole(existingUser.data.auth0_user_id, role);
      
      if (updatedUser.success) {
        console.log(`✅ Successfully updated ${email} to ${role} role`);
        console.log(`User ID: ${existingUser.data.auth0_user_id}`);
        console.log(`Previous role: ${existingUser.data.role}`);
        console.log(`New role: ${role}`);
      } else {
        console.error(`❌ Failed to update user role: ${updatedUser.error}`);
      }
    } else {
      // User doesn't exist, create them with admin role
      console.log(`User ${email} doesn't exist in database. They will be created with admin role when they first log in.`);
      console.log(`Make sure to add ${email} to the adminEmails array in the role route for initial setup.`);
    }
  } catch (error) {
    console.error('❌ Error setting up admin account:', error);
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

setupAdmin(email, role);