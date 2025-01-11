const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Organization name
    email: { type: String, required: true, unique: true }, // Email for login
    description: { type: String }, // Description of the organization
    createdAt: { type: Date, default: Date.now } // Timestamp
});

module.exports = mongoose.model('Organization', OrganizationSchema);
