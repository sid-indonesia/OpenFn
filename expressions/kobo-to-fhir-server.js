// // Build "patient" resource
// fn(state => {
//   console.log(dataValue('patient/name'),
//     dataValue('patient/name'));
//   // @Taylor, why if without "(state)" it returns `[Function (anonymous)]` and write no value in the `output.json`?

//   const patient = {
//     resourceType: 'Patient',
//     identifier: [
//       {
//         use: 'usual',
//         system: 'https://fhir.kemkes.go.id/id/nik',
//         value: dataValue('patient/identifier_NIK'),
//       },
//     ],
//     name: [
//       {
//         use: "official",
//         text: dataValue('patient/name'),
//       },
//     ],
//     gender: "female",
//     birthDate: dataValue('patient/birth_date'),
//     address: [
//       {
//         use: "home",
//         text: dataValue('patient/address'),
//       },
//     ],
//     contact: [
//       {
//         name: {
//           use: "official",
//           text: dataValue('patient/husband_name'),
//         },
//         gender: "male",
//         extension: [
//           {
//             url: "https://fhir.kemkes.go.id/StructureDefinition/patient-contact-birthDate",
//             valueDate: dataValue('patient/husband_birth_date'),
//           },
//           {
//             url: "https://fhir.kemkes.go.id/StructureDefinition/patient-contact-identifier",
//             valueIdentifier: {
//               use: "usual",
//               system: "https://fhir.kemkes.go.id/id/nik",
//               value: dataValue('patient/husband_identifier_NIK'),
//             },
//           },
//         ],
//       },
//     ],
//   };

//   return { ...state, data: { patient } };
// });

// // Build "observation" resource
// fn(state => {
//   const observation = {};

//   return { data: { ...state.data, observation } };
// });

// fn(state => {
//   console.log('these are the prepared FHIR resources', state.data);
//   return state;
// });

// // @Taylor, how to attach the `state` from previous `fn()` in this `post()` as its request body?
// // Currently it's the `state` before those `fn()`s.
// post("", state);
// // TODO post as FHIR transaction bundle
// // https://www.hl7.org/fhir/http.html#transaction

// // TODO: @Levi, once you're happy with the resources, try sending them
// // to a particular URL and view the server response in the output.json file.

console.log(sourceValue('$.configuration'));

post(sourceValue("$.configuration.resource") + "Patient", {
  body: fields(
    field("resourceType", "Patient"),
    field("identifier", [
      {
        use: "usual",
        system: "https://fhir.kemkes.go.id/id/nik",
        value: dataValue("['patient/identifier_NIK']"),
      },
    ]),
    field("name", [
      {
        use: "official",
        text: dataValue("['patient/name']"),
      },
    ]),
    field("gender", "female"),
    field("birthDate", dataValue("['patient/birth_date']")),
    field("address", [
      {
        use: "home",
        text: dataValue("['patient/address']"),
      },
    ]),
    field("contact", [
      {
        name: {
          use: "official",
          text: dataValue("['patient/husband_name']"),
        },
        gender: "male",
        extension: [
          {
            url: "https://fhir.kemkes.go.id/StructureDefinition/patient-contact-birthDate",
            valueDate: dataValue("['patient/husband_birth_date']"),
          },
          {
            url: "https://fhir.kemkes.go.id/StructureDefinition/patient-contact-identifier",
            valueIdentifier: {
              use: "usual",
              system: "https://fhir.kemkes.go.id/id/nik",
              value: dataValue("['patient/husband_identifier_NIK']"),
            },
          },
        ],
      },
    ])
  ),
  headers: {
    "Content-Type": "application/fhir+json",
    "Authorization": "Bearer " + sourceValue("$.configuration.accessToken"),
  },
});

// post("Observation", {
//   body: fields(
//     field("resourceType", "Observation"),
//     field("status", "final"),
//     field(
//       "subject",
//       field(
//         "reference",
//         (state) => `Patient/${dataValue("id")}`
//       )
//     )
//   ),
//   headers: {
//     "Content-Type": "application/fhir+json",
//   },
// });
