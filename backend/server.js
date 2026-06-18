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
//         const { uid, contentMap, rows } = req.body;

//         // 1. Determine data source
//         const dataToProcess = rows || contentMap;

//         if (!dataToProcess) {
//             return res.status(400).json({ error: "No data provided for ImpEx generation" });
//         }

//         const sapLangMap = { 'en': 'en', 'en_gb': 'en_UK', 'de': 'de_DE', 'fr': 'fr_FR', 'es': 'es_ES', 'it': 'it_IT' };

//         const header = `$contentCatalog=omegaengineeringContentCatalog2\n$productCatalog=omegaengineeringProductCatalog\n$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]\n$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default='Staged'])[unique=true,default=$productCatalog:Staged]\n\n`;

//         // 2. Map data to standard format
//         const lines = (Array.isArray(dataToProcess) ? dataToProcess : Object.keys(dataToProcess).map(lang => ({
//             lang: lang,
//             content: dataToProcess[lang],
//             uid: uid // Single mode uses the provided global UID
//         }))).map(item => {
//             const langKey = (item.lang || 'en').toLowerCase();
//             const resolvedLang = sapLangMap[langKey] || 'en';
//             const currentUid = item.uid || uid; // Fallback to global if item.uid missing

//             // 3. Sanitization
//             // REPLACE your current sanitization block in server.js with ONLY this:
//             let content = (item.content || '').toString();
//             content = content.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
//             content = content.replace(/"/g, '""');

//             return `INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${resolvedLang}]\n;${uid};"${content}"`;
//         }).join('\n\n');

//         res.json({ impexData: header + lines });
//     } catch (error) {
//         console.error("CRITICAL BACKEND ERROR:", error);
//         res.status(500).json({ error: "Failed to generate ImpEx", details: error.message });
//     }
// });
app.post('/api/generate-impex', (req, res) => {
    try {
        const { uid, contentMap, rows } = req.body;
        const dataToProcess = rows || contentMap;

        if (!dataToProcess) {
            return res.status(400).json({ error: "No data provided" });
        }

        const sapLangMap = { 'en': 'en', 'en_gb': 'en_UK', 'de': 'de_DE', 'fr': 'fr_FR', 'es': 'es_ES', 'it': 'it_IT' };

        // 1. Static Catalog Macros
        const macros = `$contentCatalog=omegaengineeringContentCatalog2\n` +
                       `$productCatalog=omegaengineeringProductCatalog\n` +
                       `$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]\n` +
                       `$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default='Staged'])[unique=true,default=$productCatalog:Staged]\n\n`;

        // 2. Normalize data into an array of objects
        const items = Array.isArray(dataToProcess) ? dataToProcess : Object.keys(dataToProcess).map(lang => ({
            lang: lang,
            content: dataToProcess[lang],
            uid: uid
        }));

        // 3. Group items by language
        const groupedByLang = items.reduce((acc, item) => {
            const langKey = (item.lang || 'en').toLowerCase();
            const resolvedLang = sapLangMap[langKey] || 'en';
            if (!acc[resolvedLang]) acc[resolvedLang] = [];
            acc[resolvedLang].push(item);
            return acc;
        }, {});

        // 4. Build blocks: One header per language, followed by all rows for that language
        const blocks = Object.keys(groupedByLang).map(lang => {
            const header = `INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${lang}]\n`;
            const rows = groupedByLang[lang].map(item => {
                const content = (item.content || '').toString();
                return `;${item.uid || uid};"${content}"`;
            }).join('\n');
            return header + rows;
        }).join('\n\n');

        res.json({ impexData: macros + blocks });
        
    } catch (error) {
        console.error("CRITICAL BACKEND ERROR:", error);
        res.status(500).json({ error: "Failed to generate ImpEx", details: error.message });
    }
});

// 2. BULK PROCESSING ROUTES
app.post('/api/impex/bulk/upload', upload.single('file'), bulkController.parseBulkUpload);
// Server Initialization
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});