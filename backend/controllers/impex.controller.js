const impexService = require('../services/impex.service');
const axios = require('axios');
// const { buildImpexMatrix } = require('../services/impex.service');
const { sanitizeSpecialChars, sanitizeHtmlAttributes } = require('../services/impex.service');
const { buildUnifiedImpex } = require('../services/impex.service');

exports.generateImpex = (req, res) => {
    try {
        const { uid, contentMap } = req.body;

        // Map short codes to SAP Commerce language tags
        const langMap = {
            'en': 'en',
            'de': 'de',
            'fr': 'fr',
            'es': 'es',
            'it': 'it',
            'en_gb': 'en_UK'
        };

        // Process each language in the map
        const lines = Object.keys(contentMap).map(langKey => {
            const rawLang = langKey.toLowerCase();
            const resolvedLang = langMap[rawLang] || rawLang;
            
            // Escape double quotes for ImpEx
            const sanitizedContent = (contentMap[langKey] || '').replace(/"/g, '""');
            
            // Build the block for this specific language
            return `INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${resolvedLang}]\n;${uid};"${sanitizedContent}"`;
        }).join('\n\n');

        res.status(200).json({ impexData: lines });
    } catch (err) {
        console.error("ImpEx Generation Error:", err);
        res.status(500).json({ error: "Failed to generate ImpEx" });
    }
};


exports.autoTranslateContent = async (req, res) => {
    const text = req.body.text;
    const target_lang = req.body.target_lang || req.query.target_lang;

    console.log("DEBUG - Received Text:", text);
    console.log("DEBUG - Received Target Lang:", target_lang);

    if (!target_lang) {
        return res.status(400).json({ error: "Language missing" });
    }

    try {
        const { text, lang } = req.body;

        // 1. Handle "No" cases
        if (!text || text === "No content" || text === "No Description") {
            const translatedNone = lang === 'DE' ? (text === "No content" ? "Keine Überschrift" : "Keine Beschreibung") : text;
            return res.status(200).json({ success: true, translatedText: translatedNone });
        }

        // 2. Make the API call with tag_handling: 'html'
        // This preserves the original HTML structure automatically
        const response = await axios.post('https://api-free.deepl.com/v2/translate',
            new URLSearchParams({
                text: text,
                target_lang: target_lang ? target_lang.toUpperCase() : 'DE',
                tag_handling: 'html'
            }).toString(),
            {
                headers: {
                    'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        return res.status(200).json({
            success: true,
            translatedText: response.data.translations[0].text
        });

    } catch (error) {
        console.error("TRANSLATION ERROR DETAILS:", error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: "Translation failed",
            details: error.response?.data?.message || error.message
        });
    }
};