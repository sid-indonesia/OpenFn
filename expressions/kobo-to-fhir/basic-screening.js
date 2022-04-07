// Build "Organization" resource
fn(state => {

  const organization = {
    fullUrl: 'urn:uuid:089812b4-82ef-4528-bb15-c551022f364e',
    request: {
      method: 'PUT',
      url: 'Organization?identifier=https://fhir.kemkes.go.id/id/organisasi|BKKBN'
    },

    resource: {
      resourceType: 'Organization',
      identifier: [
        {
          use: 'official',
          system: 'https://fhir.kemkes.go.id/id/organisasi',
          value: 'BKKBN',
        },
      ],
      active: true,
      type: [
        {
          coding: [
            {
              system: 'http://hl7.org/fhir/ValueSet/organization-type',
              code: 'govt',
              display: 'Government',
            },
          ],
        },
      ],
      name: 'Badan Kependudukan dan Keluarga Berencana Nasional (BKKBN)',
      alias: [
        'BKKBN',
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [organization] } };
});

// Build "Patient" resource
fn(state => {

  const patient = {
    fullUrl: 'urn:uuid:0fc374a1-a226-4552-9683-55dd510e67c9', // will be referenced in many `Observation` resources
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/nik|${dataValue('patient_ID/patient_identifier_NIK')(state).replace(/ /g, "_")}`
    },

    resource: {
      resourceType: 'Patient',
      identifier: [
        {
          use: 'usual',
          system: 'https://fhir.kemkes.go.id/id/nik',
          value: dataValue('patient_ID/patient_identifier_NIK')(state).replace(/ /g, "_"),
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
      managingOrganization: [
        {
          reference: state.transactionBundle.entry[0].fullUrl, // same as "BKKBN" Organization's `fullurl`
        },
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, patient] } };
});

// Build "Encounter" resource
fn(state => {

  const encounter = {
    fullUrl: 'urn:uuid:13c31d68-114c-482a-a5e2-5df2c36a81c8', // will be referenced in many `Observation` resources
    request: {
      method: 'PUT',
      url: `Encounter?identifier=https://fhir.kemkes.go.id/id/encounter|${dataValue('patient_ID/patient_identifier_NIK')(state).replace(/ /g, "_")}_${dataValue('anc_visit/visit_date')(state)}`
    },

    resource: {
      resourceType: 'Encounter',
      status: 'finished',
      class: {
        system: 'http://terminology.hl7.org/ValueSet/v3-ActEncounterCode',
        code: 'AMB',
        display: 'ambulatory',
      },
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/encounter',
          value: `${dataValue('patient_ID/patient_identifier_NIK')(state).replace(/ /g, "_")}_${dataValue('anc_visit/visit_date')(state)}`,
        },
      ],
      subject: {
        reference: state.transactionBundle.entry[1].fullUrl, // same as Patient's `fullurl`
      },
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, encounter] } };
});

// Build "CareTeam" resource
fn(state => {
  const careTeam = {
    fullUrl: 'urn:uuid:a2b4b91a-6c57-4bf1-9002-175a166e863f',
    request: {
      method: 'PUT',
      url: `CareTeam?identifier=https://fhir.kemkes.go.id/id/hdw|${dataValue('form_ID/district')(state).replace(/ /g, "_")}_${dataValue('form_ID/family_support_team_id')(state).replace(/ /g, "_")}_${dataValue('patient_ID/patient_identifier_NIK')(state).replace(/ /g, "_")}`,
    },

    resource: {
      resourceType: 'CareTeam',
      identifier: [
        {
          use: 'official',
          system: 'https://fhir.kemkes.go.id/id/hdw',
          value: `${dataValue('form_ID/district')(state).replace(/ /g, "_")}_${dataValue('form_ID/family_support_team_id')(state).replace(/ /g, "_")}_${dataValue('patient_ID/patient_identifier_NIK')(state).replace(/ /g, "_")}`,
        }
      ],
      status: 'active',
      subject: {
        reference: state.transactionBundle.entry[1].fullUrl, // same as Patient's `fullurl`
      },
      managingOrganization: [
        {
          reference: state.transactionBundle.entry[0].fullUrl, // same as "BKKBN" Organization's `fullurl`
        },
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, careTeam] } };
});

// Build "CarePlan" resource
fn(state => {
  const carePlan = {
    request: {
      method: 'PUT',
      url: `CarePlan?identifier=https://fhir.kemkes.go.id/id/care-plan|${dataValue('patient_ID/patient_identifier_NIK')(state).replace(/ /g, "_")}_${dataValue('anc_visit/visit_date')(state)}`,
    },

    resource: {
      resourceType: 'CarePlan',
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/care-plan',
          value: `${dataValue('patient_ID/patient_identifier_NIK')(state).replace(/ /g, "_")}_${dataValue('anc_visit/visit_date')(state)}`,
        },
      ],
      status: 'active',
      intent: 'plan',
      title: `${dataValue('anc_visit/visit_date')(state)} ${dataValue('anc_visit/summary')(state)}`,
      description: dataValue('anc_visit/support_team_action'),
      subject: {
        reference: state.transactionBundle.entry[1].fullUrl, // same as Patient's `fullurl`
      },
      careTeam: [
        {
          reference: state.transactionBundle.entry[3].fullUrl, // same as CareTeam's `fullurl`
        },
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, carePlan] } };
});

// Build "Observation" resource, for "Circumference Mid Upper Arm"
fn(state => {
  const observation = {
    request: {
      method: 'POST',
      url: 'Observation'
    },

    resource: {
      resourceType: 'Observation',
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '56072-2',
            display: 'Circumference Mid upper arm - right',
          },
          {
            system: 'https://sid-indonesia.org/clinical-codes',
            code: 'mid-upper-arm-circumference',
            display: 'Mid upper arm circumference',
          },
        ],
      },
      subject: {
        reference: state.transactionBundle.entry[1].fullUrl, // same as Patient's `fullurl`
      },
      encounter: {
        reference: state.transactionBundle.entry[2].fullUrl, // same as Encounter's `fullurl`
      },
      effectiveDateTime: dataValue('anc_visit/visit_date'),
      valueQuantity: {
        value: Number(dataValue('observations/circumference_mid_upper_arm')(state)),
        unit: 'cm',
      },
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
});

// Build "Observation" resource, for "Hemoglobin"
fn(state => {
  const observation = {
    request: {
      method: 'POST',
      url: 'Observation'
    },

    resource: {
      resourceType: 'Observation',
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '718-7',
            display: 'Hemoglobin [Mass/volume] in Blood',
          },
          {
            system: 'https://sid-indonesia.org/clinical-codes',
            code: 'hb-level-lab-test-result',
            display: 'Hb level lab test result',
          },
        ],
      },
      subject: {
        reference: state.transactionBundle.entry[1].fullUrl, // same as Patient's `fullurl`
      },
      encounter: {
        reference: state.transactionBundle.entry[2].fullUrl, // same as Encounter's `fullurl`
      },
      effectiveDateTime: dataValue('anc_visit/visit_date'),
      valueQuantity: {
        value: Number(dataValue('observations/hemoglobin')(state)),
        unit: 'g/dL',
      },
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
});

// Build "Observation" resource, for "Body Mass Index"
fn(state => {
  const observation = {
    request: {
      method: 'POST',
      url: 'Observation'
    },

    resource: {
      resourceType: 'Observation',
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: 'LP35925-4',
            display: 'Body mass index (BMI)',
          },
          {
            system: 'https://sid-indonesia.org/clinical-codes',
            code: 'body-mass-index',
            display: 'Body Mass Index (BMI)',
          },
        ],
      },
      subject: {
        reference: state.transactionBundle.entry[1].fullUrl, // same as Patient's `fullurl`
      },
      encounter: {
        reference: state.transactionBundle.entry[2].fullUrl, // same as Encounter's `fullurl`
      },
      effectiveDateTime: dataValue('anc_visit/visit_date'),
      valueString: dataValue('observations/body_mass_index'),
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
});

// Build "Observation" resource, for "Pregnancy risk factors" or "Resiko 4T"
fn(state => {
  const observation = {
    request: {
      method: 'POST',
      url: 'Observation'
    },

    resource: {
      resourceType: 'Observation',
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '72154-8',
            display: 'Pregnancy risk factors [RHEA]',
          },
          {
            system: 'https://sid-indonesia.org/clinical-codes',
            code: 'resiko-4t',
            display: 'Resiko 4T (Terlalu tua, Terlalu muda, Terlalu banyak, Terlalu rapat masa hamilnya',
          },
        ],
      },
      subject: {
        reference: state.transactionBundle.entry[1].fullUrl, // same as Patient's `fullurl`
      },
      encounter: {
        reference: state.transactionBundle.entry[2].fullUrl, // same as Encounter's `fullurl`
      },
      effectiveDateTime: dataValue('anc_visit/visit_date'),
      valueString: dataValue('observations/common_pregnancy_risks'),
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
});

// Build "Observation" resource, for "Comorbidities"
fn(state => {
  const observation = {
    request: {
      method: 'POST',
      url: 'Observation'
    },

    resource: {
      resourceType: 'Observation',
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '83243-6',
            display: 'Comorbidities and coexisting conditions',
          },
          {
            system: 'https://sid-indonesia.org/clinical-codes',
            code: 'comorbidities',
            display: 'Comorbidities',
          },
        ],
      },
      subject: {
        reference: state.transactionBundle.entry[1].fullUrl, // same as Patient's `fullurl`
      },
      encounter: {
        reference: state.transactionBundle.entry[2].fullUrl, // same as Encounter's `fullurl`
      },
      effectiveDateTime: dataValue('anc_visit/visit_date'),
      valueString: dataValue('observations/comorbidities'),
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
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
