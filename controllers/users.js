const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const Sentry = require("../libs/sentry");
const nodemailer = require("../libs/nodemailer");

const JWT_SECRET = process.env.JWT_SECRET_KEY;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

module.exports = {
  register: async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          status: false,
          message: "Bad request",
          error: "Name, email, and password are required",
          data: null,
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (existingUser) {
        return res.status(400).json({
          status: false,
          message: "Bad request",
          error: "Email already exists",
          data: null,
        });
      }

      const encryptedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: encryptedPassword,
        },
      });

      delete user.password;

      res.status(201).json({
        status: true,
        message: "User successfully created",
        error: null,
        data: { user },
      });
    } catch (error) {
      Sentry.captureException(error);
      next(error);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        return res.status(400).json({
          status: false,
          message: "Bad request",
          error: "Invalid email or password",
          data: null,
        });
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return res.status(400).json({
          status: false,
          message: "Bad request",
          error: "Invalid email or password",
          data: null,
        });
      }
      delete user.password;
      const token = jwt.sign(user, JWT_SECRET);

      res.status(200).json({
        status: true,
        message: "User successfully logged in",
        error: null,
        data: { user, token },
      });
    } catch (error) {
      Sentry.captureException(error);
      next(error);
    }
  },

  whoami: async (req, res, next) => {
    try {
      return res.status(200).json({
        status: true,
        message: "OK",
        error: null,
        data: { user: req.user },
      });
    } catch (error) {
      Sentry.captureException(error);
      next(error);
    }
  },

  forgotPassword: async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
          data: null,
        });
      }
      const token = jwt.sign({ email: user.email }, JWT_SECRET);
      const url = `${req.protocol}://${req.get(
        "host"
      )}/api/v1/reset-password?token=${token}`;
      const html = await nodemailer.getHTML("reset-password-link.ejs", {
        name: user.name,
        url: url,
      });

      await nodemailer.sendMail(email, "Email Forgot Password", html);

      return res.status(200).json({
        status: true,
        message: "Email sent successfully! Please check your email!",
      });
    } catch (error) {
      Sentry.captureException(error);
      next(error);
    }
  },

  resetPassword: async (req, res, next) => {
    try {
      const { token } = req.query;
      const { password, confirmPassword } = req.body;

      if (!password || !confirmPassword) {
        return res.status(400).json({
          status: false,
          message: "Please provide password and password confirmation!",
          data: null,
        });
      }

      if (password !== confirmPassword) {
        return res.status(401).json({
          status: false,
          message:
            "Password and password confirmation does not match! Please try again!",
          data: null,
        });
      }

      const encryptedPassword = await bcrypt.hash(password, 10);

      jwt.verify(token, JWT_SECRET, async (err, data) => {
        if (err) {
          return res.status(403).json({
            status: false,
            message: "Invalid or expired token!",
            data: null,
          });
        }

        const updateUser = await prisma.user.update({
          where: { email: data.email },
          data: { password: encryptedPassword },
          select: { id: true, name: true, email: true },
        });

        const notification = await prisma.notification.create({
          data: {
            title: "Password Updated!",
            message:
              "Your password has been updated successfully! Please check!",
            createdDate: new Date().toISOString(),
            user: { connect: { id: updateUser.id } },
          },
        });

        req.io.emit(`user-${updateUser.id}`, notification);

        res.status(200).json({
          status: true,
          message: "Password updated successfully! Please check!",
          data: updateUser,
        });
      });
    } catch (error) {
      Sentry.captureException(error);
      next(error);
    }
  },

  loginPage: async (req, res, next) => {
    try {
      res.render("login.ejs");
    } catch (error) {
      Sentry.captureException(error);
      next(error);
    }
  },

  resetPasswordPage: async (req, res, next) => {
    try {
      let { token } = req.query;
      res.render("reset-password.ejs", { token });
    } catch (error) {
      Sentry.captureException(error);
      next(error);
    }
  },

  notificationPage: async (req, res, next) => {
    try {
      const { id } = Number(req.params);
      const notifications = await prisma.notification.findMany({
        where: { user_id: id },
      });
      res.render("notification.ejs", {
        user_id: id,
        notifications: notifications,
      });
    } catch (error) {
      Sentry.captureException(error);
      next(error);
    }
  },
};
