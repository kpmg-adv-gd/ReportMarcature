sap.ui.define([
    "sap/ui/model/resource/ResourceModel",
    "sap/dm/dme/podfoundation/control/PropertyEditor"
], function (ResourceModel, PropertyEditor) {
    "use strict";
    
    var oFormContainer;

    return PropertyEditor.extend( "kpmg.custom.markingReport.MarkingReport.MarkingReport.builder.PropertyEditor" ,{

		constructor: function(sId, mSettings){
			PropertyEditor.apply(this, arguments);
			
			this.setI18nKeyPrefix("customComponentListConfig.");
			this.setResourceBundleName("kpmg.custom.markingReport.MarkingReport.MarkingReport.i18n.builder");
			this.setPluginResourceBundleName("kpmg.custom.markingReport.MarkingReport.MarkingReport.i18n.i18n");
		},
		
		addPropertyEditorContent: function(oPropertyFormContainer){
			var oData = this.getPropertyData();
						
			this.addInputField(oPropertyFormContainer, "BaseProxyURL", oData);
			this.addInputField(oPropertyFormContainer, "Plant", oData);
			this.addInputField(oPropertyFormContainer, "appKey", oData);

            oFormContainer = oPropertyFormContainer;
		},
		
		getDefaultPropertyData: function(){
			return {
				"BaseProxyURL": "https://proxyServerGdDm.cfapps.eu20-001.hana.ondemand.com",
				"Plant": "GD03",
				"appKey": "f39d82a2f36f5ac8f8322a3d7c409d02a6f0e7d4b2181d09d243d70fe232c8cd"
			};
		}

	});
});