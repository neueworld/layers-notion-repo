const { extractContent, convertToHTML } = require('../contentUtils');  // Assuming contentUtils already exists
const { Client } = require('@notionhq/client');

require('dotenv').config()

const notion = new Client({
    auth: process.env.NOTION_TOKEN, // Set your integration token as an environment variable
});

async function processNotionContent(pageId) {
    const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 50,
    });
    const pageData = extractContent(response.results);
    const htmlData = convertToHTML(pageData);
    if (!htmlData) {
        throw new Error('HTML conversion failed');
    }
    return htmlData;
}

module.exports = {
    processNotionContent
};
