-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (Mirroring Auth or Standalone)
create table public.users (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  role text not null check (role in ('STUDENT', 'LECTURER')),
  identifier text not null, -- NIP or NPM
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Lecturers Table
create table public.lecturers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  nip text not null,
  specialization text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Thesis Registrations (Proposals)
create table public.thesis_registrations (
  id uuid default uuid_generate_v4() primary key,
  student_id text not null, -- Linking to User ID or Identifier
  student_name text not null,
  title text not null,
  advisor1_id text, -- Linking to Lecturer ID
  advisor2_id text,
  status text not null default 'Draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Seminars (Proposal & Hasil)
create table public.seminars (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('PROPOSAL', 'HASIL')),
  student_id text not null,
  student_name text not null,
  title text not null,
  file_report_url text, -- Store URL/Path from Storage
  advisor1_id text,
  advisor2_id text,
  examiner1_id text,
  examiner2_id text,
  scheduled_date date,
  scheduled_time time,
  scheduled_room text,
  status text not null default 'Draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Thesis Defenses (Sidang)
create table public.thesis_defenses (
  id uuid default uuid_generate_v4() primary key,
  thesis_id text not null, -- Link to Thesis Registration
  student_id text not null,
  student_name text not null,
  file_fixed_url text,
  file_plagiarism_url text,
  file_transcript_url text,
  sks_count int,
  admin_requirements_met boolean default false,
  examiner1_id text,
  examiner2_id text,
  defense_date date,
  defense_time time,
  defense_room text,
  letter_number text,
  status text not null default 'Draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Internships (Magang)
create table public.internships (
  id uuid default uuid_generate_v4() primary key,
  student_id text not null,
  student_name text not null,
  company_name text not null,
  advisor_id text,
  status text not null default 'Draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Notifications
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id text not null,
  subject text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) - For now, allow public access for simplicity
-- In production, you should lock this down.
alter table public.users enable row level security;
alter table public.lecturers enable row level security;
alter table public.thesis_registrations enable row level security;
alter table public.seminars enable row level security;
alter table public.thesis_defenses enable row level security;
alter table public.internships enable row level security;
alter table public.notifications enable row level security;

-- Create Policies (Allow All for Demo)
create policy "Allow public read/write users" on public.users for all using (true);
create policy "Allow public read/write lecturers" on public.lecturers for all using (true);
create policy "Allow public read/write thesis" on public.thesis_registrations for all using (true);
create policy "Allow public read/write seminars" on public.seminars for all using (true);
create policy "Allow public read/write defenses" on public.thesis_defenses for all using (true);
create policy "Allow public read/write internships" on public.internships for all using (true);
create policy "Allow public read/write notifications" on public.notifications for all using (true);

-- Insert Mock Data (Lecturers)
insert into public.lecturers (name, nip, specialization) values
('Dr. Budi Santoso', '198001012005011001', 'AI & Data Science'),
('Prof. Siti Aminah', '197505052000122001', 'Software Engineering'),
('Dr. Joko Widodo', '198203032008041002', 'Cyber Security'),
('Ratna Sari, M.Kom', '199012122015032005', 'IoT');
