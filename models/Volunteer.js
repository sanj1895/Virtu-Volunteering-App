const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    age: { type: Number, required: false }, // Make age optional
    preferences: { type: [String], default: [] }, // Initialize empty preferences
    registrationDate: { type: Date, default: Date.now } // Automatically track registration date
});

module.exports = mongoose.model('Volunteer', volunteerSchema);


