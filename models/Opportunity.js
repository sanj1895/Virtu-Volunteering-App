const mongoose = require('mongoose');

const OpportunitySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    location: String,
    coordinates: { lat: Number, lng: Number }, // For Google Maps API
    category: [String], // Array for categories like Education, Environment
    postedBy: { type: String, required: true }, // Organization ID or email
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Opportunity', OpportunitySchema);
