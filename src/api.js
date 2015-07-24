
ngBabbage.factory('babbageApi', ['$http', '$q', 'slugifyFilter', function($http, $q, slugifyFilter) {
  var cache = {};

  var getUrl = function(endpoint, cube, path) {
    console.log("Endpoint: ", endpoint)
    var api = endpoint.slice(),
        api = api.endsWith('/') ? api.slice(0, api.length - 1) : api,
        api = api + '/cubes/' + cube + '/' + path;
    return api;
  };

  var getCached = function(url) {
    if (!angular.isDefined(cache[url])) {
      cache[url] = $http.get(url);
    }
    return cache[url];
  };

  var getModel = function(endpoint, cube) {
    return getCached(getUrl(endpoint, cube, 'model')).then(function(res) {
      var model = res.data.model;
      model.refs = {};
      model.refKeys = {};
      model.refLabels = {};

      for (var i in model.measures) {
        var measure = model.measures[i];
        measure.numeric = true;
        measure.hideLabel = true;
        model.refs[measure.ref] = measure;
      }

      for (var di in model.dimensions) {
        var dim = model.dimensions[di];
        for (var li in dim.levels) {
          var lvl = dim.levels[li];
          for (var ai in lvl.attributes) {
            var attr = lvl.attributes[ai],
                nested = attr.ref.indexOf('.') != -1;
            attr.dimension = dim;
            attr.hideLabel = slugifyFilter(attr.label) == slugifyFilter(dim.label);
            model.refs[attr.ref] = attr;
            model.refKeys[attr.ref] = nested ? dim.name + '.' + lvl.key : attr.ref;
            model.refLabels[attr.ref] = nested ? dim.name + '.' + lvl.label_attribute : attr.ref;
          }
        }
      }
      return model;
    });
  };

  var getDimensionMembers = function(endpoint, cube, dimension) {
    return getCached(getUrl(endpoint, cube, 'members/' + dimension));
  };

  var flush = function() {
    cache = {};
  };

  return {
    getUrl: getUrl,
    getModel: getModel,
    getDimensionMembers: getDimensionMembers,
    flush: flush
  };
}]);
