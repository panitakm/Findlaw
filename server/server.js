const express = require('express');
const cors = require('cors');

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use('/uploads', express.static('uploads'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '..')));

// Web Page Routes
app.get('/sign_in', (req, res) => { res.render('sign_in'); });
app.get('/sign_up', (req, res) => { res.render('sign_up'); });
app.get('/lawyers', (req, res) => { res.render('lawyers'); });
app.get('/lawyer_profile', (req, res) => { res.render('lawyer/lawyer_profile'); });
app.get('/admin_dashboard', (req, res) => { res.render('admin/admin_dashboard'); });
app.get('/lawyer_dashboard', (req, res) => { res.render('lawyer/lawyer_dashboard'); });
app.get('/lawyer_edit', (req, res) => { res.render('lawyer/lawyer_edit'); });
app.get('/lawyer_reviews', (req, res) => { res.render('lawyer/lawyer_reviews'); });
app.get('/lawyer_signup', (req, res) => { res.render('lawyer/lawyer_signup'); });
app.get('/favorites', (req, res) => { res.render('user/favorites'); });
app.get('/user_reviews', (req, res) => { res.render('user/user_reviews'); });
app.get('/profile', (req, res) => { res.render('user/profile'); });
app.get('/', (req, res) => { res.render('index'); });

// Utils and DB
const db = require('./config/db');

// Import Routes
const userRoutes = require('./routes/userRoutes');
const lawyerRoutes = require('./routes/lawyerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

// Use Routes
app.use('/', userRoutes);
app.use('/', lawyerRoutes);
app.use('/', adminRoutes);
app.use('/', reviewRoutes);

// Initialize saved_lawyers table
(async () => {
    try {
        await db.promise().query(`
            CREATE TABLE IF NOT EXISTS saved_lawyers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                lawyer_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_save (user_id, lawyer_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (lawyer_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    } catch (err) {
        console.error("Error creating saved_lawyers table:", err);
    }
})();


const serverPort = 3000;

app.listen(serverPort, () => {  
  console.log(`Server is running at: http://localhost:${serverPort}/`);  
})