-- Add generated PDF URL column to lab_reports
alter table public.lab_reports
add column if not exists generated_pdf_url text;

-- Create index for generated reports
create index if not exists lab_reports_generated_pdf_idx
on public.lab_reports (generated_pdf_url)
where generated_pdf_url is not null;
