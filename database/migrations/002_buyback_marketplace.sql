-- =====================================================
-- Buy Back Marketplace Tables
-- =====================================================

-- Items for Sale
CREATE TABLE IF NOT EXISTS public.marketplace_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    condition TEXT CHECK (condition IN ('new', 'used', 'repair_needed')),
    price DECIMAL(10,2) NOT NULL,
    images JSONB,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'pending', 'sold', 'cancelled')),
    location JSONB,
    eco_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buy Back Orders
CREATE TABLE IF NOT EXISTS public.buyback_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.user_profiles(id),
    seller_id UUID REFERENCES public.user_profiles(id),
    price DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'collected', 'delivered', 'cancelled')),
    collection_time TIMESTAMP WITH TIME ZONE,
    delivery_status JSONB,
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Ratings
CREATE TABLE IF NOT EXISTS public.user_ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reviewer_id UUID REFERENCES public.user_profiles(id),
    reviewed_id UUID REFERENCES public.user_profiles(id),
    order_id UUID REFERENCES public.buyback_orders(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.buyback_orders(id),
    sender_id UUID REFERENCES public.user_profiles(id),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smart Bins
CREATE TABLE IF NOT EXISTS public.smart_bins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bin_id TEXT UNIQUE NOT NULL,
    location JSONB NOT NULL,
    bin_type TEXT[] CHECK (bin_type <@ ARRAY['biodegradable', 'recyclable', 'hazardous']),
    capacity INTEGER NOT NULL,
    current_fill_level INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    last_collection TIMESTAMP WITH TIME ZONE,
    next_collection TIMESTAMP WITH TIME ZONE,
    sensor_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bin Collections
CREATE TABLE IF NOT EXISTS public.bin_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bin_id UUID REFERENCES public.smart_bins(id),
    collector_id UUID REFERENCES public.user_profiles(id),
    collection_time TIMESTAMP WITH TIME ZONE,
    fill_level_at_collection INTEGER,
    waste_type TEXT[],
    weight DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_marketplace_items_category ON public.marketplace_items(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON public.marketplace_items(status);
CREATE INDEX IF NOT EXISTS idx_buyback_orders_status ON public.buyback_orders(status);
CREATE INDEX IF NOT EXISTS idx_smart_bins_status ON public.smart_bins(status);
CREATE INDEX IF NOT EXISTS idx_smart_bins_fill_level ON public.smart_bins(current_fill_level);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyback_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bin_collections ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace items
CREATE POLICY "Anyone can view available items" 
    ON public.marketplace_items FOR SELECT 
    USING (status = 'available');

CREATE POLICY "Users can create their own items" 
    ON public.marketplace_items FOR INSERT 
    TO authenticated 
    WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their own items" 
    ON public.marketplace_items FOR UPDATE 
    TO authenticated 
    USING (seller_id = auth.uid());

-- Policies for orders
CREATE POLICY "Users can view their orders" 
    ON public.buyback_orders FOR SELECT 
    TO authenticated 
    USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Policies for ratings
CREATE POLICY "Anyone can view ratings" 
    ON public.user_ratings FOR SELECT 
    TO authenticated 
    USING (true);

-- Policies for chat messages
CREATE POLICY "Users can view their chat messages" 
    ON public.chat_messages FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.buyback_orders 
            WHERE id = chat_messages.order_id 
            AND (buyer_id = auth.uid() OR seller_id = auth.uid())
        )
    );