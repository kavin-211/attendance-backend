// Vercel-compatible serverless function
module.exports = (req, res) => {
  // Set response header
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  
  // Send response
  res.end('Hello, World!\n');
};
