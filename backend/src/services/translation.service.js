require('dotenv').config({ path: '../../.env' });
const { Credentials, Translator } = require('@translated/lara');

// Ensure your .env file has LARA_ACCESS_KEY_ID and LARA_ACCESS_KEY_SECRET
const GLOSSARY_MAP = {
    'ja': 'gls_3rxQ1dRjh8jpHpQh3b3Zdu',
    'ko': 'gls_3BddturTq56I2QyhVEjyWx',
    'it': 'gls_33zvNa0cEqmiHvkHakaORy',
    'fr': 'gls_3PZnGM3DIJpEw4fqfy2czh',
    'es': 'gls_0piGmZ9NS9DFwaTsRTzFsv',
    'de': 'gls_163YTuNdpmBpnwIUkMS3ZE'
};

const credentials = new Credentials(
    process.env.LARA_ACCESS_KEY_ID, 
    process.env.LARA_ACCESS_KEY_SECRET
);
const lara = new Translator(credentials);

/**
 * Translates text using Lara API.
 * @param {string} text - The content to translate.
 * @param {string} targetLang - The target language code (e.g., 'ja', 'ko').
 * @param {string} [glossaryId] - Optional glossary ID from Impex Studio.
 */

function normalizeIdFormatting(text) {
    // 1. Replace all typographic quotes and brackets with standard quotes
    let normalized = text.replace(/[«»“”„‟" ]*###ID###[«»“”„‟" ]*/g, '###ID###');
    normalized = normalized.replace(/[«»“”„‟「」]/g, '"');
    
    // 2. Extract numeric ID (e.g., 6-1100394-1)
    const idMatch = text.match(/\d+-\d+-\d+/);
    const cleanId = idMatch ? idMatch[0] : '';
    
    // 3. Inject correctly as double-double quotes ""ID""
    return normalized.replace('###ID###', '""' + cleanId + '""');
}

async function translateText(text, targetLang, glossaryId = null) {
    const langCode = targetLang.toLowerCase().split('-')[0];
    const PST_UNIVERSAL_ID = 'gls_0ycEqYCU0ciyw';
    const isTechnical = true;

    const glossaryIdToUse = isTechnical ? PST_UNIVERSAL_ID : (GLOSSARY_MAP[langCode] || null);

    try {
        const result = await lara.translate(text, null, langCode, {
            glossaryId: glossaryIdToUse,
            style: 'faithful'
        });

        // APPLY NORMALIZATION HERE
        return normalizeIdFormatting(result.translation);

    } catch (error) {
        console.error(`Lara API Error for ${langCode}:`, error.message);
        return text;
    }
}

module.exports = { translateText };