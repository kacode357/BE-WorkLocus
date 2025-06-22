require("dotenv").config();
const express = require("express"); //commonjs
const apiRoutes = require("./routes/api");
const connection = require("./config/database");

var cors = require("cors");

const app = express();
const port = process.env.PORT || 8888;

//config cors
app.use(cors());

//config req.body
app.use(express.json()); // for json
app.use(express.urlencoded({ extended: true }));

//khai báo route
apiRoutes(app);

(async () => {
  try {
    //using mongoose
    await connection();

    app.listen(port, () => {
      console.log(`Backend Nodejs App listening on port ${port}`);
    });
  } catch (error) {
    console.log(">>> Error connect to DB: ", error);
  }
})();