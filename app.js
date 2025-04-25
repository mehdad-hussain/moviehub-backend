import cors from "cors";
import express from "express";
import { envs } from "./config/env.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json("Hello World!");
});

// Start the server
app.listen(envs.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${envs.port}`);
});
