/*
 * @license
 * angular-modal v0.5.0
 * (c) 2013 Brian Ford http://briantford.com
 * License: MIT
 */

'use strict';

angular.module('btford.modal', []).factory('btfModal', ['$animate', '$compile', '$rootScope', '$controller', '$q', '$http', '$templateCache', '$timeout', modalFactoryFactory]);

function modalFactoryFactory($animate, $compile, $rootScope, $controller, $q, $http, $templateCache, $timeout) {
  return function modalFactory(config) {
    if (!(!config.template ^ !config.templateUrl)) {
      throw new Error('Expected modal to have exacly one of either `template` or `templateUrl`');
    }

    var template      = config.template,
        controller    = config.controller || null,
        controllerAs  = config.controllerAs,
        container     = angular.element(config.container || document.body),
        element       = null,
        html,
        scope,
        clickedInsideModalContent = false;

    if (config.template) {
      html = $q.when(config.template);
    } else {
      html = $http.get(config.templateUrl, {
        cache: $templateCache
      }).
        then(function (response) {
          return response.data;
        });
    }

    function activate(locals) {
      return html.then(function (html) {
        if (!element) {
          attach(html, locals);
        }
      });
    }

    function addClickEventListenersOn(nodeList) {
      for(var i = 0 ; i < nodeList.length; i++) {
        nodeList[i].addEventListener('click', function(event) {
          // event.stopPropagation();
          clickedInsideModalContent = true;
        }, false);
      }
    }

    function attach(html, locals) {
      element = angular.element(html);
      if (element.length === 0) {
        throw new Error('The template contains no elements; you need to wrap text nodes')
      }
      angular.element(document).keydown(onKeyDown);
      element.on('click', function(event) {
        if(!clickedInsideModalContent) {
          closeModal();
        }
        clickedInsideModalContent = false;
      });
      scope = $rootScope.$new();
      if (controller) {
        if (!locals) {
          locals = {};
        }
        for (var prop in locals) {
          scope[prop] = locals[prop];
        }
        locals.$scope = scope;
        var ctrl = $controller(controller, locals);
        if (controllerAs) {
          scope[controllerAs] = ctrl;
        }
      } else if (locals) {
        for (var prop in locals) {
          scope[prop] = locals[prop];
        }
      }
      $compile(element)(scope);
      return $animate.enter(element, container).then(function (modal) {
        var appModal = document.querySelector('.app-modal');
        var modalContents = appModal.querySelectorAll('.modal-content');

        if (modalContents && modalContents.length) {
          addClickEventListenersOn(modalContents);
          return modal;
        }
        var materialModalContents = appModal.querySelectorAll('.material-modal-content');
        if (materialModalContents && materialModalContents.length) {
          addClickEventListenersOn(materialModalContents);
          return modal;
        }

      });
    }

    function deactivate() {
      if (!element) {
        return $q.when();
      }
      return $animate.leave(element).then(function () {
        scope.$destroy();
        scope = null;
        element.remove();
        element = null;
        $animate.off('enter', container);
        angular.element(document).off('keydown');

      });
    }

    function active() {
      return !!element;
    }

    function onKeyDown(event) {
      if (event.keyCode == 27) { // Escape Key Code = 27
        closeModal();
      }
    }

    function closeModal() {
      if (scope && scope.close) {
        scope.close();
        $timeout();
        return;
      }
      deactivate();
      var body = angular.element("body");
      if (body.hasClass('ovh')) {
        body.removeClass('ovh');
      }
      $timeout();
    }

    return {
      activate: activate,
      deactivate: deactivate,
      active: active
    };
  };
}
