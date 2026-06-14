exports.compileMasterMatrix = (gridData, targetLanguage) => {
    if (!Array.isArray(gridData) || gridData.length === 0) {
        throw new Error("No data records provided.");
    }

    const lines = [];

    // 1. Add Header Variables (Only once)
    lines.push('$contentCatalog=omegaengineeringContentCatalog');
    lines.push('$contentCatalogName=Omega Engineering Content Catalog');
    lines.push('$productCatalog=omegaengineeringProductCatalog');
    lines.push('$productCatalogName=Omega Engineering Product Catalog');
    lines.push('$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Online])[default=$contentCatalog:Online]');
    lines.push("$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default='Online'])[unique=true,default=$productCatalog:Online]");
    lines.push('$lang=en'); // Empty line
    lines.push(''); // Empty line

    // 2. Define Language Mapping
    const localeMap = {
        'en': 'en', 'de': 'de_DE', 'es': 'es_ES', 
        'fr': 'fr_FR', 'it': 'it_IT', 'uk': 'en_UK',
    };

    // 3. Process each row
    for (const row of gridData) {
        const cleanUid = String(row.component_Id || "").trim();
        if (!cleanUid) continue;

        // Extract content from your grid object (assuming it has language keys)
        // If your gridData stores content differently, adjust this map access
        const contents = row.contentMap || { [targetLanguage]: row.content };

        for (const [lang, contentText] of Object.entries(contents)) {
            const targetLocale = localeMap[lang.toLowerCase()] || 'en';
            
            // Clean/Format HTML
            let processedHtml = (contentText || "").toLowerCase().replace(/"/g, '""');

            // 4. Output matching your Expected Result format
            lines.push(`INSERT_UPDATE CMSParagraphComponent  ;uid[unique=true];             content[lang=${targetLocale}]`);
            lines.push(`                                     ;${cleanUid}       ;"<div class=""hero"">${processedHtml}</div>"`);
        }
    }
    
    return lines.join('\n');
};