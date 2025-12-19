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
            that.MarkingUnProdPopupModel.setProperty("/value", that.formatHCN(Number(selectedConfirmation.marked_labor) + Number(selectedConfirmation.variance_labor)));
            that.MarkingUnProdPopupModel.setProperty("/personnelNumber", selectedConfirmation.user_personal_number);
            that.MarkingUnProdPopupModel.setProperty("/confirmationNumber", selectedConfirmation.confirmation_number);
            that.MarkingUnProdPopupModel.setProperty("/wbsDescription", unproductive.wbs_description);
            that.MarkingUnProdPopupModel.setProperty("/wbsActivityDescription", unproductive.activity_id_description);
            that.MarkingUnProdPopupModel.setProperty("/coordinationActivity", unproductive.coordination_activity);
            that.MarkingUnProdPopupModel.setProperty("/defectSelected", selectedConfirmation.defectId);
            that.getView().byId("selectedVarianceTextUnp").setText(selectedConfirmation.variance_description)
            that.getView().byId("selectedUpdateTextUnp").setText(selectedConfirmation.modification)
            that._selectedCause = selectedConfirmation.cause;

            var plannedLabor = unproductive.duration;
            var uom_planned_labor = unproductive.duration_uom;
            var marked_laborUnp = unproductive.marked_labor;
            var uom_marked_labor = unproductive.marked_uom;
            var varianceLabor = unproductive.variance_labor;
            try { var remainingLabor = Number(plannedLabor) - Number(marked_laborUnp) } catch(e) { var remainingLabor = 0 };
            that.MarkingUnProdPopupModel.setProperty("/plannedLabor", plannedLabor);
            that.MarkingUnProdPopupModel.setProperty("/uom_planned_labor", uom_planned_labor);
            that.MarkingUnProdPopupModel.setProperty("/markedLabor", marked_laborUnp);
            that.MarkingUnProdPopupModel.setProperty("/uom_marked_labor", uom_marked_labor);
            that.MarkingUnProdPopupModel.setProperty("/remainingLabor", remainingLabor);
            that.MarkingUnProdPopupModel.setProperty("/varianceLabor", varianceLabor);

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
            that.getZDefects();
                
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
            
            let modification = that.getView().byId("selectedUpdateTextUnp").getText() || "";
            let variance = that.getView().byId("selectedVarianceTextUnp").getText() || "";
            var defect = that.MarkingUnProdPopupModel.getProperty("/defectSelected") || "";

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
                unCancellation: "",
                unConfirmation: "X",
                rowSelectedWBS: unproductive,
                userId: user,
                modification: modification == "" ? null : modification,
                reasonForVariance: variance == "" ? null : that._selectedCause,
                defect: defect == "" ? null : defect
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
                that.MainViewController.showErrorMessageBox(error);
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
            let coordinationActivity = that.MarkingUnProdPopupModel.getProperty("/coordinationActivity");
            if(!confirmation_number || !personnelNumber) return false;

            if (coordinationActivity) {
                let modification = that.getView().byId("selectedUpdateTextUnp").getText() || "";
                let variance = that.getView().byId("selectedVarianceTextUnp").getText() || "";
                var defect = that.MarkingUnProdPopupModel.getProperty("/defectSelected") || "";
                if (modification != "" && variance == "") return false;
                if (variance != "" && modification == "" && defect == "") return false;
            }

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
        },



        onGetReasonsForVariance: function () {
            var that = this;
            var infoModel = that.MainViewController.getInfoModel();

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathReasonForVarianceApi = "/db/getReasonsForVariance";
            let url = BaseProxyURL + pathReasonForVarianceApi;

            let params = {};

            // Callback di successo
            var successCallback = function (response) {
                var oModel = new JSONModel();
                oModel.setProperty("/rows", response);
                that.getView().setModel(oModel, "varianceModel");;
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        onVarianceButtonPressed: function (oEvent) {
            var that = this;

            if (!that._oVariancePopover) {
                that._oTable = new sap.m.Table("varianceTable", {
                    mode: "SingleSelectMaster",
                    columns: [
                        new sap.m.Column({ header: new sap.m.Label({ text: "Plant" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Cause" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Description" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Notes" }) })
                    ],
                    items: {
                        path: "varianceModel>/rows",
                        template: new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Text({ text: "{varianceModel>plant}" }),
                                new sap.m.Text({ text: "{varianceModel>cause}" }),
                                new sap.m.Text({ text: "{varianceModel>description}" }),
                                new sap.m.Text({ text: "{varianceModel>notes}" })
                            ]
                        })
                    },
                    selectionChange: function (oEvent) {
                        var oSelectedItem = oEvent.getParameter("listItem");
                        var oContext = oSelectedItem.getBindingContext("varianceModel");
                        that._selectedCause = oContext.getProperty("cause");
                        that._selectedDescription = oContext.getProperty("description");
                        that._oConfirmButton.setEnabled(true);
                    }
                });

                that._oVariancePopover = new sap.m.Popover({
                    showHeader: false,
                    placement: "Right",
                    contentWidth: "600px",
                    contentHeight: "300px",
                    content: [
                        new sap.m.SearchField({
                            placeholder: "Search description...",
                            liveChange: function (oEvent) {
                                var sQuery = oEvent.getParameter("newValue");
                                var oTable = that._oTable;
                                var oBinding = oTable.getBinding("items");
                                var aFilters = [];

                                if (sQuery) {
                                    var oFilter = new sap.ui.model.Filter(
                                        "description",
                                        sap.ui.model.FilterOperator.Contains,
                                        sQuery
                                    );
                                    aFilters.push(oFilter);
                                }

                                oBinding.filter(aFilters);
                            }
                        }),
                        that._oTable

                    ],
                    footer: new sap.m.Toolbar({
                        content: [
                            new sap.m.Button({
                                text: "Confirm",
                                enabled: false,
                                press: function () {
                                    that.onConfirmVarianceSelection();
                                }
                            }),
                            new sap.m.Button({
                                text: "Cancel",
                                press: function () {
                                    that.getView().byId("selectedVarianceTextUnp").setText("");
                                }
                            }),
                            new sap.m.Button({
                                text: "Close",
                                press: function () {
                                    that._oVariancePopover.close();
                                }
                            })
                        ]
                    })
                });

                that.getView().addDependent(that._oVariancePopover);
                that._oConfirmButton = that._oVariancePopover.getFooter().getContent()[0];
            }

            that._oConfirmButton.setEnabled(false);
            that._selectedCause = null;
            that._selectedDescription = null;

            that.onGetReasonsForVariance();
            that._oVariancePopover.openBy(oEvent.getSource());
        },
        onConfirmVarianceSelection: function () {
            var that = this;
            var varianceSelection;

            if (that._selectedCause && that._selectedDescription) {
                varianceSelection = that._selectedCause;
                that.getView().byId("selectedVarianceTextUnp").setText(that._selectedDescription);

                that._oVariancePopover.close();
            } else {
                varianceSelection = "";
                sap.m.MessageToast.show("No reason selected.");
            }

            return varianceSelection;
        },
        onUpdateButtonPressed: function (oEvent) {
            var that = this;

            if (!that._oUpdatePopover) {
                that._oTable = new sap.m.Table("updateTable", {
                    mode: "SingleSelectMaster",
                    columns: [
                        new sap.m.Column({ header: new sap.m.Label({ text: "Progressive Eco" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Process Id" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Flux Type" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Type Modification" }) })
                    ],
                    items: {
                        path: "updateModel>/rows",
                        template: new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Text({ text: "{updateModel>prog_eco}" }),
                                new sap.m.Text({ text: "{updateModel>process_id}" }),
                                new sap.m.Text({ text: "{updateModel>flux_type}" }),
                                new sap.m.Text({ text: "{updateModel>type}" })
                            ]
                        })
                    },
                    selectionChange: function (oEvent) {
                        var oSelectedItem = oEvent.getParameter("listItem");
                        var oContext = oSelectedItem.getBindingContext("updateModel");
                        that._selectedProgEco = oContext.getProperty("prog_eco");
                        that._selectedProcessId = oContext.getProperty("process_id");
                        that._selectedFluxType = oContext.getProperty("flux_type");
                        that._selectedTypeModification = oContext.getProperty("type");
                        that._oConfirmUpdateButton.setEnabled(true);
                    }
                });

                that._oUpdatePopover = new sap.m.Popover({
                    showHeader: false,
                    placement: "Right",
                    contentWidth: "600px",
                    contentHeight: "300px",
                    content: [
                        new sap.m.SearchField({
                            placeholder: "Search description...",
                            liveChange: function (oEvent) {
                                var sQuery = oEvent.getParameter("newValue");
                                var oTable = that._oTable;
                                var oBinding = oTable.getBinding("items");
                                var aFilters = [];

                                if (sQuery) {
                                    var oFilter = new sap.ui.model.Filter(
                                        "description",
                                        sap.ui.model.FilterOperator.Contains,
                                        sQuery
                                    );
                                    aFilters.push(oFilter);
                                }

                                oBinding.filter(aFilters);
                            }
                        }),
                        that._oTable

                    ],
                    footer: new sap.m.Toolbar({
                        content: [
                            new sap.m.Button({
                                text: "Confirm",
                                enabled: false,
                                press: function () {
                                    that.onConfirmUpdateSelection();
                                }
                            }),
                            new sap.m.Button({
                                text: "Cancel",
                                press: function () {
                                    that.getView().byId("selectedUpdateTextUnp").setText("");
                                }
                            }),
                            new sap.m.Button({
                                text: "Close",
                                press: function () {
                                    that._oUpdatePopover.close();
                                }
                            })
                        ]
                    })
                });

                that.getView().addDependent(that._oUpdatePopover);
                that._oConfirmUpdateButton = that._oUpdatePopover.getFooter().getContent()[0];
            }

            that._oConfirmUpdateButton.setEnabled(false);
            that._selectedProgEco = null;
            that._selectedProcessId = null;
            that._selectedFluxType = null;
            that._selectedTypeModification = null;
            that.onGetUpdateTable();
            that._oUpdatePopover.openBy(oEvent.getSource());

        },
        onConfirmUpdateSelection: function () {
            var that = this;

            if (!!that._selectedProgEco ) {
                that.getView().byId("selectedUpdateTextUnp").setText(that._selectedProgEco);
                that._oUpdatePopover.close();
            } else if (!!that._selectedProcessId ){
                that.getView().byId("selectedUpdateTextUnp").setText(that._selectedProcessId);
                that._oUpdatePopover.close();
            } else {
                sap.m.MessageToast.show("No Modification selected.");
            }

        },
        
        getZDefects: function () {
            var that=this;
            var infoModel = that.MainViewController.getInfoModel();
            
            var plant = infoModel.getProperty("/plant");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/db/selectZDefectByWBE";
            let url = BaseProxyURL+pathOrderBomApi; 

            var selectedConfirmation = that.MainViewController.getInfoModel().getProperty("/selectedConfirmation");
            let params={
                plant:plant,
                wbe: that.MainViewController.getInfoModel().getProperty("/unproductive").wbe.substring(0, 16)
            };

            // Callback di successo
            var successCallback = function(response) {
                that.MarkingUnProdPopupModel.setProperty("/defects", [...[{id:"", title:"", variance: ""}], ...response]);
                that.MarkingUnProdPopupModel.setProperty("/defectSelected", selectedConfirmation.defect_id);
            };
            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        
        onChangeDefect: function (oEvent) {
            var that = this;
            var variance = this.MarkingUnProdPopupModel.getProperty("/defects").filter(item => item.id == this.MarkingUnProdPopupModel.getProperty("/defectSelected"))[0].variance;
            var variance_description = this.MarkingUnProdPopupModel.getProperty("/defects").filter(item => item.id == this.MarkingUnProdPopupModel.getProperty("/defectSelected"))[0].variance_description;
            that.getView().byId("selectedVarianceTextUnp").setText(variance);
            that._selectedCause = variance
            that._selectedDescription = variance_description
        },

        
        onGetUpdateTable: function(){
            var that=this;
            var that = this;

            var infoModel = that.MainViewController.getInfoModel();
            var plant = infoModel.getProperty("/plant");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathModificationApi = "/db/getModificationsByWBE";
            let url = BaseProxyURL + pathModificationApi;

            let params = {
                plant:plant,
                wbe: that.MainViewController.getInfoModel().getProperty("/unproductive").wbe
            };

            // Callback di successo
            var successCallback = function (response) {
                var oModel = new JSONModel();
                oModel.setProperty("/rows", response);
                that.getView().setModel(oModel, "updateModel");;
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
    })
}
)