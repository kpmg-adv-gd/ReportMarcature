sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../../utilities/CommonCallManager",
    "../../utilities/GenericDialog"
], function (JSONModel, CommonCallManager, Dialog) {
    "use strict";

    return Dialog.extend("kpmg.custom.markingReport.MarkingReport.MarkingReport.controller.popup.MarkingPopup", {

        open: function (oView, oController) {
            var that = this;
            that.MarkingPopupModel = new JSONModel();
            that.MainViewController = oController;
            that._initDialog("kpmg.custom.markingReport.MarkingReport.MarkingReport.view.popup.MarkingPopup", oView, that.MarkingPopupModel);
            that.openDialog();
            that.populateFieldsData();
        },
        populateFieldsData: function () {
            var that = this;
            var selectedConfirmation = that.MainViewController.getInfoModel().getProperty("/selectedConfirmation");
            let wbe = selectedConfirmation.wbe_machine;
            let sfc = selectedConfirmation.sfc;
            let order = selectedConfirmation.mes_order;
            let operation = selectedConfirmation.operation;
            let confirmNumber = selectedConfirmation.confirmation_number;
            let personnelNumber = selectedConfirmation.user_personal_number;

            that.MarkingPopupModel.setProperty("/wbe", wbe);
            that.MarkingPopupModel.setProperty("/sfc", sfc);
            that.MarkingPopupModel.setProperty("/order", order);
            that.MarkingPopupModel.setProperty("/operation", operation);
            that.MarkingPopupModel.setProperty("/confirmNumber", confirmNumber);
            that.MarkingPopupModel.setProperty("/personnelNumber", personnelNumber);
            that.getView().byId("personnelNumberId").setValue(personnelNumber);

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
            let hhInput = that.getView().byId("hhInputId");
            let mmInput = that.getView().byId("mmInputId");
            hhInput.setValue(hhValue);
            mmInput.setValue(mmValue);

            let oDateTimePicker = that.getView().byId("markingDatePicker");
            let oDateString = selectedConfirmation.marking_date;
            oDateTimePicker.setValue(oDateString);
            let oSelectedVarianceLabel = that.getView().byId("selectedVarianceText");
            let varianceDescription = selectedConfirmation.variance_description;
            oSelectedVarianceLabel.setText(varianceDescription)

            let plannedLabor = selectedConfirmation.planned_labor;
            let uom_planned_labor = selectedConfirmation.uom_planned_labor;
            let markedLabor = selectedConfirmation.marked_labor_total;
            let uom_marked_labor = selectedConfirmation.uom_marked_labor_total;
            let remainingLabor = selectedConfirmation.remaining_labor;
            let uom_remaining_labor = selectedConfirmation.uom_remaining_labor;
            let varianceLabor = selectedConfirmation.variance_labor_total;
            let uom_variance = selectedConfirmation.uom_variance_total;

            that.MarkingPopupModel.setProperty("/plannedLabor", Math.round(plannedLabor));
            that.MarkingPopupModel.setProperty("/uom_planned_labor", uom_planned_labor || "hcn");
            that.MarkingPopupModel.setProperty("/markedLabor", Math.round(markedLabor));
            that.MarkingPopupModel.setProperty("/uom_marked_labor", uom_marked_labor || "hcn");
            that.MarkingPopupModel.setProperty("/remainingLabor", Math.round(remainingLabor));
            that.MarkingPopupModel.setProperty("/uom_remaining_labor", uom_remaining_labor || "hcn");
            that.MarkingPopupModel.setProperty("/varianceLabor", Math.round(varianceLabor));
            that.MarkingPopupModel.setProperty("/uom_variance", uom_variance || "hcn");
                
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
                                    that.getView().byId("selectedVarianceText").setText("");
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
                that.getView().byId("selectedVarianceText").setText(that._selectedDescription);

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
                                    that.getView().byId("selectedUpdateText").setText("");
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
                that.getView().byId("selectedUpdateText").setText(that._selectedProgEco);
                that._oUpdatePopover.close();
            } else if (!!that._selectedProcessId ){
                that.getView().byId("selectedUpdateText").setText(that._selectedProcessId);
                that._oUpdatePopover.close();
            } else {
                sap.m.MessageToast.show("No Modification selected.");
            }

        },
        onGetUpdateTable: function(){
            var that=this;
            var that = this;

            var infoModel = that.MainViewController.getInfoModel();
            var sfc = infoModel.getProperty("/selectedConfirmation/sfc");
            var plant = infoModel.getProperty("/selectedConfirmation/plant");
            var order = infoModel.getProperty("/selectedConfirmation/mes_order")
            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathModificationApi = "/db/getModificationsBySfc";
            let url = BaseProxyURL + pathModificationApi;

            let params = {
                plant:plant,
                order:order,
                sfc:sfc
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
        onDefectButtonPressed: function(){
            var that=this;
        },
        onHHInputChange: function(oEvent){
            var that=this;
            let value = oEvent.getParameters().value;
            let hhInput = that.getView().byId("hhInputId");
            if(value.length>2) hhInput.setValue(value.substring(0,2));
        },
        onMMInputChange: function(oEvent){
            var that=this;
            var that=this;
            let value = oEvent.getParameters().value;
            let mmInput = that.getView().byId("mmInputId");
            if(value.length>2) mmInput.setValue(value.substring(0,2));
        },
        sendToSapAndInsertIntoZTable: function () {
            var that = this;
            var infoModel = that.MainViewController.getInfoModel();
            var personnelNumber = that.MarkingPopupModel.getProperty("/personnelNumber");
            
            var sfc = infoModel.getProperty("/selectedConfirmation/sfc");
            var workCenter = infoModel.getProperty("/selectedConfirmation/workcenter");
            var plant = infoModel.getProperty("/selectedConfirmation/plant");
            var project = infoModel.getProperty("/selectedConfirmation/project");
            var wbe_machine = that.MarkingPopupModel.getProperty("/wbe") || "";
            var operation = that.MarkingPopupModel.getProperty("/operation") || "";
            var operationDescription = infoModel.getProperty("/selectedConfirmation/operation_description") || "";
            var mes_order = that.MarkingPopupModel.getProperty("/order") || "";
            var confirmation_number = that.MarkingPopupModel.getProperty("/confirmNumber") || "";
            var marking_date = that.getView().byId("markingDatePicker").getValue();
            var marked_labor;
            var uom_marked_labor = that.MarkingPopupModel.getProperty("/uom_marked_labor");
            var variance_labor;
            var uom_variance_labor = that.MarkingPopupModel.getProperty("/uom_variance");
            var reason_for_variance = that._selectedCause || "";
            var user_id = infoModel.getProperty("/user_id") || "";
            var modification = that.getView().byId("selectedUpdateText").getText() || "";
            var hh = parseInt(that.getView().byId("hhInputId").getValue(),10);
            var mm = parseInt(that.getView().byId("mmInputId").getValue(),10);
            if(!hh) hh=0;
            if(!mm) mm=0;

            if (reason_for_variance == "") {
                marked_labor = Math.round( (hh + (mm/60)) * 100);
                variance_labor = 0;
            } else {
                variance_labor = Math.round( (hh + (mm/60)) * 100);
                marked_labor = 0;
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
                confirmation: "X",
                cancellation: "",
                modification: modification,
                cancelled_confirmation: null
            }

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathSendMarkingApi = "/api/sendMarkingToSapAndUpdateZTable";
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
                that.MainViewController.showErrorMessageBox(that.MainViewController.getI18n("marking.saveData.error.message"));
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,true,true);

        },
        validate: function () {
            var that = this;
            var sMarkingDate = that.getView().byId("markingDatePicker").getValue();
            var hhInputValue = that.getView().byId("hhInputId").getValue();
            var mmInputValue = that.getView().byId("mmInputId").getValue();

            if (!sMarkingDate) {
                return false;
            }

            if( (hhInputValue == "" && mmInputValue=="") || (parseInt(hhInputValue,10)==0 && parseInt(mmInputValue,10)==0) ){
                return false;
            } else if( (parseInt(hhInputValue,10)==0 && mmInputValue=="") || (hhInputValue=="" && parseInt(mmInputValue,10)==0) ){
                return false;
            }else if(hhInputValue==""){
                hhInputValue="00";
            } else if (mmInputValue==""){
                mmInputValue="00";
            }

            if(parseInt(mmInputValue,10)<0 || parseInt(mmInputValue,10)>59) return false;

            // Valid check date (exists and not future)
            if (!sMarkingDate || sMarkingDate == "" || new Date(that.parseDateFromString(sMarkingDate)).getTime() > new Date().getTime()) return false;

            var confirmation_number = that.MarkingPopupModel.getProperty("/confirmNumber");
            var personnelNumber = that.getView().byId("personnelNumberId").getValue();
            that.MarkingPopupModel.setProperty("/personnelNumber", personnelNumber);
            if(!confirmation_number || !personnelNumber) return false;
            let reason_for_variance = that._selectedCause || "";
            let modification = that.getView().byId("selectedUpdateText").getText() || "";
            if(!reason_for_variance && !!modification) return false;

            return true;
        },
        onConfirm: function () {
            var that = this;


            if (that.validate()) {
                that.sendToSapAndInsertIntoZTable();
            } else {
                that.MainViewController.showErrorMessageBox(that.MainViewController.getI18n("marking.error.message"));
            }
        },
        
        parseDateFromString: function(dateStr) {
            const [day, month, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day); // i mesi partono da 0 (gennaio)
        },
        onClosePopup: function () {
            var that = this;
            that.closeDialog();
        }
    })
}
)