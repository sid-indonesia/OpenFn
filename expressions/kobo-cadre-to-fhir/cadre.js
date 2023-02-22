/*
  Data transformation script
  from KoBo form "[NextGen] Form Kobo for Cadre"
  to FHIR resources and POST them to a FHIR server
*/

// Add common variables and functions here
// Do not forget to remove them later from the `state` before actions
fn(state => {
  state.commonFunctions = {

    trimSpacesTitleCase: (string) => {
      const cleanString = string.replace(/\s+/g, " "); // Remove extra spaces
      let sentence = cleanString.split(" ");
      for (let i = 0; i < sentence.length; i++) {
        sentence[i] = sentence[i][0].toUpperCase() + sentence[i].slice(1);
      }

      return sentence.join(" ");
    }

  };

  state.temporaryFullUrl = {
    patientBaby: 'urn:uuid:patient-baby',
    relatedPersonMother: 'urn:uuid:related-person-mother',
    patientMother: 'urn:uuid:patient-mother',
    practitionerCadre: 'urn:uuid:practitioner-cadre',
    locationDesa: 'urn:uuid:location-desa',
    locationDusun: 'urn:uuid:location-dusun',
    encounterPosyandu: 'urn:uuid:encounter-posyandu',
  };

  return state;
});

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
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const relatedPersonResourceMother = {
    resourceType: "RelatedPerson",
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name',
        value: `${trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']).replace(/ /g, "_")}\
          -\
          ${trimSpacesTitleCase(input['id_balita/nama_balita']).replace(/ /g, "_")}`,
      },
    ],
    patient: {
      type: 'Patient',
      reference: state.temporaryFullUrl.patientBaby,
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
        text: trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']),
      },
    ],
    gender: 'female',
    address: [
      {
        use: 'home',
        text: input['group_gr5be69/Alamat'],
      },
    ],
  };

  const patientResourceMother = {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name',
        value: `${trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']).replace(/ /g, "_")}\
          -\
          ${trimSpacesTitleCase(input['id_balita/nama_balita']).replace(/ /g, "_")}`,
      },
    ],
    name: [
      {
        use: 'official',
        text: trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']),
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
          reference: state.temporaryFullUrl.relatedPersonMother,
        },
        type: 'seealso'
      }
    ]
  };

  if (input.hasOwnProperty('group_gr5be69/Nama_Ayah')) {
    patientResourceMother.contact = [
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
          text: trimSpacesTitleCase(input['group_gr5be69/Nama_Ayah']),
        },
        gender: 'male',
      },
    ];
  }

  if (input.hasOwnProperty('group_gr5be69/Tanggal_lahir_Ibu')) {
    patientResourceMother.birthDate = input['group_gr5be69/Tanggal_lahir_Ibu'];

    relatedPersonResourceMother.birthDate = patientResourceMother.birthDate;
  }

  if (input.hasOwnProperty('group_gr5be69/Silahkan_isi_nomor_telepon_Ibu')) {
    patientResourceMother.telecom = [
      {
        system: 'phone',
        value: input['group_gr5be69/Silahkan_isi_nomor_telepon_Ibu'],
        use: 'mobile',
        rank: 1,
      }
    ];

    relatedPersonResourceMother.telecom = patientResourceMother.telecom;
  }

  const relatedPersonMother = {
    fullUrl: state.temporaryFullUrl.relatedPersonMother, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `RelatedPerson?identifier=https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name|\
        ${trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']).replace(/ /g, "_")}\
        -\
        ${trimSpacesTitleCase(input['id_balita/nama_balita']).replace(/ /g, "_")}`
    },

    resource: relatedPersonResourceMother
  };

  const patientMother = {
    fullUrl: state.temporaryFullUrl.patientMother, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name|\
        ${trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']).replace(/ /g, "_")}\
        -\
        ${trimSpacesTitleCase(input['id_balita/nama_balita']).replace(/ /g, "_")}`
    },

    resource: patientResourceMother
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, relatedPersonMother, patientMother] } };
});

// Build "Patient" resource for the baby
fn(state => {

  const input = state.data;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const patientResourceBaby = {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-baby-name-and-mother-name',
        value: `${trimSpacesTitleCase(input['id_balita/nama_balita']).replace(/ /g, "_")}\
          -\
          ${trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']).replace(/ /g, "_")}`,
      },
    ],
    name: [
      {
        use: 'official',
        text: trimSpacesTitleCase(input['id_balita/nama_balita']),
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
    patientResourceBaby['gender'] = (input['id_balita/jenis_kelamin_balita'] === 'perempuan' ? 'female' : 'male');
  }

  const patientBaby = {
    fullUrl: state.temporaryFullUrl.patientBaby, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/temp-identifier-baby-name-and-mother-name|\
        ${trimSpacesTitleCase(input['id_balita/nama_balita']).replace(/ /g, "_")}\
        -\
        ${trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']).replace(/ /g, "_")}`
    },

    resource: patientResourceBaby
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, patientBaby] } };
});

// Build "Practitioner" resource for the cadre
fn(state => {

  const input = state.data;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const practitionerResource = {
    resourceType: 'Practitioner',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-desa-name-and-cadre-name',
        value: `${trimSpacesTitleCase(input['group_yp32g51/Desa']).replace(/ /g, "_")}\
          -\
          ${trimSpacesTitleCase(input['group_yp32g51/Nama_Kader']).replace(/ /g, "_")}`,
      },
    ],
    name: [
      {
        use: 'official',
        text: trimSpacesTitleCase(input['group_yp32g51/Nama_Kader']),
      },
    ],
  }

  const practitionerCadre = {
    fullUrl: state.temporaryFullUrl.practitionerCadre, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Practitioner?identifier=https://fhir.kemkes.go.id/id/temp-identifier-desa-name-and-cadre-name|\
        ${trimSpacesTitleCase(input['group_yp32g51/Desa']).replace(/ /g, "_")}\
        -\
        ${trimSpacesTitleCase(input['group_yp32g51/Nama_Kader']).replace(/ /g, "_")}`
    },

    resource: practitionerResource
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, practitionerCadre] } };
});

// Build "Location" resources for "Desa" and "Dusun"
fn(state => {

  const input = state.data;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const locationResourceDesa = {
    resourceType: 'Location',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-desa-name',
        value: `${trimSpacesTitleCase(input['group_yp32g51/Desa']).replace(/ /g, "_")}`,
      },
    ],
    name: trimSpacesTitleCase(input['group_yp32g51/Desa']),
  }

  const locationDesa = {
    fullUrl: state.temporaryFullUrl.locationDesa, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Location?identifier=https://fhir.kemkes.go.id/id/temp-identifier-desa-name|\
        ${trimSpacesTitleCase(input['group_yp32g51/Desa']).replace(/ /g, "_")}`
    },

    resource: locationResourceDesa
  };

  const locationResourceDusun = {
    resourceType: 'Location',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-dusun-name',
        value: `${trimSpacesTitleCase(input['group_yp32g51/Silahkan_pilih_salah_satu_nama']).replace(/ /g, "_")}`,
      },
    ],
    name: trimSpacesTitleCase(input['group_yp32g51/Silahkan_pilih_salah_satu_nama']),
    partOf: {
      type: "Location",
      reference: state.temporaryFullUrl.locationDesa,
    }
  }

  const locationDusun = {
    fullUrl: state.temporaryFullUrl.locationDusun, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Location?identifier=https://fhir.kemkes.go.id/id/temp-identifier-dusun-name|\
        ${trimSpacesTitleCase(input['group_yp32g51/Silahkan_pilih_salah_satu_nama']).replace(/ /g, "_")}`
    },

    resource: locationResourceDesa
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, locationDesa, locationDusun] } };
});

// Build "Encounter" resource
fn(state => {

  const input = state.data;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  input['group_yp32g51/Desa'].replace(/\s+/g, " ");
  const encounter = {
    fullUrl: state.temporaryFullUrl.encounterPosyandu, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Encounter?identifier=https://fhir.kemkes.go.id/id/encounter|\
        ${trimSpacesTitleCase(input['id_balita/nama_balita']).replace(/ /g, "_")}\
        -\
        ${trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']).replace(/ /g, "_")}\
        -BABY_POSYANDU_VISIT`
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
          value: `${trimSpacesTitleCase(input['id_balita/nama_balita']).replace(/ /g, "_")}\
            -\
            ${trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']).replace(/ /g, "_")}\
            -BABY_POSYANDU_VISIT`,
        },
      ],
      subject: {
        type: 'Patient',
        reference: state.temporaryFullUrl.patientBaby,
      },
      location: [
        {
          location: {
            type: 'Location',
            reference: state.temporaryFullUrl.locationDusun,
          }
        }
      ],
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
        value: `${trimSpacesTitleCase(input['id_balita/nama_balita']).replace(/ /g, "_")}-${trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']).replace(/ /g, "_")}-BABY_RECEIVED_ADDITIONAL_FOOD_AT_POSYANDU`,
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
      reference: state.temporaryFullUrl.patientBaby,
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
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${trimSpacesTitleCase(input['id_balita/nama_balita']).replace(/ /g, "_")}-${trimSpacesTitleCase(input['group_gr5be69/Nama_Ibu']).replace(/ /g, "_")}-BABY_RECEIVED_ADDITIONAL_FOOD_AT_POSYANDU`
    },

    resource: observationResource,
  });

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, ...observations] } };
});

// Remove common variables and functions from the state
fn(state => {
  delete state.commonFunctions;
  delete state.temporaryFullUrl;

  return state;
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
