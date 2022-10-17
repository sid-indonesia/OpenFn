sql(state =>
  `SELECT
    '62' || substring((earv."obs.phone_number.values"::jsonb) ->> 0, 2) AS "mobilePhoneNumber",
    CASE
        WHEN (cdv."firstName" = cdv."lastName")
    THEN cdv."firstName"
        ELSE cdv."firstName" || ' ' || cdv."lastName"
    END AS "fullName",
    cdv."baseEntityId",
    cdv."attributes.alt_phone_number" AS "alternateContactPhoneNumber",
    cdv."attributes.next_contact_date",
    cdv."attributes.next_contact",
    cdv."dateCreated",
    cdv."attributes.edd",
    cdv."attributes.last_contact_record_date",
    cdv."identifiers.ANC_ID",
    earv.id AS "eventId",
    earv."providerId"
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
    writeSql: true
  }
);
