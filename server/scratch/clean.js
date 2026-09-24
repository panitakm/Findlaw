const fs = require('fs');
let code = fs.readFileSync('d:/web/server/server.js', 'utf8');

const blocksToRemove = [
  /app\.post\('\/user\/register'[\s\S]*?\n\}\);\n/,
  /app\.get\('\/users\/:id\/edit'[\s\S]*?\n\}\);\n/,
  /app\.put\('\/users\/update\/:id'[\s\S]*?\n\}\);\n/,
  /app\.post\('\/login'[\s\S]*?\n\}\);\n/,
  /app\.get\('\/users\/:id',[\s\S]*?\n\}\);\n/,
  /app\.get\('\/users\/:id\/favorites'[\s\S]*?\n\}\);\n/,
  /app\.post\('\/users\/favorites'[\s\S]*?\n\}\);\n/,
  /app\.delete\('\/users\/favorites'[\s\S]*?\n\}\);\n/,
  /app\.get\('\/users\/:id\/reviews'[\s\S]*?\n\}\);\n/
];

for (let regex of blocksToRemove) {
    code = code.replace(regex, '');
}

code = code.replace(
    "const db = require('./config/db');",
    "const db = require('./config/db');\n\nconst userRoutes = require('./routes/userRoutes');\napp.use('/', userRoutes);"
);

fs.writeFileSync('d:/web/server/server.js', code);
console.log('User routes cleaned from server.js');
