require('angular');

angular.module('ETPApp').controller('freezeAmountController', ['$scope', '$rootScope', 'userService', 'feeService','freezeAmountModal', '$http', function ($scope, $rootScope, userService,feeService,freezeAmountModal,$http) {

    $scope.rememberedPassphrase = userService.rememberPassphrase ? userService.rememberedPassphrase : false;
    $scope.sending = false;
    $scope.passmode = false;
    $scope.presendError = false;
    $scope.errorMessage = {};
    $scope.checkSecondPass = false;
    $scope.secondPassphrase = userService.secondPassphrase;
    $scope.publicKey = userService.getPublicKey();


    $scope.getCurrentFee = function () {
        $http.get($rootScope.serverUrl + '/api/blocks/getFee').then(function (resp) {
                $scope.currentFee = resp.data.fee;
                $scope.fee = resp.data.fee;
            });
    }

    $scope.isCorrectValue = function (currency, throwError) {
        var parts = String(currency).trim().split('.');
        var amount = parts[0];
        var fraction;

        if (!throwError) throwError = false;

        function error (message) {
            $scope.errorMessage.fAmount = message;

            if (throwError) {
              throw $scope.errorMessage.fAmount;
            } else {
              console.error(message);
              return false;
            }
        }

        if (currency == null) {
            return error('DDK amount can not be blank');
        }

        if (parts.length == 1) {
            // No fractional part
            fraction = '00000000';
        } else if (parts.length == 2) {
            if (parts[1].length > 8) {
                return error('DDK amount must not have more than 8 decimal places');
            } else if (parts[1].length <= 8) {
                // Less than eight decimal places
                fraction = parts[1];
            } else {
                // Trim extraneous decimal places
                fraction = parts[1].substring(0, 8);
            }
        } else {
            return error('DDK amount must have only one decimal point');
        }

        // Pad to eight decimal places
        for (var i = fraction.length; i < 8; i++) {
            fraction += '0';
        }

        // Check for zero amount
        if (amount == '0' && fraction == '00000000') {
            return error('DDK amount can not be zero');
        }

        // Combine whole with fractional part
        var result = amount + fraction;

        // In case there's a comma or something else in there.
        // At this point there should only be numbers.
        if (!/^\d+$/.test(result)) {
            return error('DDK amount contains non-numeric characters');
        }

        // Remove leading zeroes
        result = result.replace(/^0+/, '');

        return parseInt(result);
    }

    $scope.convertETP = function (currency) {
        return $scope.isCorrectValue(currency, true);
    }

    function validateForm(onValid) {
        if ($scope.isCorrectValue($scope.fAmount)) {
            return onValid();
        } else {
            $scope.presendError = true;
        }
    }

    $scope.passcheck = function (fromSecondPass) {
        $scope.publicKey = userService.getPublicKey();
        console.log('$scope.userService : ', $scope.publickey);
        if (fromSecondPass) {
            $scope.checkSecondPass = false;
            $scope.passmode = $scope.rememberedPassphrase ? false : true;
            if ($scope.passmode) {
                $scope.focus = 'secretPhrase';
            }
            $scope.secondPhrase = '';
            $scope.secretPhrase = '';
            return;
        }
        if ($scope.rememberedPassphrase) {
            validateForm(function () {
                $scope.presendError = false;
                $scope.errorMessage = {};
                $scope.freezeOrder($scope.rememberedPassphrase);
            });
        } else {
            validateForm(function () {
                $scope.presendError = false;
                $scope.errorMessage = {};
                $scope.passmode = !$scope.passmode;
                //$scope.focus = 'secretPhrase';
                $scope.secretPhrase = '';
            });
        }
    }


    $scope.freezeOrder = function(secretPhrase,withSecond){
        $rootScope.secretPhrase = secretPhrase;
        if ($scope.secondPassphrase && !withSecond) {
            $scope.checkSecondPass = true;
            $scope.focus = 'secondPhrase';
            return;
        }

        $scope.errorMessage = {};

        var data = {
            secret: secretPhrase,
            freezedAmount: $scope.convertETP($scope.fAmount),
            publicKey: $scope.publicKey
        };

        if ($scope.secondPassphrase) {
            data.secondSecret = $scope.secondPhrase;
            if ($scope.rememberedPassphrase) {
                data.secret = $scope.rememberedPassphrase;
            }
        }

        if (!$scope.sending) {
            $scope.sending = true;
            console.log('data : ', data);
            $http.post($rootScope.serverUrl + "/api/frogings/freeze", data)
                .then(function (resp) {
                    if (resp.data.success) {
                        Materialize.toast('Freeze Success', 3000, 'green white-text');
                        freezeAmountModal.deactivate();
                        $rootScope.enableReferOption = resp.data.referStatus;
                    } else {
                        Materialize.toast('Freeze Error', 3000, 'red white-text');
                        $scope.errorMessage.fromServer = resp.data.error;

                    }
                });

        }
    }

    $scope.calFees = function (fAmount) {
        var regEx2 = /[0]+$/;
        feeService(function (fees) {
            var rawFee = (parseFloat(fAmount) * (fees.froze)) / 100;
            $scope.fee = (rawFee % 1) != 0 ? rawFee.toFixed(8).toString().replace(regEx2, '') : rawFee.toString();
        });
    };

    $scope.close = function () {
        if ($scope.destroy) {
            $scope.destroy();
        }

        freezeAmountModal.deactivate();
    }

}]);
