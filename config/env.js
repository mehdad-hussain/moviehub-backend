/* eslint-disable node/prefer-global/process */
import dotenv from "dotenv";
import { expand } from "dotenv-expand";
import Joi from "joi";

// Load and expand environment variables
const envConfig = dotenv.config();
expand(envConfig);

// Define environment schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  console.error("❌ Invalid env:");
  console.error(
    JSON.stringify(
      // eslint-disable-next-line style/arrow-parens
      error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
      null,
      2,
    ),
  );
  process.exit(1);
}

// Export validated env variables
export const envs = {
  nodeEnv: envVars.NODE_ENV,
  port: envVars.PORT,
  database: {
    url: envVars.DATABASE_URL,
  },
};
