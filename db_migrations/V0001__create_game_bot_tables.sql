CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    coins INTEGER DEFAULT 1250,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    xp_to_next_level INTEGER DEFAULT 100,
    achievements_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quests (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    quest_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reward INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    target INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_purchases (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    item_name VARCHAR(255) NOT NULL,
    item_price INTEGER NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_history (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    game_name VARCHAR(100) NOT NULL,
    coins_earned INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_quests_user_id ON quests(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_user_id ON shop_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history(user_id);