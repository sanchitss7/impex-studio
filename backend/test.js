// test_translation.js
require('dotenv').config({ path: './.env' });
console.log("DEBUG: LARA_ACCESS_KEY_ID is:", process.env.LARA_ACCESS_KEY_ID);
const { translateText } = require('./src/services/translation.service');

async function runCoverageTests() {
    const testCases = [
        { text: 'Welcome "6-1100394-1"', lang: 'ja' }, // Test ID normalization
        { text: 'Connect the Pressure Sensor', lang: 'de', isTechnical: true }, // Test PST Glossary
        { text: 'Welcome "6-1100394-1"', lang: 'ko' }, // Test ID normalization
        { text: 'Connect the Pressure Sensor', lang: 'fr', isTechnical: true }
    ];

    for (const test of testCases) {
        console.log(`\nTesting: ${test.text} -> ${test.lang.toUpperCase()}`);
        const result = await translateText(test.text, test.lang);
        console.log(`Result: ${result}`);

        // Validation: Check for double-double quotes
        if (result.includes('""')) {
            console.log("PASS: Formatting correct.");
        } else {
            console.log("FAIL: Formatting incorrect.");
        }
    }
}

runCoverageTests();