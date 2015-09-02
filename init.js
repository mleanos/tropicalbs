'use strict';

var db = require('./lib/db.js');

db.sequelize.sync({force:true})
.then(function () {
  // Create an Admin Role
  return db.Role.create({ name: 'admin' });
})
.then(function (role) {
  // Create an Admin User
  return db.User.create({ email: 'admin@example.com', password: 'testPassword' })
  .then(function (user) {
    user.addRole(role);
  });
})
.then(function () {
  // Create an Owner Role
  return db.Role.create({ name: 'owner' });
})
.then(function (role) {
  // Create an Owner User
  return db.User.create({ email: 'owner@example.com', password: 'testPassword' })
  .then(function (user) {
    user.addRole(role);
  });
})
.then(function () {
  // Create a User Role
  return db.Role.create({ name: 'user' });
})
.then(function (role) {
  // Create a User User
  return db.User.create({ email: 'user@example.com', password: 'testPassword' })
  .then(function (user) {
    user.addRole(role);
  });
})
.then(function () {
  //db.sequelize.close();
  process.nextTick(function () {
    process.exit(0);
  });
})
.catch(function () {
  process.exit(1);
});