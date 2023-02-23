-- Metabase hacks
-- public.view_all_resources source
CREATE
OR REPLACE VIEW public.view_all_resources AS
SELECT
    all_fhir_resources_all_versions.pid,
    all_fhir_resources_all_versions.partition_date,
    all_fhir_resources_all_versions.partition_id,
    all_fhir_resources_all_versions.res_deleted_at,
    all_fhir_resources_all_versions.res_version,
    all_fhir_resources_all_versions.has_tags,
    all_fhir_resources_all_versions.res_published,
    all_fhir_resources_all_versions.res_updated,
    all_fhir_resources_all_versions.res_encoding,
    all_fhir_resources_all_versions.res_id,
    all_fhir_resources_all_versions.res_type,
    all_fhir_resources_all_versions.res_ver,
    all_fhir_resources_all_versions.res_text_vc
FROM
    hfj_res_ver all_fhir_resources_all_versions
WHERE
    -- the first `res_id` after changes of "Disable GZip Compression"
    all_fhir_resources_all_versions.res_id >= 4914;

-- public."view_Patient_resources" source
CREATE
OR REPLACE VIEW public."view_Patient_resources" AS
SELECT
    view_all_res.pid,
    view_all_res.partition_date,
    view_all_res.partition_id,
    view_all_res.res_deleted_at,
    view_all_res.res_version,
    view_all_res.has_tags,
    view_all_res.res_published,
    view_all_res.res_updated,
    view_all_res.res_encoding,
    view_all_res.res_id,
    view_all_res.res_type,
    view_all_res.res_ver,
    view_all_res.res_text_vc::jsonb AS res_jsonb
FROM
    view_all_resources view_all_res
WHERE
    view_all_res.res_type::text = 'Patient'::text;

-- public."view_RelatedPerson_resources" source
CREATE
OR REPLACE VIEW public."view_RelatedPerson_resources" AS
SELECT
    view_all_res.pid,
    view_all_res.partition_date,
    view_all_res.partition_id,
    view_all_res.res_deleted_at,
    view_all_res.res_version,
    view_all_res.has_tags,
    view_all_res.res_published,
    view_all_res.res_updated,
    view_all_res.res_encoding,
    view_all_res.res_id,
    view_all_res.res_type,
    view_all_res.res_ver,
    view_all_res.res_text_vc::jsonb AS res_jsonb
FROM
    view_all_resources view_all_res
WHERE
    view_all_res.res_type::text = 'RelatedPerson'::text;

-- public."view_Observation_resources" source
CREATE
OR REPLACE VIEW public."view_Observation_resources" AS
SELECT
    view_all_res.pid,
    view_all_res.partition_date,
    view_all_res.partition_id,
    view_all_res.res_deleted_at,
    view_all_res.res_version,
    view_all_res.has_tags,
    view_all_res.res_published,
    view_all_res.res_updated,
    view_all_res.res_encoding,
    view_all_res.res_id,
    view_all_res.res_type,
    view_all_res.res_ver,
    view_all_res.res_text_vc::jsonb AS res_jsonb
FROM
    view_all_resources view_all_res
WHERE
    view_all_res.res_type::text = 'Observation'::text;

-- public."view_Practitioner_resources" source
CREATE
OR REPLACE VIEW public."view_Practitioner_resources" AS
SELECT
    view_all_res.pid,
    view_all_res.partition_date,
    view_all_res.partition_id,
    view_all_res.res_deleted_at,
    view_all_res.res_version,
    view_all_res.has_tags,
    view_all_res.res_published,
    view_all_res.res_updated,
    view_all_res.res_encoding,
    view_all_res.res_id,
    view_all_res.res_type,
    view_all_res.res_ver,
    view_all_res.res_text_vc::jsonb AS res_jsonb
FROM
    view_all_resources view_all_res
WHERE
    view_all_res.res_type::text = 'Practitioner'::text;

-- public."view_Encounter_resources" source
CREATE
OR REPLACE VIEW public."view_Encounter_resources" AS
SELECT
    view_all_res.pid,
    view_all_res.partition_date,
    view_all_res.partition_id,
    view_all_res.res_deleted_at,
    view_all_res.res_version,
    view_all_res.has_tags,
    view_all_res.res_published,
    view_all_res.res_updated,
    view_all_res.res_encoding,
    view_all_res.res_id,
    view_all_res.res_type,
    view_all_res.res_ver,
    view_all_res.res_text_vc::jsonb AS res_jsonb
FROM
    view_all_resources view_all_res
WHERE
    view_all_res.res_type::text = 'Encounter'::text;

-- public."view_Location_resources" source
CREATE
OR REPLACE VIEW public."view_Location_resources" AS
SELECT
    view_all_res.pid,
    view_all_res.partition_date,
    view_all_res.partition_id,
    view_all_res.res_deleted_at,
    view_all_res.res_version,
    view_all_res.has_tags,
    view_all_res.res_published,
    view_all_res.res_updated,
    view_all_res.res_encoding,
    view_all_res.res_id,
    view_all_res.res_type,
    view_all_res.res_ver,
    view_all_res.res_text_vc::jsonb AS res_jsonb
FROM
    view_all_resources view_all_res
WHERE
    view_all_res.res_type::text = 'Location'::text;

-- public."view_Immunization_resources" source
CREATE
OR REPLACE VIEW public."view_Immunization_resources" AS
SELECT
    view_all_res.pid,
    view_all_res.partition_date,
    view_all_res.partition_id,
    view_all_res.res_deleted_at,
    view_all_res.res_version,
    view_all_res.has_tags,
    view_all_res.res_published,
    view_all_res.res_updated,
    view_all_res.res_encoding,
    view_all_res.res_id,
    view_all_res.res_type,
    view_all_res.res_ver,
    view_all_res.res_text_vc::jsonb AS res_jsonb
FROM
    view_all_resources view_all_res
WHERE
    view_all_res.res_type::text = 'Immunization'::text;

-- public."view_Organization_resources" source
CREATE
OR REPLACE VIEW public."view_Organization_resources" AS
SELECT
    view_all_res.pid,
    view_all_res.partition_date,
    view_all_res.partition_id,
    view_all_res.res_deleted_at,
    view_all_res.res_version,
    view_all_res.has_tags,
    view_all_res.res_published,
    view_all_res.res_updated,
    view_all_res.res_encoding,
    view_all_res.res_id,
    view_all_res.res_type,
    view_all_res.res_ver,
    view_all_res.res_text_vc::jsonb AS res_jsonb
FROM
    view_all_resources view_all_res
WHERE
    view_all_res.res_type::text = 'Organization'::text;