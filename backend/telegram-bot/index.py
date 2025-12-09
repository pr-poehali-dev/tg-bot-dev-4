import json
import os
import psycopg2
from typing import Dict, Any, Optional

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_or_create_user(telegram_id: int, username: Optional[str], first_name: Optional[str]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, telegram_id, username, first_name, coins, level, xp, xp_to_next_level, achievements_count FROM users WHERE telegram_id = %s",
        (telegram_id,)
    )
    user = cursor.fetchone()
    
    if user:
        cursor.execute(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE telegram_id = %s",
            (telegram_id,)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            'id': user[0],
            'telegram_id': user[1],
            'username': user[2],
            'first_name': user[3],
            'coins': user[4],
            'level': user[5],
            'xp': user[6],
            'xp_to_next_level': user[7],
            'achievements_count': user[8]
        }
    else:
        cursor.execute(
            "INSERT INTO users (telegram_id, username, first_name) VALUES (%s, %s, %s) RETURNING id, telegram_id, username, first_name, coins, level, xp, xp_to_next_level, achievements_count",
            (telegram_id, username, first_name)
        )
        new_user = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            'id': new_user[0],
            'telegram_id': new_user[1],
            'username': new_user[2],
            'first_name': new_user[3],
            'coins': new_user[4],
            'level': new_user[5],
            'xp': new_user[6],
            'xp_to_next_level': new_user[7],
            'achievements_count': new_user[8]
        }

def send_telegram_message(chat_id: int, text: str, reply_markup: Optional[Dict] = None):
    import urllib.request
    import urllib.parse
    
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        return
    
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    
    data = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'HTML'
    }
    
    if reply_markup:
        data['reply_markup'] = json.dumps(reply_markup)
    
    request = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        urllib.request.urlopen(request)
    except Exception as e:
        print(f"Error sending message: {e}")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        try:
            body_str = event.get('body', '{}')
            update = json.loads(body_str)
            
            if 'message' in update:
                message = update['message']
                chat_id = message['chat']['id']
                text = message.get('text', '')
                
                telegram_id = message['from']['id']
                username = message['from'].get('username')
                first_name = message['from'].get('first_name')
                
                user = get_or_create_user(telegram_id, username, first_name)
                
                if text == '/start':
                    webapp_url = os.environ.get('WEBAPP_URL', 'https://your-webapp-url.com')
                    
                    reply_markup = {
                        'inline_keyboard': [[
                            {
                                'text': '🎮 Открыть Game Bot',
                                'web_app': {'url': webapp_url}
                            }
                        ]]
                    }
                    
                    welcome_text = f"""👋 Привет, <b>{first_name}</b>!

Добро пожаловать в Game Bot! 🎮

💰 Твой баланс: {user['coins']} монет
📊 Уровень: {user['level']}
🏆 Достижений: {user['achievements_count']}

Нажми кнопку ниже, чтобы начать играть!"""
                    
                    send_telegram_message(chat_id, welcome_text, reply_markup)
                
                elif text == '/stats':
                    stats_text = f"""📊 <b>Твоя статистика</b>

💰 Монет: {user['coins']}
📈 Уровень: {user['level']}
⚡ Опыт: {user['xp']}/{user['xp_to_next_level']}
🏆 Достижений: {user['achievements_count']}"""
                    
                    send_telegram_message(chat_id, stats_text)
                
                elif text == '/help':
                    help_text = """❓ <b>Доступные команды:</b>

/start - Открыть игру
/stats - Твоя статистика
/help - Помощь

🎮 <b>Что можно делать:</b>
• Играть в мини-игры
• Выполнять квесты
• Покупать предметы в магазине
• Соревноваться с другими игроками"""
                    
                    send_telegram_message(chat_id, help_text)
                
                else:
                    send_telegram_message(chat_id, "Используй /start чтобы открыть игру! 🎮")
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'ok': True}),
                'isBase64Encoded': False
            }
        
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': str(e)}),
                'isBase64Encoded': False
            }
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
