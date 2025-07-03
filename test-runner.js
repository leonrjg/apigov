#!/usr/bin/env node
// test-runner.js - Simple test runner for APIGov project

const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.totalTests = 0;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.testFiles = [];
  }

  findTestFiles(dir = '.') {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        this.findTestFiles(fullPath);
      } else if (file.name.endsWith('.test.js')) {
        this.testFiles.push(fullPath);
      }
    }
  }

  async runTestFile(testFile) {
            
    try {
      // Clear require cache to ensure fresh test runs
      delete require.cache[require.resolve(path.resolve(testFile))];
      
      // Capture the original process.exit to prevent tests from exiting the runner
      const originalExit = process.exit;
      let testExitCode = null;
      
      process.exit = (code) => {
        testExitCode = code;
      };
      
      // Run the test file
      require(path.resolve(testFile));
      
      // Restore original process.exit
      process.exit = originalExit;
      
      if (testExitCode === 0) {
                return { passed: true, error: null };
      } else if (testExitCode === 1) {
                return { passed: false, error: 'Test failures' };
      } else {
        return { passed: true, error: null }; // No explicit exit called
      }
      
    } catch (error) {
                  return { passed: false, error: error.message };
    }
  }

  async runAllTests() {
            
    this.findTestFiles();
    
    if (this.testFiles.length === 0) {
            return true;
    }

        this.testFiles.forEach(file => {
    let allPassed = true;
    
    for (const testFile of this.testFiles) {
      const result = await this.runTestFile(testFile);
      if (!result.passed) {
        allPassed = false;
      }
    }

                
    if (allPassed) {
      console.log("success")
    } else {
      console.error("failed")
    }
    
    return allPassed;
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;