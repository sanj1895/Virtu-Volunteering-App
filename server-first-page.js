const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();

let volunteerServerProcess = null;
let organizationServerProcess = null;

// Serve selection page
app.get('/', (req, res) => {
    res.send(`
        <h1>Welcome to Virtu</h1>
        <p>Are you a Volunteer or an Organization?</p>
        <a href="/volunteer">
            <button style="background-color: #4CAF50; color: white; padding: 10px 20px; font-size: 16px; cursor: pointer;">I am a Volunteer</button>
        </a>
        <a href="/organization">
            <button style="background-color: #4285F4; color: white; padding: 10px 20px; font-size: 16px; cursor: pointer;">I am an Organization</button>
        </a>
    `);
});

// Start volunteer server
app.get('/volunteer', (req, res) => {
    if (!volunteerServerProcess) {
        console.log('Starting Volunteer Server...');
        volunteerServerProcess = spawn('node', [path.join(__dirname, 'server.js')], { stdio: 'inherit' });
        volunteerServerProcess.on('exit', (code) => {
            console.log(`Volunteer Server exited with code ${code}`);
            volunteerServerProcess = null;
        });
    }
    res.redirect('http://localhost:3000');
});

// Start organization server
app.get('/organization', (req, res) => {
    if (!organizationServerProcess) {
        console.log('Starting Organization Server...');
        organizationServerProcess = spawn('node', [path.join(__dirname, 'server_organizations.js')], { stdio: 'inherit' });
        organizationServerProcess.on('exit', (code) => {
            console.log(`Organization Server exited with code ${code}`);
            organizationServerProcess = null;
        });
    }
    res.redirect('http://localhost:3001');
});

// Start router server
const PORT = 5050;
app.listen(PORT, () => {
    console.log(`Router server is running on http://localhost:${PORT}`);
});
