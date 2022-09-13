/*
  Data transformation script
  from KoBo form "[FHIR] Nutritional Status"
  to FHIR resources and POST them to a FHIR server
*/

// Build "Organization" resource
fn(state => {

  const organization = {
    fullUrl: 'urn:uuid:089812b4-82ef-4528-bb15-c551022f364e',
    request: {
      method: 'PUT',
      url: 'Organization?identifier=https://fhir.kemkes.go.id/id/organisasi|LEVI'
    },

    resource: {
      resourceType: 'Organization',
      identifier: [
        {
          use: 'official',
          system: 'https://fhir.kemkes.go.id/id/organisasi',
          value: 'LEVI',
        },
      ],
      active: true,
      type: [
        {
          coding: [
            {
              system: 'http://hl7.org/fhir/ValueSet/organization-type',
              code: 'cg',
              display: 'Community Group',
            },
          ],
        },
      ],
      name: 'Komunitas Levi',
      alias: [
        'LEVI',
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [organization] } };
});

// Build "Patient" resource
fn(state => {

  const input = state.data;

  const patient = {
    fullUrl: 'urn:uuid:0fc374a1-a226-4552-9683-55dd510e67c9', // will be referenced in other resource(s)
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/nik|${input['patient/identifier'].replace(/ /g, "_")}`
    },

    resource: {
      resourceType: 'Patient',
      identifier: [
        {
          use: 'usual',
          system: 'https://fhir.kemkes.go.id/id/nik',
          value: input['patient/identifier'].replace(/ /g, "_"),
        },
      ],
      name: [
        {
          use: 'official',
          given: [
            input['patient/name'],
          ],
          text: input['patient/name'],
        },
      ],
      birthDate: input['patient/birthDate'],
      managingOrganization: [
        {
          reference: state.transactionBundle.entry
            .find(e => e.resource.resourceType === 'Organization').fullUrl, // same as "BKKBN" Organization's `fullurl`
        },
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, patient] } };
});

// Wrap up the transaction bundle
fn(state => {
  return {
    ...state,
    transactionBundle: {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: state.transactionBundle.entry,
    }
  };
});

// POST the transaction bundle to the FHIR server
post(
  state.configuration.resource,
  {
    body: sourceValue('transactionBundle'),
    headers: {
      'Content-Type': 'application/fhir+json',
      'Authorization': `${state.configuration.tokenType} ${state.configuration.accessToken}`,
    },
  }
);
