'use strict';

angular.module('tropicalbs')
  .config(function ($stateProvider) {
    $stateProvider
      .state('login', {
        url: '/login',
        templateUrl: '../../../../modules/core/client/views/login.view.client.html',
        controller: 'UsersController'
      })
      .state('signup', {
        url: '/signup',
        templateUrl: '../../../../modules/core/client/views/signup.view.client.html',
        controller: 'UsersController'
      });
  })
  .controller('UsersController', ['$scope', 'Auth', '$window', '$location', 'User', function ($scope, Auth, $window, $location, User) {

    $scope.user = {};

    $scope.login = function () {
      Auth.login($scope.user)
        .then(function () {
          $location.path('/home');
        })
        .catch(function (error) {
          //ng-message looks for key vaue pairs on the $error object of the form field. since the form is
          //'loginForm' and the password field is named 'password', we are able to attach the 'reject'
          //property to the $error object when login fails. This allows us to put a 'ng-message="reject"'
          //directive in the login view, informing the user that their attempt was unsuccessful
          $scope.loginForm.password.$error.reject = true;
        });
    };

    $scope.signup = function () {
      Auth.signup($scope.user)
        .then(function () {
          $location.path('/home');
        })
        .catch(function (error) {
          //see comment for signup above
          $scope.signupForm.email.$error.reject = true;
        });
    };

  }]);
