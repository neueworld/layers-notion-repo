const axios = require('axios');
const { Client } = require('@notionhq/client');
const mongoose = require('mongoose');
const {createPage,updateLastUpdated} = require('../../lib/databaseUtils');
const Page = require('../../lib/models/Page');
require('dotenv').config()

const notion = new Client({
    auth: process.env.NOTION_TOKEN, // Set your integration token as an environment variable
});


const connectToDatabase = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  return mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });
};


const disconnectDatabase = async () => {
  await mongoose.disconnect();
};

async function main() {

  await connectToDatabase()
  const updatedPages = [];

  try {
      // Fetch all pages from the Notion database
      const response = await notion.databases.query({
          database_id: process.env.NOTION_DATABASE_ID
      });

      // Iterate over each page from Notion
      for (let page of response.results) {
          const pageId = page.id;
          const lastEditedTime = new Date(page.last_edited_time);

          // Check if the page exists in the MongoDB
          let dbPage = await Page.findOne({ pageId: pageId });

          if (!dbPage) {
              // If the page does not exist, create it
              await createPage(pageId, lastEditedTime);
              updatedPages.push(pageId);
          } else {
              // If the page exists, compare the last updated times
              if (dbPage.lastUpdated < lastEditedTime) {
                  // If the fetched last updated time is newer, update the database
                  await updateLastUpdated(pageId, lastEditedTime);
                  updatedPages.push(pageId);
              }
              // If times are the same, do nothing
          }
      }
      console.log('Updated Pages:', updatedPages);

      if (updatedPages.length > 0) {
        await axios.post(process.env.ACTION_URL, {
            updatedPages: updatedPages
        });
        console.log('Updated pages sent to serverless function.');
    } else {
        console.log('No updates to send.');
    }
  } catch (error) {
      console.error('Error in main function:', error);
  }finally{
    await disconnectDatabase()
  }
}

main();




