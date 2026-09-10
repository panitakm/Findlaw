const fs = require('fs');

let content = fs.readFileSync('js/adminDashboard.js', 'utf8');

// Insert getAuthHeaders at the top
if (!content.includes('getAuthHeaders')) {
    content = `const getAuthHeaders = () => ({ 'Authorization': 'Bearer ' + Auth.getToken(), 'Content-Type': 'application/json' });\n` + content;
}

// Replace simple GET fetches
content = content.replace(/fetch\('http:\/\/localhost:3000\/admin([^']+)'\)/g, "fetch('http://localhost:3000/admin$1', { headers: getAuthHeaders() })");

// Replace fetches with existing options objects
// fetch('http://localhost:3000/admin/users/' + id, { method: 'DELETE' })
content = content.replace(/fetch\('http:\/\/localhost:3000\/admin([^,]+),\s*\{/g, "fetch('http://localhost:3000/admin$1, { headers: getAuthHeaders(), ");

fs.writeFileSync('js/adminDashboard.js', content);
