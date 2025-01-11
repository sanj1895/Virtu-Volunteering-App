const express = require('express');
const router = express.Router();
const Opportunity = require('../models/Opportunity'); // Import the Opportunity model
const categories = require('../constants/categories'); // Import predefined categories

// Route to fetch all opportunities and render them as styled HTML
router.get('/', async (req, res) => {
    try {
        // Fetch all opportunities
        const opportunities = await Opportunity.find();

        // Generate HTML for each opportunity
        const opportunitiesHTML = opportunities.map(op => `
            <div style="border: 1px solid #ccc; border-radius: 10px; padding: 15px; margin-bottom: 20px; max-width: 600px; background-color: #f9f9f9;">
                <h2>${op.title}</h2>
                <p><strong>Description:</strong> ${op.description}</p>
                <p><strong>Location:</strong> ${op.location}</p>
                <p><strong>Categories:</strong> ${op.category.join(', ')}</p>
                <p><strong>Posted By:</strong> ${op.postedBy}</p>
                <p><strong>Created At:</strong> ${new Date(op.createdAt).toLocaleString()}</p>
            </div>
        `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Volunteer Opportunities</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        padding: 0;
                        background-color: #f4f4f9;
                    }
                    h1 {
                        text-align: center;
                        color: #333;
                    }
                </style>
            </head>
            <body>
                <h1>Volunteer Opportunities</h1>
                ${opportunitiesHTML}
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Error fetching opportunities:', err);
        res.status(500).send('Failed to fetch opportunities.');
    }
});

// Route to create a new opportunity
router.post('/create', async (req, res) => {
    const { title, description, location, coordinates, category, postedBy } = req.body;

    try {
        // Validate category against predefined categories
        const invalidCategories = category.filter(cat => !categories.includes(cat));
        if (invalidCategories.length > 0) {
            return res.status(400).json({
                error: `Invalid categories: ${invalidCategories.join(', ')}`
            });
        }

        // Create a new opportunity
        const newOpportunity = new Opportunity({
            title,
            description,
            location,
            coordinates,
            category,
            postedBy
        });

        await newOpportunity.save();
        res.status(201).json({ message: 'Opportunity created successfully!', opportunity: newOpportunity });
    } catch (err) {
        console.error('Error creating opportunity:', err);
        res.status(500).json({ error: 'Failed to create opportunity' });
    }
});

// Route to render an HTML form for creating opportunities
router.get('/create', (req, res) => {
    const categoriesList = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Create Opportunity</title>
        </head>
        <body>
            <h1>Create a New Opportunity</h1>
            <form method="POST" action="/opportunities/create">
                <label>Title:</label>
                <input type="text" name="title" required><br><br>

                <label>Description:</label>
                <input type="text" name="description" required><br><br>

                <label>Location:</label>
                <input type="text" name="location" required><br><br>

                <label>Latitude:</label>
                <input type="number" step="any" name="coordinates[lat]" required><br><br>

                <label>Longitude:</label>
                <input type="number" step="any" name="coordinates[lng]" required><br><br>

                <label>Category:</label>
                <select name="category" multiple required>
                    ${categoriesList}
                </select>
                <small>Hold down Ctrl (Windows) or Command (Mac) to select multiple categories.</small><br><br>

                <label>Posted By (email):</label>
                <input type="email" name="postedBy" required><br><br>

                <button type="submit">Create Opportunity</button>
            </form>
        </body>
        </html>
    `);
});

// Route to edit an existing opportunity
router.put('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        // Validate category if it's part of the update
        if (updateData.category) {
            const invalidCategories = updateData.category.filter(cat => !categories.includes(cat));
            if (invalidCategories.length > 0) {
                return res.status(400).json({
                    error: `Invalid categories: ${invalidCategories.join(', ')}`
                });
            }
        }

        const updatedOpportunity = await Opportunity.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ message: 'Opportunity updated!', opportunity: updatedOpportunity });
    } catch (err) {
        console.error('Error updating opportunity:', err);
        res.status(500).json({ error: 'Failed to update opportunity' });
    }
});

// Route to delete an opportunity
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await Opportunity.findByIdAndDelete(id);
        res.status(200).json({ message: 'Opportunity deleted successfully!' });
    } catch (err) {
        console.error('Error deleting opportunity:', err);
        res.status(500).json({ error: 'Failed to delete opportunity' });
    }
});

module.exports = router;
