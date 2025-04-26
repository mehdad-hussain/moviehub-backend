import mongoose from "mongoose";
import { envs } from "./env.js";

export async function connectDB() {
  try {
    const conn = await mongoose.connect(envs.database.url);
    console.warn(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // eslint-disable-next-line node/prefer-global/process
    process.exit(1);
  }
}
