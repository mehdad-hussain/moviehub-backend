import jwt from "jsonwebtoken";
import { envs } from "../config/env.js";
import User from "../models/user.js";

// Generate tokens
function generateTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, envs.jwt.accessSecret, {
    expiresIn: envs.jwt.accessExpiration,
  });

  const refreshToken = jwt.sign({ id: userId }, envs.jwt.refreshSecret, {
    expiresIn: envs.jwt.refreshExpiration,
  });

  return { accessToken, refreshToken };
}

// Generate only access token
function generateAccessToken(userId) {
  return jwt.sign({ id: userId }, envs.jwt.accessSecret, {
    expiresIn: envs.jwt.accessExpiration,
  });
}

// Register a new user
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      await user.save();

      res.status(201).json({
        id: user._id,
        name: user.name,
        email: user.email,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Login user
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists and password is correct
    if (user && (await user.comparePassword(password))) {
      const { accessToken, refreshToken } = generateTokens(user._id);

      // Save refresh token to user document
      user.refreshToken = refreshToken;
      await user.save();

      // Set refresh token as HTTP-only cookie with improved settings
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        secure: envs.nodeEnv === "production",
        sameSite: envs.nodeEnv === "production" ? "none" : "lax",
        path: "/",
      });

      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        accessToken,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Refresh token
export async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, envs.jwt.refreshSecret);

    // Find user with matching refresh token
    const user = await User.findOne({ _id: decoded.id }).select(
      "-refreshToken -password -createdAt -updatedAt",
    );

    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }
    const accessToken = generateAccessToken(user._id);

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(403).json({ message: "Invalid refresh token" });
  }
}

// Logout user
export async function logout(req, res) {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(200).json({ message: "Already logged out" });
    }

    // Find user with the refresh token
    const user = await User.findOne({ refreshToken });

    if (user) {
      // Clear refresh token in database
      user.refreshToken = "";
      await user.save();
    }

    // Clear refresh token cookie
    res.cookie("refreshToken", "", {
      httpOnly: true,
      expires: new Date(0),
      secure: envs.nodeEnv === "production",
      sameSite: envs.nodeEnv === "production" ? "none" : "lax",
      path: "/",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
