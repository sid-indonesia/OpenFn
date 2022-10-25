fn(state => {
  const jobName = state.configuration.qontak.ancVisitReminder.jobName;
  const csvAbsoluteFileName = state.configuration.qontak.ancVisitReminder.contactListCSVAbsoluteFileName;

  return qontakCreateContactList(state, csvAbsoluteFileName, jobName);
});

fn(state => {
  const requestBody = {
    "name": state.campaignName,
    "message_template_id": state.configuration.qontak.ancVisitReminder.messageTemplateId,
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
          "value": "next_contact"
        }
      ]
    }
  };
  const jobName = state.configuration.qontak.ancVisitReminder.jobName;

  return qontakBroadcastBulk(state, requestBody, jobName);
});
