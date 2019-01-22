require('angular');

angular.module('DDKApp').controller('blockModalController', ["$scope", "$http", "$rootScope", "blockModal", "userInfo", function ($scope, $http, $rootScope, blockModal, userInfo) {

    $scope.loading = true;
    $scope.transactions = [];
    /* For Transaction Block */
    $scope.getTransactionsOfBlock = function (blockId) {
        $http.get($rootScope.serverUrl + "/api/transactions/", {params: {blockId: blockId}})
        .then(function (resp) {
            $scope.transactions = resp.data.transactions;
            $scope.loading = false;
        });
    };

    $scope.getTransactionsOfBlock($scope.block.b_id);

    $scope.close = function () {
        blockModal.deactivate();
        angular.element(document.querySelector("body")).removeClass("ovh");
    }
    /* For User Information */
    $scope.userInfo = function (userId) {
        blockModal.deactivate();
        angular.element(document.querySelector("body")).removeClass("ovh");
        $scope.userInfo = userInfo.activate({userId: userId});
        angular.element(document.querySelector("body")).addClass("ovh");
    }

}]);
