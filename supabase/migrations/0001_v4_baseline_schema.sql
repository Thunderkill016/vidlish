-- Create v4_user_states table to store V4 Engine's Memory State
CREATE TABLE public.v4_user_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    storage_revision INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.v4_user_states ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own state"
    ON public.v4_user_states FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own state"
    ON public.v4_user_states FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own state"
    ON public.v4_user_states FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_v4_user_states_updated_at
    BEFORE UPDATE ON public.v4_user_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
