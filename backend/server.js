require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const compression = require('compression');

// Core isolated controller/service module imports
const impexController = require('./controllers/impex.controller');
const bulkController = require('./controllers/bulk.controller');
const impexService = require('./services/impex.service');
const translationService = require('./services/translation.service'); // Ensure this exists!

const app = express();
const PORT = 3000;

// Middleware Setup
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Setup memory storage driver
const upload = multer({ storage: multer.memoryStorage() });

const getDisplayLang = (langCode) => {
    const map = {
        'en_gb': 'en_UK',
        'de_de': 'de_DE',
        'fr_fr': 'fr_FR',
        // Add other mappings as needed
    };
    // If it's not in the map, default to uppercase or original
    return map[langCode.toLowerCase()] || langCode.toUpperCase();
};

// Logging Middleware
app.use((req, res, next) => {
    console.log(`Requested URL: ${req.url} | Method: ${req.method}`);
    next();
});

// ==========================================================================
// ROUTES
// ==========================================================================

// 1. SINGLE COMPONENT ROUTES
// Using the controller as imported

app.post('/api/translate', async (req, res) => {
    try {
        const { text, target_lang } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        // REMOVE the normalization map that strips locale info
        // Pass the target_lang as-is (or ensure it's formatted as 'en-GB' instead of 'en_GB')
        const formattedLang = target_lang.replace('_', '-');

        console.log(`DEBUG: Calling translation service with: ${formattedLang}`);

        const translated = await translationService.translateText(text, formattedLang);

        res.json({ translatedText: translated });
    } catch (err) {
        console.error("TRANSLATION BACKEND ERROR:", err);
        res.status(500).json({ error: 'Translation failed', details: err.message });
    }
});


// app.post('/api/generate-impex', (req, res) => {
//     try {
//         const { uid, contentMap } = req.body;

//         const sapLangMap = {
//             'en': 'en',
//             'en_gb': 'en_UK',
//             'de': 'de_DE',
//             'fr': 'fr_FR',
//             'es': 'es_ES',
//             'it': 'it_IT'
//         };

//         // Iterate over keys to build an entry for EVERY language provided
//         const lines = Object.keys(contentMap).map(langKey => {
//             const rawLang = langKey.toLowerCase();
//             const resolvedLang = sapLangMap[rawLang] || rawLang;

//             // Clean content: Escape double quotes for SAP ImpEx ( " -> "" )
//             const content = (contentMap[langKey] || '').replace(/"/g, '""');

//             return `INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${resolvedLang}]\n;${uid};"${content}"`;
//         }).join('\n\n');

//         res.json({ impexData: lines });
//     } catch (error) {
//         console.error("Backend Generation Error:", error);
//         res.status(500).json({ error: "Failed to generate ImpEx" });
//     }
// });


app.post('/api/generate-impex', (req, res) => {
    try {
        const { uid, contentMap } = req.body;

        // 1. Define Macro Headers
        const header = `$contentCatalog=omegaengineeringContentCatalog\n$productCatalog=omegaengineeringProductCatalog\n$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]\n$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default='Staged'])[unique=true,default=$productCatalog:Staged]\n\n`;

        const sapLangMap = {
            'en': 'en',
            'en_gb': 'en_UK',
            'de': 'de_DE',
            'fr': 'fr_FR',
            'es': 'es_ES',
            'it': 'it_IT'
        };

        const lines = rows.map(item => {
            // ... (Your existing lang resolution logic) ...

            // Get raw content
            let content = (item.content || '').toString();

            // 1. Sanitize: Fix the spacing issue inside quotes
            // Matches " 6... " and turns it into "6..."
            content = content.replace(/"\s+/g, '"').replace(/\s+"/g, '"');

            // 2. Sanitize: Fix smart quotes (as discussed previously)
            content = content.replace(/[\u201C\u201D\u201E\u201F]/g, '"');

            // 3. Escape: Double up quotes for ImpEx
            content = content.replace(/"/g, '""');

            return `INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${resolvedLang}]\n;${uid};"${content}"`;
        }).join('\n\n');

        res.json({ impexData: header + lines });
    } catch (error) {
        console.error("ImpEx Error:", error);
        res.status(500).json({ error: "Failed to generate ImpEx" });
    }
});

// 2. BULK PROCESSING ROUTES
app.post('/api/impex/bulk/upload', upload.single('file'), bulkController.parseBulkUpload);
// Server Initialization
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});