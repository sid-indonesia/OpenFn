// Your job goes here.

// KoBo to FHIR
post(sourceValue("$.configuration.resource")(state) + "Patient", {
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