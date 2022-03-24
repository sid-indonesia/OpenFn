// // Build "patient" resource
// fn(state => {
//   console.log(dataValue('patient/name'),
//     dataValue('patient/name')(state));
//   // @Taylor, why if without "(state)" it returns `[Function (anonymous)]` and write no value in the `output.json`?

//   const patient = {
//     resourceType: 'Patient',
//     identifier: [
//       {
//         use: 'usual',
//         system: 'https://fhir.kemkes.go.id/id/nik',
//         value: dataValue('patient/identifier_NIK')(state),
//       },
//     ],
//     name: [
//       {
//         use: "official",
//         text: dataValue('patient/name')(state),
//       },
//     ],
//     gender: "female",
//     birthDate: dataValue('patient/birth_date')(state),
//     address: [
//       {
//         use: "home",
//         text: dataValue('patient/address')(state),
//       },
//     ],
//     contact: [
//       {
//         name: {
//           use: "official",
//           text: dataValue('patient/husband_name')(state),
//         },
//         gender: "male",
//         extension: [
//           {
//             url: "https://fhir.kemkes.go.id/StructureDefinition/patient-contact-birthDate",
//             valueDate: dataValue('patient/husband_birth_date')(state),
//           },
//           {
//             url: "https://fhir.kemkes.go.id/StructureDefinition/patient-contact-identifier",
//             valueIdentifier: {
//               use: "usual",
//               system: "https://fhir.kemkes.go.id/id/nik",
//               value: dataValue('patient/husband_identifier_NIK')(state),
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

post(sourceValue("configuration.accessToken")(state) + "Patient", {
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
        text: dataValue("['patient/name']")(state),
      },
    ]),
    field("gender", "female"),
    field("birthDate", dataValue("['patient/birth_date']")(state)),
    field("address", [
      {
        use: "home",
        text: dataValue("['patient/address']")(state),
      },
    ]),
    field("contact", [
      {
        name: {
          use: "official",
          text: dataValue("['patient/husband_name']")(state),
        },
        gender: "male",
        extension: [
          {
            url: "https://fhir.kemkes.go.id/StructureDefinition/patient-contact-birthDate",
            valueDate: dataValue("['patient/husband_birth_date']")(state),
          },
          {
            url: "https://fhir.kemkes.go.id/StructureDefinition/patient-contact-identifier",
            valueIdentifier: {
              use: "usual",
              system: "https://fhir.kemkes.go.id/id/nik",
              value: dataValue("['patient/husband_identifier_NIK']")(state),
            },
          },
        ],
      },
    ])
  ),
  headers: {
    "Content-Type": "application/fhir+json",
    "Authorization": "Bearer " + sourceValue("$.configuration.accessToken")(state),
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
//         (state) => `Patient/${dataValue("id")(state)}`
//       )
//     )
//   ),
//   headers: {
//     "Content-Type": "application/fhir+json",
//   },
// });
