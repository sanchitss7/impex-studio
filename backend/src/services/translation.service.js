require('dotenv').config({ path: '../../.env' });
const { Credentials, Translator } = require('@translated/lara');

const GLOSSARY_MAP = {
    'ja': 'gls_3rxQ1dRjh8jpHpQh3b3Zdu',
    'ko': 'gls_3BddturTq56I2QyhVEjyWx',
    'it': 'gls_33zvNa0cEqmiHvkHakaORy',
    'fr': 'gls_3PZnGM3DIJpEw4fqfy2czh',
    'es': 'gls_0piGmZ9NS9DFwaTsRTzFsv',
    'de': 'gls_163YTuNdpmBpnwIUkMS3ZE'
};

const credentials = new Credentials(process.env.LARA_ACCESS_KEY_ID, process.env.LARA_ACCESS_KEY_SECRET);
const lara = new Translator(credentials);

/**
 * Normalizes ID formatting while preserving double-double quotes for ImpEx.
 */
function normalizeIdFormatting(text) {
    // Standardizes ID placeholder format
    let normalized = text.replace(/[«»“”„‟" ]*###ID###[«»“”„‟" ]*/g, '###ID###');
    const idMatch = text.match(/\d+-\d+-\d+/);
    const cleanId = idMatch ? idMatch[0] : '';
    return normalized.replace('###ID###', '""' + cleanId + '""');
}

/**
 * Optimized Translation: Extracts text nodes, translates them, and reinjects them.
 * This prevents the translator from modifying form attributes or quote styles in tags.
 */
async function translateText(text, targetLang, glossaryId = null) {
    const langCode = targetLang.toLowerCase().split('-')[0];
    const glossaryIdToUse = glossaryId || (GLOSSARY_MAP[langCode] || 'gls_0ycEqYCU0ciyw');

    try {
        // 1. ISOLATION: Identify text nodes (>content<) only
        const textNodeRegex = />([^<]+)</g;
        let translatedResult = text;
        const matches = [...text.matchAll(textNodeRegex)];

        for (const match of matches) {
            const fullMatch = match[0];
            const textToTranslate = match[1].trim();

            // Skip technical strings, IDs, or empty segments
            if (textToTranslate.length > 1 && !textToTranslate.includes('=')) {
                // Perform the API call for this specific node
                const res = await lara.translate(textToTranslate, null, langCode, {
                    glossaryId: glossaryIdToUse,
                    style: 'faithful'
                });

                // Re-inject the translation back into the HTML block
                translatedResult = translatedResult.replace(fullMatch, fullMatch.replace(textToTranslate, res.translation));
            }
        }

        // 2. Apply final ID formatting
        return normalizeIdFormatting(translatedResult);

    } catch (error) {
        console.error(`Lara API Error for ${langCode}:`, error.message);
        return text;
    }
}

module.exports = { translateText };