const express = require('express'); // Import Express
const bodyParser = require('body-parser'); // Import Body Parser
const mongoose = require('mongoose'); // Import Mongoose
const session = require('express-session'); // Import Express Session
const passport = require('passport'); // Import Passport
const GoogleStrategy = require('passport-google-oauth20').Strategy; // Import Google OAuth Strategy
require('dotenv').config(); // Import dotenv to handle environment variables
const Opportunity = require('./models/Opportunity'); // Ensure correct path to Opportunity model

const app = express(); // Create an Express app

app.use(bodyParser.json()); // Middleware to parse JSON data

// Middleware for sessions
app.use(session({
    secret: 'secret', 
    resave: true, // Ensure sessions persist
    saveUninitialized: true, // Save uninitialized sessions
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1); // Exit if MongoDB connection fails
    });

// Volunteer Model
const Volunteer = require('./models/Volunteer');

// Serialize and deserialize user for session
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    passReqToCallback: true, // Allows access to req
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        console.log(`OAuth Callback: Checking user with email: ${email}`);

        // Check if the user already exists in the database
        const volunteer = await Volunteer.findOne({ email });

        if (volunteer) {
            console.log(`OAuth Callback: Existing user found - ${volunteer.name}`);
            return done(null, volunteer); // Existing user
        }

        // New user detected
        console.log('OAuth Callback: New user detected.');
        return done(null, { newUser: true, email, name: profile.displayName });
    } catch (err) {
        console.error('Error during OAuth callback:', err);
        return done(err, null);
    }
}));

// Homepage Route with Register and Sign-In Buttons
app.get('/', (req, res) => {
    const errorMessage = req.query.error || ''; // Check if there's an error message

    res.send(`
        <h1>Welcome to Virtu, the gamified volunteering App!</h1>
        <p>Click the appropriate button below to get started:</p>
        
        ${errorMessage ? `<p style="color: red;">${errorMessage}</p> `: ''}
        
        <a href="/auth/google?mode=register">
            <button style="background-color: #4CAF50; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                Register
            </button>
        </a>

        <a href="/auth/google?mode=signin">
            <button style="background-color: #4285F4; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 5px; cursor: pointer;">
                Sign In
            </button>
        </a>
    `);
});

// Google OAuth callback route
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    async (req, res) => {
        // Retrieve the session mode
        let mode = req.session.mode || 'signin';
        console.log(`OAuth Callback: Initial mode is ${mode}`);
        console.log(`OAuth Callback: User Data -, req.user`);

        if (req.user) {
            const userExists = !req.user.newUser; // True if user exists

            if (req.user.newUser) {
                // New user detected - switch mode to 'register'
                console.log('OAuth Callback: New user detected. Switching mode to register.');
                mode = 'register';
                req.session.mode = 'register';
                return res.redirect(`/complete-profile?email=${req.user.email}&name=${req.user.name}`);
            }

            if (userExists) {
                // Existing user trying to register again - switch mode to 'signin'
                if (mode === 'register') {
                    console.log('OAuth Callback: Existing user detected. Switching mode to signin.');
                    mode = 'signin';
                    req.session.mode = 'signin';
                }
                console.log('OAuth Callback: Existing user signing in. Redirecting to dashboard.');
                return res.redirect('/dashboard');
            }
        }

        // Fallback for unexpected cases
        console.error('OAuth Callback: Unhandled case. req.user data is missing or invalid.');
        res.redirect('/?error=Unexpected error occurred. Please try again.');
    }
);


// Route to initiate Google OAuth
app.get('/auth/google',
    (req, res, next) => {
        const mode = req.query.mode || 'signin';
        req.session.mode = mode; // Store mode in session
        console.log(`Auth Route: Mode set to ${mode}`);
        next();
    },
    passport.authenticate('google', { 
        scope: ['profile', 'email']
    })
);

// User Dashboard Route
app.get('/dashboard', async (req, res) => {
    if (!req.user) {
        console.log('Dashboard: No user in session. Redirecting to homepage.');
        return res.redirect('/');
    }

    try {
        const name = req.user.name || 'User';
        const email = req.user.email || 'Unknown';
        const userPreferences = req.user.preferences || [];

        // Fetch a limited number of opportunities matching user preferences
        const opportunities = await Opportunity.find({
            category: { $in: userPreferences }
        }).limit(5);

        // Generate HTML for opportunities
        const opportunitiesHTML = opportunities.map(op => `
            <li>
                <strong>${op.title}</strong><br>
                ${op.description}<br>
                Location: ${op.location}<br>
                Categories: ${op.category.join(', ')}<br>
            </li>
        `).join('');

        // Render the dashboard
        res.send(`
            <h1>Welcome, ${name}!</h1>
            <p>Email: ${email}</p>
            <p>Thank you for joining Virtu, the gamified volunteering App!</p>

            <!-- Recommended Opportunities Section -->
            <h2>Recommended Opportunities:</h2>
            <ul>${opportunitiesHTML}</ul>

            <!-- View More Opportunities Button -->
            <a href="/opportunities">
                <button style="
                    background-color: #4CAF50; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    font-size: 16px; 
                    border-radius: 5px; 
                    cursor: pointer;">
                    View More Opportunities
                </button>
            </a>

            <!-- Other Dashboard Features -->
            <form method="GET" action="/edit-profile">
                <button type="submit" style="
                    background-color: #FFC107; 
                    color: black; 
                    border: none; 
                    padding: 10px 20px; 
                    font-size: 16px; 
                    border-radius: 5px; 
                    cursor: pointer;">
                    Edit Profile
                </button>
            </form>

            <form method="GET" action="/logout">
                <button type="submit" style="
                    background-color: #4CAF50; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    font-size: 16px; 
                    border-radius: 5px; 
                    cursor: pointer;">
                    Logout
                </button>
            </form>

            <form method="POST" action="/delete-account" 
                  onsubmit="return confirm('Are you sure you want to delete your account? This action is irreversible.');">
                <button type="submit" style="
                    background-color: #FF6347; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    font-size: 16px; 
                    border-radius: 5px; 
                    cursor: pointer;">
                    Delete Account
                </button>
            </form>
        `);
    } catch (err) {
        console.error('Error fetching opportunities:', err);
        res.status(500).send('<h1>Something went wrong while loading your dashboard.</h1>');
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            console.error('Logout: Error during logout:', err);
            return res.redirect('/dashboard?error=Logout failed. Please try again.');
        }

        // Destroy the session
        req.session.destroy(err => {
            if (err) {
                console.error('Logout: Error destroying session:', err);
                return res.redirect('/dashboard?error=Session cleanup failed. Please try again.');
            }

            console.log('Logout: User successfully logged out.');
            res.redirect('/?message=You have been logged out successfully.');
        });
    });
});


// Complete Profile Page Route
app.get('/complete-profile', (req, res) => {
    const { email, name } = req.query; // Pre-fill form with Google data

    res.send(`
        <h1>Complete Your Profile</h1>
        <form method="POST" action="/complete-profile">
            <input type="hidden" name="email" value="${email || ''}" />
            
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" value="${name || ''}" readonly /><br><br>
            
            <label for="age">Age:</label>
            <input type="number" id="age" name="age" required /><br><br>
            
            <label for="preferences">Select Volunteering Preferences:</label>
            <select id="preferences" name="preferences" multiple required>
                <option value="Environment">Environment</option>
                <option value="Education">Education</option>
                <option value="Animal Welfare">Animal Welfare</option>
                <option value="Community Support">Community Support</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Technology">Technology</option>
                <option value="Arts & Culture">Arts & Culture</option>
            </select><br><br>
            
            <small>Hold down Ctrl (Windows) or Command (Mac) to select multiple options.</small><br><br>

            <button type="submit">Submit</button>
        </form>
    `);
});

app.use(bodyParser.urlencoded({ extended: true })); // Parses form data

// Complete Profile POST Route
app.post('/complete-profile', async (req, res) => {
    const { email, name, age, preferences } = req.body;

    try {
        console.log('Complete Profile: Form Data Received:', { email, name, age, preferences });

        // Validate required fields
        if (!email || !name || !age) {
            console.log('Complete Profile: Missing required fields.');
            return res.redirect('/?error=Please fill out all required fields.');
        }

        // Handle preferences (convert to an array if not already)
        const preferencesArray = Array.isArray(preferences) ? preferences : [preferences];
        console.log('Complete Profile: Processed Preferences:', preferencesArray);

        // Check if user already exists
        let volunteer = await Volunteer.findOne({ email });
        if (volunteer) {
            console.log('Complete Profile: User already exists, redirecting to dashboard.');
            return res.redirect('/dashboard');
        }

        // Create a new volunteer user
        volunteer = new Volunteer({
            email,
            name,
            age,
            preferences: preferencesArray
        });

        await volunteer.save();

        console.log('Complete Profile: New volunteer profile created successfully.');
        req.session.mode = 'signin'; // Switch session mode to 'signin'
        req.login(volunteer, err => {
            if (err) {
                console.error('Complete Profile: Login error:', err);
                return res.redirect('/?error=Error logging in after registration.');
            }
            res.redirect('/dashboard');
        });
    } catch (err) {
        console.error('Complete Profile: Error saving profile:', err);
        res.redirect('/?error=An unexpected error occurred. Please try again.');
    }
});


// Delete Account Route with Logout
app.post('/delete-account', async (req, res) => {
    if (!req.user) {
        console.log('Delete Account: No user in session. Redirecting to homepage.');
        return res.redirect('/'); // Redirect if not logged in
    }

    try {
        const email = req.user.email;
        console.log(`Delete Account: Attempting to delete account for ${email}`);

        // Delete the user from the database
        await Volunteer.deleteOne({ email });
        console.log(`Delete Account: Successfully deleted account for ${email}`);

        // Log out the user and destroy the session
        req.logout(err => {
            if (err) {
                console.error('Delete Account: Logout error:', err);
                return res.redirect('/?error=Account deleted, but logout failed.');
            }

            req.session.destroy(err => {
                if (err) {
                    console.error('Delete Account: Error destroying session:', err);
                    return res.redirect('/?error=Account deleted, but session cleanup failed.');
                }

                console.log('Delete Account: Session destroyed. Redirecting to homepage.');
                res.redirect('/?error=Your account has been deleted successfully.');
            });
        });
    } catch (err) {
        console.error('Delete Account: Error deleting account:', err);
        res.redirect('/dashboard?error=An error occurred while deleting your account. Please try again.');
    }
});

// Edit Profile GET Route
app.get('/edit-profile', (req, res) => {
    if (!req.user) {
        console.log('Edit Profile: No user in session. Redirecting to homepage.');
        return res.redirect('/');
    }

    const { name, age, preferences } = req.user;

    res.send(`
        <h1>Edit Your Profile</h1>
        <form method="POST" action="/edit-profile">
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" value="${name}" required /><br><br>
            
            <label for="age">Age:</label>
            <input type="number" id="age" name="age" value="${age || ''}" required /><br><br>

            <label for="preferences">Volunteering Preferences:</label>
            <select id="preferences" name="preferences" multiple>
                <option value="Environment" ${preferences?.includes('Environment') ? 'selected' : ''}>Environment</option>
                <option value="Education" ${preferences?.includes('Education') ? 'selected' : ''}>Education</option>
                <option value="Animal Welfare" ${preferences?.includes('Animal Welfare') ? 'selected' : ''}>Animal Welfare</option>
                <option value="Community Support" ${preferences?.includes('Community Support') ? 'selected' : ''}>Community Support</option>
                <option value="Healthcare" ${preferences?.includes('Healthcare') ? 'selected' : ''}>Healthcare</option>
                <option value="Technology" ${preferences?.includes('Technology') ? 'selected' : ''}>Technology</option>
                <option value="Arts & Culture" ${preferences?.includes('Arts & Culture') ? 'selected' : ''}>Arts & Culture</option>
            </select><br><br>

            <small>Hold down Ctrl (Windows) or Command (Mac) to select multiple options.</small><br><br>
            <button type="submit">Save Changes</button>
        </form>
    `);
});

// Edit Profile POST Route
app.post('/edit-profile', async (req, res) => {
    if (!req.user) {
        console.log('Edit Profile: No user in session. Redirecting to homepage.');
        return res.redirect('/');
    }

    const { name, age, preferences } = req.body;

    try {
        console.log('Edit Profile: Received data:', { name, age, preferences });

        // Convert preferences into an array (if not already)
        const preferencesArray = Array.isArray(preferences) ? preferences : [preferences];

        // Update user data in the database
        await Volunteer.updateOne(
            { email: req.user.email },
            { $set: { name, age, preferences: preferencesArray } }
        );

        // Update the session user object to reflect the changes
        req.user.name = name;
        req.user.age = age;
        req.user.preferences = preferencesArray;

        console.log('Edit Profile: Profile updated successfully.');
        res.redirect('/dashboard?message=Profile updated successfully.');
    } catch (err) {
        console.error('Edit Profile: Error updating profile:', err);
        res.redirect('/edit-profile?error=An error occurred while updating your profile.');
    }
});

const opportunityRoutes = require('./routes/opportunities'); // Import opportunity routes
app.use('/opportunities', opportunityRoutes); // Base route for opportunities

const path = require('path');

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));



// Start the Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});