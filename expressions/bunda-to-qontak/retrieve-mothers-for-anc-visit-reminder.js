sql(state =>
  `SELECT
    '62' || substring((anc_registration."obs.phone_number.values"::jsonb) ->> 0, 2) AS "phone_number",
    CASE
        WHEN (the_mother."firstName" = the_mother."lastName")
    THEN the_mother."firstName"
        ELSE the_mother."firstName" || ' ' || the_mother."lastName"
    END AS "full_name",
    CASE
        WHEN (the_mother."firstName" = the_mother."lastName")
    THEN the_mother."firstName"
        ELSE the_mother."firstName" || ' ' || the_mother."lastName"
    END AS "customer_name",
    'Bunda App' AS "company",
    the_mother."attributes.next_contact_date" AS "next_contact_date",
    the_mother."attributes.next_contact" AS "next_contact"
  FROM
    core.client_detailed_view the_mother
  LEFT JOIN core."event_ANC Registration_view" anc_registration ON
    the_mother."baseEntityId" = anc_registration."baseEntityId"
  WHERE
    the_mother."attributes.next_contact_date"::date = current_date + INTERVAL '${state.configuration.databaseBunda.ancVisitReminder.intervalInDays} day'
    AND
    the_mother."attributes.next_contact_date" != '-0001-04-24'
    AND
    anc_registration."obs.phone_number.values"::jsonb ->> 0 IS NOT NULL
    AND
    anc_registration."obs.phone_number.values"::jsonb ->> 0 != '0'
    AND
    anc_registration."obs.phone_number.values"::jsonb ->> 0 != '999'
    AND
    anc_registration."obs.phone_number.values"::jsonb ->> 0 !~ '^000*'
    AND
    length(anc_registration."obs.phone_number.values"::jsonb ->> 0) >= 10
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
    END);`,
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
