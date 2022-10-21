sql(state =>
  `
SELECT
  phone_number,
  full_name,
  full_name AS customer_name,
  'Bunda App' AS company,
  calc_gestational,
  CASE
      WHEN calc_gestational >= 28
      THEN '3'
      ELSE (CASE
          WHEN (calc_gestational >= 13)
          THEN '2'
          ELSE (CASE
              WHEN calc_gestational >= 0
              THEN '1'
              ELSE '-'
          END
          )
      END
      )
  END
  AS "pregna_trimester"
FROM
  (
  SELECT
      '62' || substring((anc_registration."obs.phone_number.values"::jsonb) ->> 0, 2) AS "phone_number",
      CASE
          WHEN (the_mother."firstName" = the_mother."lastName")
          THEN the_mother."firstName"
          ELSE the_mother."firstName" || ' ' || the_mother."lastName"
      END AS "full_name",
      CASE
          WHEN latest_profile."obs.ultrasound_done.humanReadableValues"::jsonb ->> 0 ILIKE 'yes'
          THEN (current_date - (
                  to_date(
                      latest_profile."obs.ultrasound_edd.values"::jsonb ->> 0,
                      'dd-mm-yyyy'
                  ) - INTERVAL '280 days'
              )::date
          ) / 7
          ELSE (current_date - (
                  the_mother."attributes.edd"::date - INTERVAL '280 days'
              )::date
          ) / 7
      END
      AS "calc_gestational"
  FROM
      core.client_detailed_view the_mother
  LEFT JOIN core."event_ANC Registration_view" anc_registration ON
      the_mother."baseEntityId" = anc_registration."baseEntityId"
  LEFT JOIN (
      SELECT
          sub_profile."baseEntityId",
          max(sub_profile.id) AS latest_id
      FROM
          core."event_Profile_view" sub_profile
      GROUP BY
          sub_profile."baseEntityId"
      ) latest_id_of_profile ON
      latest_id_of_profile."baseEntityId" = the_mother."baseEntityId"
  LEFT JOIN
      core."event_Profile_view" latest_profile ON
      latest_profile.id = latest_id_of_profile.latest_id
  WHERE
      (CASE
          WHEN latest_profile."obs.ultrasound_done.humanReadableValues"::jsonb ->> 0 ILIKE 'yes'
          THEN to_date((latest_profile."obs.ultrasound_edd.values"::jsonb ->> 0), 'dd-mm-yyyy') > current_date
          ELSE (CASE
              WHEN (
                  the_mother."attributes.edd" != '0'
                  AND
                  the_mother."attributes.edd" != ''
              )
              THEN the_mother."attributes.edd"::date > current_date
              ELSE FALSE
          END)
      END)
      AND
      anc_registration."obs.phone_number.values"::jsonb ->> 0 IS NOT NULL
      AND
      anc_registration."obs.phone_number.values"::jsonb ->> 0 != '0'
      AND
      anc_registration."obs.phone_number.values"::jsonb ->> 0 !~ '^000*'
      AND
      anc_registration."obs.reminders.humanReadableValues"::jsonb ->> 0 ILIKE 'yes'
      AND 
      (CASE
          WHEN (EXISTS (
          SELECT
              1
          FROM
              core."event_ANC Close_view" anc_close
          WHERE
              anc_close."baseEntityId" = the_mother."baseEntityId")
          )
          THEN FALSE
          ELSE TRUE
      END)
  ) qontak;
`,
  {
    writeSql: false,
    execute: true
  }
);

fn(state => {
  // if not empty, return state
  if (state.response.body.rows.length) {
    return state;
  } else {
    throw new Error("`response.body.rows` is empty (no new data)");
  }
});
