const { translateText } = require('../services/translation.service');
const { convertImpexToHtml } = require('../utils/impex-to-html');
const { buildUnifiedImpex } = require('../services/impex.service');

exports.generateImpex = async (req, res) => {
    try {
        const { uid, contentMap, rows, selectedLanguage } = req.body;
        // The service now handles both arrays (rows) and objects (contentMap)
        const dataToProcess = rows || contentMap;

        if (!dataToProcess) {
            return res.status(400).json({ error: "No data provided" });
        }

        const result = buildUnifiedImpex({
            uid,
            contentMap: dataToProcess,
            selectedLanguage: selectedLanguage || 'en'
        });

        const htmlPreview = convertImpexToHtml(result.impexData, selectedLanguage || 'EN');

        res.status(200).json({
            impexData: result.impexData,
            htmlContent: htmlPreview
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