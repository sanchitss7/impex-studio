/**
 * Unified ImpEx Builder
 * @param {Object} options 
 * @param {string} options.uid - Component ID(s)
 * @param {string|Array} options.contentMap - Map of {lang: content} OR Array of {component_Id, content}
 * @param {string} options.headerConfig - Custom header override
 * @param {string} options.selectedLanguage - Language context (defaults to 'en')
 */
const buildUnifiedImpex = ({ headerConfig, uid, displayLang, contentMap, selectedLanguage = 'en' }) => {

    // Helper to format content consistently
    const formatContent = (str) => {
        let val = str || "";

        // 1. Remove any "Translated: " prefixes added by your translation service
        val = val.replace(/Translated1: /gi, '');

        // 2. Decode and Sanitize
        let decoded = decodeHtmlEntities(val);
        let cleaned = sanitizeContent(decoded);

        // 3. Normalize quotes: Flatten "" to " then escape " to ""
        let normalized = cleaned.replace(/""/g, '"');
        return normalized.replace(/"/g, '""');
    };
};

const decodeHtmlEntities = (str) => {
    if (!str) return '';
    return str
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
};

const sanitizeContent = (str) => {
    if (!str) return '';
    let val = String(str);

    // Sanitize characters and HTML tags as before...
    val = val
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

    return val.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName, attrPart) => {
        const tag = tagName.toLowerCase();
        if (match.startsWith('</')) return `</${tag}>`;
        if (!attrPart || !attrPart.trim()) return `<${tag}>`;

        const attrRegex = /([a-zA-Z0-9-_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
        const attrs = [];
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrPart)) !== null) {
            attrs.push(`${attrMatch[1].toLowerCase()}="${attrMatch[2] || attrMatch[3] || attrMatch[4] || ""}"`);
        }
        return `<${tag}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}>`;
    });
};

// --- New Fixer Logic ---
// const fixImpExSyntax = (content) => {
//     return content.split('\n').map(line => {
//         const trimmed = line.trim();
//         // Skip metadata lines (Macros, Headers, Empty lines)
//         if (!trimmed || trimmed.startsWith('$') || trimmed.startsWith('INSERT_UPDATE') || trimmed.startsWith('#')) {
//             return line;
//         }
//         if (!line.includes(';')) return line;

//         const lastSemicolonIndex = line.lastIndexOf(';');
//         const prefix = line.substring(0, lastSemicolonIndex + 1);
//         let cellContent = line.substring(lastSemicolonIndex + 1).trim();

//         // Unwrap if wrapped, then re-escape internal quotes (double them)
//         if (cellContent.startsWith('"') && cellContent.endsWith('"')) {
//             cellContent = cellContent.substring(1, cellContent.length - 1);
//         }

//         return `${prefix}"${cellContent}"`;
//     }).join('\n');
// };

module.exports = {
    buildUnifiedImpex,
    sanitizeContent
};