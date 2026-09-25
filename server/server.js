const express = require('express');
const cors = require('cors');

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }))

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


const serverPort = 3000;

app.listen(serverPort, () => {  
  console.log(`Server is running at: http://localhost:${serverPort}/`);  
})