#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

// Function to update .env.local with the webhook secret
function updateEnvFile(secret) {
  try {
    let envContent = '';
    
    // Read existing .env.local if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Check if STRIPE_WEBHOOK_SECRET already exists
    const secretRegex = /^STRIPE_WEBHOOK_SECRET=.*$/m;
    
    if (secretRegex.test(envContent)) {
      // Replace existing secret
      envContent = envContent.replace(secretRegex, `STRIPE_WEBHOOK_SECRET='${secret}'`);
      console.log('✅ Updated STRIPE_WEBHOOK_SECRET in .env.local');
    } else {
      // Add new secret
      if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `STRIPE_WEBHOOK_SECRET='${secret}'\n`;
      console.log('✅ Added STRIPE_WEBHOOK_SECRET to .env.local');
    }
    
    // Write back to file
    fs.writeFileSync(envPath, envContent);
  } catch (error) {
    console.error('❌ Error updating .env.local:', error.message);
  }
}

// Start stripe listen command
const stripeProcess = spawn('stripe', [
  'listen',
  '--forward-to',
  'localhost:3000/api/webhooks/stripe'
], {
  stdio: ['inherit', 'pipe', 'pipe']
});

let outputBuffer = '';
let secretCaptured = false;

// Capture output to find the webhook secret
stripeProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Buffer output until we find the secret
  if (!secretCaptured) {
    outputBuffer += output;
    
    // Look for the webhook signing secret in the output
    const secretMatch = outputBuffer.match(/Your webhook signing secret is (whsec_\w+)/);
    
    if (secretMatch) {
      const secret = secretMatch[1];
      console.log(`\n📝 Webhook signing secret detected: ${secret}`);
      updateEnvFile(secret);
      secretCaptured = true;
    }
  }
});

stripeProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle process exit
stripeProcess.on('close', (code) => {
  console.log(`\nStripe webhook listener exited with code ${code}`);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Stopping Stripe webhook listener...');
  stripeProcess.kill('SIGINT');
});

console.log('🚀 Starting Stripe webhook listener...');
console.log('⏳ Waiting for webhook signing secret...\n');