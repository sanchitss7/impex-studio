const axios = require('axios');
const { generateImpexService } = require('../services/impex.service'); // Move logic here

exports.generateImpex = async (req, res) => {
    try {
        // Just delegate to a shared service
        const result = await generateImpexService(req.body);
        res.status(200).json(result);
    } catch (err) {
        console.error("ImpEx Controller Error:", err);
        res.status(500).json({ error: "Failed to generate ImpEx" });
    }
};

exports.autoTranslateContent = async (req, res) => {
    try {
        const { text, target_lang } = req.body;
        if (!text || !target_lang) return res.status(400).json({ error: "Missing parameters" });

        // Keep this as is, it's a direct API proxy
        const response = await axios.post('https://api-free.deepl.com/v2/translate',
            new URLSearchParams({
                text,
                target_lang: target_lang.toUpperCase(),
                tag_handling: 'html'
            }).toString(),
            {
                headers: {
                    'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        res.status(200).json({ success: true, translatedText: response.data.translations[0].text });
    } catch (error) {
        res.status(500).json({ error: "Translation failed" });
    }
};