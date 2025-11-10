#!/usr/bin/env node

/**
 * Check if Node.js version meets requirements
 * Required: Node.js v18.x or higher
 */

const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
const requiredVersion = 18;

if (majorVersion < requiredVersion) {
  console.error('\ Node.js version check failed!\n');
  console.error(`Current version: ${nodeVersion}`);
  console.error(`Required version: v${requiredVersion}.x or higher\n`);
  process.exit(1);
}

console.log(`Node.js version check passed: ${nodeVersion}\n`);

