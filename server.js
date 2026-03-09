require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const { Resend } = require('resend');

const app = express();
const PORT = 3000;
const SECRET_KEY = process.env.JWT_SECRET; // In production, use environment variable
const RESEND_API_KEY = process.env.RESEND_API_KEY; // Resend API Key
const resend = new Resend(process.env.RESEND_API_KEY);
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Serve static files

// Helper to read users
const getUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE);
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Helper to save users
const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Register Endpoint
app.post('/api/auth/register', async (req, res) => {
    console.log('Register request received:', req.body);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const users = getUsers();
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const newUser = {
            id: Date.now(),
            name,
            email,
            password: hashedPassword,
            isVerified: false,
            verificationToken
        };

        users.push(newUser);
        saveUsers(users);

        console.log('Sending email to:', email);
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: 'Verify your CPMS Account',
            html: `<p>Your verification code is: <strong>${verificationToken}</strong></p>`
        });

        if (error) {
            console.error('Resend API Error:', error);
            // Don't fail the registration if email fails, but maybe warn?
            // Or better, fail it so user knows.
            // But since user is saved... maybe we should revert save?
            // For now, let's just Log it.
            return res.status(500).json({ message: 'Error sending verification email: ' + error.message });
        }

        console.log('Email sent successfully:', data);
        res.status(201).json({ message: 'User registered. Please check your email for verification code.' });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Verify Email Endpoint
app.post('/api/auth/verify-email', (req, res) => {
    const { email, code } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });
    if (user.verificationToken !== code) return res.status(400).json({ message: 'Invalid verification code' });

    user.isVerified = true;
    user.verificationToken = null; // Clear token
    saveUsers(users);

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ message: 'Email verified successfully', token, user: { name: user.name, email: user.email } });
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
        return res.status(403).json({ message: 'Account not verified. Please verify your email.', needsVerification: true });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, user: { name: user.name, email: user.email } });
});

// Protected Route Example
app.get('/api/auth/me', (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const verified = jwt.verify(token.split(" ")[1], SECRET_KEY);
        res.json(verified);
    } catch (err) {
        res.status(400).json({ message: 'Invalid token' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
