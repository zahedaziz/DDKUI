
require('angular');


angular.module('DDKApp').service("stakeService", function ($http, $filter, esClient, userService, $rootScope) {

  function filterData(data, filter) {
    return $filter('filter')(data, filter)
  }

  function orderData(data, params) {
    return params.sorting() ? $filter('orderBy')(data, params.orderBy()) : filteredData;
  }

  function sliceData(data, params) {
    return data.slice((params.page() - 1) * params.count(), params.page() * params.count())
  }

  function transformData(data, filter, params) {
    return sliceData(orderData(filterData(data, filter), params), params);
  }

  var service = {
    searchForStake: '',
    cachedData: [],
    getData: function (searchForStake, $defer, params, filter, secret, cb) {
      let searchStake;
      if(searchForStake.trim().toLowerCase() == "active" || searchForStake.trim().toLowerCase() == "inactive") {
        searchStake = searchForStake.trim().toLowerCase() == "active" ? 1 : 0;
      } else {
        searchStake = '';
      }
      var address = userService.getAddress();
      var startTime;
      var endTime;

      /* added search functionality for stake orders
         FIXME: Search stake orders based on conditions */
      if (searchForStake) {
        if (searchForStake.startTime && searchForStake.endTime) {
          /* Do search for stake orders based on time interval */
          function calculateTimestamp(date) {
            date = date.split('-');
            var year = date[2];
            var month = date[1];
            var day = date[0];
            var d1 = new Date(Date.UTC(2016, 0, 1, 17, 0, 0, 0));
            var d2 = new Date(Date.UTC(year, (month - 1), day, 17, 0, 0, 0));
            return parseInt((d2.getTime() - d1.getTime()) / 1000);
          }
          /* FIXME: start/end Dates should be modified on the UI */
          var startDate = '20-02-2018';
          var endDate = '21-02-2018';
          var startTime = calculateTimestamp(startDate);
          var endTime = calculateTimestamp(endDate);
          esClient.search({
            index: 'stake_orders',
            type: 'stake_orders',
            body: {
              "query": {
                "bool": {
                  "must": [
                    {
                      "range": {
                        "startTime": {
                          "gte": startTime,
                          "lte": endTime
                        }
                      }
                    }
                  ],
                  "must_not": [],
                  "should": []
                }
              },
              "from": 0,
              "size": 10,
              "sort": [],
              "aggs": {}
            }
          }, function (error, stakeResponse, status) {
            var resultData = [];
            stakeResponse.hits.hits.forEach(function (stakeOrder) {
              resultData.push(stakeOrder._source);
            });
            if (resultData != null) {
              params.total(resultData.length)
              var filteredData = $filter('filter')(resultData, filter);
              var transformedData = transformData(resultData, filter, params)
              $defer.resolve(transformedData);
            }
            cb(null);
          });
        } else {
          if(searchStake) {
          //Do search for stake orders based on status i.e Active/Inactive
          esClient.search({
            index: 'stake_orders',
            type: 'stake_orders',
            body: {
              "query": {
                "bool": {
                  "must": [
                    {
                      "term": {
                        "status": searchStake
                      }
                    },
                    {
                      "term": {
                        "senderId.keyword": address
                      }
                    }
                  ],
                  "must_not": [],
                  "should": []
                }
              },
              "from": 0,
              "size": 10,
              "sort": [{ insertTime: { order: 'desc' } }],
              "aggs": {}
            }
          }, function (error, stakeResponse, status) {
            var resultData = [];
            stakeResponse.hits.hits.forEach(function (stakeOrder) {
              resultData.push(stakeOrder._source);
            });
            if (resultData != null) {
              params.total(resultData.length)
              var filteredData = $filter('filter')(resultData, filter);
              var transformedData = transformData(resultData, filter, params)
              $defer.resolve(transformedData);
            }
            cb(null);
          });
        } else {
          params.total(0);
          $defer.resolve([]);
          cb(null);
        }
        }
      } else {
        //Do search for all stake orders related to <address>
            esClient.search({
              index: 'stake_orders',
              type: 'stake_orders',
              body: {
                "query": {
                  "bool": {
                    "must": [
                      {
                        "match_all": {}
                      },

                      {
                        "term": {
                          "senderId.keyword": address
                        }
                      }
                    ],
                    "must_not": [],
                    "should": []
                  }
                },
                "from": (params.page() - 1) * params.count(),
                "size": params.count(),
                "sort": [{ insertTime: { order: 'desc' } }],
                "aggs": {}
              }
            }, function (error, stakeRes, status) {
              var resultData = [];
              stakeRes.hits.hits.forEach(function (stakeOrder) {
                resultData.push(stakeOrder._source);
              });
              if (resultData != null) {
                params.total(stakeRes.hits.total);
                $defer.resolve(resultData);
              }
              cb(null);
            });
      }
    },
    getRewardData: function ($defer, params, filter, cb) {

      $http.get($rootScope.serverUrl + "/api/frogings/getRewardHistory", {
          params : {
            senderId: userService.address
          }
      }).then(function (response) {
        function filterData(data, filter) {
          return $filter('filter')(data, filter)
        }
        function orderData(data, params) {
          return params.sorting() ? $filter('orderBy')(data, params.orderBy()) : filteredData;
        }
        function sliceData(data, params) {
          return data.slice((params.page() - 1) * params.count(), params.page() * params.count())
        }
        function transformData(data, filter, params) {
          return sliceData(orderData(filterData(data, filter), params), params);
        }
        if (response.data.success) {
          params.total(response.data.count);
          var filteredData = $filter('filter')(response.data.rewardHistory, filter);
          var transformData = transformData(response.data.rewardHistory, filter, params);
          $defer.resolve(transformData);
          cb();
        } else {
          $defer.resolve([]);
          cb();

        }
      });
    }
  };
  return service;
});
