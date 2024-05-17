const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.split(" ")[1]) {
    return res.status(401).json({
      status: false,
      message: "You're not authorized!",
      data: null,
    });
  }

  jwt.verify(authorization.split(" ")[1], JWT_SECRET_KEY, async (err, data) => {
    if (err) {
      return res.status(401).json({
        status: false,
        message: "You're not authorized!",
        err: err.message,
        data: null,
      });
    }

    let user = await prisma.user.findFirst({
      where: {
        id: data.id,
      },
    });

    // delete user.iat;
    delete user.password;

    req.user = user;
    next();
  });
};
