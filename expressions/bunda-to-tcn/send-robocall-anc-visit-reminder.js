tcnImportScheduleAPI(
  {
    payloadFilePath: state.configuration.tcn.ancVisitReminder.payloadFilePath,
    description: state.configuration.tcn.ancVisitReminder.description,
    country: state.configuration.tcn.ancVisitReminder.country,
    importTemplateNumber: state.configuration.tcn.ancVisitReminder.importTemplateNumber,
    scheduleTemplateNumber: state.configuration.tcn.ancVisitReminder.scheduleTemplateNumber,
    csvData: convertToCSVString(state.response.body.rows),
  }
);
