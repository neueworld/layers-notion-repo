const mongoose = require('mongoose');
const Page = require('./models/Page');
const Item = require('./models/Item'); 

const connectToDatabase = async () => {
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.DATABASE_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    }
};

const disconnectDatabase = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
};

const addOrUpdateItem = async (name, slug, collectionId, itemId) => {
    await connectToDatabase();
    try {
      const result = await Item.findOneAndUpdate(
        { itemId: itemId }, // Find an item by itemId
        { name, slug, collectionId, itemId }, // Update these fields
        { new: true, upsert: true, runValidators: true } // Options: create if not exists, return new item
      );
  
      console.log("Item added or updated:", result);
      return result;
    } catch (error) {
      console.error("Failed to add or update item:", error);
      throw error;  // Rethrow or handle error as needed
    } finally {
      await mongoose.disconnect(); // Optionally disconnect if not in serverless
    }
  };

async function createPage(pageId, lastUpdated) {

    await connectToDatabase();
    try {
        const newPage = new Page({
            pageId: pageId,
            lastUpdated: lastUpdated
        });
        await newPage.save();
        console.log('Page saved successfully:', newPage);
    } catch (error) {
        console.error('Error saving the page:', error);
    }finally {
        await mongoose.disconnect(); // Optionally disconnect if not in serverless
      }
}

async function updateLastUpdated(pageId, newLastUpdated) {
    await connectToDatabase();
    try {
        const result = await Page.findOneAndUpdate(
            { pageId: pageId },
            { lastUpdated: newLastUpdated },
            { new: true }  // Returns the updated object
        );
        if (result) {
            console.log('Updated page lastUpdated time successfully:', result);
        } else {
            console.log('No document found with that pageId.');
        }
    } catch (error) {
        console.error('Error updating lastUpdated time:', error);
    }finally {
        await mongoose.disconnect(); // Optionally disconnect if not in serverless
      }
  }
  
async function getItem(pageTitle,slug){

    await connectToDatabase();
       
    try{
        const item = await Item.findOne({ name: pageTitle, slug: slug });
        return item;
    }catch(error){
        console.error('Error updating lastUpdated time:', error);
    }finally{
        await disconnectDatabase()
    }

}
module.exports = {addOrUpdateItem,createPage,updateLastUpdated,connectToDatabase, disconnectDatabase,getItem};
