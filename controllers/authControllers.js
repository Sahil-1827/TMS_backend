const User = require("../models/User");
const { generateToken } = require("../utils/jwt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/mail");
const path = require("path");

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
    });

    console.log("User registered with token:", verificationToken);
    await user.save();

    const verificationUrl = `http://${process.env.BASE_URL}/api/auth/verify/${verificationToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Verify Your Email - TMS Portal",
        template: "verificationEmail.ejs",
        data: {
          name: user.name,
          verificationUrl,
        },
      });

      res.status(201).json({
        message:
          "Registration successful! Please check your email to verify your account.",
        user: {
          _id: user._id,
          name,
          email,
          role: user.role,
        },
      });
    } catch (mailError) {
      console.error("Mail error:", mailError);
      res.status(201).json({
        message:
          "Registration successful, but there was an error sending the verification email. Please contact support.",
        user: {
          _id: user._id,
          name,
          email,
          role: user.role,
        },
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    console.log("Attempting to verify token:", token);

    const user = await User.findOne({ verificationToken: token });
    console.log("User found:", user ? user.email : "none");

    if (!user) {
      return res.render("emails/verificationMessage", {
        title: "Link Expired",
        message:
          "This verification link is invalid or has already been used. Please try logging in or enter your email below to resend the verification link.",
        showResend: true,
      });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    // Generate token for auto-login
    const autoLoginToken = generateToken(user);

    // Redirect to frontend with token
    res.redirect(
      `http://localhost:5173/login?token=${autoLoginToken}&verified=true`,
    );
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).render("emails/verificationMessage", {
      title: "Error",
      message: "An unexpected error occurred. Please try again later.",
      showResend: false,
    });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    await user.save();

    const verificationUrl = `http://${process.env.BASE_URL}/api/auth/verify/${verificationToken}`;

    await sendEmail({
      email: user.email,
      subject: "Verify Your Email - TMS Portal",
      template: "verificationEmail.ejs",
      data: {
        name: user.name,
        verificationUrl,
      },
    });

    res.json({
      message:
        "Verification email resent successfully! Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
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
      } catch (error) {}
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
      return res
        .status(401)
        .json({ message: "Please verify your email to login" });
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

module.exports = { register, login, getMe, verifyEmail, resendVerification };
