const { translateText } = require('../services/translation.service');
const { buildUnifiedImpex } = require('../services/impex.service');
const { convertImpexToHtml } = require('../utils/impex-to-html');

exports.generateImpex = async (req, res) => {
    try {
        const { uid, contentMap, rows, selectedLanguage } = req.body;
        const dataToProcess = rows || contentMap;

        if (!dataToProcess) {
            return res.status(400).json({ error: "No data provided" });
        }

        // 1. Generate the ImpEx
        const result = buildUnifiedImpex({
            uid,
            contentMap: dataToProcess,
            selectedLanguage: selectedLanguage || 'en'
        });

        // 2. Generate HTML Preview ONCE
        const lang = selectedLanguage || 'EN';
        const htmlContent = convertImpexToHtml(result.impexData, lang);

        // 3. Return the response
        res.status(200).json({
            impexData: result.impexData,
            htmlContent: htmlContent
        });
    } catch (error) {
        console.error("Backend Error Details:", error);
        res.status(500).json({ error: "Failed to generate", details: error.message });
    }
};

exports.autoTranslateContent = async (req, res) => {
    try {
        const { text, target_lang } = req.body;
        if (!text || !target_lang) return res.status(400).json({ error: "Missing parameters" });

        const translatedText = await translateText(text, target_lang);
        res.status(200).json({ success: true, translatedText: translatedText });
    } catch (error) {
        console.error("Translation Controller Error:", error);
        res.status(500).json({ error: "Translation failed" });
    }
};