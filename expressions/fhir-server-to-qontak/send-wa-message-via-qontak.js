post(`${state.configuration.qontak_resource}/v1/broadcasts/whatsapp/direct`, {
  body: {
    "to_name": "Levi",
    "to_number": `${state.configuration.qontak_leviPhoneNumber}`,
    "message_template_id": `${state.configuration.qontak_testMessageTemplateId}`,
    "channel_integration_id": `${state.configuration.qontak_whatsAppChannelIntegrationId}`,
    "language": {
      "code": "en"
    },
    "parameters": {
      "header": {
        "format": "IMAGE",
        "params": [
          {
            "key": "url",
            "value": "https://qontak-hub-development.s3.amazonaws.com/uploads/direct/images/52e21eb9-9292-4c86-b0ad-28038440062f/logo-qontak.png"
          },
          {
            "key": "filename",
            "value": "logo-qontak.png"
          }
        ]
      },
      "body": [
        {
          "key": "1",
          "value_text": `data from JSON: ${JSON.stringify(state.data)}`,
          "value": "patients"
        }
      ]
    }
  },
  headers: {
    'content-type': 'application/json',
    'Authorization': `${state.configuration.qontak_token_type} ${state.configuration.qontak_access_token}`
  }
})
