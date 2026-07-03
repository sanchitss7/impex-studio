/**
 * Converts ImpEx rows to an HTML file structure with Google Sans font.
 */
function convertImpexToHtml(impexContent, lang) {
    if (!impexContent) return "";
    
    const lines = impexContent.split('\n');
    let currentLang = lang || 'EN';
    
    let htmlOutput = `<!DOCTYPE html>
<html lang="${currentLang.split('_')[0]}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lang} Translation</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet">
    <style>
        body { font-family: "Google Sans", sans-serif; padding: 20px; line-height: 1.6; }
        h3 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 20px; }
        .content-box { margin-bottom: 30px; }
    </style>
</head>
<body>\n`;

    lines.forEach(line => {
        if (line.startsWith('INSERT_UPDATE')) {
            const langMatch = line.match(/content\[lang=([^\]]+)\]/);
            if (langMatch && langMatch[1]) currentLang = langMatch[1];
            return;
        }

        if (!line.trim() || line.startsWith('$')) return;

        const parts = line.split(';');
        if (parts.length >= 3) {
            const uid = parts[1];
            let content = parts.slice(2).join(';'); 
            content = content.replace(/""/g, '"').replace(/^"|"$/g, '');
            htmlOutput += `<div class="content-box"><h3>${uid} (${currentLang})</h3>\n${content}</div>\n\n`;
        }
    });

    htmlOutput += `</body>\n</html>`;
    return htmlOutput;
}

module.exports = { convertImpexToHtml };