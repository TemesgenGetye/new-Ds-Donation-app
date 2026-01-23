const rateLimit = require("express-rate-limit");

// Define a rate limit rule
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: "Too many requests, please try again later.",
});

// Apply to all routes
module.exports = limiter;
