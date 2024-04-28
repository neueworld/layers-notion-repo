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
     // console.log("Page Title response : ",response)
      const notionPageObject = response.properties;
      const pageTitle = notionPageObject.Name.title[0].plain_text;
      const type = notionPageObject.Type.select.name;
      const tags = notionPageObject.Tags.select.name;
      const categories = notionPageObject.Category.multi_select.map(cat => cat.name);
    
      return {
        pageTitle,
        type,
        tags,
        categories,
      };

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

const connectToDatabase = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  return mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });
};


const disconnectDatabase = async () => {
  await mongoose.disconnect();
};

const createCollectionItemV2 = async (collectionId,fieldData) => {
  const options = {
    method: 'POST',
    url: `https://api.webflow.com/v2/collections/${collectionId}/items/`,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}` // Replace with your Webflow API token
    },
    data: {
      isArchived: false,
      isDraft: false,
      fieldData: fieldData
    }
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

async function getCollectionItem(collectionId, itemId) {
    const options = {
        method: 'GET',
        url: `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`  // Replace 'your-webflow-api-token' with your actual Webflow API token
        }
    };

    try {
        const response = await axios.request(options);
        console.log(response.data);
        return response.data;  // Returns the entire item data
    } catch (error) {
        console.error('Error retrieving collection item:', error.message);
        throw new Error(error);
    }
}

(async () => {

   const item = await getCollectionItem("6613d5ab30544bc293e55431","662e31563352ee28d8ca4e55")
   console.log(item.fieldData.data)
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

