const impexService = require('../services/impex.service');
const axios = require('axios');

exports.generateImpex = (req, res) => {
    const { headerConfig, uid, contentMap } = req.body;
    console.log("DEBUG PAYLOAD:", JSON.stringify(req.body, null, 2));
    // If contentMap is an Array, convert it to an Object for the service
    const normalizedMap = Array.isArray(contentMap) 
        ? contentMap.reduce((acc, item) => {
            acc[item.lang] = item.content;
            return acc;
          }, {}) 
        : contentMap;

    const impexOutput = impexService.buildImpexMatrix(headerConfig, uid, normalizedMap);
    
    return res.status(200).json({ success: true, impexData: impexOutput });
};

// exports.generateImpex = (req, res) => {
//     try {
//         const { headerConfig, uid, contentMap } = req.body;
//         // contentMap now contains the edited/translated descriptions and contents
//         const impexOutput = impexService.buildImpexMatrix(headerConfig, uid, contentMap);
//         return res.status(200).json({ success: true, impexData: impexOutput });
//     } catch (error) {
//         return res.status(500).json({ error: "Generation failed" });
//     }
// };

exports.autoTranslateContent = async (req, res) => {
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
                target_lang: lang ? lang.toUpperCase() : 'DE',
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