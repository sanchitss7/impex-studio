const bulkCompilerService = require('../services/bulk-compiler.service');

exports.generateBulkImpexMatrix = (req, res) => {
    try {
        const { gridData, targetLanguage } = req.body;

        console.log(`⚙️ Running Batch Regex Compiler Matrix for language: [${targetLanguage}]`);
        console.log(`📦 Rows to process: ${gridData ? gridData.length : 0}`);

        if (!gridData || !targetLanguage) {
            return res.status(400).json({ 
                error: "Missing parameters. Required fields: 'gridData' array and 'targetLanguage' token." 
            });
        }

        const compiledImpexData = bulkCompilerService.compileMasterMatrix(gridData, targetLanguage);

        return res.status(200).json({
            success: true,
            impexData: compiledImpexData
        });

    } catch (error) {
        console.error("[BULK ENGINE FAULT]:", error);
        return res.status(500).json({ 
            error: `Failed to compile batch operation matrix sequence: ${error.message}` 
        });
    }
};