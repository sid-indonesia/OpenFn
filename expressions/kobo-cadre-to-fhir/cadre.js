/*
  Data transformation script
  from KoBo form "[NextGen] Form Kobo for Cadre"
  to FHIR resources and POST them to a FHIR server
*/

// Build "Organization" resource, will be referenced in other resources
fn(state => {

  const organization = {
    fullUrl: 'urn:uuid:Organisasi-SID',
    request: {
      method: 'PUT',
      url: 'Organization?identifier=https://fhir.kemkes.go.id/id/organisasi|SID'
    },

    resource: {
      resourceType: 'Organization',
      identifier: [
        {
          use: 'official',
          system: 'https://fhir.kemkes.go.id/id/organisasi',
          value: 'SID',
        },
      ],
      active: true,
      type: [
        {
          coding: [
            {
              system: 'http://hl7.org/fhir/ValueSet/organization-type',
              code: 'edu',
              display: 'Educational Institute',
            },
          ],
        },
      ],
      name: 'Summit Institute for Development',
      alias: [
        'SID',
        'Summit',
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [organization] } };
});

// Build "Patient" and "RelatedPerson" resource for the mother
// http://hl7.org/fhir/R4/patient.html#maternity
fn(state => {

  const input = state.data;

  const relatedPersonResourceMother = {
    resourceType: "RelatedPerson",
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name',
        value: `${input['group_gr5be69/Nama_Ibu'].replace(/ /g, "_")}-${input['id_balita/nama_balita'].replace(/ /g, "_")}`,
      },
    ],
    patient: {
      type: 'Patient',
      reference: 'urn:uuid:patient-baby',
    },
    relationship: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
            code: 'MTH',
            display: 'Mother',
          },
        ],
        text: 'Mother',
      },
    ],
    name: [
      {
        use: 'official',
        text: input['group_gr5be69/Nama_Ibu'],
      },
    ],
    gender: 'female',
    address: [
      {
        use: 'home',
        text: input['group_gr5be69/Alamat'],
      },
    ],
  }

  const patientResourceMother = {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name',
        value: `${input['group_gr5be69/Nama_Ibu'].replace(/ /g, "_")}-${input['id_balita/nama_balita'].replace(/ /g, "_")}`,
      },
    ],
    name: [
      {
        use: 'official',
        text: input['group_gr5be69/Nama_Ibu'],
      },
    ],
    gender: 'female',
    address: [
      {
        use: 'home',
        text: input['group_gr5be69/Alamat'],
      },
    ],
    managingOrganization: {
      type: 'Organization',
      reference: state.transactionBundle.entry
        .find(e => e.resource.resourceType === 'Organization').fullUrl, // same as "SID" Organization's `fullurl`
    },
    link: [
      {
        other: {
          type: 'RelatedPerson',
          reference: 'urn:uuid:related-person-mother',
        },
        type: 'seealso'
      }
    ]
  }

  if (input.hasOwnProperty('group_gr5be69/Nama_Ayah')) {
    patientResourceMother['contact'] = [
      {
        relationship: [
          {
            coding: [
              {
                system: 'http://hl7.org/fhir/R4/valueset-patient-contactrelationship.html',
                code: 'N',
                display: 'Next-of-Kin',
              },
            ],
            text: 'Suami'
          }
        ],
        name: {
          use: 'official',
          text: input['group_gr5be69/Nama_Ayah'],
        },
        gender: 'male',
      },
    ]
  }

  if (input.hasOwnProperty('group_gr5be69/Tanggal_lahir_Ibu')) {
    patientResourceMother['birthDate'] = input['group_gr5be69/Tanggal_lahir_Ibu'];

    relatedPersonResourceMother['birthDate'] = patientResourceMother['birthDate'];
  }

  if (input.hasOwnProperty('group_gr5be69/Silahkan_isi_nomor_telepon_Ibu')) {
    patientResourceMother['telecom'] = [
      {
        system: 'phone',
        value: input['group_gr5be69/Silahkan_isi_nomor_telepon_Ibu'],
        use: 'mobile',
        rank: 1,
      }
    ]

    relatedPersonResourceMother['telecom'] = patientResourceMother['telecom'];
  }

  const relatedPersonMother = {
    fullUrl: 'urn:uuid:related-person-mother', // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `RelatedPerson?identifier=https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name|${input['group_gr5be69/Nama_Ibu'].replace(/ /g, "_")}-${input['id_balita/nama_balita'].replace(/ /g, "_")}`
    },

    resource: relatedPersonResourceMother
  };

  const patientMother = {
    fullUrl: 'urn:uuid:patient-mother', // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name|${input['group_gr5be69/Nama_Ibu'].replace(/ /g, "_")}-${input['id_balita/nama_balita'].replace(/ /g, "_")}`
    },

    resource: patientResourceMother
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, relatedPersonMother, patientMother] } };
});

// Build "Patient" resource for the baby
fn(state => {

  const input = state.data;

  const patientResourceBaby = {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-baby-name-and-mother-name',
        value: `${input['id_balita/nama_balita'].replace(/ /g, "_")}-${input['group_gr5be69/Nama_Ibu'].replace(/ /g, "_")}`,
      },
    ],
    name: [
      {
        use: 'official',
        text: input['id_balita/nama_balita'],
      },
    ],
    birthDate: input['id_balita/dob_balita'],
    managingOrganization: {
      type: 'Organization',
      reference: state.transactionBundle.entry
        .find(e => e.resource.resourceType === 'Organization').fullUrl, // same as "SID" Organization's `fullurl`
    },
  }

  if (input.hasOwnProperty('id_balita/jenis_kelamin_balita')) {
    patientResourceBaby['gender'] = (input['id_balita/jenis_kelamin_balita'] === 'perempuan') ? 'female' : 'male';
  }

  const patientBaby = {
    fullUrl: 'urn:uuid:patient-baby', // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/temp-identifier-baby-name-and-mother-name|${input['id_balita/nama_balita'].replace(/ /g, "_")}-${input['group_gr5be69/Nama_Ibu'].replace(/ /g, "_")}`
    },

    resource: patientResourceBaby
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, patientBaby] } };
});

// Build "Encounter" resource
fn(state => {

  const input = state.data;

  const encounter = {
    fullUrl: 'urn:uuid:13c31d68-114c-482a-a5e2-5df2c36a81c8', // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Encounter?identifier=https://fhir.kemkes.go.id/id/encounter|${input['id_balita/nama_balita'].replace(/ /g, "_")}-${input['group_gr5be69/Nama_Ibu'].replace(/ /g, "_")}-BABY_POSYANDU_VISIT`
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
          value: `${input['id_balita/nama_balita'].replace(/ /g, "_")}-${input['group_gr5be69/Nama_Ibu'].replace(/ /g, "_")}-BABY_POSYANDU_VISIT`,
        },
      ],
      subject: {
        type: 'Patient',
        reference: 'urn:uuid:patient-baby',
      },
    },
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, encounter] } };
});

// Build "Observation" resources, for "Apakah bayi/balita menerima makanan tambahan saat posyandu?"
fn(state => {

  const input = state.data;

  const babyHasReceivedAdditionalFoodAtPosyandu = input['group_ho1bh03/Apakah_bayi_balita_m_mbahan_saat_posyandu'] === 'tidak' ? false : true;

  let observations = [];

  const observationResource = {
    resourceType: 'Observation',
    identifier: [
      {
        use: 'usual',
        system: 'https://fhir.kemkes.go.id/id/observation',
        value: `${input['id_balita/nama_balita'].replace(/ /g, "_")}-${input['group_gr5be69/Nama_Ibu'].replace(/ /g, "_")}-BABY_RECEIVED_ADDITIONAL_FOOD_AT_POSYANDU`,
      },
    ],
    status: 'final',
    code: {
      coding: [
        {
          system: 'https://sid-indonesia.org/clinical-codes',
          code: 'baby-received-additional-food-at-posyandu',
          display: 'Baby received additional food at posyandu',
        },
      ],
    },
    subject: {
      type: 'Patient',
      reference: 'urn:uuid:patient-baby',
    },
    encounter: {
      type: 'Encounter',
      reference: state.transactionBundle.entry
        .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
    },
    effectiveDateTime: input['group_ho1bh03/Tanggal_Posyandu'],
    valueBoolean: babyHasReceivedAdditionalFoodAtPosyandu,
  };

  observations.push({
    request: {
      method: 'PUT',
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${input['id_balita/nama_balita'].replace(/ /g, "_")}-${input['group_gr5be69/Nama_Ibu'].replace(/ /g, "_")}-BABY_RECEIVED_ADDITIONAL_FOOD_AT_POSYANDU`
    },

    resource: observationResource,
  });

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, ...observations] } };
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
