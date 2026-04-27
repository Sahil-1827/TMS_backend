const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const crypto = require("crypto");
const sendEmail = require("../utils/mail");

const getUsers = async (req, res) => {
  try {
    let users;
    if (req.user.role === "admin") {
      users = await User.find({ adminId: req.user._id }).select(
        "name email role createdAt profilePicture isActive",
      );
    } else if (req.user.role === "manager") {
      users = await User.find({ adminId: req.user.adminId }).select(
        "name email role createdAt profilePicture isActive",
      );
    } else {
      users = [];
    }
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;

      if (req.file) {
        const { cloudinary } = require("../utils/cloudinary");

        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "user_profiles",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          uploadStream.end(req.file.buffer);
        });

        user.profilePicture = result.secure_url;
      }

      const updatedUser = await user.save();

      await ActivityLog.create({
        action: "update",
        entity: "user",
        entityId: updatedUser._id,
        performedBy: req.user._id,
        adminId: req.user.role === "admin" ? req.user._id : req.user.adminId,
        details: `User profile for "${updatedUser.name}" was updated by ${req.user.name}`,
      });

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture,
        createdAt: updatedUser.createdAt,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Update profile error:", error);

    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }
    res.status(500).json({ message: error.message });
  }
};

const createSubUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (role !== "user" && role !== "manager") {
      return res.status(400).json({ message: "Invalid role specified" });
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
      role,
      adminId: req.user._id,
      verificationToken,
    });

    if (req.file) {
      const { cloudinary } = require("../utils/cloudinary");
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "user_profiles" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        uploadStream.end(req.file.buffer);
      });
      user.profilePicture = result.secure_url;
    }

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
        id: user._id,
        message:
          "User created successfully! A verification email has been sent.",
        name,
        email,
        role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      });
    } catch (mailError) {
      console.error("Mail error:", mailError);
      res.status(201).json({
        id: user._id,
        message:
          "User created successfully, but there was an error sending the verification email.",
        name,
        email,
        role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      });
    }
  } catch (error) {
    console.error("Create sub-user error:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateSubUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const userToUpdate = await User.findOne({ _id: id, adminId: req.user._id });
    if (!userToUpdate) {
      return res
        .status(404)
        .json({ message: "User not found or unauthorized" });
    }

    if (name) userToUpdate.name = name;
    if (email) userToUpdate.email = email;
    if (role) {
      if (role !== "user" && role !== "manager") {
        return res.status(400).json({ message: "Invalid role specified" });
      }
      userToUpdate.role = role;
    }

    if (req.file) {
      const { cloudinary } = require("../utils/cloudinary");
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "user_profiles" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        uploadStream.end(req.file.buffer);
      });
      userToUpdate.profilePicture = result.secure_url;
    }

    await userToUpdate.save();

    res.json({
      id: userToUpdate._id,
      name: userToUpdate.name,
      email: userToUpdate.email,
      role: userToUpdate.role,
      profilePicture: userToUpdate.profilePicture,
      isActive: userToUpdate.isActive,
      createdAt: userToUpdate.createdAt,
    });
  } catch (error) {
    console.error("Update sub-user error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }
    res.status(500).json({ message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, adminId: req.user._id });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or unauthorized" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  updateUserProfile,
  createSubUser,
  updateSubUser,
  toggleUserStatus,
};
