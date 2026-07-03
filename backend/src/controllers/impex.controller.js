const { translateText } = require('../services/translation.service');
const { convertImpexToHtml } = require('../utils/impex-to-html');
const { generateImpexService } = require('../services/impex.service');

exports.generateImpex = async (req, res) => {
    try {
        const { uid, contentMap, rows } = req.body;
        const dataToProcess = rows || contentMap;

        if (!dataToProcess) return res.status(400).json({ error: "No data provided" });

        const sapLangMap = { 'en': 'en_US', 'de': 'de_DE', 'fr': 'fr_FR', 'es': 'es_ES', 'it': 'it_IT', 'ja': 'ja_JA', 'ko': 'ko_KO' };
        const macros = `$contentCatalog=omegaengineeringContentCatalog\n$productCatalog=omegaengineeringProductCatalog\n$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]\n$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default='Staged'])[unique=true,default=$productCatalog:Staged]\n\n`;

        const items = Array.isArray(dataToProcess) ? dataToProcess : Object.keys(dataToProcess).map(lang => ({
            lang: lang,
            content: dataToProcess[lang],
            uid: uid
        }));

        const groupedByLang = items.reduce((acc, item) => {
            const langKey = (item.lang || 'en').toLowerCase();
            const resolvedLang = sapLangMap[langKey] || 'en';
            if (!acc[resolvedLang]) acc[resolvedLang] = [];
            acc[resolvedLang].push(item);
            return acc;
        }, {});

        const blocks = Object.keys(groupedByLang).map(lang => {
            const header = `INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${lang}]\n`;
            const rowStrings = groupedByLang[lang].map(item => {
                const safeUid = item.uid || uid || 'UnknownUID';
                const safeContent = item.content || '';
                return `;${safeUid};"${safeContent}"`;
            }).join('\n');
            return header + rowStrings;
        }).join('\n\n');

        const finalImpex = macros + blocks;

        // --- HTML GENERATION START ---
        const htmlPreview = convertImpexToHtml(finalImpex, req.body.selectedLanguage || 'EN');
        // --- HTML GENERATION END ---

        res.status(200).json({ 
            impexData: finalImpex, 
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