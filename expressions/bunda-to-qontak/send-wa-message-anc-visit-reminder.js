fn(state => {
  const jobName = state.configuration.qontak.ancVisitReminder.jobName;

  const mothers = state.response.body.rows;

  state.campaignName = new Date().toISOString() + " Bunda App (" + jobName + ")";

  const csvAbsoluteFileName = state.configuration.qontak.ancVisitReminder.contactListCSVAbsoluteFileName;

  fs.writeFileSync(csvAbsoluteFileName, convertToCSVString(mothers));

  const readStream = fs.createReadStream(csvAbsoluteFileName);

  const formData = new FormData();
  formData.append("source_type", "spreadsheet");
  formData.append("name", state.campaignName);
  formData.append("file", readStream);

  try {
    // Hit Qontak's API "Create contact list asynchronously"
    return post(`${state.configuration.qontak.baseUrl}/v1/contacts/contact_lists/async`, {
      data: formData,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        'Authorization': `${state.configuration.qontak.tokenType} ${state.configuration.qontak.accessToken}`
      }
    })(state);
  } catch (err) {
    if (err.response) {
      console.error("err.response.data:", err.response.data);
    }

    throw err;
  }
});

fn(async state => {
  const jobName = state.configuration.qontak.ancVisitReminder.jobName;

  if (!state.data.data.id) {
    throw new Error("Contact List ID not retrieved");
  }

  state.contactListId = state.data.data.id;

  // Try retrieve Contact List by ID until `progress` equalsTo`success`

  // Give Qontak some time to process the contact list (because the API is
  // asynchronous and currently there is no "Create contact list synchronously")
  await sleep(state.configuration.qontak.contactListAPI.initialDelayMS); // give initial 10 seconds

  const maxRetries = state.configuration.qontak.contactListAPI.maxRetries;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const contactListFinalState = await get(`${state.configuration.qontak.baseUrl}/v1/contacts/contact_lists/${state.contactListId}`, {
        headers: {
          'Authorization': `${state.configuration.qontak.tokenType} ${state.configuration.qontak.accessToken}`
        }
      })(state);

      if (contactListFinalState.data.data.progress) {
        if ("success" === contactListFinalState.data.data.progress.toLowerCase()) {
          break;
        } else if ("processing" === contactListFinalState.data.data.progress.toLowerCase()) {
          await sleep(state.configuration.qontak.contactListAPI.delayMS);
          continue;
        }
      }

      throw new Error("Contact List upload has failed");

    } catch (err) {
      if (err.response) {
        console.error("err.response.data:", err.response.data);
      }

      throw err;
    }
  }

  // Broadcast Bulk with retries if 429
  const maxRequests = state.configuration.qontak.broadcastBulkAPI.maxRequests;
  const maxRequestWindowMS = state.configuration.qontak.broadcastBulkAPI.maxRequestsWindowMS;
  const limiter = new RateLimiter(maxRequests, maxRequestWindowMS, false);
  const tokenBucket = new LimiterLibraryRateLimiter({
    maxRequests,
    maxRequestWindowMS,
    limiter
  });

  const promises = getArrayOfLength(state.configuration.qontak.broadcastBulkAPI.numRequestsParallel).map(async (index) => (
    fetchAndRetryIfNecessary(async (attempt = 0) => (
      tokenBucket.acquireToken(() => callTheAPI(
        post(`${state.configuration.qontak.baseUrl}/v1/broadcasts/whatsapp`, {
          body: {
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
          },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${state.configuration.qontak.tokenType} ${state.configuration.qontak.accessToken}`
          }
        }), jobName, state, index, attempt))
    ), state, 0, index)
  ));

  const finalStates = await Promise.all(promises);

  return finalStates[0];
});
