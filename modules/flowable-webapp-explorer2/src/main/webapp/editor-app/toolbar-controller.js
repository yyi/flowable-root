/*
 * Activiti Modeler component part of the Activiti project
 * Copyright 2005-2014 Alfresco Software, Ltd. All rights reserved.
 * 
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.

 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 */
'use strict';

angular.module('activitiModeler')
    .controller('ToolbarController', ['$scope', '$http', '$modal', '$q', '$rootScope', '$translate', '$location','editorManager',
        function ($scope, $http, $modal, $q, $rootScope, $translate, $location,editorManager) {

    	$scope.editorFactory.promise.then(function () {
    		$scope.items = KISBPM.TOOLBAR_CONFIG.items;
    	});
        
        $scope.secondaryItems = KISBPM.TOOLBAR_CONFIG.secondaryItems;

        // Call configurable click handler (From http://stackoverflow.com/questions/359788/how-to-execute-a-javascript-function-when-i-have-its-name-as-a-string)
        var executeFunctionByName = function(functionName, context /*, args */) {
            var args = Array.prototype.slice.call(arguments).splice(2);
            var namespaces = functionName.split(".");
            var func = namespaces.pop();
            for(var i = 0; i < namespaces.length; i++) {
                context = context[namespaces[i]];
            }
            return context[func].apply(this, args);
        };

        // Click handler for toolbar buttons
        $scope.toolbarButtonClicked = function(buttonIndex) {

            // Default behaviour
            var buttonClicked = $scope.items[buttonIndex];
            var services = { '$scope' : $scope, '$rootScope' : $rootScope, '$http' : $http, '$modal' : $modal, '$q' : $q, '$translate' : $translate, 'editorManager' : editorManager};
            executeFunctionByName(buttonClicked.action, window, services);

            // Other events
            var event = {
                type : KISBPM.eventBus.EVENT_TYPE_TOOLBAR_BUTTON_CLICKED,
                toolbarItem : buttonClicked
            };
            KISBPM.eventBus.dispatch(event.type, event);
        };
        
        // Click handler for secondary toolbar buttons
        $scope.toolbarSecondaryButtonClicked = function(buttonIndex) {
            var buttonClicked = $scope.secondaryItems[buttonIndex];
            var services = { '$scope' : $scope, '$http' : $http, '$modal' : $modal, '$q' : $q, '$translate' : $translate, '$location': $location,'editorManager' : editorManager};
            executeFunctionByName(buttonClicked.action, window, services);
        };
        
        /* Key bindings */
        Mousetrap.bind('mod+z', function(e) {
        	var services = { '$scope' : $scope, '$rootScope' : $rootScope, '$http' : $http, '$modal' : $modal, '$q' : $q, '$translate' : $translate,'editorManager' : editorManager};
        	KISBPM.TOOLBAR.ACTIONS.undo(services);
        });
        
        Mousetrap.bind('mod+y', function(e) {
        	var services = { '$scope' : $scope, '$rootScope' : $rootScope, '$http' : $http, '$modal' : $modal, '$q' : $q, '$translate' : $translate,'editorManager' : editorManager};
        	KISBPM.TOOLBAR.ACTIONS.redo(services);
        });
        
        Mousetrap.bind('mod+c', function(e) {
        	var services = { '$scope' : $scope, '$rootScope' : $rootScope, '$http' : $http, '$modal' : $modal, '$q' : $q, '$translate' : $translate,'editorManager' : editorManager};
        	KISBPM.TOOLBAR.ACTIONS.copy(services);
        });
        
        Mousetrap.bind('mod+v', function(e) {
        	var services = { '$scope' : $scope, '$rootScope' : $rootScope, '$http' : $http, '$modal' : $modal, '$q' : $q, '$translate' : $translate,'editorManager' : editorManager};
        	KISBPM.TOOLBAR.ACTIONS.paste(services);
        });
        
        Mousetrap.bind('del', function(e) {
            console.log("testjueh");
        	$scope.$apply(function(){
                var services = { '$scope' : $scope, '$rootScope' : $rootScope, '$http' : $http, '$modal' : $modal, '$q' : $q, '$translate' : $translate,'editorManager' : editorManager};
                KISBPM.TOOLBAR.ACTIONS.deleteItem(services);
            });
        });

        /* Undo logic */

        $scope.undoStack = [];
        $scope.redoStack = [];

        KISBPM.eventBus.addListener(KISBPM.eventBus.EVENT_TYPE_UNDO_REDO_RESET,function($scope){
            this.undoStack = [];
            this.redoStack = [];
            for(var i = 0; i < this.items.length; i++)
            {
                var item = this.items[i];
                if (item.action === 'KISBPM.TOOLBAR.ACTIONS.undo' || item.action === "KISBPM.TOOLBAR.ACTIONS.redo"){
                    item.enabled = false;
                }
            }
        },$scope);

        $scope.editorFactory.promise.then(function() {

            // Catch all command that are executed and store them on the respective stacks
            editorManager.registerOnEvent(ORYX.CONFIG.EVENT_EXECUTE_COMMANDS, function( evt ){

                // If the event has commands
                if( !evt.commands ){ return; }

                $scope.undoStack.push( evt.commands );
                $scope.redoStack = [];
                
                for(var i = 0; i < $scope.items.length; i++) 
        		{
                    var item = $scope.items[i];
                    if (item.action === 'KISBPM.TOOLBAR.ACTIONS.undo')
                    {
                    	item.enabled = true;
                    }
                    else if (item.action === 'KISBPM.TOOLBAR.ACTIONS.redo')
                    {
                    	item.enabled = false;
                    }
        		}

                // Update
                editorManager.getCanvas().update();
                editorManager.updateSelection();

            });
        });
        
        // Handle enable/disable toolbar buttons 
        $scope.editorFactory.promise.then(function() {
        	editorManager.registerOnEvent(ORYX.CONFIG.EVENT_SELECTION_CHANGED, function( evt ){
        		var elements = evt.elements;
        		
        		for(var i = 0; i < $scope.items.length; i++) 
        		{
                    var item = $scope.items[i];
                    if (item.enabledAction && item.enabledAction === 'element')
                    {
                    	var minLength = 1;
                    	if(item.minSelectionCount) {
                    		minLength = item.minSelectionCount;
                    	}
                    	if (elements.length >= minLength && !item.enabled) {
                    		$scope.safeApply(function () {
                    			item.enabled = true;
                            });
                    	}
                    	else if (elements.length == 0 && item.enabled) {
                    		$scope.safeApply(function () {
                    			item.enabled = false;
                            });
                    	}
                    }
                }
        	});
        	
        });

    }]);