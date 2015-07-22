
ngBabbage.directive('babbagePanel', ['$rootScope', 'slugifyFilter', function($rootScope, slugifyFilter) {
  return {
    restrict: 'EA',
    require: '^babbage',
    scope: {
    },
    templateUrl: 'babbage-templates/panel.html',
    link: function($scope, $element, attrs, babbageCtrl) {
      var model = null;

      $scope.state = {};
      $scope.axes = [];
      $scope.filterAttributes = [];
      $scope.filters = [];
      $scope.getSort = babbageCtrl.getSort;
      $scope.pushSort = babbageCtrl.pushSort;
      $scope.embedLink = null;

      var update = function() {
        //$scope.state.page = 0;
        babbageCtrl.setState($scope.state);
      };

      $scope.add = function(axis, ref) {
        if (axis.selected.indexOf(ref) == -1) {
          if (axis.multiple) {
            axis.selected.push(ref);
          } else {
            if (axis.selected.length) {
              $scope.state.order = babbageCtrl.removeSorts(axis.selected[0]);
            }
            axis.selected = [ref];
          }
          $scope.state[axis.name] = axis.selected;
          update();
        }
      };

      $scope.remove = function(axis, ref) {
        var i = axis.selected.indexOf(ref);
        if (i != -1) {
          axis.selected.splice(i, 1);
          $scope.state[axis.name] = axis.selected;
          $scope.state.order = babbageCtrl.removeSorts(ref);
          update();
        }
      };

      var makeOptions = function() {
        var options = [];
        for (var di in model.dimensions) {
          var dim = model.dimensions[di];
          for (var li in dim.levels) {
            var lvl = dim.levels[li];
            for (var ai in lvl.attributes) {
              var attr = angular.copy(lvl.attributes[ai]);
              attr.dimension = dim;
              attr.level = lvl;
              attr.type = 'attributes';
              if (slugifyFilter(dim.label) != slugifyFilter(attr.label)) {
                attr.subLabel = '' + attr.label;
              }
              attr.sortKey = '0' + dim.label + attr.label;
              attr.label = dim.label;
              attr.cardinality = lvl.cardinality;
              options.push(attr);
            }
          }
        }

        for (var ai in model.aggregates) {
          var agg = model.aggregates[ai];
          agg.type = 'aggregates';
          agg.sortKey = '1' + agg.name;
          options.push(agg);
        }

        for (var mi in model.measures) {
          var mea = model.measures[mi];
          mea.type = 'measures';
          mea.sortKey = '2' + mea.name;
          options.push(mea);
        }

        return options;
      }

      var sortOptions = function(a, b) {
        return a.label.localeCompare(b.label);
      }

      var makeAxes = function(state, options) {
        var axes = [];
        if (!babbageCtrl.queryModel) return [];

        for (var name in babbageCtrl.queryModel) {
          var axis = babbageCtrl.queryModel[name];
          axis.name = name;
          axis.sortId = axis.sortId || 1;
          axis.available = [];
          axis.active = [];

          axis.selected = asArray(state[name]);
          if (!axis.selected.length) {
            if (angular.isFunction(axis.defaults)) {
              axis.selected = axis.defaults(model);
            } else {
              axis.selected = asArray(axis.defaults);
            }
          }
          axis.available = axis.available.sort(sortOptions);
          axis.active = axis.active.sort(sortOptions);

          for (var i in options) {
            var opt = options[i];
            if (axis.selected.indexOf(opt.ref) != -1) {
              axis.active.push(opt);
            } else if (axis.types.indexOf(opt.type) != -1) {
              axis.available.push(opt);
            }
          }
          axes.push(axis);
        }

        return axes.sort(function(a, b) {
          return a.sortId - b.sortId;
        });
      };

      var makeFilterAttributes = function(options) {
        var filters = [];
        for (var i in options) {
          var opt = options[i];
          if (opt.type == 'attributes' && opt.cardinality != 'high') {
            if (opt.level.label_attribute == opt.name) {
              filters.push(opt);
            }
          }
        }
        return filters.sort(sortOptions);
      };

      var refToDimension = function(ref) {
        return ref.split('.', 1);
      };

      var makeValues = function(ref, res) {
        return res.data.data.map(function(e) {
          return {
            label: e[ref],
            value: e[model.refKeys[ref]]
          };
        });
      };

      var getAttributeByRef = function(ref) {
        for (var i in $scope.filterAttributes) {
          var attr = $scope.filterAttributes[i];
          if (attr.ref == ref) {
            return attr;
          }
        }
      };

      var loadFilters = function(state) {
        var cuts = asArray(state.cut);
        for (var i in cuts) {
          var cut = cuts[i];
          if (cut.indexOf(':') != -1) {
            var ref = cut.split(':', 1)[0],
                values = cut.slice(ref.length + 1).split(';');
            for (var j in values) {
              $scope.addFilter(getAttributeByRef(ref), values[j]);
            }
          }
        }
      };

      $scope.addFilter = function(attr, value) {
        babbageCtrl.getDimensionMembers(refToDimension(attr.ref)).then(function(res) {
          $scope.filters.push({
            ref: attr.ref,
            attr: attr,
            value: value,
            values: makeValues(attr.ref, res)
          });
        });
      };

      $scope.removeFilter = function(filter) {
        var idx = $scope.filters.indexOf(filter);
        if (idx != -1) {
          $scope.filters.splice(idx, 1);
          $scope.updateFilters();
        }
      };

      $scope.setFilter = function(filter, item, value) {
        $scope.updateFilters();
      };

      $scope.updateFilters = function() {
        var filters = {};
        for (var i in $scope.filters) {
          var f = $scope.filters[i];
          if (angular.isUndefined(filters[f.ref])) {
            filters[f.ref] = [];
          }
          filters[f.ref].push(f.value);
        }
        var cuts = [];
        for (var ref in filters) {
          var values = filters[ref],
              value = values.join(';')
              cut = ref + ':' + value;
          cuts.push(cut);
        }
        $scope.state.cut = cuts;
        update();
      };

      var unsubscribe = babbageCtrl.subscribe(function(event, mdl, state) {
        model = mdl;
        $scope.state = state;

        var options = makeOptions();
        $scope.axes = makeAxes(state, options);
        $scope.filterAttributes = makeFilterAttributes(options);
        $scope.filters = [];
        loadFilters(state);

      });
      $scope.$on('$destroy', unsubscribe);

    }
  };
}]);
