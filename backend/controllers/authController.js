const jwt = require('jsonwebtoken');
const { User } = require('../models');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_key_change_in_production', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide name, email, and password.');
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      res.status(400);
      throw new Error('A user with that email already exists.');
    }

    const user = await User.create({ name, email, password });
    
    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id)
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide email and password.');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password.');
    }

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id)
    });
  } catch (error) {
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, getMe };
