require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const compression = require('compression');

// Core isolated controller/service module imports
const impexController = require('./src/controllers/impex.controller');
const bulkController = require('./src/controllers/bulk.controller');
const impexService = require('./src/services/impex.service');
const translationService = require('./src/services/translation.service'); // Ensure this exists!

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
        'en_us': 'en_US',
        'de_de': 'de_DE',
        'fr_fr': 'fr_FR',
        'it_it': 'it_IT',
        'es_es': 'es_ES',
        // Add other mappings as needed
    };
    // If it's not in the map, default to uppercase or original
    return map[langCode.toLowerCase()] || langCode.toUpperCase();
};
app.post('/api/generate-impex', impexController.generateImpex);
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

        // FIX: Check if target_lang exists before calling .replace()
        const langValue = target_lang; 
        const formattedLang = langValue.replace('_', '-');

        console.log(`DEBUG: Calling translation service with: ${formattedLang}`);

        const translated = await translationService.translateText(text, formattedLang);

        res.json({ translatedText: translated });
    } catch (err) {
        console.error("TRANSLATION BACKEND ERROR:", err);
        res.status(500).json({ error: 'Translation failed', details: err.message });
    }
});

app.post('/api/generate-impex', (req, res) => {
    try {
        const { uid, contentMap, rows } = req.body;
        const dataToProcess = rows || contentMap;

        if (!dataToProcess) return res.status(400).json({ error: "No data provided" });

        const sapLangMap = { 'en': 'en_US', 'de': 'de_DE', 'fr': 'fr_FR', 'es': 'es_ES', 'it': 'it_IT', 'ja': 'ja_JA', 'ko': 'ko_KO' };
        const macros = `$contentCatalog=omegaengineeringContentCatalog\n$productCatalog=omegaengineeringProductCatalog\n$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]\n$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default='Staged'])[unique=true,default=$productCatalog:Staged]\n\n`;

        // Ensure we always have an array
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

        // Build blocks with defensive checks
        const blocks = Object.keys(groupedByLang).map(lang => {
            const header = `INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${lang}]\n`;

            // Defensively map rows
            const rowStrings = groupedByLang[lang].map(item => {
                const safeUid = item.uid || uid || 'UnknownUID';
                const safeContent = item.content || '';
                return `;${safeUid};"${safeContent}"`;
            }).join('\n');

            return header + rowStrings;
        }).join('\n\n');

        res.json({ impexData: macros + blocks });
    } catch (error) {
        console.error("Backend Error Details:", error); // Terminal will show exactly why it failed
        res.status(500).json({ error: "Failed to generate ImpEx", details: error.message });
    }
});

// 2. BULK PROCESSING ROUTES
app.post('/api/impex/bulk/upload', upload.single('file'), bulkController.parseBulkUpload);
// Server Initialization
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});