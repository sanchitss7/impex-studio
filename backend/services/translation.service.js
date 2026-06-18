const deepl = require('deepl-node');

// Ensure your .env file has DEEPL_API_KEY=your_key_here
const authKey = process.env.DEEPL_API_KEY;
const translator = new deepl.Translator(authKey);

async function translateText(text, targetLang) {
    try {
        // DeepL expects target codes like 'EN-GB', 'DE', 'FR', 'ES', 'IT'
        // We normalize the input format to match DeepL's requirements
        const deepLTarget = targetLang.toUpperCase().replace('_', '-');
        
        console.log(`DeepL Request: Translating to ${deepLTarget}. Text sample: ${text.substring(0, 20)}`);
        
        const result = await translator.translateText(text, null, deepLTarget);

        return result.text;
    
    } catch (error) {
        console.error("DeepL API Error:", error.message);
        // Return original text on failure so the process doesn't break
        return text;
    }
}

module.exports = { translateText };