-- Create sensor_readings table
create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  soil_moisture integer,
  temperature decimal(5,2),
  humidity decimal(5,2),
  light integer,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.sensor_readings enable row level security;

-- RLS Policies for sensor_readings
create policy "Users can view their own sensor readings"
  on public.sensor_readings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sensor readings"
  on public.sensor_readings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sensor readings"
  on public.sensor_readings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sensor readings"
  on public.sensor_readings for delete
  using (auth.uid() = user_id);

-- Create indexes for faster queries
create index if not exists sensor_readings_plant_id_idx on public.sensor_readings(plant_id);
create index if not exists sensor_readings_user_id_idx on public.sensor_readings(user_id);
create index if not exists sensor_readings_timestamp_idx on public.sensor_readings(timestamp desc);
