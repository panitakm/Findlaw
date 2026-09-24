const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if(file.endsWith('.ejs') && !file.includes('navbar.ejs')) results.push(file);
        }
    });
    return results;
}
const swal = `  <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.26.25/dist/sweetalert2.min.css" rel="stylesheet">\n  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.26.25/dist/sweetalert2.all.min.js"></script>\n`;
walk('d:/web/views').forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if(!content.includes('sweetalert2')) {
        content = content.replace('</head>', swal + '</head>');
        fs.writeFileSync(f, content, 'utf8');
    }
});
console.log('done');
