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

  state.configuration.headersForFHIRServer = {
    'Content-Type': 'application/fhir+json',
    'Accept': 'application/fhir+json',
    'Authorization': `${state.configuration.tokenType} ${state.configuration.accessToken}`,
  };

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
      // Need to make sure that the parameters are of type Array before using this function
      return [
        ...array1,
        ...array2.filter(
          (element2) =>
            !array1.some(
              (element1) => JSON.stringify(element2) === JSON.stringify(element1)
            )
        )
      ];
    },

    hasNestedArray: (value) => typeof value === 'object' && value !== null && !Array.isArray(value) &&
      Object.values(value).some(v => Array.isArray(v) || state.commonFunctions.hasNestedArray(v)),

    mergeNestedArrayAndRemoveDuplicates: (obj1, obj2) => {
      const mergedObj = {};

      // Merge all properties from both objects
      for (const key of new Set(Object.keys(obj1).concat(Object.keys(obj2)))) {
        const value1 = obj1[key];
        const value2 = obj2[key];
        if (Array.isArray(value1) && Array.isArray(value2)) {
          // If the property is an array, merge it and remove duplicates
          mergedObj[key] = state.commonFunctions.mergeArrayAndRemoveDuplicates(value1, value2);
        } else if (state.commonFunctions.hasNestedArray(value2) || state.commonFunctions.hasNestedArray(value1)) {
          // If the property is an object which contains array as some of the properties, call current method recursively
          mergedObj[key] = state.commonFunctions.mergeNestedArrayAndRemoveDuplicates(value1, value2);
        } else if (obj2.hasOwnProperty(key) && value2 !== null) {
          // If present, use the value from the second object (obj2) to overwrite the value in the first object (obj1)
          mergedObj[key] = value2;
        } else {
          // Otherwise, keep the one retrieved from server (obj1)
          mergedObj[key] = value1;
        }
      }

      return mergedObj;
    },

    mergeResourceIfFoundInServer: (state, newlyCompiledResource) => {
      if (state.data.hasOwnProperty('entry')) {
        const resourceFromServer = state.data.entry[0].resource;
        const mergedResource = state.commonFunctions.mergeNestedArrayAndRemoveDuplicates(resourceFromServer, newlyCompiledResource);
        return mergedResource;
      } else {
        return newlyCompiledResource;
      }
    },

    checkMoreThanOneResourceByIdentifier: (state) => {
      if (state.data.total > 1) {
        throw new Error('We found more than one: "' +
          state.data.entry[0].resource.resourceType + '" resources with identifier ' +
          JSON.stringify(state.data.entry[0].resource.identifier) + ', aborting POST transaction bundle');
      }
    }

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
    encounterPosyanduBaby: 'urn:uuid:encounter-posyandu-baby',
    encounterPosyanduMother: 'urn:uuid:encounter-posyandu-mother',
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
      nikMother: 'group_gr5be69/nik_ibu',
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
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Organization" resource, will be referenced in other resources
fn(state => {

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

  organization.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, organizationResource);

  return { ...state, transactionBundle: { entry: [organization] } };
});

fn(state => {
  state.configuration.queryIdentifierMother = state.koboData[state.inputKey.required.nikMother].replace(/ /g, "_");

  state.configuration.queryIdentifierMotherBaby = state.koboData[state.inputKey.required.nikMother].replace(/ /g, "_").replace(/ /g, "_") +
    `-` +
    state.commonFunctions.trimSpacesTitleCase(state.koboData[state.inputKey.required.babyName]).replace(/ /g, "_");

  state.configuration.queryIdentifierDesaCadre = state.commonFunctions.trimSpacesTitleCase(state.koboData[state.inputKey.required.desaName]).replace(/ /g, "_") +
    `-` +
    state.commonFunctions.trimSpacesTitleCase(state.koboData[state.inputKey.required.cadreName]).replace(/ /g, "_");

  state.configuration.queryIdentifierKecamatan = state.commonFunctions.trimSpacesTitleCase(state.koboData[state.inputKey.required.kecamatanName]).replace(/ /g, "_");

  state.configuration.queryIdentifierDesa = state.commonFunctions.trimSpacesTitleCase(state.koboData[state.inputKey.required.desaName]).replace(/ /g, "_");

  state.configuration.queryIdentifierDusunDesa = state.commonFunctions.trimSpacesTitleCase(state.koboData[state.inputKey.required.dusunName]).replace(/ /g, "_") +
    `-` +
    state.commonFunctions.trimSpacesTitleCase(state.koboData[state.inputKey.required.desaName]).replace(/ /g, "_");

  return state;
});

// GET "RelatedPerson" resource of the mother by identifier from server first
get(`${state.configuration.resource}/RelatedPerson`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/nik|` +
        state.configuration.queryIdentifierMother,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
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
        use: 'official',
        system: 'https://fhir.kemkes.go.id/id/nik',
        value: state.configuration.queryIdentifierMother,
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
    fullUrl: state.temporaryFullUrl.relatedPersonMother,
    request: {
      method: 'PUT',
      url: `RelatedPerson?identifier=https://fhir.kemkes.go.id/id/nik|` +
        state.configuration.queryIdentifierMother,
    },
  };

  relatedPersonMother.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, relatedPersonResourceMother);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, relatedPersonMother] } };
});

// GET "Patient" resource of the mother by identifier from server first
get(`${state.configuration.resource}/Patient`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/nik|` +
        state.configuration.queryIdentifierMother,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Patient" resource for the mother
// http://hl7.org/fhir/R4/patient.html#maternity
fn(state => {
  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const patientResourceMother = {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'official',
        system: 'https://fhir.kemkes.go.id/id/nik',
        value: state.configuration.queryIdentifierMother,
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
      reference: state.temporaryFullUrl.organizationSID,
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
    fullUrl: state.temporaryFullUrl.patientMother,
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/nik|` +
        state.configuration.queryIdentifierMother,
    },
  };

  patientMother.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, patientResourceMother);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, patientMother] } };
});

// GET "Patient" resource of the baby by identifier from server first
get(`${state.configuration.resource}/Patient`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/mother-nik-and-baby-name|` +
        state.configuration.queryIdentifierMotherBaby,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Patient" resource for the baby
fn(state => {
  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const patientResourceBaby = {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'usual',
        system: 'https://fhir.kemkes.go.id/id/mother-nik-and-baby-name',
        value: state.configuration.queryIdentifierMotherBaby,
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
      reference: state.temporaryFullUrl.organizationSID, // same as "SID" Organization's `fullurl`
    },
  };

  if (input.hasOwnProperty(state.inputKey.optional.babyGender)) {
    patientResourceBaby.gender = (input[state.inputKey.optional.babyGender] === 'perempuan' ? 'female' : 'male');
  }

  const patientBaby = {
    fullUrl: state.temporaryFullUrl.patientBaby,
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/mother-nik-and-baby-name|` +
        state.configuration.queryIdentifierMotherBaby,
    },
  };

  patientBaby.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, patientResourceBaby);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, patientBaby] } };
});

// GET "Practitioner" resource of the cadre by identifier from server first
get(`${state.configuration.resource}/Practitioner`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/temp-identifier-desa-name-and-cadre-name|` +
        state.configuration.queryIdentifierDesaCadre,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

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
        value: state.configuration.queryIdentifierDesaCadre,
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
    fullUrl: state.temporaryFullUrl.practitionerCadre,
    request: {
      method: 'PUT',
      url: `Practitioner?identifier=https://fhir.kemkes.go.id/id/temp-identifier-desa-name-and-cadre-name|` +
        state.configuration.queryIdentifierDesaCadre,
    },
  };

  practitionerCadre.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, practitionerResource);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, practitionerCadre] } };
});

// GET "Location" resource of the Kecamatan by identifier from server first
get(`${state.configuration.resource}/Location`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/temp-identifier-kecamatan-name|` +
        state.configuration.queryIdentifierKecamatan,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Location" resources for "Kecamatan"
fn(state => {
  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

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
          value: state.configuration.queryIdentifierKecamatan,
        },
      ],
      name: trimSpacesTitleCase(input[state.inputKey.required.kecamatanName]),
    };

    const locationKecamatan = {
      fullUrl: state.temporaryFullUrl.locationKecamatan,
      request: {
        method: 'PUT',
        url: `Location?identifier=https://fhir.kemkes.go.id/id/temp-identifier-kecamatan-name|` +
          state.configuration.queryIdentifierKecamatan,
      },
    };

    locationKecamatan.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, locationResourceKecamatan);
    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, locationKecamatan] } };
  } else {
    return state;
  }
});

// GET "Location" resource of the Desa by identifier from server first
get(`${state.configuration.resource}/Location`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/temp-identifier-desa-name|` +
        state.configuration.queryIdentifierDesa,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Location" resources for "Desa"
fn(state => {
  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const locationResourceDesa = {
    resourceType: 'Location',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-desa-name',
        value: state.configuration.queryIdentifierDesa,
      },
    ],
    name: trimSpacesTitleCase(input[state.inputKey.required.desaName]),
  };

  // Because Kecamatan was previously a "free text" field in the form
  if (input.hasOwnProperty(state.inputKey.required.kecamatanName)) {
    locationResourceDesa.partOf = {
      type: "Location",
      reference: state.temporaryFullUrl.locationKecamatan,
    };
  }

  const locationDesa = {
    fullUrl: state.temporaryFullUrl.locationDesa,
    request: {
      method: 'PUT',
      url: `Location?identifier=https://fhir.kemkes.go.id/id/temp-identifier-desa-name|` +
        state.configuration.queryIdentifierDesa,
    },
  };

  locationDesa.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, locationResourceDesa);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, locationDesa] } };
});

// GET "Location" resource of the Dusun by identifier from server first
get(`${state.configuration.resource}/Location`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/temp-identifier-dusun-name-and-desa-name|` +
        state.configuration.queryIdentifierDusunDesa,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Location" resources for "Dusun"
fn(state => {
  const input = state.koboData;
  const trimSpacesTitleCase = state.commonFunctions.trimSpacesTitleCase;

  const locationResourceDusun = {
    resourceType: 'Location',
    identifier: [
      {
        use: 'temp',
        system: 'https://fhir.kemkes.go.id/id/temp-identifier-dusun-name-and-desa-name',
        value: state.configuration.queryIdentifierDusunDesa,
      },
    ],
    name: trimSpacesTitleCase(input[state.inputKey.required.dusunName]),
    partOf: {
      type: "Location",
      reference: state.temporaryFullUrl.locationDesa,
    }
  };

  const locationDusun = {
    fullUrl: state.temporaryFullUrl.locationDusun,
    request: {
      method: 'PUT',
      url: `Location?identifier=https://fhir.kemkes.go.id/id/temp-identifier-dusun-name-and-desa-name|` +
        state.configuration.queryIdentifierDusunDesa,
    },
  };

  locationDusun.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, locationResourceDusun);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, locationDusun] } };
});

// GET "Encounter" resource of Posyandu Visit for the mother by identifier from server first
get(`${state.configuration.resource}/Encounter`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/encounter|` +
        state.configuration.queryIdentifierMother + `-MOTHER_POSYANDU_VISIT`,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Encounter" resource for the mother
// http://hl7.org/fhir/R4/patient.html#maternity
fn(state => {
  const encounterResource = {
    resourceType: 'Encounter',
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/ValueSet/v3-ActEncounterCode',
      code: 'AMB',
      display: 'ambulatory',
    },
    identifier: [
      {
        use: 'usual',
        system: 'https://fhir.kemkes.go.id/id/encounter',
        value: state.configuration.queryIdentifierMother + `-MOTHER_POSYANDU_VISIT`,
      },
    ],
    subject: {
      type: 'Patient',
      reference: state.temporaryFullUrl.patientMother,
    },
    location: [
      {
        location: {
          type: 'Location',
          reference: state.temporaryFullUrl.locationDusun,
        }
      }
    ],
  };

  const encounter = {
    fullUrl: state.temporaryFullUrl.encounterPosyanduMother,
    request: {
      method: 'PUT',
      url: `Encounter?identifier=https://fhir.kemkes.go.id/id/encounter|` +
        state.configuration.queryIdentifierMother + `-MOTHER_POSYANDU_VISIT`,
    },
  };

  encounter.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, encounterResource);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, encounter] } };
});

// GET "Encounter" resource of Posyandu Visit for the baby by identifier from server first
get(`${state.configuration.resource}/Encounter`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/encounter|` +
        state.configuration.queryIdentifierMotherBaby + `-BABY_POSYANDU_VISIT`,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Encounter" resource for the baby
fn(state => {
  const encounterResource = {
    resourceType: 'Encounter',
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/ValueSet/v3-ActEncounterCode',
      code: 'AMB',
      display: 'ambulatory',
    },
    identifier: [
      {
        use: 'usual',
        system: 'https://fhir.kemkes.go.id/id/encounter',
        value: state.configuration.queryIdentifierMotherBaby + `-BABY_POSYANDU_VISIT`,
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
    partOf: {
      type: 'Encounter',
      reference: state.temporaryFullUrl.encounterPosyanduMother
    }
  };

  const encounter = {
    fullUrl: state.temporaryFullUrl.encounterPosyanduBaby,
    request: {
      method: 'PUT',
      url: `Encounter?identifier=https://fhir.kemkes.go.id/id/encounter|` +
        state.configuration.queryIdentifierMotherBaby + `-BABY_POSYANDU_VISIT`,
    },
  };

  encounter.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, encounterResource);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, encounter] } };
});

// GET "Observation" resource of Baby Received Additional Food by identifier from server first
get(`${state.configuration.resource}/Observation`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/observation|` +
        state.configuration.queryIdentifierMotherBaby + `-BABY_RECEIVED_ADDITIONAL_FOOD_AT_POSYANDU`,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Observation" resources, for "Apakah bayi/balita menerima makanan tambahan saat posyandu?"
fn(state => {
  const input = state.koboData;

  const observationResource = {
    resourceType: 'Observation',
    identifier: [
      {
        use: 'usual',
        system: 'https://fhir.kemkes.go.id/id/observation',
        value: state.configuration.queryIdentifierMotherBaby + `-BABY_RECEIVED_ADDITIONAL_FOOD_AT_POSYANDU`,
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
      reference: state.temporaryFullUrl.encounterPosyanduBaby,
    },
    effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
    valueBoolean: input[state.inputKey.required.isBabyGivenAdditionalFoodAtPosyandu] === 'tidak' ? false : true,
  };

  const observation = {
    request: {
      method: 'PUT',
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
        state.configuration.queryIdentifierMotherBaby + `-BABY_RECEIVED_ADDITIONAL_FOOD_AT_POSYANDU`,
    },
  };

  observation.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, observationResource);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
});

// GET "Observation" resource of "Income per month" by identifier from server first
get(`${state.configuration.resource}/Observation`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/observation|` +
        state.configuration.queryIdentifierMotherBaby + `-INCOME_PER_MONTH`,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Observation" resource, for "Income per month"
fn(state => {
  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.incomePerMonth)) {

    const observationResource = {
      resourceType: 'Observation',
      identifier: [
        {
          use: 'usual',
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: state.configuration.queryIdentifierMotherBaby + `-INCOME_PER_MONTH`,
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
        reference: state.temporaryFullUrl.encounterPosyanduMother,
      },
      effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
      valueString: input[state.inputKey.optional.incomePerMonth]
    };

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          state.configuration.queryIdentifierMotherBaby + `-INCOME_PER_MONTH`,
      },
    };

    observation.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, observationResource);

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// GET "Observation" resource of "Birth weight Measured" by identifier from server first
get(`${state.configuration.resource}/Observation`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/observation|` +
        state.configuration.queryIdentifierMotherBaby + `-BABY_BIRTH_WEIGHT`,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Observation" resource, for "Birth weight Measured"
fn(state => {
  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.babyBirthWeightInKg)) {

    const observationResource = {
      resourceType: 'Observation',
      identifier: [
        {
          use: 'usual',
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: state.configuration.queryIdentifierMotherBaby + `-BABY_BIRTH_WEIGHT`,
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
      effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
      valueQuantity: {
        value: Number(input[state.inputKey.optional.babyBirthWeightInKg]),
        unit: 'kg',
      },
    };

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          state.configuration.queryIdentifierMotherBaby + `-BABY_BIRTH_WEIGHT`,
      },
    };

    observation.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, observationResource);

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// GET "Observation" resource of "Baby weight measured at Posyandu" by identifier from server first
get(`${state.configuration.resource}/Observation`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/observation|` +
        state.configuration.queryIdentifierMotherBaby + `-BABY_WEIGHT_AT_POSYANDU`,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Observation" resource, for "Baby weight measured at Posyandu"
fn(state => {
  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.babyWeightAtPosyanduInKg)) {

    const observationResource = {
      resourceType: 'Observation',
      identifier: [
        {
          use: 'usual',
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: state.configuration.queryIdentifierMotherBaby + `-BABY_WEIGHT_AT_POSYANDU`,
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
        reference: state.temporaryFullUrl.encounterPosyanduBaby
      },
      effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
      valueQuantity: {
        value: Number(input[state.inputKey.optional.babyWeightAtPosyanduInKg]),
        unit: 'kg',
      },
    };

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          state.configuration.queryIdentifierMotherBaby + `-BABY_WEIGHT_AT_POSYANDU`,
      },
    };

    observation.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, observationResource);

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// GET "Observation" resource of "Baby height measured at Posyandu" by identifier from server first
get(`${state.configuration.resource}/Observation`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/observation|` +
        state.configuration.queryIdentifierMotherBaby + `-BABY_HEIGHT_AT_POSYANDU`,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Observation" resource, for "Baby height measured at Posyandu"
fn(state => {
  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.babyHeightAtPosyanduInCm)) {

    const observationResource = {
      resourceType: 'Observation',
      identifier: [
        {
          use: 'usual',
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: state.configuration.queryIdentifierMotherBaby + `-BABY_HEIGHT_AT_POSYANDU`,
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
        reference: state.temporaryFullUrl.encounterPosyanduBaby,
      },
      effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
      valueQuantity: {
        value: Number(input[state.inputKey.optional.babyHeightAtPosyanduInCm]),
        unit: 'cm',
      },
    };

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          state.configuration.queryIdentifierMotherBaby + `-BABY_HEIGHT_AT_POSYANDU`,
      },
    };

    observation.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, observationResource);

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// GET "Observation" resource of "Baby Head Occipital-frontal circumference by Tape measure" by identifier from server first
get(`${state.configuration.resource}/Observation`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/observation|` +
        state.configuration.queryIdentifierMotherBaby + `-BABY_HEAD_CIRCUMFERENCE_AT_POSYANDU`,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Observation" resource, for "Baby Head Occipital-frontal circumference by Tape measure"
fn(state => {
  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.babyHeadCircumferenceInCm)) {

    const observationResource = {
      resourceType: 'Observation',
      identifier: [
        {
          use: 'usual',
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: state.configuration.queryIdentifierMotherBaby + `-BABY_HEAD_CIRCUMFERENCE_AT_POSYANDU`,
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
        reference: state.temporaryFullUrl.encounterPosyanduBaby,
      },
      effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
      valueQuantity: {
        value: Number(input[state.inputKey.optional.babyHeadCircumferenceInCm]),
        unit: 'cm',
      },
    };

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          state.configuration.queryIdentifierMotherBaby + `-BABY_HEAD_CIRCUMFERENCE_AT_POSYANDU`,
      },
    };

    observation.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, observationResource);

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// GET "Observation" resource of "Baby Dosage Vitamin A at Posyandu" by identifier from server first
get(`${state.configuration.resource}/Observation`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/observation|` +
        state.configuration.queryIdentifierMotherBaby + `-BABY_DOSAGE_VITAMIN_A_AT_POSYANDU`,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Observation" resource, for "Baby Dosage Vitamin A at Posyandu"
fn(state => {
  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.dosageBabyGivenVitaminAAtPosyandu)) {

    const observationResource = {
      resourceType: 'Observation',
      identifier: [
        {
          use: 'usual',
          system: 'https://fhir.kemkes.go.id/id/observation',
          value: state.configuration.queryIdentifierMotherBaby + `-BABY_DOSAGE_VITAMIN_A_AT_POSYANDU`,
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
        reference: state.temporaryFullUrl.encounterPosyanduBaby,
      },
      effectiveDateTime: input[state.inputKey.required.visitPosyanduDate],
      valueString: input[state.inputKey.optional.dosageBabyGivenVitaminAAtPosyandu],
    };

    const observation = {
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
          state.configuration.queryIdentifierMotherBaby + `-BABY_DOSAGE_VITAMIN_A_AT_POSYANDU`,
      },
    };

    observation.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, observationResource);

    return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
  } else {
    return state;
  }
});

// Build "Immunization" resources
fn(state => {
  const input = state.koboData;

  if (input.hasOwnProperty(state.inputKey.optional.immunizationsGivenToBabyAtPosyanduSeparatedBySpace)) {
    const immunizationTypeList = input[state.inputKey.optional.immunizationsGivenToBabyAtPosyanduSeparatedBySpace].split(' ');
    const immunizationResources = immunizationTypeList.map(
      (immunizationType) => {
        return {
          request: {
            method: 'PUT',
            url: `Immunization?identifier=https://fhir.kemkes.go.id/id/immunization|` +
              state.configuration.queryIdentifierMotherBaby + `-BABY_IMMUNIZATION_${immunizationType.toUpperCase()}`,
          },

          resource: {
            resourceType: 'Immunization',
            identifier: [
              {
                use: 'usual',
                system: 'https://fhir.kemkes.go.id/id/immunization',
                value: state.configuration.queryIdentifierMotherBaby + `-BABY_IMMUNIZATION_${immunizationType.toUpperCase()}`,
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
              reference: state.temporaryFullUrl.encounterPosyanduBaby,
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
          state.configuration.queryIdentifierMotherBaby +
          `-BABY_OTHER_IMMUNIZATION_${trimSpacesTitleCase(otherImmunizationType).toUpperCase().replace(/ /g, "_")}`,
      },

      resource: {
        resourceType: 'Immunization',
        identifier: [
          {
            use: 'usual',
            system: 'https://fhir.kemkes.go.id/id/immunization',
            value: state.configuration.queryIdentifierMotherBaby +
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
          reference: state.temporaryFullUrl.encounterPosyanduBaby,
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
    headers: sourceValue('configuration.headersForFHIRServer'),
  }
);
