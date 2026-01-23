const User = require("../models/User");
const { generateToken } = require("../utils/jwt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = new User({
      name,
      email,
      password,
      role: "admin",
      verificationToken,
      isVerified: false,
    });

    await user.save();

    const verificationUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
      : `http://localhost:5173/verify-email?token=${verificationToken}`;

    const message = `
      <h1>Email Verification</h1>
      <p>Please click the link below to verify your email:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Verify your email",
        html: message,
      });

      res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
      });

    } catch (emailError) {
      console.error("Email send error:", emailError);

      await User.findByIdAndDelete(user._id);

      res.status(500).json({
        message: "Registration cancelled. Email sending failed. Please check your email configuration or contact admin."
      });
    }

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id)
          .select("-password")
          .populate("teams")
          .populate("managedTeams")
          .populate("managedTasks");
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        return res.json({
          token,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            teams: user.teams,
            managedTeams: user.managedTeams,
            managedTasks: user.managedTasks,
            profilePicture: user.profilePicture,
            createdAt: user.createdAt,
          },
        });
      } catch (error) { }
    }

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email })
      .populate("teams")
      .populate("managedTeams")
      .populate("managedTasks");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email to login" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "You are deactivated by admin" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email,
        role: user.role,
        teams: user.teams,
        managedTeams: user.managedTeams,
        managedTasks: user.managedTasks,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token: verificationToken } = req.body;

    if (!verificationToken) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({ verificationToken });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      message: "Email verified successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teams: user.teams,
        managedTeams: user.managedTeams,
        managedTasks: user.managedTasks,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: error.message });
  }
};

const testEmailConfig = async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      await transporter.verify();
      res.json({
        message: "✅ SMTP Connection Successful!",
        config: {
          user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}***` : "MISSING",
          pass: process.env.EMAIL_PASS ? "PRESENT" : "MISSING",
        }
      });
    } catch (verifyError) {
      res.status(500).json({
        message: "❌ SMTP Connection Failed",
        error: verifyError.message,
        code: verifyError.code,
        fullError: verifyError,
        config: {
          user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}***` : "MISSING",
          pass: process.env.EMAIL_PASS ? "PRESENT" : "MISSING",
        }
      });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { register, login, getMe, verifyEmail, testEmailConfig };
