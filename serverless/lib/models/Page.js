const mongoose = require('mongoose');

// Define the schema
const pageSchema = new mongoose.Schema({
    pageId: {
        type: String,
        required: true,
        unique: true, // Ensures index is unique
        index: true   // Makes this property indexable
    },
    lastUpdated: {
        type: Date,
        required: true
    }
});

// Create the model
const Page = mongoose.model('Page', pageSchema);

module.exports = Page;