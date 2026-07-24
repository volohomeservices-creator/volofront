// server.js - Production Entry Point for Hostinger Managed Node.js Hosting
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const port = process.env.PORT || 3000;

const app = next({
  dev,
  dir: __dirname,
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`> Next.js production server running on ${port}`);
  });
}).catch((err) => {
  console.error('Error starting Next.js server:', err);
  process.exit(1);
});
