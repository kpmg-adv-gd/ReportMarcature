sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../../utilities/CommonCallManager",
    "../../utilities/GenericDialog"
], function (JSONModel, CommonCallManager, Dialog) {
    "use strict";

    return Dialog.extend("kpmg.custom.markingReport.MarkingReport.MarkingReport.controller.popup.InfoMarkingPopup", {

        open: function (oView, oController) {
            var that = this;
            that.InfoMarkingPopupModel = new JSONModel();
            that.MainViewController = oController;
            that._initDialog("kpmg.custom.markingReport.MarkingReport.MarkingReport.view.popup.InfoMarkingPopup", oView, that.InfoMarkingPopupModel);
            that.populateInfoPopupData();
            that.openDialog();
        },
        populateInfoPopupData: function () {
            var that = this;
            var selectedConfirmation = that.MainViewController.getInfoModel().getProperty("/selectedConfirmation");
            let wbe = selectedConfirmation.wbe_machine;
            let sfc = selectedConfirmation.sfc;
            let project = selectedConfirmation.project;
            let operation = selectedConfirmation.operation;
            let operation_description = selectedConfirmation.operation_description;
            let confirmNumber = selectedConfirmation.confirmation_number;
            let plannedLabor = selectedConfirmation.planned_labor;
            let markedLabor = selectedConfirmation.marked_labor_total;
            let remainingLabor = selectedConfirmation.remaining_labor;
            let varianceLabor = selectedConfirmation.variance_labor_total;
            let uom_planned_labor = selectedConfirmation.uom_planned_labor;
            let uom_marked_labor = selectedConfirmation.uom_marked_labor_total;
            let uom_remaining_labor = selectedConfirmation.uom_remaining_labor;
            let uom_variance = selectedConfirmation.uom_variance_total;

            that.InfoMarkingPopupModel.setProperty("/wbe", wbe);
            that.InfoMarkingPopupModel.setProperty("/sfc", sfc);
            that.InfoMarkingPopupModel.setProperty("/project", project);
            that.InfoMarkingPopupModel.setProperty("/operation", operation);
            that.InfoMarkingPopupModel.setProperty("/operation_description", operation_description);
            that.InfoMarkingPopupModel.setProperty("/confirmNumber", confirmNumber);
            that.InfoMarkingPopupModel.setProperty("/plannedLabor", Math.round(plannedLabor));
            that.InfoMarkingPopupModel.setProperty("/markedLabor", Math.round(markedLabor));
            that.InfoMarkingPopupModel.setProperty("/remainingLabor", Math.round(remainingLabor));
            that.InfoMarkingPopupModel.setProperty("/varianceLabor", Math.round(varianceLabor));
            that.InfoMarkingPopupModel.setProperty("/uom_planned_labor", uom_planned_labor || "hcn");
            that.InfoMarkingPopupModel.setProperty("/uom_marked_labor", uom_marked_labor || "hcn");
            that.InfoMarkingPopupModel.setProperty("/uom_remaining_labor", uom_remaining_labor || "hcn");
            that.InfoMarkingPopupModel.setProperty("/uom_variance", uom_variance || "hcn");
        },
        onClosePopup: function () {
            var that = this;
            that.closeDialog();
        }
    })
}
)