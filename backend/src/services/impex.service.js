/**
 * Unified ImpEx Builder
 */
const buildUnifiedImpex = ({ headerConfig, uid, contentMap, selectedLanguage = 'en', catalogState = 'Staged' }) => {

    // Standard SAP Language Mapping
    const sapLangMap = {
        'en': 'en',
        'fr': 'fr_FR',
        'de': 'de_DE',
        'es': 'es_ES',
        'it': 'it_IT',
        'ja': 'ja_JA',
        'ko': 'ko_KO'
    };

    // SAP Macros
    const macros = [
        '$contentCatalog=omegaengineeringContentCatalog',
        '$productCatalog=omegaengineeringProductCatalog',
        '$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]',
        '$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default=\'Staged\'])[unique=true,default=$productCatalog:Staged]',
        '', // Empty string adds the required trailing newline
        '\n', // Empty string adds the required trailing newline
    ].join('\n');
    const macros = macrosTemplate.replace(/{{STATE}}/g, catalogState);
    const formatContent = (str, lang) => {
        let val = (typeof str === 'object' && str !== null) ? (str.content || JSON.stringify(str)) : String(str || "");

        val = val.replace(/Translated1: /gi, '');
        let decoded = decodeHtmlEntities(val);
        let cleaned = sanitizeContent(decoded);

        // FRENCH-ONLY CLEANUP: Remove &nbsp; and Unicode spaces entirely
        if (lang && lang.toLowerCase().includes('fr')) {
            cleaned = cleaned.replace(/(&nbsp;|\u00A0)/gi, '');
        }

        let normalized = cleaned.replace(/""/g, '"');
        return normalized.replace(/"/g, '""');
    };

    // 1. Normalize input to a flat array
    const items = Array.isArray(contentMap) ? contentMap : Object.keys(contentMap).map(key => ({
        lang: key,
        content: contentMap[key],
        uid: uid
    }));

    // 2. Group by resolved language
    const grouped = items.reduce((acc, item) => {
        const langKey = String(item.lang || 'en').toLowerCase();
        const resolvedLang = sapLangMap[langKey] || langKey;

        if (!acc[resolvedLang]) acc[resolvedLang] = [];

        acc[resolvedLang].push({
            uid: item.uid || uid,
            content: formatContent(item.content, resolvedLang)
        });
        return acc;
    }, {});

    // 3. Build blocks: Header once per language, followed by all components in that group
    const blocks = Object.keys(grouped).map(lang => {
        const header = `INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${lang}]`;
        const rows = grouped[lang].map(item => `;${item.uid};"${item.content}"`).join('\n');
        return `${header}\n${rows}`;
    }).join('\n\n');

    return { impexData: macros + blocks };
};

const decodeHtmlEntities = (str) => {
    return String(str || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
};

const sanitizeContent = (str) => {
    if (!str) return '';
    let val = String(str);

    // 1. Aggressive cleaning of artifacts
    val = val.replace(/&nbsp;/gi, '').replace(/\u00A0/g, '').replace(/;/g, '').replace(/"\s*"/g, '"').replace(/""+/g, '"');

    // 2. Character normalization
    val = val.replace(/\0/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .replace(/[\u2019\u2018\u201A\u201B]/g, "'")
        .replace(/[«»]/g, '"')
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
        .replace(/[\u2010-\u2015]/g, '-')
        .replace(/[\u00A1]/g, '!')
        .replace(/[\u00B0]/g, '°')
        .replace(/[\uFFFD]/g, '')
        .replace(/[\u00D0]/g, 'Đ')
        .replace(/[\u00D1]/g, 'Ñ')
        .replace(/[\u00D5]/g, 'Õ')
        .replace(/[\u017D]/g, 'Ž')
        .replace(/[\u2039]/g, '<')
        .replace(/[\u203A]/g, '>');

    // 3. Tag and Attribute Normalization
    return val.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (match, slash, tagName, attrPart) => {
        const tag = tagName.toLowerCase();

        // Return closing tags
        if (slash) return `</${tag}>`;

        // Handle self-closing tags
        const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
        const isSelfClosing = selfClosingTags.includes(tag) || attrPart.trim().endsWith('/');

        if (!attrPart || !attrPart.trim()) return `<${tag}${isSelfClosing ? ' />' : '>'}`;

        const attrRegex = /([a-zA-Z0-9-_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
        const attrs = [];
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrPart)) !== null) {
            const key = attrMatch[1].toLowerCase();
            const value = (attrMatch[2] || attrMatch[3] || attrMatch[4] || "").replace(/^["']|["']$/g, '');
            attrs.push(`${key}="${value}"`);
        }

        return `<${tag}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}${isSelfClosing ? ' />' : '>'}`;
    });
};

module.exports = { buildUnifiedImpex, sanitizeContent };