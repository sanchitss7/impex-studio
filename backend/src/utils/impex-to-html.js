/**
 * Converts ImpEx rows to an HTML file structure.
 * @param {string} impexContent - The raw ImpEx string.
 * @param {string} lang - The language code (e.g., 'it_IT').
 */
function convertImpexToHtml(impexContent, lang) {
    if (!impexContent) return "";
    
    const lines = impexContent.split('\n');
    let htmlOutput = `<!DOCTYPE html>
<html lang="${lang ? lang.split('_')[0] : 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lang} Translation</title>
</head>
<body>\n`;

    lines.forEach(line => {
        // Skip header lines or empty lines
        if (!line.trim() || line.startsWith('INSERT_UPDATE') || line.startsWith('$')) return;

        // Parse: ;uid;content
        const parts = line.split(';');
        if (parts.length >= 3) {
            const uid = parts[1]; // Get UID
            // Join parts from index 2 onwards to ensure content with semicolons is kept intact
            let content = parts.slice(2).join(';'); 
            
            // Clean up double-double quotes for standard HTML display
            content = content.replace(/""/g, '"');
            
            // Remove leading/trailing quotes if the ImpEx wrapped the whole content
            content = content.replace(/^"|"$/g, '');

            htmlOutput += `<hr><br><h3>${uid}</h3>\n${content}\n\n`;
        }
    });

    htmlOutput += `</body>\n</html>`;
    return htmlOutput;
}

module.exports = { convertImpexToHtml };