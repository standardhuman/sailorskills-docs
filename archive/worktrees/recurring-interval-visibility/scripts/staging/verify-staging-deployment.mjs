#!/usr/bin/env node

/**
 * Vercel Staging Deployment Verification
 *
 * Tests all 13 staging URLs to verify:
 * - DNS resolution
 * - SSL certificate
 * - Service responds (200 or 30x)
 * - No major errors
 *
 * Usage: node scripts/staging/verify-staging-deployment.mjs
 */

const services = [
  { name: 'Login', url: 'https://login-staging.sailorskills.com', critical: true },
  { name: 'Portal', url: 'https://portal-staging.sailorskills.com', critical: true },
  { name: 'Operations', url: 'https://ops-staging.sailorskills.com', critical: true },
  { name: 'Billing', url: 'https://billing-staging.sailorskills.com', critical: true },
  { name: 'Estimator', url: 'https://estimator-staging.sailorskills.com', critical: false },
  { name: 'Settings', url: 'https://settings-staging.sailorskills.com', critical: false },
  { name: 'Inventory', url: 'https://inventory-staging.sailorskills.com', critical: false },
  { name: 'Insight', url: 'https://insight-staging.sailorskills.com', critical: false },
  { name: 'Video', url: 'https://video-staging.sailorskills.com', critical: false },
  { name: 'Booking', url: 'https://booking-staging.sailorskills.com', critical: false },
  { name: 'Marketing', url: 'https://marketing-staging.sailorskills.com', critical: false },
  { name: 'Site', url: 'https://site-staging.sailorskills.com', critical: false },
];

async function checkService(service) {
  const startTime = Date.now();

  try {
    const response = await fetch(service.url, {
      method: 'HEAD',
      redirect: 'manual', // Don't follow redirects automatically
    });

    const responseTime = Date.now() - startTime;
    const status = response.status;

    // Consider 200-399 as success (includes redirects)
    const isSuccess = status >= 200 && status < 400;

    return {
      name: service.name,
      url: service.url,
      critical: service.critical,
      status,
      success: isSuccess,
      responseTime,
      error: null,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      name: service.name,
      url: service.url,
      critical: service.critical,
      status: null,
      success: false,
      responseTime,
      error: error.message,
    };
  }
}

async function verifyAll() {
  console.log('🔍 Verifying Staging Deployment...\n');
  console.log('Testing 13 services...\n');

  const results = await Promise.all(services.map(checkService));

  // Group results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const criticalFailed = failed.filter(r => r.critical);

  // Print results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Successful services
  if (successful.length > 0) {
    console.log(`✅ SUCCESSFUL (${successful.length}/${services.length})\n`);
    successful.forEach(r => {
      const criticalBadge = r.critical ? '🔴' : '  ';
      console.log(`  ${criticalBadge} ${r.name.padEnd(12)} ${r.status} (${r.responseTime}ms)`);
      console.log(`     ${r.url}`);
    });
    console.log('');
  }

  // Failed services
  if (failed.length > 0) {
    console.log(`❌ FAILED (${failed.length}/${services.length})\n`);
    failed.forEach(r => {
      const criticalBadge = r.critical ? '🔴 CRITICAL' : '⚠️  Warning';
      console.log(`  ${criticalBadge} - ${r.name}`);
      console.log(`     URL: ${r.url}`);
      if (r.status) {
        console.log(`     Status: ${r.status}`);
      }
      if (r.error) {
        console.log(`     Error: ${r.error}`);
      }
      console.log('');
    });
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Total Services:     ${services.length}`);
  console.log(`Successful:         ${successful.length}`);
  console.log(`Failed:             ${failed.length}`);
  console.log(`Critical Failed:    ${criticalFailed.length}\n`);

  // Average response time
  const avgResponseTime = Math.round(
    successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length
  );
  console.log(`Avg Response Time:  ${avgResponseTime}ms\n`);

  // Overall status
  if (failed.length === 0) {
    console.log('✅ ALL SERVICES OPERATIONAL\n');
    console.log('Staging environment is ready for testing!');
    return 0;
  } else if (criticalFailed.length > 0) {
    console.log('🔴 CRITICAL SERVICES DOWN\n');
    console.log('Critical services must be fixed before staging is usable.');
    console.log('Critical services: Login, Portal, Operations, Billing');
    return 1;
  } else {
    console.log('⚠️  SOME SERVICES DOWN\n');
    console.log('Non-critical services are down but staging is partially usable.');
    return 1;
  }
}

// Run verification
verifyAll()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('\n❌ Verification script failed:', error);
    process.exit(1);
  });
