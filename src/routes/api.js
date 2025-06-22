const CheckApi = require("./checkapi.route");
const authRoutes = require("./auth.route");
const userRoutes = require("./user.route");
const adminRoutes = require("./admin.route");
const attendanceRoutes = require("./attendance.route");
const workReportRoutes = require("./workReport.route");

const initRoute = (app) => {
  app.use("", CheckApi);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/attendances", attendanceRoutes);
  app.use("/api/work-reports", workReportRoutes); 
};

module.exports = initRoute;