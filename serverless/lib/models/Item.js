const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true }, // Indexed for quicker search
    slug: { type: String, required: true, index: true }, // Indexed for quicker search
    collectionId: { type: String, required: true },
    itemId: { type: String, required: true }
});


const Item = mongoose.model('Item', ItemSchema);

module.exports = Item;
