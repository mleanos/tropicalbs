'use strict';

angular.module('tropicalbs')
  .factory('navService', navService);

navService.$inject = ['$http', '$location', '$window'];

function navService ($http, $location, $window) {

  var _tabs = $window.tabs;

  var nav = {
    getTabs: getTabs,
    refreshTabs: refreshTabs
  };

  return nav;

  //////////

  function getTabs () {
    return _tabs;
  }

  function refreshTabs () {
    var req = {
      method: 'GET',
      url: 'api/core/tabs'
    };
    return $http(req)
      .then(handleResponse)
      .catch(handleError);
  }

  function handleError (err) {
    return err;
  }

  function handleResponse (res) {
    _tabs = res.data;
  }
}
