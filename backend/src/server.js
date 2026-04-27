const dotenv = require("dotenv");
const dns = require("dns");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");

// Some local resolvers fail Atlas SRV lookups on Windows networks.
// Force reliable public resolvers before mongoose.connect().
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
