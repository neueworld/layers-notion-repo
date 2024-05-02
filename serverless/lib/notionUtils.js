const { Client } = require('@notionhq/client');

require('dotenv').config()

const notion = new Client({
    auth: process.env.NOTION_TOKEN, // Set your integration token as an environment variable
});

async function getPageTitle(pageId) {
    try {
      // Fetch the page object based on the page ID
      const response = await notion.pages.retrieve({ page_id: pageId });

      // Corrected to use 'Name' property as per your Notion API structure
      const titleProperty = response.properties.Name;

      if (titleProperty && titleProperty.type === 'title' && titleProperty.title.length > 0) {
        // Retrieve the plain text of the title
        return titleProperty.title[0].plain_text;
      } else {
        // Handle pages that might not have a title or have different structure
        return 'No title found or different structure';
      }
    } catch (error) {
      console.error('Error retrieving page title:', error);
      return null;
    }
}

module.exports = { getPageTitle };
