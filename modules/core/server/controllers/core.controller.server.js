'use strict';

var jwt = require('jwt-simple');
var path = require('path');
var Promise = require('bluebird');

var config = require(path.resolve('./lib/config'));
var db = require(path.resolve('./lib/db.js'));

exports.checkAuth = checkAuth;
exports.decode = decode;
exports.logIn = logIn;
exports.renderIndex = renderIndex;
exports.signUp = signUp;

//////////

/**
 * Check if a token was included on the request and find the user that is associated with that token.
 *
 * @param {ExpressRequestObject} req The request object generated by express.
 * @param {ExpressResponseObject} res The response object generated by express.
 */

function checkAuth (req, res, next) {
  // Get the token from the request
  var token = req.headers['x-access-token'];
  // If no token, send 403
  if (!token) {
    res.status(403).send('no token provided');
  } else {
    // Decode the token to get the user info
    var user = jwt.decode(token, config.secret);

    // Set up user query
    var userQuery = {
      where: {
        email: user.email
      },
      include: [{
        model: db.Role
      }]
    };

    // Look for user in the database
    db.User.findOne(userQuery)
      .then(checkUser)
      .catch(sendError);
  }

  //////////

  function checkUser(foundUser) {
    // If found, send user email and roles back
    if (foundUser) {
      var resJson = {
        user: {
          email: foundUser.email,
          roles: stripRoleNames(foundUser.Roles)
        }
      };

      res.status(200).send(resJson);
    } else {
      // If user not found, send status 401
      res.status(401).send('User does not exist');
    }
  }

  function sendError () {
    res.status(500).send('Database error: Error finding user in database');
  }
}

/**
 * Login a given user
 *
 * @param {ExpressRequestObject} req The request object generated by express.
 * @param {ExpressResponseObject} res The response object generated by express.
 */

function logIn(req, res) {
  // Force the user's email to lowercase
  var email = req.body.email.toLowerCase();
  var password = req.body.password;

  // Query the database for the user by email
  var userQuery = {
    where: {
      email: email
    },
    include: [{
      model: db.Role
    }]
  };

  db.User.findOne(userQuery)
    .then(comparePassword)
    .catch(send500);

  //////////

  function comparePassword (user) {
    // Check to see if the user was found.
    if (!user) {
      // No user was found.
      res.status(400).send('User does not exist or password is incorrect');
    } else {
      // User was Found
      // Compare the provided password to the password in the database
      return user.comparePassword(password)
        .then(checkMatch)
        .catch(send400);
    }

    function checkMatch (isMatch) {
      // Check to see if the passwords match
      if (isMatch) {
        // The passwords match
        // Create a user object to send to the client
        var userResponse = {
          email: user.email,
          roles: stripRoleNames(user.Roles)
        };

        // Create a token, and encode the userResponse
        var token = jwt.encode(userResponse, config.secret);

        var resJson = {
          token: token,
          user: userResponse
        };

        // Send the token and user object to the client
        res.send(resJson);
      } else {
        // Passwords do not match
        res.status(400).send('User does not exist or password is incorrect');
      }
    }
  }

  function send400 () {
    // Invalid Password
    res.status(400).send('Invalid Password');
  }

  function send500 (err) {
    res.status(500).send('An error occured while logging in.');
  }
}

/**
 * Strips an array of Roles returned from the Database to an array of role names
 *
 * @param {Array} roles An Array
 * @returns {Array} roleNames An array of role names
 */
function stripRoleNames (roles) {
  var roleNames = [];
  for(var r = 0; r < roles.length; r++) {
    roleNames.push(roles[r].name);
  }
  return roleNames;
}

/**
 * Render the index page for the angular application.
 *
 * @param {ExpressRequestObject} req
 * @param {ExpressResponseObject} res
 */

function renderIndex (req, res) {
  Promise.all([db.Page.findAll(), getTabs()])
    .then(render)
    .catch(send500);

  //////////

  function getTabs () {
    var tabQuery = {
      include : [
        {
          model: db.Role
        }
      ]
    };
    return db.Tab.findAll(tabQuery)
      .then(processTabs);
  }

  function processTabs (tabs) {
    var response = [];
    tabs.forEach(function (tab) {
      var tempTab = {};
      tempTab.title = tab.title;
      tempTab.uisref = tab.uisref;
      tempTab.visibleRoles = [];
      tab.Roles.forEach(function (role) {
        tempTab.visibleRoles.push(role.name);
      });
      response.push(tempTab);
    });
    return response;
  }

  function render (results) {
    res.render(path.resolve('./modules/core/server/views/index.core.view.server.html'), {
      pages: results[0],
      tabs: results[1]
    });
  }

  function send500() {
    res.status(500).send('Database Error Occurred');
  }
}

/**
 * Sign up a given user
 *
 * @param {ExpressRequestObject} req The request object generated by express.
 * @param {ExpressResponseObject} res The response object generated by express.
 */

function signUp (req, res) {
  // Force the email to lowercase
  var email = req.body.email.toLowerCase();
  var password = req.body.password;

  // Create user query
  var userQuery = {
    email: email,
    password: password
  };

  db.User.create(userQuery)
    .then(addDefaultRole)
    .then(findNewUser)
    .then(createToken)
    .catch(send400);

  //////////

  function addDefaultRole (user) {
    // Get default role from database
    var defaultRoleQuery = {
      where: {
        name: 'user'
      }
    };

    return db.Role.findOne(defaultRoleQuery)
      .then(setRole);

    function setRole (role) {
      return user.addRole(role);
    }
  }

  function createToken (user) {
    var token = jwt.encode(user, config.secret);
    var resJson = {
      token: token,
      user: {
        email: user.email,
        roles: stripRoleNames(user.Roles)
      }
    };

    res.send(resJson);
  }

  function findNewUser () {
    var userQuery = {
      where: {
        email: email
      },
      include: [{
        model: db.Role
      }]
    };

    return db.User.findOne(userQuery);
  }

  function send400 () {
    // Invalid Password
    res.status(400).send('Database Error');
  }
}

/**
 * Decode a token
 *
 * @param {ExpressRequestObject} req The request object generated by express.
 * @param {ExpressResponseObject} res The response object generated by express.
 * @param {function} next
 */

function decode (req, res, next) {
  var token = req.headers['x-access-token'];
  var user;

  if (!token) {
    return res.send(403); // Send forbidden if a token is not provided
  }

  try {
    // decode token and attach user to the request
    // for use inside our controllers
    user = jwt.decode(token, config.secret);
    req.user = user;
    next();
  } catch(error) {
    res.status(500).send('User not found');
  }
}
