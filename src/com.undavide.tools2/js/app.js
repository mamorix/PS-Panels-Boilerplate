var app = angular.module('ToolsApp', []);

app.factory('CSI', function() {
	
	var csInterface = new CSInterface();

	// Convert the Color object to string in hexadecimal format; 
	var toHex = function (color, delta) {

		function computeValue(value, delta) {
			var computedValue = !isNaN(delta) ? value + delta : value;
			if (computedValue < 0) {
				computedValue = 0;
			} else if (computedValue > 255) {
				computedValue = 255;
			}

			computedValue = Math.floor(computedValue);

			computedValue = computedValue.toString(16);
			return computedValue.length === 1 ? "0" + computedValue : computedValue;
		}

		var hex = "";
		if (color) {
			hex = computeValue(color.red, delta) + computeValue(color.green, delta) + computeValue(color.blue, delta);
		}
		return hex;
	}

	// Add a rule in a stylesheet
	var addRule = function (stylesheetId, selector, rule) {
		var stylesheet = document.getElementById(stylesheetId);
		if (stylesheet) {
			stylesheet = stylesheet.sheet;
			if (stylesheet.addRule) {
				stylesheet.addRule(selector, rule);
			} else if (stylesheet.insertRule) {
				stylesheet.insertRule(selector + ' { ' + rule + ' }', stylesheet.cssRules.length);
			}
		}
	}
	
	// Update the theme with the appropriate Topcoat CSS using appSkinInfo
	// to determine which one to load - then overrides some Topcoat properties
	var updateThemeWithAppSkinInfo = function (appSkinInfo) {

		// console.log(JSON.stringify(appSkinInfo));

		var themeShade = "",
			redShade = appSkinInfo.panelBackgroundColor.color.red;

		if (redShade > 200) { // exact: 214 (#D6D6D6)
			themeShade = "lightlight"; // might be useful in the future
			// this is where font color and other theme dependent stuff could go
			$("#topcoat").attr("href", "css/topcoat-desktop-lightlight.min.css");
		
		} else if (redShade > 180) { // exact: 184 (#B8B8B8)
			themeShade = "light";
			$("#topcoat").attr("href", "css/topcoat-desktop-light.min.css");

		} else if (redShade > 80) { // exact: 83 (#535353)
			themeShade = "dark";
			$("#topcoat").attr("href", "css/topcoat-desktop-dark.min.css");
		
		} else if (redShade > 50) { // exact: 52 (#343434)
			themeShade = "darkdark";
			$("#topcoat").attr("href", "css/topcoat-desktop-darkdark.min.css");
		}

		var styleId = "topcoat-host",
			fontColor = themeShade.match(/light/) ? "#202020" : "#E6E6E6"
			
		addRule(styleId, "body", "font-family:" + appSkinInfo.baseFontFamily );
		addRule(styleId, "body", "font-size:" + appSkinInfo.baseFontSize + "px");
		addRule(styleId, "body", "color:" + fontColor);

		// Set the Tools icons stylesheet and Font color
		if (redShade > 128) { // light theme
			$("#icons").attr("href", "css/icons-light-theme.css");	
		} else { // dark theme
			$("#icons").attr("href", "css/icons-dark-theme.css");	
		}
	}

	// Callback for the CSInterface.THEME_COLOR_CHANGED_EVENT
	var onAppThemeColorChanged = function (event) {
		var skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
		updateThemeWithAppSkinInfo(skinInfo);
	}
	
	var syncTheme = function () {
		updateThemeWithAppSkinInfo(csInterface.hostEnvironment.appSkinInfo);
		csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);		
	}

	return {
		csInterface: csInterface,
		syncTheme: syncTheme
	}
});

app.factory('StringIDs', ['$http', function($http) {

	return {
		getObject: function() { return $http.get('./js/tools.json') }
	}
	
}]);

app.controller('ToolsController', ['$scope', '$http', 'CSI', 'StringIDs', function ($scope, $http, CSI, StringIDs) {

	CSI.syncTheme();
	$scope.psToolsModel = null;
	$scope.csInterface = CSI.csInterface;

	// Get the StringID of the currently selected Tool
	// so that when the panel opens it already has the right Tool selected
	CSI.csInterface.evalScript('getCurrentTool()', function (stringID) { // callback

		// Fetch the local JSON (array of Tools objects)
		StringIDs.getObject()

			.success( function (data) {
				// fill the psToolsModel to be used by ng-repeat directive
				$scope.psToolsModel = data;

				// filter the JSON to extract the object corresponding to the selected tool
				// selectedTool is an Array of one object
				var selectedTool = $scope.psToolsModel.filter(function (item) {
					return item['stringID'] == stringID;
				});
				// assign the object to toggleGroup, which is the ng-model for radio buttons
				$scope.toggleGroup = JSON.stringify(selectedTool[0]);
			})

			// in case of error
			.error( function(data, status, headers, config) {
				console.log("Error reading the tools file!");
			});
	});
}]);

app.directive('psTools', [ 'CSI', function (CSI) {
	return {
		restrict: 'E',
		replace: true,
		// seems like ToolTip doesn't work as button's title :-(
		template: '<div class="inline"><input type="radio" value="{{tool}}" id="{{type}}" class="topcoat-toggle" ng-model="$parent.toggleGroup" ng-click="selectTool()"> \
					<label class="topcoat-toggle topcoat-icon-button ps-icon {{type}}" for="{{type}}" title="{{toolTip}}"></label></div>',
		link: function($scope, $element, $attrs) {
			$scope.type = $attrs.type;
			if ($attrs.idx) {
				$scope.toolTip = $scope.psToolsModel[$attrs.idx].toolTip;
			}
			// calls the selection function in JSX
			$scope.selectTool = function() { 
				CSI.csInterface.evalScript("selectTool('" + $scope.type + "')");
			};
		}
	}
}]);
