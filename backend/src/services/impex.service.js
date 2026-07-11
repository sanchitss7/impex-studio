/**
 * Unified ImpEx Builder
 */
const buildUnifiedImpex = ({ headerConfig, uid, contentMap, selectedLanguage = 'en' }) => {

    const sapLangMap = {
        'en': 'en', 'fr': 'fr_FR', 'de': 'de_DE',
        'es': 'es_ES', 'it': 'it_IT', 'ja': 'ja_JA', 'ko': 'ko_KO'
    };

    const macros = [
        '$contentCatalog=omegaengineeringContentCatalog',
        '$productCatalog=omegaengineeringProductCatalog',
        '$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]',
        '$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default=\'Staged\'])[unique=true,default=$productCatalog:Staged]',
        '',
        '\n'
    ].join('\n');

    const items = Array.isArray(contentMap) ? contentMap : Object.keys(contentMap).map(key => ({
        lang: key,
        content: contentMap[key],
        uid: uid
    }));

    const grouped = items.reduce((acc, item) => {
        const langKey = String(item.lang || 'en').toLowerCase();
        const resolvedLang = sapLangMap[langKey] || langKey;

        if (!acc[resolvedLang]) {
            acc[resolvedLang] = [];
        }

        acc[resolvedLang].push({
            uid: item.uid || uid,
            content: formatContent(item.content, resolvedLang)
        });

        return acc;
    }, {});

    const blocks = Object.keys(grouped).map(lang => {
        // Updated header config with catalog version and path-delimiter
        const header = `UPDATE CMSParagraphComponent;$contentCV[unique=true] ; uid[unique=true]; content[path-delimiter=!][lang=${lang}]`;
        
        // Binds the clean, escaped content in a single pair of outer double quotes
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

    // 1. COLLAPSE WHITESPACE
    val = val.replace(/\s+/g, ' ');

    // 2. BASELINE FLATTENING: Collapse all existing double-double quotes to standard single quotes
    val = val.replace(/""/g, '"');

    // 3. Aggressive cleaning & character normalization
    val = val.replace(/&nbsp;/gi, '').replace(/\u00A0/g, '').replace(/;/g, '');
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

    // 4. Tag and Attribute Key Normalization to Lowercase
    return val.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (match, slash, tagName, attrPart) => {
        const tag = tagName.toLowerCase();
        if (slash) return `</${tag}>`;
        if (!attrPart || !attrPart.trim()) return `<${tag}>`;

        const attrRegex = /([a-zA-Z0-9-_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
        
        let newAttrs = attrPart.replace(attrRegex, (fullMatch, key, val1, val2, val3) => {
            const attrKey = key.toLowerCase();
            const attrVal = val1 || val2 || val3 || "";
            return `${attrKey}="${attrVal}"`;
        });

        return `<${tag}${newAttrs}>`;
    });
};

const formatContent = (str) => {
    // 1. Sanitize the HTML
    let val = sanitizeContent(str).trim();
    
    // 2. Remove all existing leading/trailing quotes so we have a clean slate
    val = val.replace(/^["\s]+|["\s]+$/g, '');
    
    // 3. Escape internal quotes (" -> "")
    val = val.replace(/"/g, '""');
    
    // 4. Return without adding outer quotes (the buildUnifiedImpex function handles the wrapper)
    return val;
};

module.exports = { buildUnifiedImpex, sanitizeContent };