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
          url: `Patient?identifier=https://fhir.kemkes.go.id/id/nik|${dataValue('patient_ID/patient_identifier_NIK')}`
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
        fullUrl: 'urn:uuid:9b3055be-bb9f-4fce-b5da-599286eb2841',
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
            value: dataValue('observations/circumference_mid_upper_arm'),
            unit: 'cm',
          },
        },
      },
      {
        fullUrl: 'urn:uuid:bf551c01-8aa5-4ace-99d4-ae03a5bc89e7',
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
                code: '56072-2', // TODO change hemoglobin
                display: 'Hemoglobin', // TODO change correct one if this is wrong
              },
              {
                system: 'https://sid-indonesia.org/clinical-codes',
                code: 'hemoglobin',
                display: 'Hemoglobin',
              }
            ]
          }
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

// post('Observation', {
//   body: fields(
//     field('resourceType', 'Observation'),
//     field('status', 'final'),
//     field(
//       'subject',
//       field(
//         'reference',
//         (state) => `Patient/${dataValue('id')}`
//       )
//     )
//   ),
//   headers: {
//     'Content-Type': 'application/fhir+json',
//   },
// });
