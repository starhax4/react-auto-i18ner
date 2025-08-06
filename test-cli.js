#!/usr/bin/env node

/**
 * Simple test script to validate the CLI works as expected
 * Run this with: node test-cli.js
 */

const { exec } = require('child_process');
const path = require('path');

async function testCLI() {
  console.log('🧪 Testing React Auto i18ner CLI...\n');

  const cliPath = path.join(__dirname, 'dist', 'cli.js');

  // Test 1: Help command
  console.log('📖 Test 1: Help command');
  exec(`node ${cliPath} --help`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Help command failed:', error);
      return;
    }
    console.log('✅ Help command works');
    console.log('Output preview:', stdout.substring(0, 200) + '...\n');
  });

  // Test 2: Version command
  console.log('📖 Test 2: Version command');
  exec(`node ${cliPath} --version`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Version command failed:', error);
      return;
    }
    console.log('✅ Version command works');
    console.log('Version:', stdout.trim(), '\n');
  });

  // Test 3: Init command (dry run)
  console.log('📖 Test 3: Init command');
  exec(`node ${cliPath} init --help`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Init command failed:', error);
      return;
    }
    console.log('✅ Init command available\n');
  });

  console.log('🎉 Basic CLI tests completed!');
  console.log('💡 To test full functionality, run in a React project:');
  console.log('   npx react-auto-i18ner --dry-run');
}

testCLI();
