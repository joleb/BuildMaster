import axios, { isAxiosError } from 'axios';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';

const url = 'https://wiki.guildwars.com/wiki/Skill_template_format/Skill_list';

type Skill = {
  id: string;
  name: string;
  additionalDetails: {
    attribute?: string;
    description?: string;
    imageUrl?: string;
    imageAbsoluteUrl?: string;
    type?: string;
    skillUrl?: string;
  };
};

// Ensure the images/skill folder exists
const imageFolderPath = path.join(__dirname, 'images', 'skill');
if (!fs.existsSync(imageFolderPath)) {
  fs.mkdirSync(imageFolderPath, { recursive: true });
}

axios.get(url)
  .then(async (response) => {
    if (response.status === 200) {
      const $ = load(response.data);
      const skills: Array<Skill> = [];
      const elements: Array<Element> = [];
      $('tr').slice(1).each((_, element) => {
        elements.push(element);
      });
      await Promise.all(elements.map(async (element) => {
        // stop at 10
        //if (index > 10) return;
        const columns = $(element).find('td');
        const skillId = columns.eq(0).text().trim();
        const skillLink = columns.eq(1).find('a');
        const skillName = skillLink.text().trim();
        const skillUrl = skillLink.attr('href');

        console.log(`Scraping ${skillName} (${skillId})... ${skillUrl}`);
        // Follow the link to get additional details

        const details = skillUrl ? await scrapeSkillDetails(`https://wiki.guildwars.com${skillUrl}`) : {};

        skills.push({
          id: skillId,
          name: skillName,
          additionalDetails: {
            ...details,
            skillUrl: `https://wiki.guildwars.com${skillUrl}`, // Add the link to the skill itself
          },
        });

        // Download the skill image
        if (details.imageAbsoluteUrl) {
          await downloadImage(details.imageAbsoluteUrl, skillId);
        }
      }));

      // Save the data to a JSON file
      const jsonData = JSON.stringify({ skills }, null, 2);
      fs.writeFileSync('guild_wars_skills_with_details.json', jsonData);

      console.log('Data has been successfully scraped and saved to guild_wars_skills_with_details.json.');
    } else {
      console.error(`Failed to retrieve data. Status code: ${response.status}`);
    }
  })
  .catch(error => {
    console.error(`Error: ${error.message}`);
  });

const scrapeSkillDetails = async (skillUrl: string) => {
  try {
    const response = await axios.get(skillUrl);
    if (response.status === 200) {
      const $ = load(response.data);
      console.log(`Scraping ${skillUrl}...`);

      // Extract attribute details from the linked page
      const attributeElement = $('dl dt:contains("Attribute") + dd a');
      const attribute = attributeElement.text().trim();

      // Extract type and description
      const typeAndDescriptionElement = $('div.noexcerpt>p').first();
      const typeAndDescription = typeAndDescriptionElement.text().trim();
      const typeEndIndex = typeAndDescription.indexOf('.');
      // remove the period if it exists
      const type = typeAndDescription.slice(0, typeEndIndex).replace('.', '');
      const description = typeAndDescription.slice(typeEndIndex + 1).trim();

      // Extract image URL
      const imageUrl = $('.skill-image img').attr('src');
      // Construct the absolute URL for the image
      const imageAbsoluteUrl = imageUrl ? `https://wiki.guildwars.com${imageUrl}` : undefined;

      return {
        attribute,
        type,
        description,
        imageUrl,
        imageAbsoluteUrl,
      };
    } else {
      console.error(`Failed to retrieve data for ${skillUrl}. Status code: ${response.status}`);
      return {};
    }
  } catch (error) {
    if (isAxiosError(error)) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${error}`);
    }
    return {};
  }
};

const downloadImage = async (imageUrl: string, imageName: string) => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      const imageBuffer = Buffer.from(response.data, 'binary');
      const imagePath = path.join(__dirname, 'images', 'skill', `${imageName}.jpg`);
      fs.writeFileSync(imagePath, imageBuffer);
      console.log(`Downloaded image for skill ${imageName}`);
    } else {
      console.error(`Failed to download image from ${imageUrl}. Status code: ${response.status}`);
    }
  } catch (error) {
    if (isAxiosError(error)) {
    console.error(`Error downloading image: ${error.message}`);
    } else {
      console.error(`Error downloading image: ${error}`);
    }
  }
};
