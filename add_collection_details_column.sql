-- Add collection_details column to route_stops table
-- This will store the complete collection form data including waste types, bags count, signatures, etc.

ALTER TABLE route_stops 
ADD COLUMN IF NOT EXISTS collection_details JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN route_stops.collection_details IS 'Stores complete collection form data including waste types, bags count, signatures, notes, and timestamps';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_route_stops_collection_details ON route_stops USING GIN (collection_details);
