const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const COL_TO_STATUS = {
  'suggested':   'Suggested',
  'to-build':    'To Build',
  'in-progress': 'In Progress',
  'done':        'Done'
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const response = await notion.databases.query({ database_id: DATABASE_ID });
      const cards = response.results
        .map(page => ({
          id:          page.id,
          name:        page.properties.Name?.title[0]?.plain_text || '',
          status:      page.properties.Status?.select?.name || 'To Build',
          priority:    page.properties.Priority?.select?.name || '',
          description: page.properties.Description?.rich_text[0]?.plain_text || ''
        }))
        .filter(c => c.name); // skip rows with no name (e.g. accidental Notion entries)
      return res.json(cards);
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body;
      if (!id || !status) return res.status(400).json({ error: 'id and status required' });
      await notion.pages.update({
        page_id: id,
        properties: { Status: { select: { name: status } } }
      });
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
