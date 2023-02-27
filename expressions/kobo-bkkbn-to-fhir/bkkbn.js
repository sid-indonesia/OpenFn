/*
  Data transformation script
  from KoBo form "[BKKBN] Laporan Tim Pendamping Balita"
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

    mergeNestedArrayAndRemoveDuplicates: (obj1, obj2) => {
      const mergedObj = {};

      // Merge all properties from both objects
      for (const key of Object.keys(obj1).concat(Object.keys(obj2))) {
        const value1 = obj1[key];
        const value2 = obj2[key];
        if (Array.isArray(value1) && Array.isArray(value2)) {
          // If the property is an array, merge it and remove duplicates
          mergedObj[key] = state.commonFunctions.mergeArrayAndRemoveDuplicates(value1, value2);
        } else {
          // Otherwise, use the value from the second object (obj2) to overwrite the value in the first object (obj1)
          mergedObj[key] = value2;
        }
      }

      return mergedObj;
    },

    mergeResourceFromServerWithNewlyCompiledResource: (resourceFromServer, resourceNewlyCompiled) => {
      const arrayKeys = Object.keys(resourceNewlyCompiled).filter(key => Array.isArray(resourceNewlyCompiled[key]));
      const mergedArrays = {};
      for (const key of arrayKeys) {
        mergedArrays[key] = state.commonFunctions.mergeArrayAndRemoveDuplicates(resourceFromServer[key], resourceNewlyCompiled[key]);
      }

      const nestedArrayKeys = Object.keys(resourceNewlyCompiled).filter(key => {
        const value = resourceNewlyCompiled[key];
        return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).some(v => Array.isArray(v));
      });
      const mergedNestedArrays = {};
      for (const key of nestedArrayKeys) {
        mergedNestedArrays[key] = state.commonFunctions.mergeNestedArrayAndRemoveDuplicates(resourceFromServer[key], resourceNewlyCompiled[key]);
      }

      return {
        ...resourceFromServer,
        ...resourceNewlyCompiled,
        ...mergedArrays,
        ...mergedNestedArrays
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

    checkMoreThanOneResourceByIdentifier: (state) => {
      if (state.data.total > 1) {
        throw new Error('We found more than one: "' +
          state.data.entry[0].resource.resourceType + '" resources with identifier ' +
          JSON.stringify(state.data.entry[0].resource.identifier) + ', aborting POST transaction bundle');
      }
    }

  };

  state.temporaryFullUrl = {
    organizationBKKBN: 'urn:uuid:organization-BKKBN',
    patientBaby: 'urn:uuid:patient-baby',
    relatedPersonMother: 'urn:uuid:related-person-mother',
    patientMother: 'urn:uuid:patient-mother',
  };

  state.inputKey = {
    required: {
      motherAddress: 'id_balita/alamat_rumah',
      babyName: 'id_balita/nama_balita',
      babyBirthDate: 'id_balita/dob_balita',
      babyGender: 'id_balita/jenis_kelamin_balita',
      nikMother: 'id_balita/NIK_Ibu',
      motherName: 'id_balita/nama_ortu',
      motherPhoneNumber: 'id_balita/nomor_telepon',
      screeningResult: 'detil_kunjungan/hasil_skrining',
      visitDate: 'detil_kunjungan/Tanggal_Kunjungan',
      basicImmunizationsGivenToBabySeparatedBySpace: 'group_pd7fc60/idl',
      kecamatanName: 'group_yp32g51/Kecamatan',
    },
    optional: {
    },
  };

  return state;
});

// GET "Organization" resource by identifier from server first
get(`${state.configuration.resource}/Organization`,
  {
    query: {
      identifier: 'https://fhir.kemkes.go.id/id/organisasi|BKKBN',
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
  };

  const organization = {
    fullUrl: state.temporaryFullUrl.organizationBKKBN,
    request: {
      method: 'PUT',
      url: 'Organization?identifier=https://fhir.kemkes.go.id/id/organisasi|BKKBN'
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
    telecom: [
      {
        system: 'phone',
        value: input[state.inputKey.required.motherPhoneNumber],
        use: 'mobile',
        rank: 1,
      }
    ],
  };

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
      reference: state.temporaryFullUrl.organizationBKKBN,
    },
    link: [
      {
        other: {
          type: 'RelatedPerson',
          reference: state.temporaryFullUrl.relatedPersonMother,
        },
        type: 'seealso'
      }
    ],
    telecom: [
      {
        system: 'phone',
        value: input[state.inputKey.required.motherPhoneNumber],
        use: 'mobile',
        rank: 1,
      }
    ],
  };

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
    gender: (input[state.inputKey.required.babyGender] === 'perempuan' ? 'female' : 'male'),
    managingOrganization: {
      type: 'Organization',
      reference: state.temporaryFullUrl.organizationBKKBN, // same as "SID" Organization's `fullurl`
    },
  };

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

// GET "Observation" resource of "BKKBN Screening Result" by identifier from server first
get(`${state.configuration.resource}/Observation`,
  {
    query: {
      identifier: `https://fhir.kemkes.go.id/id/observation|` +
        state.configuration.queryIdentifierMotherBaby + `-BKKBN_SCREENING_RESULT`,
    },
    headers: sourceValue('configuration.headersForFHIRServer'),
  },
  state => {
    state.commonFunctions.checkMoreThanOneResourceByIdentifier(state);
    return state;
  }
);

// Build "Observation" resources, for "BKKBN Screening Result"
fn(state => {
  const input = state.koboData;

  const observationResource = {
    resourceType: 'Observation',
    identifier: [
      {
        use: 'usual',
        system: 'https://fhir.kemkes.go.id/id/observation',
        value: state.configuration.queryIdentifierMotherBaby + `-BKKBN_SCREENING_RESULT`,
      },
    ],
    status: 'final',
    code: {
      coding: [
        {
          system: 'https://sid-indonesia.org/clinical-codes',
          code: 'bkkbn-screening-result',
          display: 'BKKBN Screening Result',
        },
      ],
    },
    subject: {
      type: 'Patient',
      reference: state.temporaryFullUrl.patientBaby,
    },
    effectiveDateTime: input[state.inputKey.required.visitDate],
    valueString: input[state.inputKey.required.screeningResult],
  };

  const observation = {
    request: {
      method: 'PUT',
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|` +
        state.configuration.queryIdentifierMotherBaby + `-BKKBN_SCREENING_RESULT`,
    },
  };

  observation.resource = state.commonFunctions.mergeResourceIfFoundInServer(state, observationResource);

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, observation] } };
});

// Build "Immunization" resources
fn(state => {
  const input = state.koboData;

  const immunizationTypeList = input[state.inputKey.required.basicImmunizationsGivenToBabySeparatedBySpace].split(' ');
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
          occurrenceDateTime: input[state.inputKey.required.visitDate],
          patient: {
            type: 'Patient',
            reference: state.temporaryFullUrl.patientBaby,
          },
        },
      };
    }
  );

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, ...immunizationResources] } };
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
