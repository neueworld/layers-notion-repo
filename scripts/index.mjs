import { Client } from '@notionhq/client';
import { Octokit } from "@octokit/rest";
import {getAllCollectionItems,createCollectionItem} from './webflow.mjs';
import 'dotenv/config'


const notion = new Client({ auth: process.env.NOTION_API_KEY });
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
  
  
  
async function fetchOpenIssues(owner, repo) {
    try {
      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open'  // Fetch only open issues
      });
      return response.data.map(issue => issue.body); // Returns an array of the body text of each issue
    } catch (error) {
      console.error('Error fetching issues:', error);
      return []; // Return an empty array in case of error
    }
  }
  
async function getPageTitle(pageId) {
    try {
      const response = await notion.pages.retrieve({ page_id: pageId });
      //console.log(response)
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
  
(async () => {

  const issues = await fetchOpenIssues('neueworld', 'layers-notion-repo');
  console.log(issues)
  if (issues.length === 0) {
    console.log("No open issues found.");
    return;
  }

const pageId = issues[0].trim()

  const pageTitle = await getPageTitle(pageId)

  for (const issue of issues) {
    if (!pageTitle) {
      console.log(`Invalid or null page title for page ID ${pageId}`);
      continue; // Skip this issue
    }

    const slug = pageTitle.toLowerCase().replace(/\s+/g, '-');
    const allCollectionItems = await getAllCollectionItems(siteId);


    let existingTitle = false;

    // Loop through each collection and its items to check for duplicate titles
    allCollectionItems.forEach(collection => {
      collection.items.forEach(item => {
        if (item.fieldData.name.toLowerCase() === pageTitle.toLowerCase()) {
          existingTitle = true;
          console.log(`Duplicate found for title: ${pageTitle}`);
        }
      });
    });
  
    if (existingTitle) {
      console.log(`Duplicate slug or title found: ${pageTitle}`);
      continue; // Skip this issue
    }


    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 50,
    });

    if (!response.results || response.results.length === 0) {
      console.log(`No content found for page ID ${pageId}`);
      continue; // Skip this issue
    }

    const pageData = extractContent(response.results);
    const htmlData = convertToHTML(pageData);

    if (!htmlData) {
      console.log(`HTML conversion failed for page ID ${pageId}`);
      continue; // Skip this issue
    }


    await createCollectionItem('6613d5ab30544bc293e55431', { name: pageTitle, slug: slug, data: htmlData });
    console.log(`Created collection item with title: ${pageTitle}`);

  }

  await closeFirstOpenIssue('neueworld','layers-notion-repo')

})();



/**Docs Collection ID: 6613d5ab30544bc293e55431 */

