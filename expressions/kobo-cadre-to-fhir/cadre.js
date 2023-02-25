/*
  Data transformation script
  from KoBo form "[NextGen] Form Kobo for Cadre"
  to FHIR resources and POST them to a FHIR server
*/

fn(state => {
  // Move `state.data` to `state.koboData`
  // because `state.data` will be filled with FHIR resource(s)
  // retrieved from FHIR server
  state.koboData = state.data;

  // Add common variables and functions here
  // Do not forget to remove them later from the `state` before actions
  state.commonFunctions = {

    trimSpacesTitleCase: (string) => {
      const cleanString = string.replace(/_/g, " ").replace(/\s+/g, " ").toLowerCase(); // Remove extra spaces
      let sentence = cleanString.split(" ");
      for (let i = 0; i < sentence.length; i++) {
        sentence[i] = sentence[i][0].toUpperCase() + sentence[i].slice(1);
      }

      return sentence.join(" ");
    },

    mergeArrayAndRemoveDuplicates: (array1, array2) => {
      if (Array.isArray(array1) && Array.isArray(array2)) {
        return [
          ...array1,
          ...array2.filter(
            (element2) =>
              !array1.some(
                (element1) => JSON.stringify(element2) === JSON.stringify(element1)
              )
          )
        ];
      } else if (Array.isArray(array1)) {
        return array1;
      } else if (Array.isArray(array2)) {
        return array2;
      } else {
        return [];
      }
    },

    mergeResourceFromServerWithNewlyCompiledResource: (resourceFromServer, resourceNewlyCompiled) => {
      const arrayKeys = Object.keys(resourceNewlyCompiled).filter(key => Array.isArray(resourceNewlyCompiled[key]));
      const mergedArrays = {};
      for (const key of arrayKeys) {
        mergedArrays[key] = state.commonFunctions.mergeArrayAndRemoveDuplicates(resourceFromServer[key], resourceNewlyCompiled[key]);
      }

      return {
        ...resourceFromServer,
        ...resourceNewlyCompiled,
        ...mergedArrays
      };
    },

    mergeResourceIfFoundInServer: (state, newlyCompiledResource) => {
      if (state.data.hasOwnProperty('entry')) {
        const resourceFromServer = state.data.entry[0].resource;
        const mergedResource = state.commonFunctions.mergeResourceFromServerWithNewlyCompiledResource(resourceFromServer, newlyCompiledResource);
        return mergedResource;
      } else {
        return newlyCompiledResource;
      }
    },

  };

  state.temporaryFullUrl = {
    organizationSID: 'urn:uuid:organization-SID',
    patientBaby: 'urn:uuid:patient-baby',
    relatedPersonMother: 'urn:uuid:related-person-mother',
    patientMother: 'urn:uuid:patient-mother',
    practitionerCadre: 'urn:uuid:practitioner-cadre',
    locationKecamatan: 'urn:uuid:location-kecamatan',
    locationDesa: 'urn:uuid:location-desa',
    locationDusun: 'urn:uuid:location-dusun',
    encounterPosyandu: 'urn:uuid:encounter-posyandu',
  };

  const input = state.koboData;
  state.inputKey = {
    required: {
      kecamatanName: 'group_yp32g51/Nama_Kecamatan',
      desaName: 'group_yp32g51/Desa',
      dusunName: Object.keys(input).find(key => key.startsWith('group_yp32g51/Silahkan_pilih_')),
      cadreName: 'group_yp32g51/Nama_Kader',
      motherName: 'group_gr5be69/Nama_Ibu',
      motherAddress: 'group_gr5be69/Alamat',
      babyName: 'id_balita/nama_balita',
      babyBirthDate: 'id_balita/dob_balita',
      visitPosyanduDate: 'group_ho1bh03/Tanggal_Posyandu',
      isBabyGivenAdditionalFoodAtPosyandu: 'group_ho1bh03/Apakah_bayi_balita_m_mbahan_saat_posyandu',
    },
    optional: {
      motherBirthDate: 'group_gr5be69/Tanggal_lahir_Ibu',
      motherPhoneNumber: 'group_gr5be69/Silahkan_isi_nomor_telepon_Ibu',
      fatherName: 'group_gr5be69/Nama_Ayah',
      incomePerMonth: 'group_gr5be69/Pendapatan_per_bulan',
      babyBirthWeightInKg: 'id_balita/Berat_badan_lahir',
      babyGender: 'id_balita/jenis_kelamin_balita',
      babyWeightAtPosyanduInKg: 'group_ho1bh03/Berat_Bayi_balita',
      babyHeightAtPosyanduInCm: 'group_ho1bh03/Panjang_Bayi_balita',
      babyHeadCircumferenceInCm: 'group_ho1bh03/Lingkar_Kepala',
      isBabyGivenVitaminAAtPosyandu: 'group_ho1bh03/Apakah_bayi_menerima_Vit_A_sa',
      dosageBabyGivenVitaminAAtPosyandu: 'group_ho1bh03/Berapa_dosis_Vit_A_erikan_saat_posyandu',
      immunizationsGivenToBabyAtPosyanduSeparatedBySpace: 'group_ho1bh03/Apa_jenis_imunisasi_yang_diber',
      otherImmunizationsGivenToBabyAtPosyandu: 'group_ho1bh03/Sebutkan_jenis_imuni_at_posyandu_hari_ini',
    },
  };

  return state;
});

// GET "Organization" resource by identifier from server first
get(`${state.configuration.resource}/Organization`,
  {
    query: {
      identifier: 'https://fhir.kemkes.go.id/id/organisasi|SID',
    },
    headers: {
      'content-type': 'application/fhir+json',
      'accept': 'application/fhir+json',
      'Authorization': `${state.configuration.tokenType} ${state.configuration.accessToken}`,
    },
  },
  state => {
    if (state.data.total > 1) {
      throw new Error('We found more than one: "' +
        state.data.entry[0].resource.resourceType + '" resources with identifier ' +
        JSON.stringify(state.data.entry[0].resource.identifier) + ', aborting POST transaction bundle');
    }

    return state;
  }
);

// Build "Organization" resource, will be referenced in other resources
fn(state => {

  const mergeResourceIfFoundInServer = state.commonFunctions.mergeResourceIfFoundInServer;

  const organizationResource = {
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
  };

  const organization = {
    fullUrl: state.temporaryFullUrl.organizationSID,
    request: {
      method: 'PUT',
      url: 'Organization?identifier=https://fhir.kemkes.go.id/id/organisasi|SID'
    },
  };

  organization.resource = mergeResourceIfFoundInServer(state, organizationResource);

  return { ...state, transactionBundle: { entry: [organization] } };
});

// GET "RelatedPerson" resource of the mother by identifier from server first
get(`${state.configuration.resource}/RelatedPerson`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name|` +
        `${sourceValue('commonFunctions.trimSpacesTitleCase')(sourceValue('koboData')[sourceValue('inputKey.required.motherName')]).replace(/ /g, "_")}` +
        `-` +
        `${sourceValue('commonFunctions.trimSpacesTitleCase')(sourceValue('koboData')[sourceValue('inputKey.required.babyName')]).replace(/ /g, "_")}`,
    },
    headers: {
      'content-type': 'application/fhir+json',
      'accept': 'application/fhir+json',
      'Authorization': `${state.configuration.tokenType} ${state.configuration.accessToken}`,
    },
  },
  state => {
    if (state.data.total > 1) {
      throw new Error('We found more than one: "' +
        state.data.entry[0].resource.resourceType + '" resources with identifier ' +
        JSON.stringify(state.data.entry[0].resource.identifier) + ', aborting POST transaction bundle');
    }

    return state;
  }
);

// Build "RelatedPerson" resource for the mother
// http://hl7.org/fhir/R4/patient.html#maternity
fn(state => {

  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const relatedPersonResourceMother = {
    resourceType: "RelatedPerson",
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name',
        value: `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}`,
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
        text: trimSpacesTitleCase(input[state.inputKey.required.motherName]),
      },
    ],
    gender: 'female',
    address: [
      {
        use: 'home',
        text: input[state.inputKey.required.motherAddress],
      },
    ],
  };

  if (input.hasOwnProperty(state.inputKey.optional.motherBirthDate)) {
    relatedPersonResourceMother.birthDate = input[state.inputKey.optional.motherBirthDate];
  }

  if (input.hasOwnProperty(state.inputKey.optional.motherPhoneNumber)) {
    relatedPersonResourceMother.telecom = [
      {
        system: 'phone',
        value: input[state.inputKey.optional.motherPhoneNumber],
        use: 'mobile',
        rank: 1,
      }
    ];
  }

  const relatedPersonMother = {
    fullUrl: state.temporaryFullUrl.relatedPersonMother, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `RelatedPerson?identifier=https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name|` +
        `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
        `-` +
        `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}`,
    },

    resource: relatedPersonResourceMother
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, relatedPersonMother] } };
});

// Build "Patient" resource for the mother
// http://hl7.org/fhir/R4/patient.html#maternity
fn(state => {

  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const patientResourceMother = {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name',
        value: `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}`,
      },
    ],
    name: [
      {
        use: 'official',
        text: trimSpacesTitleCase(input[state.inputKey.required.motherName]),
      },
    ],
    gender: 'female',
    address: [
      {
        use: 'home',
        text: input[state.inputKey.required.motherAddress],
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

  if (input.hasOwnProperty(state.inputKey.optional.fatherName)) {
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
          text: trimSpacesTitleCase(input[state.inputKey.optional.fatherName]),
        },
        gender: 'male',
      },
    ];
  }

  if (input.hasOwnProperty(state.inputKey.optional.motherBirthDate)) {
    patientResourceMother.birthDate = input[state.inputKey.optional.motherBirthDate];
  }

  if (input.hasOwnProperty(state.inputKey.optional.motherPhoneNumber)) {
    patientResourceMother.telecom = [
      {
        system: 'phone',
        value: input[state.inputKey.optional.motherPhoneNumber],
        use: 'mobile',
        rank: 1,
      }
    ];
  }

  const patientMother = {
    fullUrl: state.temporaryFullUrl.patientMother, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/temp-identifier-mother-name-and-baby-name|` +
        `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
        `-` +
        `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}`,
    },

    resource: patientResourceMother
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, patientMother] } };
});

// Build "Patient" resource for the baby
fn(state => {

  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const patientResourceBaby = {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-baby-name-and-mother-name',
        value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}`,
      },
    ],
    name: [
      {
        use: 'official',
        text: trimSpacesTitleCase(input[state.inputKey.required.babyName]),
      },
    ],
    birthDate: input[state.inputKey.required.babyBirthDate],
    managingOrganization: {
      type: 'Organization',
      reference: state.transactionBundle.entry
        .find(e => e.resource.resourceType === 'Organization').fullUrl, // same as "SID" Organization's `fullurl`
    },
  };

  if (input.hasOwnProperty(state.inputKey.optional.babyGender)) {
    patientResourceBaby.gender = (input[state.inputKey.optional.babyGender] === 'perempuan' ? 'female' : 'male');
  }

  const patientBaby = {
    fullUrl: state.temporaryFullUrl.patientBaby, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/temp-identifier-baby-name-and-mother-name|` +
        `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
        `-` +
        `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}`,
    },

    resource: patientResourceBaby
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, patientBaby] } };
});

// Build "Practitioner" resource for the cadre
fn(state => {

  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const practitionerResource = {
    resourceType: 'Practitioner',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-desa-name-and-cadre-name',
        value: `${trimSpacesTitleCase(input[state.inputKey.required.desaName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.cadreName]).replace(/ /g, "_")}`,
      },
    ],
    name: [
      {
        use: 'official',
        text: trimSpacesTitleCase(input[state.inputKey.required.cadreName]),
      },
    ],
  };

  const practitionerCadre = {
    fullUrl: state.temporaryFullUrl.practitionerCadre, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Practitioner?identifier=https://fhir.kemkes.go.id/id/temp-identifier-desa-name-and-cadre-name|` +
        `${trimSpacesTitleCase(input[state.inputKey.required.desaName]).replace(/ /g, "_")}` +
        `-` +
        `${trimSpacesTitleCase(input[state.inputKey.required.cadreName]).replace(/ /g, "_")}`,
    },

    resource: practitionerResource
  };

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, practitionerCadre] } };
});

// Build "Location" resources for "Kecamatan", "Desa" and "Dusun"
fn(state => {

  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;
  let locations = [];

  const locationResourceDesa = {
    resourceType: 'Location',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-desa-name',
        value: `${trimSpacesTitleCase(input[state.inputKey.required.desaName]).replace(/ /g, "_")}`,
      },
    ],
    name: trimSpacesTitleCase(input[state.inputKey.required.desaName]),
  };

  // Because Kecamatan was previously a "free text" field in the form,
  // now it is a "Select One" type of question
  // and has a bit different property name in the JSON
  if (input.hasOwnProperty(state.inputKey.required.kecamatanName)) {
    const locationResourceKecamatan = {
      resourceType: 'Location',
      identifier: [
        {
          use: 'temp',
          system: 'https://fhir.kemkes.go.id/id/temp-identifier-kecamatan-name',
          value: `${trimSpacesTitleCase(input[state.inputKey.required.kecamatanName]).replace(/ /g, "_")}`,
        },
      ],
      name: trimSpacesTitleCase(input[state.inputKey.required.kecamatanName]),
    };

    const locationKecamatan = {
      fullUrl: state.temporaryFullUrl.locationKecamatan, // will be referenced in other resources
      request: {
        method: 'PUT',
        url: `Location?identifier=https://fhir.kemkes.go.id/id/temp-identifier-kecamatan-name|` +
          `${trimSpacesTitleCase(input[state.inputKey.required.kecamatanName]).replace(/ /g, "_")}`
      },

      resource: locationResourceKecamatan
    };

    locations.push(locationKecamatan);
    locationResourceDesa.partOf = {
      type: "Location",
      reference: state.temporaryFullUrl.locationKecamatan,
    };
  }

  const locationDesa = {
    fullUrl: state.temporaryFullUrl.locationDesa, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Location?identifier=https://fhir.kemkes.go.id/id/temp-identifier-desa-name|` +
        `${trimSpacesTitleCase(input[state.inputKey.required.desaName]).replace(/ /g, "_")}`
    },

    resource: locationResourceDesa
  };

  const locationResourceDusun = {
    resourceType: 'Location',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-dusun-name-and-desa-name',
        value: `${trimSpacesTitleCase(input[state.inputKey.required.dusunName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.desaName]).replace(/ /g, "_")}`,
      },
    ],
    name: trimSpacesTitleCase(input[state.inputKey.required.dusunName]),
    partOf: {
      type: "Location",
      reference: state.temporaryFullUrl.locationDesa,
    }
  };

  const locationDusun = {
    fullUrl: state.temporaryFullUrl.locationDusun, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Location?identifier=https://fhir.kemkes.go.id/id/temp-identifier-dusun-name-and-desa-name|` +
        `${trimSpacesTitleCase(input[state.inputKey.required.dusunName]).replace(/ /g, "_")}` +
        `-` +
        `${trimSpacesTitleCase(input[state.inputKey.required.desaName]).replace(/ /g, "_")}`,
    },

    resource: locationResourceDusun
  };

  locations.push(locationDesa, locationDusun);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, ...locations] } };
});

// Build "Encounter" resource
fn(state => {

  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const encounter = {
    fullUrl: state.temporaryFullUrl.encounterPosyandu, // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Encounter?identifier=https://fhir.kemkes.go.id/id/encounter|` +
        `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
        `-` +
        `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
        `-BABY_POSYANDU_VISIT`,
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
          use: 'temp',
          system: 'https://fhir.kemkes.go.id/id/encounter',
          value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
            `-` +
            `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
            `-BABY_POSYANDU_VISIT`,
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

  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const babyHasReceivedAdditionalFoodAtPosyandu = input[state.inputKey.required.isBabyGivenAdditionalFoodAtPosyandu] === 'tidak' ? false : true;

  let observations = [];

  const observationResource = {
    resourceType: 'Observation',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/observation',
        value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
          `-BABY_RECEIVED_ADDITIONAL_FOOD_AT_POSYANDU`,
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
    effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
    valueBoolean: babyHasReceivedAdditionalFoodAtPosyandu,
  };

  observations.push({
    request: {
      method: 'PUT',
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
        `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
        `-` +
        `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
        `-BABY_RECEIVED_ADDITIONAL_FOOD_AT_POSYANDU`,
    },

    resource: observationResource,
  });

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, ...observations] } };
});

// Build "Observation" resource, for "Income per month"
fn(state => {

  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.incomePerMonth)) {
    const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
          `-INCOME_PER_MONTH`,
      },

      resource: {
        resourceType: 'Observation',
        identifier: [
          {
            use: 'temp',
            system: 'https://fhir.kemkes.go.id/id/observation',
            value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
              `-` +
              `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
              `-INCOME_PER_MONTH`
          },
        ],
        status: 'final',
        code: {
          coding: [
            {
              system: 'https://sid-indonesia.org/clinical-codes',
              code: 'income-per-month',
              display: 'Income per month',
            },
          ],
        },
        subject: {
          type: 'Patient',
          reference: state.temporaryFullUrl.patientMother,
        },
        encounter: {
          type: 'Encounter',
          reference: state.transactionBundle.entry
            .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
        },
        effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
        valueString: input[state.inputKey.optional.incomePerMonth]
      },
    };

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// Build "Observation" resource, for "Birth weight Measured"
fn(state => {

  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.babyBirthWeightInKg)) {
    const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
          `-BABY_BIRTH_WEIGHT`,
      },

      resource: {
        resourceType: 'Observation',
        identifier: [
          {
            use: 'temp',
            system: 'https://fhir.kemkes.go.id/id/observation',
            value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
              `-` +
              `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
              `-BABY_BIRTH_WEIGHT`
          },
        ],
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8339-4',
              display: 'Birth weight Measured',
            },
          ],
        },
        subject: {
          type: 'Patient',
          reference: state.temporaryFullUrl.patientBaby,
        },
        effectiveDateTime: input[state.inputKey.required.babyBirthDate],
        valueQuantity: {
          value: Number(input[state.inputKey.optional.babyBirthWeightInKg]),
          unit: 'kg',
        },
      },
    };

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// Build "Observation" resource, for "Baby weight measured at Posyandu"
fn(state => {

  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.babyWeightAtPosyanduInKg)) {
    const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
          `-BABY_WEIGHT_AT_POSYANDU`,
      },

      resource: {
        resourceType: 'Observation',
        identifier: [
          {
            use: 'temp',
            system: 'https://fhir.kemkes.go.id/id/observation',
            value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
              `-` +
              `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
              `-BABY_WEIGHT_AT_POSYANDU`
          },
        ],
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '3141-9',
              display: 'Body weight Measured',
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
        effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
        valueQuantity: {
          value: Number(input[state.inputKey.optional.babyWeightAtPosyanduInKg]),
          unit: 'kg',
        },
      },
    };

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// Build "Observation" resource, for "Baby height measured at Posyandu"
fn(state => {

  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.babyHeightAtPosyanduInCm)) {
    const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
          `-BABY_HEIGHT_AT_POSYANDU`,
      },

      resource: {
        resourceType: 'Observation',
        identifier: [
          {
            use: 'temp',
            system: 'https://fhir.kemkes.go.id/id/observation',
            value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
              `-` +
              `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
              `-BABY_HEIGHT_AT_POSYANDU`
          },
        ],
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '3137-7',
              display: 'Body height Measured',
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
        effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
        valueQuantity: {
          value: Number(input[state.inputKey.optional.babyHeightAtPosyanduInCm]),
          unit: 'cm',
        },
      },
    };

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// Build "Observation" resource, for "Baby Head Occipital-frontal circumference by Tape measure"
fn(state => {

  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.babyHeadCircumferenceInCm)) {
    const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
          `-BABY_HEAD_CIRCUMFERENCE_AT_POSYANDU`,
      },

      resource: {
        resourceType: 'Observation',
        identifier: [
          {
            use: 'temp',
            system: 'https://fhir.kemkes.go.id/id/observation',
            value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
              `-` +
              `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
              `-BABY_HEAD_CIRCUMFERENCE_AT_POSYANDU`
          },
        ],
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8287-5',
              display: 'Head Occipital-frontal circumference by Tape measure',
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
        effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
        valueQuantity: {
          value: Number(input[state.inputKey.optional.babyHeadCircumferenceInCm]),
          unit: 'cm',
        },
      },
    };

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// Build "Observation" resource, for "Baby Head Occipital-frontal circumference by Tape measure"
fn(state => {

  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.dosageBabyGivenVitaminAAtPosyandu)) {
    const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
          `-BABY_DOSAGE_VITAMIN_A_AT_POSYANDU`,
      },

      resource: {
        resourceType: 'Observation',
        identifier: [
          {
            use: 'temp',
            system: 'https://fhir.kemkes.go.id/id/observation',
            value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
              `-` +
              `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
              `-BABY_DOSAGE_VITAMIN_A_AT_POSYANDU`
          },
        ],
        status: 'final',
        code: {
          coding: [
            {
              system: 'https://sid-indonesia.org/clinical-codes',
              code: 'baby-dosage-vitamin-a-at-posyandu',
              display: 'Baby dosage vitamin A at posyandu',
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
        effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
        valueString: input[state.inputKey.optional.dosageBabyGivenVitaminAAtPosyandu],
      },
    };

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// Build "Immunization" resources
fn(state => {

  const input = state.koboData;
  if (input.hasOwnProperty(state.inputKey.optional.immunizationsGivenToBabyAtPosyanduSeparatedBySpace)) {
    const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;
    const immunizationTypeList = input[state.inputKey.optional.immunizationsGivenToBabyAtPosyanduSeparatedBySpace].split(' ');
    const immunizationResources = immunizationTypeList.map(
      (immunizationType) => {
        return {
          request: {
            method: 'PUT',
            url: `Immunization?identifier=https://fhir.kemkes.go.id/id/immunization|` +
              `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
              `-` +
              `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
              `-BABY_IMMUNIZATION_${immunizationType.toUpperCase()}`,
          },

          resource: {
            resourceType: 'Immunization',
            identifier: [
              {
                use: 'temp',
                system: 'https://fhir.kemkes.go.id/id/immunization',
                value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
                  `-` +
                  `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
                  `-BABY_IMMUNIZATION_${immunizationType.toUpperCase()}`
              },
            ],
            status: 'completed',
            vaccineCode: {
              coding: [
                {
                  system: 'https://sid-indonesia.org/clinical-codes',
                  code: immunizationType,
                  display: `Baby Immunization, ${immunizationType}`,
                },
              ],
              text: immunizationType,
            },
            occurrenceDateTime: input[state.inputKey.required.visitPosyanduDate],
            patient: {
              type: 'Patient',
              reference: state.temporaryFullUrl.patientBaby,
            },
            encounter: {
              type: 'Encounter',
              reference: state.transactionBundle.entry
                .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
            },
            location: {
              type: 'Location',
              reference: state.temporaryFullUrl.locationDusun,
            }
          },
        };
      }
    );

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, ...immunizationResources] } };
  } else {
    return state;
  }
});

// Build other "Immunization" resource, if specified
fn(state => {

  const input = state.koboData;
  if (input.hasOwnProperty(state.inputKey.optional.otherImmunizationsGivenToBabyAtPosyandu)) {
    const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;
    const otherImmunizationType = input[state.inputKey.optional.otherImmunizationsGivenToBabyAtPosyandu];

    const otherImmunization = {
      request: {
        method: 'PUT',
        url: `Immunization?identifier=https://fhir.kemkes.go.id/id/immunization|` +
          `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
          `-` +
          `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
          `-BABY_OTHER_IMMUNIZATION_${trimSpacesTitleCase(otherImmunizationType).toUpperCase().replace(/ /g, "_")}`,
      },

      resource: {
        resourceType: 'Immunization',
        identifier: [
          {
            use: 'temp',
            system: 'https://fhir.kemkes.go.id/id/immunization',
            value: `${trimSpacesTitleCase(input[state.inputKey.required.babyName]).replace(/ /g, "_")}` +
              `-` +
              `${trimSpacesTitleCase(input[state.inputKey.required.motherName]).replace(/ /g, "_")}` +
              `-BABY_OTHER_IMMUNIZATION_${trimSpacesTitleCase(otherImmunizationType).toUpperCase().replace(/ /g, "_")}`,
          },
        ],
        status: 'completed',
        vaccineCode: {
          coding: [
            {
              system: 'https://sid-indonesia.org/clinical-codes',
              code: trimSpacesTitleCase(otherImmunizationType),
              display: `Baby Other Immunization, ${otherImmunizationType}`,
            },
          ],
          text: otherImmunizationType,
        },
        occurrenceDateTime: input[state.inputKey.required.visitPosyanduDate],
        patient: {
          type: 'Patient',
          reference: state.temporaryFullUrl.patientBaby,
        },
        encounter: {
          type: 'Encounter',
          reference: state.transactionBundle.entry
            .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
        },
        location: {
          type: 'Location',
          reference: state.temporaryFullUrl.locationDusun,
        }
      },
    };

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, otherImmunization] } };
  } else {
    return state;
  }
});

// Remove common variables and functions from the state
fn(state => {
  delete state.commonFunctions;
  delete state.temporaryFullUrl;
  delete state.inputKey;

  state.data = state.koboData;
  delete state.koboData;

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
