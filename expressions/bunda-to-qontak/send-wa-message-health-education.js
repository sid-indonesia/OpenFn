fn(state => {
  const jobName = state.configuration.qontak.healthEducation.jobName;
  const csvAbsoluteFileName = state.configuration.qontak.healthEducation.contactListCSVAbsoluteFileName;

  return qontakCreateContactList(state, csvAbsoluteFileName, jobName);
});

fn(state => {
  const requestBody = {
    "name": state.campaignName,
    "message_template_id": state.configuration.qontak.healthEducation.messageTemplateId,
    "contact_list_id": state.contactListId,
    "channel_integration_id": state.configuration.qontak.whatsAppChannelIntegrationId,
    "parameters": {
      "body": [
        {
          "key": "1",
          "value": "full_name"
        },
        {
          "key": "2",
          "value": "pregna_trimester"
        },
        {
          "key": "3",
          "value": "calc_gestational"
        }
      ]
    }
  }
  const jobName = state.configuration.qontak.healthEducation.jobName;

  return qontakBroadcastBulk(state, requestBody, jobName);
});
