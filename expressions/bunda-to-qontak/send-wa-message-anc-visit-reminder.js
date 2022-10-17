fn(async state => {
  const jobName = '"ANC Visit Reminder"';

  // The call to your API

  async function callTheAPI(reqIndex, attempt = 0) {
    console.log('Request ', jobName, ' Start:', reqIndex, `attempt:${attempt}`, new Date().toISOString());

    try {
      const finalState = await post(`${state.configuration.qontak.baseUrl}/v1/broadcasts/whatsapp`, {
        body: {
          "name": "Test OpenFn",
          "message_template_id": `${state.configuration.qontak.testMessageTemplateId}`,
          "contact_list_id": `${state.data.contactListId}`,
          "channel_integration_id": `${state.configuration.qontak.whatsAppChannelIntegrationId}`,
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
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${state.configuration.qontak.tokenType} ${state.configuration.qontak.accessToken}`
        }
      })(state);

      console.log('Request ', jobName, ' End:  ', reqIndex, `attempt:${attempt}`, finalState.response.status)

      return finalState;
    } catch (err) {
      if (err.response) {
        console.log('Request ', jobName, ' End:  ', reqIndex, `attempt:${attempt}`, err.response.status);

        if (err.response.status === 429 || err.response.status === 422) {
          return { ...state, response: err.response };
        }
      }

      throw err;
    }
  }

  // Ratelimit helpers

  class TokenBucketRateLimiter {

    reset() {
      this.count = 0;
      this.resetTimeout = null;
    }

    scheduleReset() {
      if (!this.resetTimeout) {
        this.resetTimeout = setTimeout(() => this.reset(), this.maxRequestWindowMS);
      }
    }

    async acquireToken(fn) {
      if (this.count === this.maxRequests) {
        await nextTick();
        this.scheduleReset();
        await sleep(this.maxRequestWindowMS);
        return this.acquireToken(fn);
      }

      this.count = this.count + 1;
      await nextTick();
      return fn();
    }
  }

  function getMillisToSleep(retryHeaderString) {
    let millisToSleep = Math.round(parseFloat(retryHeaderString) * 1000);
    if (isNaN(millisToSleep)) {
      millisToSleep = Math.max(0, new Date(retryHeaderString) - new Date());
    }
    return millisToSleep;
  }

  async function fetchAndRetryIfNecessary(callAPI, index, attempt = 0) {
    const finalState = await callAPI(attempt);
    if (finalState.response.status === 429) {
      const retryAfter = finalState.response.headers["x-ratelimit-reset"]; // Qontak set this header
      const millisToSleep = getMillisToSleep(retryAfter) + state.configuration.qontak.broadcastBulk.extraWaitMS;
      console.log('❗ Retrying:  ', index, `attempt:${attempt + 1}`, 'at', retryAfter, 'sleep for', millisToSleep, 'ms');
      await sleep(millisToSleep);
      return fetchAndRetryIfNecessary(callAPI, index, attempt + 1);
    } else if (finalState.response.status === 422
      && attempt < 10
      && finalState.response.data
      && finalState.response.data.error.messages[0].toLowerCase() === "please wait a moment to send a new broadcast message.") {

      const millisToSleep = 100;
      console.log('❗ Retrying weird 422:  ', index, `attempt:${attempt + 1}`, 'sleep for', millisToSleep, 'ms');
      await sleep(millisToSleep);
      return fetchAndRetryIfNecessary(callAPI, index, attempt + 1);
    }
    return finalState;
  }

  // General Helpers

  function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  function nextTick() {
    return sleep(0);
  }

  function getArrayOfLength(length) {
    return Array.from(Array(length).keys());
  }



  function createCSV(data) {
    // get keys as array
    const keys = Object.keys(data[0]);
    // const keys = ["phone_number", "full_name", "customer_name", "company", "next_contact"];

    const commaSeparatedString = [
      keys.join(","),
      data.map(row =>
        keys.map(key =>
          row[key]
        ).join(",")
      ).join("\n")
    ].join("\n");

    return new Blob([commaSeparatedString], { type: 'text/csv' });
  }



  const mothers = state.response.body.rows;

  // Create campaignName var
  const campaignName = new Date().toISOString() + " Bunda App (" + jobName + ")";

  // Hit Qontak's API "Create contact list asynchronously", get contact_list_id
  const formData = new FormData();
  formData.append("name", campaignName);
  formData.append("source_type", "spreadsheet");
  formData.append("file", createCSV(mothers));

  const contactListId = await post(`${state.configuration.qontak.baseUrl}/v1/contacts/contact_lists/async`, {
    body: formData,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${state.configuration.qontak.tokenType} ${state.configuration.qontak.accessToken}`
    }
  })(state);
  state.data = { ...state.data, contactListId: contactListId };

  // Try retrieve Contact List by ID until `progress` equalsTo `success`

  // Broadcast Bulk with retries if 429
  const tokenBucket = new TokenBucketRateLimiter({
    maxRequests: state.configuration.qontak.broadcastBulk.maxRequests,
    maxRequestWindowMS: state.configuration.qontak.broadcastBulk.maxRequestsWindowMS
  });
  tokenBucket.reset();

  const promises = getArrayOfLength(state.configuration.qontak.broadcastBulk.numRequestsParallel).map(async (index) => (
    fetchAndRetryIfNecessary(async (attempt = 0) => (
      tokenBucket.acquireToken(() => callTheAPI(index, attempt))
    ), 0, index)
  ));

  const finalStates = await Promise.all(promises);

  return finalStates[0];
});
