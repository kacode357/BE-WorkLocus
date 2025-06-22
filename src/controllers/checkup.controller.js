const CheckApiRunning = {
  async checkApiRunning(req, res) {
    try {
      return res.status(200).json({ message: "API is running" });
    } catch (error) {
      console.error("Error checking API status:", error.message);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

module.exports = CheckApiRunning;
