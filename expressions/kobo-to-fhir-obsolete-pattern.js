// Your job goes here.

post(`${state.configuration.resource}`, {
  body: fields(
    field('resourceType', 'Bundle'),
    field('type', 'transaction'),
    field('entry', [
      {
        fullUrl: 'urn:uuid:0fc374a1-a226-4552-9683-55dd510e67c9', // will be referenced in many `Observation` resources
        request: {
          method: 'PUT',
          url: `Patient?identifier=https://fhir.kemkes.go.id/id/nik|${dataValue('patient_ID/patient_identifier_NIK')(state)}`
        },

        resource: {
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
        },
      },
      {
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
            reference: 'urn:uuid:0fc374a1-a226-4552-9683-55dd510e67c9', // same as Patient's `fullurl`
          },
          effectiveDateTime: dataValue('anc_visit/visit_date'),
          valueQuantity: {
            value: Number(dataValue('observations/circumference_mid_upper_arm')(state)),
            unit: 'cm',
          },
        },
      },
      {
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
            reference: 'urn:uuid:0fc374a1-a226-4552-9683-55dd510e67c9', // same as Patient's `fullurl`
          },
          effectiveDateTime: dataValue('anc_visit/visit_date'),
          valueQuantity: {
            value: Number(dataValue('observations/hemoglobin')(state)),
            unit: 'g/dL',
          },
        },
      },
      {
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
            reference: 'urn:uuid:0fc374a1-a226-4552-9683-55dd510e67c9', // same as Patient's `fullurl`
          },
          effectiveDateTime: dataValue('anc_visit/visit_date'),
          valueString: dataValue('observations/body_mass_index'),
        },
      },
      {
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
            reference: 'urn:uuid:0fc374a1-a226-4552-9683-55dd510e67c9', // same as Patient's `fullurl`
          },
          effectiveDateTime: dataValue('anc_visit/visit_date'),
          valueString: dataValue('observations/common_pregnancy_risks'),
        },
      },
      {
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
            reference: 'urn:uuid:0fc374a1-a226-4552-9683-55dd510e67c9', // same as Patient's `fullurl`
          },
          effectiveDateTime: dataValue('anc_visit/visit_date'),
          valueString: dataValue('observations/comorbidities'),
        },
      },
    ],
    ),
  ),
  headers: {
    'Content-Type': 'application/fhir+json',
    'Authorization': `${state.configuration.tokenType} ${state.configuration.accessToken}`,
    // TODO handle if expire, POST grant_type=refresh_token?
    // https://stackoverflow.com/a/43349958
  },
});
