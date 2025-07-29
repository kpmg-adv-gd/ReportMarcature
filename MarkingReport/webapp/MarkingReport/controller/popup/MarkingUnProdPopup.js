sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../../utilities/CommonCallManager",
    "../../utilities/GenericDialog"
], function (JSONModel, CommonCallManager, Dialog) {
    "use strict";

    return Dialog.extend("kpmg.custom.markingReport.MarkingReport.MarkingReport.controller.popup.MarkingUnProdPopup", {

        open: function (oView, oController) {
            var that = this;
            that.MarkingUnProdPopupModel = new JSONModel();
            that.MainViewController = oController;
            that._initDialog("kpmg.custom.markingReport.MarkingReport.MarkingReport.view.popup.MarkingUnProdPopup", oView, that.MarkingUnProdPopupModel);
            that.openDialog();
            that.populateFieldsData();
        },

        populateFieldsData: function () {
            var that = this;
            var selectedConfirmation = that.MainViewController.getInfoModel().getProperty("/selectedConfirmation");
            var unproductive = that.MainViewController.getInfoModel().getProperty("/unproductive");

            that.MarkingUnProdPopupModel.setProperty("/day", selectedConfirmation.marking_date);
            that.MarkingUnProdPopupModel.setProperty("/value", that.formatHCN(selectedConfirmation.marked_labor));
            that.MarkingUnProdPopupModel.setProperty("/personnelNumber", selectedConfirmation.user_personal_number);
            that.MarkingUnProdPopupModel.setProperty("/confirmationNumber", selectedConfirmation.confirmation_number);
            that.MarkingUnProdPopupModel.setProperty("/wbsDescription", unproductive.wbs_description);
            that.MarkingUnProdPopupModel.setProperty("/wbsActivityDescription", unproductive.activity_id_description);

            let marked_labor = selectedConfirmation.marked_labor;
            let variance_labor = selectedConfirmation.variance_labor;
            let labor=0;
            if(!marked_labor && variance_labor){
                labor=variance_labor;
            } else if(marked_labor && !variance_labor){
                labor=marked_labor;
            }
            let hhValue = Math.trunc(labor/100);
            let mmValue = Math.round(((labor/100)-hhValue)*60);
            let hhInput = that.getView().byId("hhUnProdInputId");
            let mmInput = that.getView().byId("mmUnProdInputId");
            hhInput.setValue(hhValue);
            mmInput.setValue(mmValue);
                
        },
      
        onHHInputChange: function(oEvent){
            var that=this;
            let value = oEvent.getParameters().value;
            let hhInput = that.getView().byId("hhUnProdInputId");
            if(value.length>2) hhInput.setValue(value.substring(0,2));
        },
        onMMInputChange: function(oEvent){
            var that=this;
            var that=this;
            let value = oEvent.getParameters().value;
            let mmInput = that.getView().byId("mmUnProdInputId");
            if(value.length>2) mmInput.setValue(value.substring(0,2));
        },

        sendToSapAndInsertIntoZTable: function () {
            var that = this;
            var infoModel = that.MainViewController.getInfoModel();
            var plant = infoModel.getProperty("/plant");
            let user = infoModel.getProperty("/user_id");
            var unproductive = infoModel.getProperty("/unproductive");
            
            var personnelNumber = that.MarkingUnProdPopupModel.getProperty("/personnelNumber");
            var day = that.MarkingUnProdPopupModel.getProperty("/day");
            let confirmation_number = that.MarkingUnProdPopupModel.getProperty("/confirmationNumber");

            var hh = parseInt(that.getView().byId("hhUnProdInputId").getValue(),10);
            var mm = parseInt(that.getView().byId("mmUnProdInputId").getValue(),10);
            if(!hh) hh=0;
            if(!mm) mm=0;
            var duration = Math.round( (hh + (mm/60)) * 100);

            let params = {
                plant: plant,
                activityNumber: unproductive.network,
                activityNumberId: unproductive.activity_id,
                cancellation: "",
                confirmation: "",
                confirmationCounter: "",
                confirmationNumber: confirmation_number,
                date: day,
                duration: "" + duration,
                durationUom: "HCN",
                personalNumber: personnelNumber,
                reasonForVariance: "",
                unCancellation: "",
                unConfirmation: "X",
                rowSelectedWBS: unproductive,
                userId: user
            }

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathSendMarkingApi = "/api/sendZDMConfirmations";
            let url = BaseProxyURL + pathSendMarkingApi;

            // Callback di successo
            var successCallback = function (response) {
                that.MainViewController.showToast(that.MainViewController.getI18n("marking.success.message"));
                that.MainViewController.onGoPress();
                that.onClosePopup();
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
                that.MainViewController.showErrorMessageBox(that.MainViewController.getI18n("marking.errorUnprod.message"));
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,true,true);
        },
        validate: function () {
            var that = this;
            var hhInputValue = that.getView().byId("hhUnProdInputId").getValue();
            var mmInputValue = that.getView().byId("mmUnProdInputId").getValue();
            var day = that.MarkingUnProdPopupModel.getProperty("/day")

            if( (hhInputValue == "" && mmInputValue=="") || (parseInt(hhInputValue,10)==0 && parseInt(mmInputValue,10)==0) ){
                return false;
            } else if( (parseInt(hhInputValue,10)==0 && mmInputValue=="") || (hhInputValue=="" && parseInt(mmInputValue,10)==0) ){
                return false;
            }else if(hhInputValue==""){
                hhInputValue="00";
            } else if (mmInputValue==""){
                mmInputValue="00";
            }

            // Valid check date (exists and not future)
            if (!day || day == "" || new Date(that.parseDateFromString(day)).getTime() > new Date().getTime()) return false;

            if(parseInt(mmInputValue,10)<0 || parseInt(mmInputValue,10)>59) return false;

            var confirmation_number = that.MarkingUnProdPopupModel.getProperty("/confirmationNumber");
            var personnelNumber = that.MarkingUnProdPopupModel.getProperty("/personnelNumber");
            if(!confirmation_number || !personnelNumber) return false;

            return true;
        },
        onConfirmPress: function () {
            var that = this;
            if (that.validate()) {
                that.sendToSapAndInsertIntoZTable();
            } else {
                that.MainViewController.showErrorMessageBox(that.MainViewController.getI18n("marking.errorNonProd.message"));
            }
        },
        onClosePopup: function () {
            var that = this;
            that.closeDialog();
        },

        formatDate: function (dateStr) {
            const [day, month, year] = dateStr.split("/");
            const fullYear = year.length === 2 ? "20" + year : year; // oppure logica personalizzata
            return `${day}/${month}/${fullYear}`;
        },

        parseDateFromString: function(dateStr) {
            const [day, month, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day); // i mesi partono da 0 (gennaio)
        },

        formatHCN: function(centesimi) {
            const ore = Math.floor(centesimi / 100);
            const minuti = Math.round((centesimi % 100) * 0.6); // 1 centesimo = 0.6 minuti
            return ore + "h " + minuti.toString().padStart(2, '0') + "m";
        }
    })
}
)