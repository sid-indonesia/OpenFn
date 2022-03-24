// Your job goes here.
console.log('this is the `expiresIn`', state.configuration.expiresIn);
console.log('this is the `refreshExpiresIn`', state.configuration.refreshExpiresIn);
console.log('this is the `givenName`', state.configuration.givenName);
console.log('this is the `familyName`', state.configuration.familyName);

post(sourceValue('$.configuration.resource')(state) + 'Patient', {
  body: fields(
    field('resourceType', 'Patient'),
    field('identifier', [
      {
        use: 'usual',
        system: 'https://fhir.kemkes.go.id/id/nik',
        value: dataValue('patient_ID/patient_identifier_NIK'),
        
      },
    ]),
    field('name', [
      {
        use: 'official',
        text: dataValue('patient_ID/patient_name'),
      },
    ]),
    field('gender', 'female'),
    field('birthDate', dataValue('patient_ID/patient_dob')),
    field('address', [
      {
        use: 'home',
        text: dataValue('patient_ID/patient_address'),
      },
    ]),
    field('contact', [
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
    ])
  ),
  headers: {
    'Content-Type': 'application/fhir+json',
    'Authorization': sourceValue('$.configuration.tokenType')(state) + ' ' + sourceValue('$.configuration.accessToken')(state),
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