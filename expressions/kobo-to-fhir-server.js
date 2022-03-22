// Build "patient" resource
fn(state => {
  const patient = {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'usual',
        system: 'https://fhir.kemkes.go.id/id/nik',
        value: dataValue("['patient/identifier_NIK']"),
      },
    ],
  };

  return { data: { patient } };
});

// Build "observation" resource
fn(state => {
  const observation = {};

  return { data: { ...state.data, observation } };
});

fn(state => {
  console.log('these are the prepared FHIR resources', state.data);
  return state;
});

// TODO: @Levi, once you're happy with the resources, try sending them
// to a particular URL and view the server response in the output.json file.

// post("Patient", {
//   body: fields(
//     field("resourceType", "Patient"),
//     field("identifier", [
//       {
//         use: "usual",
//         system: "https://fhir.kemkes.go.id/id/nik",
//         value: dataValue("['patient/identifier_NIK']"),
//       },
//     ]),
//     field("name", [
//       {
//         use: "official",
//         text: dataValue("['patient/name']"),
//       },
//     ]),
//     field("gender", "female"),
//     field("birthDate", dataValue("['patient/birth_date']")),
//     field("address", [
//       {
//         use: "home",
//         text: dataValue("['patient/address']"),
//       },
//     ]),
//     field("contact", [
//       {
//         name: {
//           use: "official",
//           text: dataValue("['patient/husband_name']"),
//         },
//         gender: "male",
//         extension: [
//           {
//             url: "https://fhir.kemkes.go.id/StructureDefinition/patient-contact-birthDate",
//             valueDate: dataValue("['patient/husband_birth_date']"),
//           },
//           {
//             url: "https://fhir.kemkes.go.id/StructureDefinition/patient-contact-identifier",
//             valueIdentifier: {
//               use: "usual",
//               system: "https://fhir.kemkes.go.id/id/nik",
//               value: dataValue("['patient/husband_identifier_NIK']"),
//             },
//           },
//         ],
//       },
//     ])
//   ),
//   headers: {
//     "Content-Type": "application/fhir+json",
//     "Authorization": sourceValue("$.configuration.accessToken"), // still not working
//   },
// });

// // post("Observation", {
// //   body: fields(
// //     field("resourceType", "Observation"),
// //     field("status", "final"),
// //     field(
// //       "subject",
// //       field(
// //         "reference",
// //         (state) => `Patient/${dataValue("id")(state)}`
// //       )
// //     )
// //   ),
// //   headers: {
// //     "Content-Type": "application/fhir+json",
// //   },
// // });
