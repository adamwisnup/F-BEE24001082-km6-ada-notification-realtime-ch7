const router = require("express").Router();

const restrict = require("../middlewares/restrict");
const {
  register,
  login,
  whoami,
  forgotPassword,
  resetPassword,
  loginPage,
  resetPasswordPage,
  notificationPage,
} = require("../controllers/users");

router.post("/register", register);
router.post("/login", login);
router.get("/whoami", restrict, whoami);
router.get("/notification/users/:id", notificationPage);

router.get("/login", loginPage);
router.get("/reset-password", resetPasswordPage);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
