sap.ui.define([
    'jquery.sap.global',
	"sap/dm/dme/podfoundation/controller/PluginViewController",
	"sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageBox",
    "../utilities/CommonCallManager",
    "./popup/MarkingPopup",
    "./popup/InfoMarkingPopup",
    "./popup/MarkingUnProdPopup"
], function (jQuery, PluginViewController, JSONModel,Spreadsheet, MessageBox, CommonCallManager, MarkingPopup, InfoMarkingPopup,MarkingUnProdPopup) {
	"use strict";

	return PluginViewController.extend("kpmg.custom.markingReport.MarkingReport.MarkingReport.controller.MainView", {
        markingReportModel: new JSONModel(),
        MarkingPopup: new MarkingPopup(),
        InfoMarkingPopup: new InfoMarkingPopup(),
        MarkingUnProdPopup: new MarkingUnProdPopup(),
		onInit: function () {
			PluginViewController.prototype.onInit.apply(this, arguments);
			this.setInfoModel();
            this.setBasicProperties();
		},
        onAfterRendering: function(){
            var that=this;
			that.populateSuggestionFilters();
        },
        getI18n: function(token) {
            return this.getView().getModel("i18n").getProperty(token);
        },
		setInfoModel: function() {
            var oModel = new JSONModel();
            //Imposto il mio modello globale -> Sarà accessibile da tutti i controller che ereditano il mio BaseController
            sap.ui.getCore().setModel(oModel, "InfoModel");
        },
        getInfoModel: function(){
            return sap.ui.getCore().getModel("InfoModel");
        },
		setBasicProperties: function(){
            this.getInfoModel().setProperty("/BaseProxyURL",this.getConfiguration().BaseProxyURL);
            this.getInfoModel().setProperty("/plant",this.getConfiguration().Plant);
            this.getInfoModel().setProperty("/user_id",this.getUserId());
            this.getInfoModel().setProperty("/appKey",this.getConfiguration().appKey);
			this.getView().setModel(this.markingReportModel, "MarkingReportModel");
			this.getView().getModel("MarkingReportModel").setProperty("/hasSelectedRow",false);
        },
        showToast: function(sMessage) {
            sap.m.MessageToast.show(sMessage);
        },
        showErrorMessageBox: function(oMessage) {
            MessageBox.error(oMessage, {
                title: "Error", // Titolo della finestra
                actions: [sap.m.MessageBox.Action.CLOSE], // Azione per chiudere il messaggio
                onClose: function (oAction) {
                }
            });
        },
        populateSuggestionFilters: function(){
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPIFilter = "/api/getFilterMarkingReport";
            let url = BaseProxyURL+pathAPIFilter;
            let plant = that.getInfoModel().getProperty("/plant");
            let params = {
                "plant": plant
            }
            // Callback di successo
            var successCallback = function(response) {
                var oFilterModel = new JSONModel(response);
                oFilterModel.setSizeLimit(10000);
                this.getView().setModel(oFilterModel,"FilterModel");
            };

            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);

        },
        onGoPress: function(){
			var that=this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathDBApi = "/db/getZOpConfirmationData";
            let url = BaseProxyURL+pathDBApi;
            let plant = that.getInfoModel().getProperty("/plant");
			let projectValue = that.getView().byId("projectInputId").getValue();
			let wbeValue = that.getView().byId("wbeInputId").getValue();
			let userIdValue = that.getView().byId("userInputId").getValue();
            let startMarkingDate="";
            let endMarkingDate="";

            let markingDataRangeValue = this.getView().byId("dataRangeInputId").getValue();
            let dateRegex = /(\d{2}\/\d{2}\/\d{4})\s*[\u2013\u002D]\s*(\d{2}\/\d{2}\/\d{4})/;
            let match = markingDataRangeValue.match(dateRegex);
            if(match){
                startMarkingDate=match[1];
                endMarkingDate=match[2];
            }
            let params = {
                "plant": plant,
				"project":projectValue,
				"wbe":wbeValue,
				"userId":userIdValue,
                "startMarkingDate":startMarkingDate,
                "endMarkingDate":endMarkingDate
            }
            // Callback di successo
            var successCallback = function(response) {
				that.getView().getModel("MarkingReportModel").setProperty("/OpConfirmations",response);
                let oTable = that.getView().byId("resultTable");
                let selectedIndex = oTable.getSelectedIndex();
                if(selectedIndex!==-1){
                    let selectedObject = oTable.getContextByIndex(selectedIndex).getObject();
                    that.getInfoModel().setProperty("/selectedConfirmation",selectedObject);
                }
            };

            // Callback di errore
            var errorCallback = function(error) {
                that.showErrorMessageBox(error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, true);
		},
		rowSelectionChange: function(oEvent){
			var that=this;
			var oTable = oEvent.getSource();
            var selectedIndex = oTable.getSelectedIndex();
            //Tutte le volte in cui ho selezionato (e non deselezionato)
            if( selectedIndex !== -1 ){
				var selectedObject = oTable.getContextByIndex(selectedIndex).getObject();
                that.getInfoModel().setProperty("/selectedConfirmation",selectedObject);
				that.getView().getModel("MarkingReportModel").setProperty("/hasSelectedRow",true);
                if (selectedObject.sfc != null) {
                    that.getView().getModel("MarkingReportModel").setProperty("/noUnprod",true);
                }else{
                    that.getView().getModel("MarkingReportModel").setProperty("/noUnprod",false);
                }
			} else {
				that.getInfoModel().setProperty("/selectedConfirmation",undefined);
				that.getView().getModel("MarkingReportModel").setProperty("/hasSelectedRow",false);
			}
		},
        onStornoPress: function(oEvent){
            var that=this;
            let oTitle=that.getI18n("markingReport.storno.title");
            let oMessage=that.getI18n("markingReport.storno.message");
            sap.m.MessageBox.show(
                oMessage, // Messaggio da visualizzare
                {
                    icon: sap.m.MessageBox.Icon.WARNING, // Tipo di icona
                    title: oTitle,        // Titolo della MessageBox
                    actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL], 
                    onClose: function(oAction) {          // Callback all'interazione
                        if (oAction=="OK") {
                            if (that.getInfoModel().getProperty("/selectedConfirmation").sfc != null)
                                that.sendStornoToSAP();
                            else
                                that.searchUnproductive("storno");
                        }
                    }
                }
            );

        },
        sendStornoToSAP: function(){
            var that=this;
            var infoModel = that.getInfoModel();
            var personnelNumber = infoModel.getProperty("/selectedConfirmation/user_personal_number");
            var sfc = infoModel.getProperty("/selectedConfirmation/sfc");
            var workCenter = infoModel.getProperty("/selectedConfirmation/workcenter");
            var plant = infoModel.getProperty("/selectedConfirmation/plant");
            var project = infoModel.getProperty("/selectedConfirmation/project");
            var wbe_machine = infoModel.getProperty("/selectedConfirmation/wbe_machine");
            var operation = infoModel.getProperty("/selectedConfirmation/operation") || "";
            var operationDescription = infoModel.getProperty("/selectedConfirmation/operation_description") || "";
            var mes_order = infoModel.getProperty("/selectedConfirmation/mes_order") || "";
            var confirmation_number = infoModel.getProperty("/selectedConfirmation/confirmation_number") || "";
            var marking_date = infoModel.getProperty("/selectedConfirmation/marking_date") || "";
            var marked_labor = infoModel.getProperty("/selectedConfirmation/marked_labor") || "";
            var uom_marked_labor = infoModel.getProperty("/selectedConfirmation/uom_marked_labor") || "";
            var variance_labor = infoModel.getProperty("/selectedConfirmation/variance_labor") || "";
            var uom_variance_labor = infoModel.getProperty("/selectedConfirmation/uom_variance_labor") || "";
            var reason_for_variance = that._selectedCause || "";
            var user_id = infoModel.getProperty("/user_id") || "";
            var cancelled_confirmation = infoModel.getProperty("/selectedConfirmation/confirmation_counter") || "";

            if(!that.validateMarkingDate(marking_date)){
                that.showErrorMessageBox(that.getI18n("marking.storno.error.markingDate"));
                return;
            }

            let params = {
                plant: plant,
                sfc: sfc,
                workCenter: workCenter,
                project: project,
                personalNumber: personnelNumber,
                wbe_machine : wbe_machine,
                operation : operation,
                operationDescription: operationDescription,
                mes_order : mes_order,
                confirmation_number : confirmation_number,
                marking_date : marking_date,
                marked_labor : marked_labor,
                uom_marked_labor : uom_marked_labor,
                variance_labor : variance_labor,
                uom_variance_labor : uom_variance_labor,
                reason_for_variance : reason_for_variance,
                user_id : user_id,
                confirmation: "",
                cancellation: "X",
                modification: "",
                cancelled_confirmation: cancelled_confirmation
            }

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathSendMarkingApi = "/api/sendMarkingToSapAndUpdateZTable";
            let url = BaseProxyURL + pathSendMarkingApi;

            // Callback di successo
            var successCallback = function (response) {
                that.showToast(that.getI18n("marking.success.message"));
                that.onGoPress();

            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
                that.showErrorMessageBox(that.getI18n("marking.saveData.error.message"));
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,true,true);

        },
        sendStornoUnProdToSAP: function(){
            var that=this;
            var infoModel = that.getInfoModel();
            var plant = infoModel.getProperty("/selectedConfirmation/plant");
            var unproductive = infoModel.getProperty("/unproductive");
            var selectedConfirmation = infoModel.getProperty("/selectedConfirmation");
            var user = that.getInfoModel().getProperty("/user_id");

            if(!that.validateMarkingDate(selectedConfirmation.marking_date)){
                that.showErrorMessageBox(that.getI18n("marking.storno.error.markingDate"));
                return;
            }

            let params = {
                plant: plant,
                activityNumber: unproductive.network,
                activityNumberId: unproductive.activity_id,
                cancellation: "",
                confirmation: "",
                confirmationCounter: selectedConfirmation.confirmation_counter,
                confirmationNumber: selectedConfirmation.confirmation_number,
                date: selectedConfirmation.marking_date,
                duration: selectedConfirmation.marked_labor,
                durationUom: "HCN",
                personalNumber: selectedConfirmation.user_personal_number,
                reasonForVariance: "",
                unCancellation: "X",
                unConfirmation:"",
                rowSelectedWBS: unproductive,
                userId: user
            }

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathSendMarkingApi = "/api/stornoUnproductive";
            let url = BaseProxyURL + pathSendMarkingApi;

            // Callback di successo
            var successCallback = function (response) {
                that.showToast(that.getI18n("marking.success.message"));
                that.onGoPress();

            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
                that.showErrorMessageBox(error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,true,true);

        },
        onNewMarkPress: function(oEvent){
            var that=this;
            if (that.getInfoModel().getProperty("/selectedConfirmation").sfc != null) {
                that.MarkingPopup.open(that.getView(), that);
            }else{
                that.searchUnproductive("mark");
            }
        },
        searchUnproductive: function (mode) {
            var that = this;
            var plant = that.getInfoModel().getProperty("/plant");
            var selectedConfirmation = that.getInfoModel().getProperty("/selectedConfirmation");

            let params = {
               plant: plant,
               confirmationNumber: selectedConfirmation.confirmation_number
            }

            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathSendMarkingApi = "/db/getUnproductiveByConfirmationNumber";
            let url = BaseProxyURL + pathSendMarkingApi;

            // Callback di successo
            var successCallback = function (response) {
                if (response && response.length > 0) {
                    that.getInfoModel().setProperty("/unproductive", response[0]);
                    if (mode == "mark")
                        that.MarkingUnProdPopup.open(that.getView(), that);
                    else
                        that.sendStornoUnProdToSAP();
                }
            };

            // Callback di errore
            var errorCallback = function (error) {
                
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        onInfoMarkPress: function(oEvent){
            var that=this;
            var selectedConfirmation = that.getInfoModel().getProperty("/selectedConfirmation");
            if (selectedConfirmation.sfc == null) return;
            that.InfoMarkingPopup.open(that.getView(), that);
        },
        onExportExcel: function () {
            var that=this;
            // Crea l'array di colonne per l'Excel (può essere personalizzato)
            var aColumns = [
                { label: "Plant", property: "plant" },
                { label: "Project", property: "project" },
                { label: "WBE", property: "wbe_machine" },
                { label: "Order", property: "mes_order" },
                { label: "SFC", property: "sfc" },
                { label: "Operation", property: "operation" },
                { label: "Operation Description", property: "operation_description" },
                { label: "Work Center", property: "workcenter" },
                { label: "Confirmation Number", property: "confirmation_number" },
                { label: "Confirmation Counter", property: "confirmation_counter" },
                { label: "Marking Date", property: "marking_date" },
                { label: "Marked Labor", property: "marked_labor" },
                { label: "Marked Labor UoM", property: "uom_marked_labor" },
                { label: "Variance Labor", property: "variance_labor" },
                { label: "Variance Labor UoM", property: "uom_variance_labor" },
                { label: "Variance", property: "reason_for_variance" },
                { label: "Variance Description", property: "variance_description" },
                { label: "Eng.Changes", property: "modification" },
                { label: "User Id", property: "user_id" },
                { label: "User Personal Number", property: "user_personal_number" },
                { label: "Cancellation Flag", property: "cancellation_flag" },
                { label: "Cancelled By", property: "cancelled_by" },
                { label: "Cancelled Confirmation", property: "cancelled_confirmation" },
                { label: "Operation Total Planned Labor", property: "planned_labor" },
                { label: "Operation Total Planned Labor UoM", property: "uom_planned_labor" },
                { label: "Operation Total Marked Labor", property: "marked_labor_total" },
                { label: "Operation Total Marked Labor UoM", property: "uom_marked_labor_total" },
                { label: "Operation Total Remaining Labor", property: "remaining_labor" },
                { label: "Operation Total Remaining Labor UoM", property: "uom_remaining_labor" },
                { label: "Operation Total Variance Labor", property: "variance_labor_total" },
                { label: "Operation Total Variance Labor UoM", property: "uom_variance_total" },
                { label: "Defect", property: "defect_description" }
            ];

            var aData = that.getView().getModel("MarkingReportModel").getProperty("/OpConfirmations");
            var todayAsString = that.getTodayDateAsString();
            // Configura l'oggetto per l'esportazione
            var oSettings = {
                workbook: { columns: aColumns },
                dataSource: aData,
                fileName: "Marking_Report_Export_"+todayAsString+".xlsx",
                mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            };

            // Crea il file Excel e avvia il download
            var oSpreadsheet = new Spreadsheet(oSettings);
            oSpreadsheet.build().then(function () {
                oSpreadsheet.destroy();
            });
        },
        validateMarkingDate: function(marking_date){
            var that=this;
            function convertToDate(dateStr) {
                let parts = dateStr.split("/");
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
            let markingDate = convertToDate(marking_date);
            let today = new Date();
            if (markingDate > today) {
                return false;
            }
            return true;
            /*
            let monthsMarking = marking_date.split("/")[1];
            let comparingDate = new Date();
            //Data attuale con il primo giorno del mese
            comparingDate.setDate(1);
            if(today.getDate()<=2){
                comparingDate.setMonth(monthsMarking-1);
            }
            comparingDate.setHours(0,0,0,0);
            if(markingDate<comparingDate) return false;
            return true;
            */
        },
        getTodayDateAsString: function(){
            const oggi = new Date();
            const giorno = String(oggi.getDate()).padStart(2, '0');
            const mese = String(oggi.getMonth() + 1).padStart(2, '0'); // I mesi in JS partono da 0, quindi aggiungiamo 1
            const anno = oggi.getFullYear();
            const dataStringa = `${giorno}_${mese}_${anno}`;
            return dataStringa;
        },
		onExit: function () {
			PluginViewController.prototype.onExit.apply(this, arguments);
		}
	});
});