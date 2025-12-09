const API_URL = 'https://functions.poehali.dev/6cbe4687-ddf3-4e90-9936-9257c143fc29';

function getTelegramUserId(): string | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const initDataUnsafe = window.Telegram.WebApp.initDataUnsafe;
    return initDataUnsafe?.user?.id?.toString() || null;
  }
  return '123456789';
}

async function apiRequest(method: string, params?: any, body?: any) {
  const telegramUserId = getTelegramUserId();
  
  if (!telegramUserId) {
    throw new Error('Telegram user ID not found');
  }

  const url = new URL(API_URL);
  if (params) {
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-User-Id': telegramUserId,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

export async function getUserData() {
  return apiRequest('GET', { action: 'user' });
}

export async function getLeaderboard() {
  const data = await apiRequest('GET', { action: 'leaderboard' });
  return data.leaderboard;
}

export async function playGame(gameName: string, coinsEarned: number, xpEarned: number) {
  return apiRequest('POST', null, {
    action: 'play_game',
    game_name: gameName,
    coins_earned: coinsEarned,
    xp_earned: xpEarned,
  });
}

export async function buyItem(itemName: string, itemPrice: number) {
  return apiRequest('POST', null, {
    action: 'buy_item',
    item_name: itemName,
    item_price: itemPrice,
  });
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initDataUnsafe: {
          user?: {
            id: number;
            username?: string;
            first_name?: string;
          };
        };
        ready: () => void;
        expand: () => void;
      };
    };
  }
}
