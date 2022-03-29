// Build "patient" resource
fn(state => {

  const patient = {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'usual',
        system: 'https://fhir.kemkes.go.id/id/nik',
        value: dataValue('patient_ID/patient_identifier_NIK'),
      },
    ],
    name: [
      {
        use: 'official',
        text: dataValue('patient_ID/patient_name'),
      },
    ],
    gender: 'female',
    birthDate: dataValue('patient_ID/patient_dob'),
    address: [
      {
        use: 'home',
        text: dataValue('patient_ID/patient_address'),
      },
    ],
    contact: [
      {
        name: {
          use: 'official',
          text: dataValue('patient_ID/partner_name'),
        },
        gender: 'male',
        extension: [
          {
            url: 'https://fhir.kemkes.go.id/StructureDefinition/patient-contact-birthDate',
            valueDate: dataValue('patient_ID/partner_dob'),
          },
          {
            url: 'https://fhir.kemkes.go.id/StructureDefinition/patient-contact-identifier',
            valueIdentifier: {
              use: 'usual',
              system: 'https://fhir.kemkes.go.id/id/nik',
              value: dataValue('patient_ID/partner_identifier_NIK'),
            },
          },
        ],
      },
    ],
  };

  return { ...state, transformedData: { patient } };
});

// Build "observation" resource
fn(state => {
  const observation = {
    resourceType: 'Observation',
    status: 'final',
    code: {
      coding: [
        {
          system: 'https://fhir.kemkes.go.id/CodeSystem/observation-code',
          code: 'KBB',
          display: 'Kesehatan Berat Badan',
        },
        {
          system: 'https://sid-indonesia.org/clinical-codes',
          code: 'body-weight',
          display: 'Body Weight'
        }
      ],
    },
    subject: {
      reference: '', // `fullUrl` to the Patient resource
    },
    effectiveDateTime: dataValue('anc_visit/visit_date'),
    valueQuantity: {
      value: dataValue('observations/value'),
      unit: 'kg',
    },
  };

  return { ...state, transformedData: { ...state.transformedData, observation } };
});

fn(state => {
  // console.log('these are the prepared FHIR resources', state.transformedData);
  return state;
});

post(state.configuration.resource, state => ({
  body: state.new,
  headers: {
    'Content-Type': 'application/fhir+json',
    'Authorization': `${state.configuration.tokenType} ${state.configuration.accessToken}`,
  },
}));

// TODO: @Levi, once you're happy with the resources, try sending them
// to a particular URL and view the server response in the output.json file.
