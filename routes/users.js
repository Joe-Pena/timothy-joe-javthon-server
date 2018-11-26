const express = require('express');
const User = require('../models/user');

const router = express.Router();
router.use(express.json());

router.post('/', (req, res, next) => {
  const { username, password, name, email } = req.body;
  const requiredFields = ['username', 'password'];

  const missingField = requiredFields.find(field => ! (field in req.body));

  if(missingField) {
    const err = new Error(`Missing ${missingField} field`);
    err.status = 422;
    return next(err);
  }

  const trimmedFields = ['username', 'password'];
  const nonTrimmedFields = trimmedFields.find(field => field in req.body && (req.body[field].trim() !== req.body[field]));
  if(nonTrimmedFields){
    const err = new Error(`${nonTrimmedFields} cannot start or end with whitespace`);
    err.status = 422;
    return next(err);
  }

  // password must be at least 10 characters long
  const fieldSizes = {
    username: {
      min: 5
    },
    password: {
      min: 10,
      max: 72
    }
  };

  const tooSmallField = Object.keys(fieldSizes).find(
    field => 'min' in fieldSizes[field] && req.body[field].trim().length < fieldSizes[field].min
  );
  const tooLargeField = Object.keys(fieldSizes).find(
    field => 'max' in fieldSizes[field] && req.body[field].trim().length > fieldSizes[field].max
  );

  if(tooSmallField || tooLargeField){
    const message = tooSmallField 
      ? `${tooSmallField} must be at least ${fieldSizes[tooSmallField].min} characters long`
      : `${tooLargeField} must be at most ${fieldSizes[tooLargeField].max} characters long`;
    const err = new Error(message);
    err.status = 422;
    return next(err);
  }

  User.findOne({ username })
    .then(user => {
      if(user){
        const err = new Error('Username already exists');
        err.status = 422;
        return next(err);
      }
      return User.hashPassword(password);
    })
    .then(digest => {
      return User.create({
        username,
        password: digest,
        email,
        name
      });
    })
    .then(user => {
      return res.status(201).json(user);
    })
    .catch(next);
});

module.exports = router;