-- Create these tables in the project's SQL Editor. Each release is an immutable snapshot.
create table public.smalltalk_vocabulary (
  release text not null,
  position integer not null check (position >= 0),
  id text not null check (id ~ '^[a-z0-9][a-z0-9_-]*$'),
  word text not null check (word ~ '^[A-Za-z]+$'),
  meaning text not null,
  example text not null,
  translation text not null,
  major text not null check (major in ('common', 'computer', 'business', 'health', 'engineering', 'humanities')),
  difficulty text not null check (difficulty in ('basic', 'intermediate', 'advanced')),
  primary key (release, id),
  unique (release, position)
);

create unique index smalltalk_vocabulary_word_key
  on public.smalltalk_vocabulary (release, major, lower(word));

create table public.smalltalk_phrases (
  release text not null,
  position integer not null check (position >= 0),
  difficulty text not null check (difficulty in ('basic', 'intermediate', 'advanced')),
  english text not null,
  korean text not null,
  context text not null,
  primary key (release, position),
  unique (release, difficulty, english)
);

alter table public.smalltalk_vocabulary enable row level security;
alter table public.smalltalk_phrases enable row level security;
revoke all on public.smalltalk_vocabulary, public.smalltalk_phrases from anon, authenticated;
grant select on public.smalltalk_vocabulary, public.smalltalk_phrases to service_role;
