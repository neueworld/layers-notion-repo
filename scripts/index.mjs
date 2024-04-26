import { Client } from '@notionhq/client';
import { Octokit } from "@octokit/rest";
import {getAllCollectionItems,createCollectionItem} from './webflow.mjs';
import { WebflowClient, Webflow } from 'webflow-api';
import 'dotenv/config'
import axios from 'axios'

// Initialize the Webflow API
const api = new WebflowClient({ token: process.env.WEBFLOW_API_TOKEN }); // Replace 'your_api_token_here' with your actual Webflow API token

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const siteId = "660e763c275e50fdf03ef908";

const octokit = new Octokit({
  auth: process.env.GT_TOKEN
});

function extractContent(blocks) {
    return blocks.map(block => {
      switch (block.type) {
        case 'paragraph':
          return { type: 'paragraph', text: block.paragraph.rich_text.map(text => text.plain_text).join('') };
        case 'image':
          return { type: 'image', url: block.image.file ? block.image.file.url : block.image.external.url };
        case 'heading_1':
          return { type: 'heading_1', text: block.heading_1.rich_text.map(text => text.plain_text).join('') };
        case 'heading_2':
          return { type: 'heading_2', text: block.heading_2.rich_text.map(text => text.plain_text).join('') };
        case 'heading_3':
          return { type: 'heading_3', text: block.heading_3.rich_text.map(text => text.plain_text).join('') };
        default:
          return undefined;
      }
    }).filter(content => content !== undefined);
  }
  
function convertToHTML(data) {
    let htmlContent = "";
  
    data.forEach(item => {
      switch (item.type) {
        case 'paragraph':
          htmlContent += `<p>${item.text}</p>\n`;
          break;
        case 'image':
          htmlContent += `<img src="${item.url}" alt="Image">\n`;
          break;
        case 'heading_1':
          htmlContent += `<h1>${item.text}</h1>\n`;
          break;
        case 'heading_2':
          htmlContent += `<h2>${item.text}</h2>\n`;
          break;
        case 'heading_3':
          htmlContent += `<h3>${item.text}</h3>\n`;
          break;
      }
    });
  
    return htmlContent;
  }
async function updateWebflowItem(collectionId, itemId, richTextContent, itemName, slug) {
    const options = {
      method: 'PATCH',
      url: `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}` // Use your Webflow API token
      },
      data: {
        isArchived: false,
        isDraft: false,
        fieldData: {
          name: itemName,
          slug: slug,
          data: richTextContent
        }
      }
    };
  
    try {
      //await publishCollectionItem(collectionId, [itemId])
      const response = await axios.request(options);
      console.log('Item updated successfully:', response.data);
      return true
    } catch (error) {
        return false;
    
    }
  }

async function getPageTitle(pageId) {
    try {
      const response = await notion.pages.retrieve({ page_id: pageId });
      console.log("Page Title response : ",response)
      const title = response.properties.Name.title[0].plain_text; // Adjust 'Title' according to your page schema
      return title;
    } catch (error) {
      console.error('Error retrieving page title:', error);
      return null;
    }
  }
  async function closeFirstOpenIssue(owner, repo) {
    try {
      // Fetch the list of open issues
      const issues = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: "open"
      });
  
      // Check if there are any open issues
      if (issues.data.length === 0) {
        console.log("No open issues found.");
        return;
      }
  
      // Get the first open issue
      const issue = issues.data[0];
  
      // Close the issue
      const updateResponse = await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issue.number,
        state: "closed"
      });
  
      console.log(`Issue #${issue.number} has been closed.`);
      console.log(`Status: ${updateResponse.status}`);
    } catch (error) {
      console.error("Error closing the issue:", error);
    }
  }
async function getItemData(collectionId, itemId) {
    const options = {
        method: 'GET',
        url: `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`
        }
    };

    try {
        const response = await axios.request(options);
        console.log(response.data);
        return response.data; // Returning the data might be useful for further processing
    } catch (error) {
        console.error('Error fetching item data:', error);
        return null; // Optionally, return null or handle the error as needed
    }
}


(async () => {

  

  const pageId = "c4f87517-def4-4f82-9557-12e4a6b9a2bd";
  const pageTitle = await getPageTitle(pageId)
  const slug = pageTitle.toLowerCase().replace(/\s+/g, '-');

  console.log("The Page Title is : ",pageTitle)

    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 50,
    });


    const pageData = extractContent(response.results);
    console.log(pageData)
    const htmlData = convertToHTML(pageData);


    console.log(htmlData)

   // await updateWebflowItem("6613d5ab30544bc293e55431","661ea66da638b95c8b9e75ea",{ name: pageTitle, slug: slug, data: htmlData })
   // await createCollectionItem('6613d5ab30544bc293e55431', { name: pageTitle, slug: slug, data: htmlData });
   // console.log(`Created collection item with title: ${pageTitle}`);

  const data = await getItemData('6613d5ab30544bc293e55431','661ea66da638b95c8b9e75ea')
  console.log(data)
  //await closeFirstOpenIssue('neueworld','layers-notion-repo')

})();



/**Docs Collection ID: 6613d5ab30544bc293e55431 */

// import axios from 'axios'

// // Endpoint URL of your serverless function
// const functionUrl = 'https://faas-blr1-8177d592.doserverless.co/api/v1/web/fn-b22ceea5-ced4-4583-b687-5a5d7a133dab/sample/hello'; // Update with your function's URL';

// async function callServerlessFunction() {
//   const url = functionUrl
//   const data = {
//       name: 'John'
//   };

//   try {
//       const response = await axios.post(url, data);
//       console.log('Response:', response.data);
//   } catch (error) {
//       console.error('Error calling serverless function:', error.message);
//   }
// }

// callServerlessFunction();

/**
 * 
*/

