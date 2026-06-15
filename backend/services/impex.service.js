/**
 * Core Impex Standardization Engine
 * Optimized for row-based input (Component UID and Content)
 */
// services/impex.service.js
const sanitizeContent = (content) => {
    // 1. If content is an object, attempt to extract the value property
    let str = "";
    if (typeof content === 'object' && content !== null) {
        str = content.value || content.content || JSON.stringify(content);
    } else {
        str = content ? String(content) : '';
    }

    // 2. Surgical EIN Fix: Force "XX-XXXXXXX" to ""XX-XXXXXXX""
    let sanitized = str.replace(/"(\d{2}-\d{7,8})"/g, '""$1""');

    // 3. Escape: Protect existing "" placeholders, then escape remaining " to ""
    return sanitized
        .replace(/""/g, '@@@')
        .replace(/"/g, '""')
        .replace(/@@@/g, '""');
};

const buildImpexMatrix = (headerConfig, uid, contentMap) => {
    // 1. Define the mandatory macros exactly as requested
    let lines = [
        '$contentCatalog=omegaengineeringContentCatalog',
        '$contentCatalogName=Omega Engineering Content Catalog',
        '$productCatalog=omegaengineeringProductCatalog',
        '$productCatalogName=Omega Engineering Product Catalog',
        '$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]',
        "$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default='Staged'])[unique=true,default=$productCatalog:Staged]",
        '$lang=en',
        '', // Empty line
    ];

    // 2. Add the specific header configuration provided
    lines.push(headerConfig || 'INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=$lang]');

    if (!contentMap) return lines.join('\n');

    // Use Object.entries to get the component_Id and content
    Object.entries(contentMap).forEach(([componentId, content]) => {
        const sanitized = sanitizeContent(content);

        // Use the componentId from the map as the UID for each row
        // This makes each row specific to the component in that grid row
        const row = `;${componentId};"${sanitized}"`;
        lines.push(row);
    });

    return lines.join('\n');
};

module.exports = { buildImpexMatrix, sanitizeContent };

exports.buildImpexMatrix = (headerConfig, uid, contentMap) => {
    const lines = [];
    // 1. Define Macros
    const macros = [
        "$contentCatalog=omegaengineeringContentCatalog",
        "$contentCatalogName=Omega Engineering Content Catalog",
        "$productCatalog=omegaengineeringProductCatalog",
        "$productCatalogName=Omega Engineering Product Catalog",
        "$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]",
        "$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default='Staged'])[unique=true,default=$productCatalog:Staged]",
        "$lang=en",
        "" // Empty line for clarity
    ];
    lines.push(...macros);
    // Default header configuration if none is provided
    const defaultHeader = "INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=$lang]";
    lines.push(headerConfig || defaultHeader);

    // contentMap is now an array of row objects: [{ component_Id: '...', content: '...' }, ...]
    contentMap.forEach((row) => {
        if (!row.content) return;

        let processedHtml = row.content;

        const sanitizeSpecialChars = (str) => {
            return str
                // Remove Null bytes (\0) which cause "unexpected char 0"
                .replace(/\0/g, '')
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
                .replace(/[\u2019\u2018\u201A\u201B]/g, "'")
                .replace(/[«»]/g, '"')
                .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
                .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
                .replace(/[\u00A1]/g, '!')
                .replace(/[\u00B0]/g, '°')
                .replace(/[\u00A0]/g, ' ')
                .replace(/[\uFFFD]/g, '')
                .replace(/[\u00D0]/g, 'Đ')
                .replace(/[\u00D1]/g, 'Ñ')
                .replace(/[\u00D5]/g, 'Õ')
                .replace(/[\u017D]/g, 'Ž')
                .replace(/[\u2039]/g, '<')
                .replace(/[\u203A]/g, '>');
        };
       
        const buildSingleImpex = (uid, contentMap) => {
            // 1. Locale mapping remains for the HEADER definition
            const localeMap = {
                'en': 'en',
                'de': 'de_DE',
                'es': 'es_ES',
                'fr': 'fr_FR',
                'it': 'it_IT',
                'uk': 'en_UK'
            };

            // ... (keep your existing macro definitions here) ...

            let output = [...macros];

            Object.entries(contentMap).forEach(([lang, content]) => {
                const locale = localeMap[lang] || lang;
                const sanitized = sanitizeHtmlAttributes(sanitizeSpecialChars(content));

                // CHANGE: Move the [lang=...] part to the HEADER line only
                output.push(`INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${locale}]`);
                const langHeader = (lang === 'en') ? '$lang' : locale;  
                // CHANGE: Output the row without the [lang=...] suffix
                output.push(`;${uid};"${sanitized}"`);

                output.push("");
            });

            return output.join('\n').trim();
        };

        const sanitizeHtmlAttributes = (html) => {
            // Standardize HTML tags and double-double quote attributes
            return html.replace(/<([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName, attrPart) => {
                const tag = tagName.toLowerCase();
                if (!attrPart.trim()) return `<${tag}>`;

                const attrRegex = /([a-zA-Z0-9-_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
                const attrs = [];
                let attrMatch;
                let hasItemscope = false;

                while ((attrMatch = attrRegex.exec(attrPart)) !== null) {
                    const key = attrMatch[1].toLowerCase();
                    const value = attrMatch[2] || attrMatch[3] || attrMatch[4] || "";
                    if (key === 'itemscope') { hasItemscope = true; continue; }
                    attrs.push(`${key}=""${value}""`);
                }

                if (hasItemscope || attrPart.toLowerCase().includes('itemscope')) {
                    attrs.unshift('itemscope=""itemscope""');
                }

                return `<${tag}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}>`;
            });
        };

        const buildImpexMatrix = (headerConfig, uid, contentMap) => {
            const lines = [
                "$contentCatalog=omegaengineeringContentCatalog",
                "$contentCatalogName=Omega Engineering Content Catalog",
                "$productCatalog=omegaengineeringProductCatalog",
                "$productCatalogName=Omega Engineering Product Catalog",
                "$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]",
                "$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default='Staged'])[unique=true,default=$productCatalog:Staged]",
                "$lang=en",
                ""
            ];

            // Use provided header or fall back to default
            const defaultHeader = "INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=$lang]";
            lines.push(headerConfig || defaultHeader);

            // Ensure contentMap is processed as an array
            if (contentMap && Array.isArray(contentMap)) {
                contentMap.forEach((row) => {
                    if (!row.content) return;

                    // 1. Clean special characters
                    let cleanContent = sanitizeSpecialChars(row.content);

                    // 2. Standardize HTML attributes to ImpEx double-double format
                    cleanContent = sanitizeHtmlAttributes(cleanContent);

                    // 3. Construct line
                    lines.push(`;${row.component_Id};"${cleanContent}"`);
                });
            }

            return lines.join('\n').trim();
        };

        module.exports = { buildImpexMatrix };

        // Optimized Regex for HTML Impex Standardization
        processedHtml = processedHtml.replace(/<([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName, attrPart) => {
            const tag = tagName.toLowerCase();

            // If the tag has no attributes (e.g., <div>), just return the tag
            if (!attrPart.trim()) return `<${tag}>`;

            // New Regex: Specifically looks for key="value", key='value', or key=value
            // It ignores spaces that are part of the value itself.
            const attrRegex = /([a-zA-Z0-9-_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
            const attrs = [];
            let attrMatch;
            let hasItemscope = false;

            while ((attrMatch = attrRegex.exec(attrPart)) !== null) {
                const key = attrMatch[1].toLowerCase();
                const value = attrMatch[2] || attrMatch[3] || attrMatch[4] || "";

                if (key === 'itemscope') {
                    hasItemscope = true;
                    continue;
                }

                // Strict double-double quoting
                attrs.push(`${key}=""${value}""`);
            }

            if (hasItemscope || attrPart.toLowerCase().includes('itemscope')) {
                attrs.unshift('itemscope=""itemscope""');
            }

            return `<${tag}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}>`;
        });


        // Construct the line: ;UID;Content
        lines.push(`;${row.component_Id};"${processedHtml}"`);
    });

    return lines.join('\n').trim();
};