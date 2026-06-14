require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const compression = require('compression');

// Core isolated controller/service module imports
const impexController = require('./controllers/impex.controller');
const bulkController = require('./controllers/bulk.controller');
const bulkCompilerController = require('./controllers/bulk-compiler.controller');
const impexService = require('./services/impex.service');

const app = express();
const PORT = 3000;

// Middleware Setup
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Setup memory storage driver
const upload = multer({ storage: multer.memoryStorage() });

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
app.post('/api/translate', impexController.autoTranslateContent);

// Merged route for /api/impex/generate
app.post('/api/impex/generate', (req, res) => {
    try {
        const { headerConfig, uid, contentMap } = req.body;
        console.log("Received payload for /api/impex/generate:", { uid });

        if (!headerConfig || !contentMap) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Logic to build the ImpEx string
        const languages = Object.keys(contentMap);
        const impexData = impexService.buildImpexMatrix(headerConfig, uid, contentMap);
        let impexLines = [
            headerConfig,
            ...languages.map(lang => {
                let content = contentMap[lang] || '';

                // 1. FLATTEN: Convert all existing "" to a single " 
                // This removes any pre-existing "double-escaped" patterns so we start from scratch.
                let normalized = content.replace(/""/g, '"');

                // 2. ESCAPE: Now, every single " becomes ""
                // This is a global replace that is now 100% safe because we flattened first.
                let sanitized = normalized.replace(/"/g, '""');
                console.log("DEBUG: Final string for EIN:", sanitized.includes('""06-6041011""') ? "Fixed" : "Still Single Quotes");
                console.log("DEBUG: Full String Preview:", sanitized.substring(sanitized.indexOf("EIN") + 4, sanitized.indexOf("EIN") + 25));
                return `;${uid};"${sanitized}"[lang=${lang}]`;
            })
        ];

        res.status(200).json({ impexData: impexLines.join('\n') });
    } catch (err) {
        console.error("BACKEND CRASH:", err);
        res.status(500).json({ error: "Server crashed while generating ImpEx" });
    }
});

// 2. BULK PROCESSING ROUTES
app.post('/api/bulk/upload', upload.single('file'), bulkController.parseBulkUpload);
app.post('/api/impex/bulk/upload', upload.single('file'), bulkController.parseBulkUpload);
app.post('/api/impex/bulk/generate-matrix', bulkCompilerController.generateBulkImpexMatrix);

// 3. GENERATION PREVIEW ROUTE (The one used by your Modal)
app.post('/api/generate-impex', (req, res) => {
    const { headerConfig, contentMap } = req.body;
    try {
        // Ensure buildImpexMatrix is exported from impexService
        const impexContent = impexService.buildImpexMatrix(headerConfig, null, contentMap);
        res.json({ content: impexContent });
    } catch (error) {
        console.error("Backend Generation Error:", error);
        res.status(500).json({ error: "Failed to generate ImpEx" });
    }
});

// Server Initialization
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});