// Build "Organization" resource, will be referenced in other resources
fn(state => {

  const organization = {
    fullUrl: 'urn:uuid:089812b4-82ef-4528-bb15-c551022f364e',
    request: {
      method: 'PUT',
      url: 'Organization?identifier=https://fhir.kemkes.go.id/id/organisasi|Kemkes'
    },

    resource: {
      resourceType: 'Organization',
      identifier: [
        {
          use: 'official',
          system: 'https://fhir.kemkes.go.id/id/organisasi',
          value: 'Kemkes',
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
      name: 'Kementerian Kesehatan RI',
      alias: [
        'Kemkes',
        'Kemenkes RI',
      ],
    },
  };

  return { ...state, transactionBundle: { entry: [organization] } };
});

// Build "Patient" resource
fn(state => {

  const patient = {
    fullUrl: 'urn:uuid:0fc374a1-a226-4552-9683-55dd510e67c9', // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Patient?identifier=https://fhir.kemkes.go.id/id/nik|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}`
    },

    resource: {
      resourceType: 'Patient',
      identifier: [
        {
          use: 'usual',
          system: 'https://fhir.kemkes.go.id/id/nik',
          value: dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_"),
        },
      ],
      name: [
        {
          use: 'official',
          given: [
            dataValue('id_pasutri/nama_bumil'),
          ],
          text: dataValue('id_pasutri/nama_bumil'),
        },
      ],
      gender: 'female',
      birthDate: dataValue('id_pasutri/dob_bumil'),
      address: [
        {
          use: 'home',
          text: dataValue('id_pasutri/alamat_pasutri'),
        },
      ],
      contact: [
        {
          name: {
            use: 'official',
            given: [
              dataValue('id_pasutri/nama_suami'),
            ],
            text: dataValue('id_pasutri/nama_suami'),
          },
          gender: 'male',
          extension: [
            {
              url: 'https://fhir.kemkes.go.id/StructureDefinition/patient-contact-birthDate',
              valueDate: dataValue('id_pasutri/dob_suami'),
            },
            {
              url: 'https://fhir.kemkes.go.id/StructureDefinition/patient-contact-identifier',
              valueIdentifier: {
                use: 'usual',
                system: 'https://fhir.kemkes.go.id/id/nik',
                value: dataValue('id_pasutri/NIK_suami'),
              },
            },
          ],
        },
      ],
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

// Build "Encounter" resource
fn(state => {

  const encounter = {
    fullUrl: 'urn:uuid:13c31d68-114c-482a-a5e2-5df2c36a81c8', // will be referenced in other resources
    request: {
      method: 'PUT',
      url: `Encounter?identifier=https://fhir.kemkes.go.id/id/encounter|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_STATUS`
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
          value: `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_STATUS`,
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

// Build "Observation" resources, for "Received COVID-19 vaccine" and Dosage status
fn(state => {

  const hasReceivedCovidVaccine = dataValue('vaksin/status_vaksinasi')(state) === 'belum' ? false : true;

  let observations = [];

  let observationExtensions = [
    {
      url: 'https://fhir.kemkes.go.id/StructureDefinition/konsultan-vaksin',
      valueString: dataValue('vaksin/konsultan_vaksin'),
    },
  ];

  if (dataValue('vaksin/konsultan_vaksin2')(state) != null) {
    observationExtensions.push({
      url: 'https://fhir.kemkes.go.id/StructureDefinition/konsultan-vaksin-others',
      valueString: dataValue('vaksin/konsultan_vaksin2'),
    });
  }

  if (dataValue('vaksin/mau_vaksin_apa')(state) != null) {
    observationExtensions.push({
      url: 'https://fhir.kemkes.go.id/StructureDefinition/varian-vaksin',
      valueString: dataValue('vaksin/mau_vaksin_apa'),
    });
  }

  if (dataValue('vaksin/mau_vaksin_kenapa')(state) != null) {
    observationExtensions.push({
      url: 'https://fhir.kemkes.go.id/StructureDefinition/varian-vaksin-kenapa',
      valueString: dataValue('vaksin/mau_vaksin_kenapa'),
    });
  }

  if (dataValue('vaksin/mau_vaksin_kenapa2')(state) != null) {
    observationExtensions.push({
      url: 'https://fhir.kemkes.go.id/StructureDefinition/varian-vaksin-kenapa-others',
      valueString: dataValue('vaksin/mau_vaksin_kenapa2'),
    });
  }

  if (dataValue('vaksin/pesan_utk_ibu_vaksin')(state) != null) {
    observationExtensions.push({
      url: 'https://fhir.kemkes.go.id/StructureDefinition/pesan-utk-ibu-hamil-vaksin',
      valueString: dataValue('vaksin/pesan_utk_ibu_vaksin'),
    });
  }

  const observationResource = {
    resourceType: 'Observation',
    identifier: [
      {
        use: 'usual',
        system: 'https://fhir.kemkes.go.id/id/observation',
        value: `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_STATUS`,
      },
    ],
    status: 'final',
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '97073-1',
          display: 'Received COVID-19 vaccine',
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
    effectiveInstant: dataValue('_submission_time'),
    valueBoolean: hasReceivedCovidVaccine,
    extension: observationExtensions,
  };

  observations.push({
    request: {
      method: 'PUT',
      url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_STATUS`
    },

    resource: observationResource,
  });

  if (hasReceivedCovidVaccine === true) {
    observations.push({
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_STATUS_DOSE`
      },

      resource: {
        resourceType: 'Observation',
        identifier: [
          {
            use: 'usual',
            system: 'https://fhir.kemkes.go.id/id/observation',
            value: `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_STATUS_DOSE`,
          },
        ],
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '97155-6',
              display: 'SARS coronavirus 2 (COVID-19) immunization status',
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
        effectiveInstant: dataValue('_submission_time'),
        valueString: dataValue('vaksin/status_vaksinasi'),
      },
    });
  }

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, ...observations] } };
});

// Build "Observation" resource, for "Reasons for not accepting COVID-19 vaccine"
fn(state => {

  let observations = [];

  if (dataValue('vaksin/kenapa_belum')(state) != null) {
    observations.push({
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REASON_FOR_NOT_ACCEPTING`
      },

      resource: {
        resourceType: 'Observation',
        identifier: [
          {
            use: 'usual',
            system: 'https://fhir.kemkes.go.id/id/observation',
            value: `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REASON_FOR_NOT_ACCEPTING`,
          },
        ],
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '98173-8',
              display: 'Reasons for not accepting COVID-19 vaccine',
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
        effectiveInstant: dataValue('_submission_time'),
        valueString: dataValue('vaksin/kenapa_belum'),
      },
    });

    if (dataValue('vaksin/kenapa_belum2')(state) != null) {
      observations.push({
        request: {
          method: 'PUT',
          url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REASON_FOR_NOT_ACCEPTING_OTHERS`
        },

        resource: {
          resourceType: 'Observation',
          identifier: [
            {
              use: 'usual',
              system: 'https://fhir.kemkes.go.id/id/observation',
              value: `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REASON_FOR_NOT_ACCEPTING_OTHERS`,
            },
          ],
          status: 'final',
          code: {
            coding: [
              {
                system: 'https://sid-indonesia.org/clinical-codes',
                code: 'reasons-for-not-accepting-covid-19-vaccine-others',
                display: 'Reasons for not accepting COVID-19 vaccine (others)',
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
          effectiveInstant: dataValue('_submission_time'),
          valueString: dataValue('vaksin/kenapa_belum2'),
        },
      });
    }
  }

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, ...observations] } };
});

// Build "Observation" resource, for "Vaccine reaction"
fn(state => {

  let observations = [];

  if (dataValue('vaksin/efek_samping_vaksin')(state) != null) {
    const reactionDate = new Date(dataValue('vaksin/dosis1_kapan')(state));
    reactionDate.setDate(reactionDate.getDate() + Number(dataValue('vaksin/efek_samping_kapan')(state)));
    const reactionDateString = reactionDate.toISOString();

    observations.push({
      fullUrl: 'urn:uuid:22991c3d-1b01-4019-aa78-7da464292463',
      request: {
        method: 'PUT',
        url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REACTION`
      },

      resource: {
        resourceType: 'Observation',
        identifier: [
          {
            use: 'usual',
            system: 'https://fhir.kemkes.go.id/id/observation',
            value: `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REACTION`,
          },
        ],
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '31044-1',
              display: 'Immunization reaction',
            },
            {
              system: 'https://sid-indonesia.org/clinical-codes',
              code: 'immunization-reaction',
              display: 'Immunization reaction',
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
        effectiveDateTime: reactionDateString,
        valueString: dataValue('vaksin/efek_samping_vaksin'),
      },
    });

    if (dataValue('vaksin/efek_samping_vaksin2')(state) != null) {
      observations.push({
        request: {
          method: 'PUT',
          url: `Observation?identifier=https://fhir.kemkes.go.id/id/observation|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REACTION_OTHERS`
        },

        resource: {
          resourceType: 'Observation',
          identifier: [
            {
              use: 'usual',
              system: 'https://fhir.kemkes.go.id/id/observation',
              value: `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REACTION_OTHERS`,
            },
          ],
          status: 'final',
          code: {
            coding: [
              {
                system: 'https://sid-indonesia.org/clinical-codes',
                code: 'immunization-reaction-others',
                display: 'Immunization reaction (others)',
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
          effectiveDateTime: reactionDateString,
          valueString: dataValue('vaksin/efek_samping_vaksin2'),
        },
      });
    }
  }

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, ...observations] } };
});

// Build "Immunization" resource
fn(state => {

  let immunizations = [];

  let reactionDateString;

  if (dataValue('vaksin/dosis1_kapan')(state) != null) {
    const reactionDate = new Date(dataValue('vaksin/dosis1_kapan')(state));
    reactionDate.setDate(reactionDate.getDate() + Number(dataValue('vaksin/efek_samping_kapan')(state)));
    reactionDateString = reactionDate.toISOString();
  }

  if (dataValue('vaksin/dosis1_apa')(state) != null) {
    immunizations.push({
      request: {
        method: 'PUT',
        url: `Immunization?identifier=https://fhir.kemkes.go.id/id/immunization|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_DOSE_1`
      },

      resource: {
        resourceType: 'Immunization',
        identifier: [
          {
            system: 'https://fhir.kemkes.go.id/id/immunization',
            value: `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_DOSE_1`,
          },
        ],
        status: 'completed',
        vaccineCode: {
          coding: [
            {
              system: 'https://fhir.kemkes.go.id/id/vaccine',
              code: `COVID19_${dataValue('vaksin/dosis1_apa')(state)}`,
              display: `Covid-19 vaccine, brand: ${dataValue('vaksin/dosis1_apa')(state)}`,
            },
          ],
        },
        occurrenceDateTime: dataValue('vaksin/dosis1_kapan'),
        patient: {
          reference: state.transactionBundle.entry
            .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
        },
        encounter: {
          reference: state.transactionBundle.entry
            .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
        },
        protocolApplied: [
          {
            series: 'COVID19',
            authority: {
              reference: state.transactionBundle.entry
                .find(e => e.resource.resourceType === 'Organization').fullUrl, // same as "Kemkes" Organization's `fullurl`
            },
            targetDisease: [
              {
                coding: [
                  {
                    system: 'https://fhir.kemkes.go.id/id/disease',
                    code: 'COVID19',
                    display: 'Coronavirus disease caused by the SARS-CoV-2 virus',
                  },
                ],
              },
            ],
            doseNumberPositiveInt: 1,
            seriesDosesPositiveInt: 3,
          },
        ],
        reaction: [
          {
            date: reactionDateString,
            detail: {
              reference: state.transactionBundle.entry
                .find(e => e.resource.identifier[0].value ===
                  `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REACTION`)
                .fullUrl, // same as "Immunization reaction" Observation's `fullurl`
            }
          },
        ],
      }
    });
  }

  if (dataValue('vaksin/dosis2_apa')(state) != null) {
    immunizations.push({
      request: {
        method: 'PUT',
        url: `Immunization?identifier=https://fhir.kemkes.go.id/id/immunization|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_DOSE_2`
      },

      resource: {
        resourceType: 'Immunization',
        identifier: [
          {
            system: 'https://fhir.kemkes.go.id/id/immunization',
            value: `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_DOSE_2`,
          },
        ],
        status: 'completed',
        vaccineCode: {
          coding: [
            {
              system: 'https://fhir.kemkes.go.id/id/vaccine',
              code: `COVID19_${dataValue('vaksin/dosis2_apa')(state)}`,
              display: `Covid-19 vaccine, brand: ${dataValue('vaksin/dosis2_apa')(state)}`,
            },
          ],
        },
        occurrenceDateTime: dataValue('vaksin/dosis2_kapan'),
        patient: {
          reference: state.transactionBundle.entry
            .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
        },
        encounter: {
          reference: state.transactionBundle.entry
            .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
        },
        protocolApplied: [
          {
            series: 'COVID19',
            authority: {
              reference: state.transactionBundle.entry
                .find(e => e.resource.resourceType === 'Organization').fullUrl, // same as "Kemkes" Organization's `fullurl`
            },
            targetDisease: [
              {
                coding: [
                  {
                    system: 'https://fhir.kemkes.go.id/id/disease',
                    code: 'COVID19',
                    display: 'Coronavirus disease caused by the SARS-CoV-2 virus',
                  },
                ],
              },
            ],
            doseNumberPositiveInt: 2,
            seriesDosesPositiveInt: 3,
          },
        ],
        reaction: [
          {
            date: reactionDateString,
            detail: {
              reference: state.transactionBundle.entry
                .find(e => e.resource.identifier[0].value ===
                  `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REACTION`)
                .fullUrl, // same as "Immunization reaction" Observation's `fullurl`
            }
          },
        ],
      }
    });
  }

  if (dataValue('vaksin/dosis3_apa')(state) != null) {
    immunizations.push({
      request: {
        method: 'PUT',
        url: `Immunization?identifier=https://fhir.kemkes.go.id/id/immunization|${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_DOSE_3`
      },

      resource: {
        resourceType: 'Immunization',
        identifier: [
          {
            system: 'https://fhir.kemkes.go.id/id/immunization',
            value: `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_DOSE_3`,
          },
        ],
        status: 'completed',
        vaccineCode: {
          coding: [
            {
              system: 'https://fhir.kemkes.go.id/id/vaccine',
              code: `COVID19_${dataValue('vaksin/dosis3_apa')(state)}`,
              display: `Covid-19 vaccine, brand: ${dataValue('vaksin/dosis3_apa')(state)}`,
            },
          ],
        },
        occurrenceDateTime: dataValue('vaksin/dosis3_kapan'),
        patient: {
          reference: state.transactionBundle.entry
            .find(e => e.resource.resourceType === 'Patient').fullUrl, // same as Patient's `fullurl`
        },
        encounter: {
          reference: state.transactionBundle.entry
            .find(e => e.resource.resourceType === 'Encounter').fullUrl, // same as Encounter's `fullurl`
        },
        protocolApplied: [
          {
            series: 'COVID19',
            authority: {
              reference: state.transactionBundle.entry
                .find(e => e.resource.resourceType === 'Organization').fullUrl, // same as "Kemkes" Organization's `fullurl`
            },
            targetDisease: [
              {
                coding: [
                  {
                    system: 'https://fhir.kemkes.go.id/id/disease',
                    code: 'COVID19',
                    display: 'Coronavirus disease caused by the SARS-CoV-2 virus',
                  },
                ],
              },
            ],
            doseNumberPositiveInt: 3,
            seriesDosesPositiveInt: 3,
          },
        ],
        reaction: [
          {
            date: reactionDateString,
            detail: {
              reference: state.transactionBundle.entry
                .find(e => e.resource.identifier[0].value ===
                  `${dataValue('id_pasutri/NIK_bumil')(state).replace(/ /g, "_")}_COVID19_VACCINATION_REACTION`)
                .fullUrl, // same as "Immunization reaction" Observation's `fullurl`
            }
          },
        ],
      }
    });
  }

  return { ...state, transactionBundle: { entry: [...state.transactionBundle.entry, ...immunizations] } };
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
