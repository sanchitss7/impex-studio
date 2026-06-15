const XLSX = require('xlsx');

/**
 * Ingests a multipart Form-Data Excel/CSV binary buffer, parses sheet keys,
 * and normalizes rows into frontend-ready JSON matrix records.
 */
exports.parseBulkUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: "No physical file data stream detected in payload body request."
            });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
       
        // Convert sheet to JSON array
        const rawRows = XLSX.utils.sheet_to_json(worksheet);

        if (rawRows.length === 0) {
            return res.status(400).json({ error: "The uploaded file is empty." });
        }

        // DYNAMIC MAPPING: Case-insensitive lookups
        const parsedGridData = rawRows.map((row, index) => {
            // Normalize keys to lowercase for comparison
            const normalizedRow = Object.keys(row).reduce((acc, key) => {
                acc[key.toLowerCase()] = row[key];
                return acc;
            }, {});

            return {
                selected: true,
                component_Id: normalizedRow['component_id'] !== undefined ? String(normalizedRow['component_id']).trim() : `UNASSIGNED_ID_${index + 1}`,
                content: normalizedRow['content'] !== undefined ? String(normalizedRow['content']).trim() : ""
            };
        });
        return res.status(200).json({
            success: true,
            totalRowsProcessed: parsedGridData.length,
            gridData: parsedGridData
        });

    } catch (error) {
        console.error("[EXCEL SPREADSHEET PARSER FAULT]:", error);
        return res.status(500).json({
            error: `Failed to compile uploaded spreadsheet template: ${error.message}`
        });
    }
};