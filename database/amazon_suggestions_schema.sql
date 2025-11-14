-- Amazon product suggestions for shopping list items
CREATE TABLE IF NOT EXISTS amazon_suggestions (
    id SERIAL PRIMARY KEY,
    shopping_item_id INTEGER NOT NULL REFERENCES shopping_list(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amazon_url TEXT NOT NULL,
    product_title TEXT,
    product_image_url TEXT,
    product_price TEXT,
    asin VARCHAR(20),
    suggested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vote_count INTEGER DEFAULT 0,
    UNIQUE(shopping_item_id, asin)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_amazon_suggestions_shopping_item ON amazon_suggestions(shopping_item_id);
CREATE INDEX IF NOT EXISTS idx_amazon_suggestions_user ON amazon_suggestions(user_id);
