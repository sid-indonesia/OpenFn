sql(state =>
  `SELECT
    '62' || substring((earv."obs.phone_number.values"::jsonb) ->> 0, 2) AS "phone_number",
    CASE
        WHEN (cdv."firstName" = cdv."lastName")
    THEN cdv."firstName"
        ELSE cdv."firstName" || ' ' || cdv."lastName"
    END AS "full_name",
    CASE
        WHEN (cdv."firstName" = cdv."lastName")
    THEN cdv."firstName"
        ELSE cdv."firstName" || ' ' || cdv."lastName"
    END AS "customer_name",
    'Bunda App' AS "company",
    cdv."attributes.next_contact" AS "next_contact"
  FROM
    core.client_detailed_view cdv
  LEFT JOIN core."event_ANC Registration_view" earv ON
    cdv."baseEntityId" = earv."baseEntityId"
  WHERE
    cdv."attributes.next_contact_date"::date = current_date + INTERVAL '${state.configuration.databaseBunda.ancVisitReminder.intervalInDays} day'
    AND
    cdv."attributes.next_contact_date" != '-0001-04-24'
    AND
    (earv."obs.phone_number.values"::jsonb) ->> 0 IS NOT NULL
    AND
    (earv."obs.phone_number.values"::jsonb) ->> 0 != '0'
    AND
    (earv."obs.reminders.humanReadableValues"::jsonb) ->> 0 ILIKE 'yes'
    AND 
    (CASE
        WHEN (EXISTS (
        SELECT
            1
        FROM
            core."event_ANC Close_view" eacv
        WHERE
            eacv."baseEntityId" = cdv."baseEntityId")
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
