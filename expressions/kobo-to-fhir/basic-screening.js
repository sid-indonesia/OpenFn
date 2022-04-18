/*
  Data transformation script
  from KoBo form "[FHIR] Skrining Ibu Hamil"
  to FHIR resources and POST them to a FHIR server
*/

console.log(sourceValue("configuration"));

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

  const input = state.data;

  const patient = {
    fullUrl: 'urn:uuid:0fc374a1-a226-4552-9683-55dd510e67c9', // will be referenced in many `Observation` resources
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/nik|${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}`
    },

    resource: {
      resourceType: 'Patient',
      identifier: [
        {
          use: 'usual',
          system: 'https://fhir.kemkes.go.id/id/nik',
          value: input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_"),
        },
      ],
      name: [
        {
          use: 'official',
          given: [
            input['patient_ID/patient_name'],
          ],
          text: input['patient_ID/patient_name'],
        },
      ],
      gender: 'female',
      birthDate: input['patient_ID/patient_dob'],
      address: [
        {
          use: 'home',
          text: input['patient_ID/patient_address'],
        },
      ],
      contact: [
        {
          name: {
            use: 'official',
            given: [
              input['patient_ID/partner_name'],
            ],
            text: input['patient_ID/partner_name'],
          },
          gender: 'male',
          extension: [
            {
              url: 'https://fhir.kemkes.go.id/StructureDefinition/patient-contact-birthDate',
              valueDate: input['patient_ID/partner_dob'],
            },
            {
              url: 'https://fhir.kemkes.go.id/StructureDefinition/patient-contact-identifier',
              valueIdentifier: {
                use: 'usual',
                system: 'https://fhir.kemkes.go.id/id/nik',
                value: input['patient_ID/partner_identifier_NIK'],
              },
            },
          ],
        },
      ],
      managingOrganization: [
        {
          reference: state.transactionBundle.entry
            .find(e => e.resource.identifier[0].value === 'BKKBN').fullUrl, // same as "BKKBN" Organization's `fullurl`
        },
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, patient] } };
});

// Build "Encounter" resource
fn(state => {

  const input = state.data;

  const encounter = {
    fullUrl: 'urn:uuid:13c31d68-114c-482a-a5e2-5df2c36a81c8', // will be referenced in many `Observation` resources
    request: {
      method: 'PUT',
      url: `Encounter?identifier=https://fhir.kemkes.go.id/id/encounter|${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_${input['anc_visit/visit_date']}`
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
          value: `${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_${input['anc_visit/visit_date']}`,
        },
      ],
      subject: {
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
      },
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, encounter] } };
});

// Build "CareTeam" resource
fn(state => {

  const input = state.data;

  const careTeam = {
    fullUrl: 'urn:uuid:a2b4b91a-6c57-4bf1-9002-175a166e863f',
    request: {
      method: 'PUT',
      url: `CareTeam?identifier=https://fhir.kemkes.go.id/id/hdw|${input['form_ID/district'].replace(/ /g, "_")}_${input['form_ID/family_support_team_id'].replace(/ /g, "_")}_${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}`,
    },

    resource: {
      resourceType: 'CareTeam',
      identifier: [
        {
          use: 'official',
          system: 'https://fhir.kemkes.go.id/id/hdw',
          value: `${input['form_ID/district'].replace(/ /g, "_")}_${input['form_ID/family_support_team_id'].replace(/ /g, "_")}_${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}`,
        }
      ],
      status: 'active',
      subject: {
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
      },
      managingOrganization: [
        {
          reference: state.transactionBundle.entry
            .find(e => e.resource.identifier[0].value === 'BKKBN').fullUrl, // same as "BKKBN" Organization's `fullurl`
        },
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, careTeam] } };
});

// Build "CarePlan" resource
fn(state => {

  const input = state.data;

  const carePlan = {
    request: {
      method: 'PUT',
      url: `CarePlan?identifier=https://fhir.kemkes.go.id/id/care-plan|${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_${input['anc_visit/visit_date']}`,
    },

    resource: {
      resourceType: 'CarePlan',
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/care-plan',
          value: `${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_${input['anc_visit/visit_date']}`,
        },
      ],
      status: 'active',
      intent: 'plan',
      title: `${input['anc_visit/visit_date']} ${input['anc_visit/summary']}`,
      description: input['anc_visit/support_team_action'],
      subject: {
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
      },
      careTeam: [
        {
          reference: state.transactionBundle.entry
            .find(e => e.resource.resourceType === 'CareTeam').fullUrl, // same as CareTeam's `fullurl`
        },
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, carePlan] } };
});

// Build "Observation" resource, for "Circumference Mid Upper Arm"
fn(state => {

  const input = state.data;

  const observation = {
    request: {
      method: 'PUT',
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_CIRCUMFERENCE_MID_UPPER_ARM`
    },

    resource: {
      resourceType: 'Observation',
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: `${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_CIRCUMFERENCE_MID_UPPER_ARM`,
        },
      ],
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
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
      },
      encounter: {
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
      },
      effectiveDateTime: input['anc_visit/visit_date'],
      valueQuantity: {
        value: Number(input['observations/circumference_mid_upper_arm']),
        unit: 'cm',
      },
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
});

// Build "Observation" resource, for "Hemoglobin"
fn(state => {

  const input = state.data;

  const observation = {
    request: {
      method: 'PUT',
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_HEMOGLOBIN`
    },

    resource: {
      resourceType: 'Observation',
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: `${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_HEMOGLOBIN`,
        },
      ],
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
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
      },
      encounter: {
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
      },
      effectiveDateTime: input['anc_visit/visit_date'],
      valueQuantity: {
        value: Number(input['observations/hemoglobin']),
        unit: 'g/dL',
      },
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
});

// Build "Observation" resource, for "Body Mass Index"
fn(state => {

  const input = state.data;

  const observation = {
    request: {
      method: 'PUT',
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_BODY_MASS_INDEX`
    },

    resource: {
      resourceType: 'Observation',
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: `${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_BODY_MASS_INDEX`,
        },
      ],
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
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
      },
      encounter: {
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
      },
      effectiveDateTime: input['anc_visit/visit_date'],
      valueString: input['observations/body_mass_index'],
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
});

// Build "Observation" resource, for "Pregnancy risk factors" or "Resiko 4T"
fn(state => {

  const input = state.data;

  const observation = {
    request: {
      method: 'PUT',
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_PREGNANCY_RISK_FACTORS`
    },

    resource: {
      resourceType: 'Observation',
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: `${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_PREGNANCY_RISK_FACTORS`,
        },
      ],
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
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
      },
      encounter: {
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
      },
      effectiveDateTime: input['anc_visit/visit_date'],
      valueString: input['observations/common_pregnancy_risks'],
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
});

// Build "Observation" resource, for "Comorbidities"
fn(state => {

  const input = state.data;

  const observation = {
    request: {
      method: 'PUT',
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_COMORBIDITIES`
    },

    resource: {
      resourceType: 'Observation',
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: `${input['patient_ID/patient_identifier_NIK'].replace(/ /g, "_")}_COMORBIDITIES`,
        },
      ],
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
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
      },
      encounter: {
        reference: state.transactionBundle.entry
          .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
      },
      effectiveDateTime: input['anc_visit/visit_date'],
      valueString: input['observations/comorbidities'],
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
