const opportunityList = document.getElementById('opportunity-list');
const createForm = document.getElementById('create-opportunity-form');

// Function to fetch all opportunities
async function fetchOpportunities() {
    try {
        const response = await fetch('/opportunities'); // GET route
        const data = await response.json();

        // Render opportunities in the list
        opportunityList.innerHTML = '';
        data.forEach(opportunity => {
            const listItem = document.createElement('li');
            listItem.textContent = `${opportunity.title} - ${opportunity.location}`;
            opportunityList.appendChild(listItem);
        });
    } catch (err) {
        console.error('Error fetching opportunities:', err);
    }
}

async function loadCategories() {
    const categorySelect = document.getElementById('category');
    const response = await fetch('/categories'); // Fetch categories from backend
    const categories = await response.json();

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// Load categories when the page loads
document.addEventListener('DOMContentLoaded', loadCategories);


// Function to handle form submission
createForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const location = document.getElementById('location').value;
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);
    const category = Array.from(document.getElementById('category').selectedOptions)
                          .map(option => option.value);
    const postedBy = document.getElementById('postedBy').value;

    try {
        const response = await fetch('/opportunities/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                location,
                coordinates: { lat, lng },
                category,
                postedBy
            })
        });

        if (response.ok) {
            alert('Opportunity created successfully!');
            fetchOpportunities(); // Refresh the list
            createForm.reset();
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.error}`);
        }
    } catch (err) {
        console.error('Error creating opportunity:', err);
    }
});



// Fetch opportunities on page load
fetchOpportunities();
