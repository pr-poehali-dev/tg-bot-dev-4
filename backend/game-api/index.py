import json
import os
import psycopg2
from typing import Dict, Any, Optional

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    telegram_user_id = headers.get('X-Telegram-User-Id') or headers.get('x-telegram-user-id')
    
    if not telegram_user_id:
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Unauthorized: X-Telegram-User-Id header required'}),
            'isBase64Encoded': False
        }
    
    try:
        telegram_user_id = int(telegram_user_id)
    except ValueError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid telegram user id'}),
            'isBase64Encoded': False
        }
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            action = query_params.get('action', 'user')
            
            if action == 'user':
                cursor.execute(
                    "SELECT id, telegram_id, username, first_name, coins, level, xp, xp_to_next_level, achievements_count FROM users WHERE telegram_id = %s",
                    (telegram_user_id,)
                )
                user = cursor.fetchone()
                
                if not user:
                    cursor.close()
                    conn.close()
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'User not found'}),
                        'isBase64Encoded': False
                    }
                
                user_data = {
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
                
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps(user_data),
                    'isBase64Encoded': False
                }
            
            elif action == 'leaderboard':
                cursor.execute(
                    "SELECT username, first_name, coins, level FROM users ORDER BY coins DESC LIMIT 10"
                )
                leaders = cursor.fetchall()
                
                leaderboard = []
                for idx, leader in enumerate(leaders, 1):
                    leaderboard.append({
                        'rank': idx,
                        'name': leader[0] or leader[1] or 'Anonymous',
                        'coins': leader[2],
                        'level': leader[3]
                    })
                
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'leaderboard': leaderboard}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_str = event.get('body', '{}')
            body_data = json.loads(body_str)
            action = body_data.get('action')
            
            cursor.execute("SELECT id FROM users WHERE telegram_id = %s", (telegram_user_id,))
            user_result = cursor.fetchone()
            
            if not user_result:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'User not found'}),
                    'isBase64Encoded': False
                }
            
            user_id = user_result[0]
            
            if action == 'play_game':
                game_name = body_data.get('game_name')
                coins_earned = body_data.get('coins_earned', 0)
                xp_earned = body_data.get('xp_earned', 0)
                
                cursor.execute(
                    "INSERT INTO game_history (user_id, game_name, coins_earned, xp_earned) VALUES (%s, %s, %s, %s)",
                    (user_id, game_name, coins_earned, xp_earned)
                )
                
                cursor.execute(
                    "UPDATE users SET coins = coins + %s, xp = xp + %s WHERE id = %s",
                    (coins_earned, xp_earned, user_id)
                )
                
                cursor.execute(
                    "SELECT coins, xp, xp_to_next_level, level FROM users WHERE id = %s",
                    (user_id,)
                )
                updated_user = cursor.fetchone()
                
                new_level = updated_user[3]
                if updated_user[1] >= updated_user[2]:
                    new_level = updated_user[3] + 1
                    new_xp = updated_user[1] - updated_user[2]
                    new_xp_to_next = int(updated_user[2] * 1.5)
                    
                    cursor.execute(
                        "UPDATE users SET level = %s, xp = %s, xp_to_next_level = %s WHERE id = %s",
                        (new_level, new_xp, new_xp_to_next, user_id)
                    )
                
                conn.commit()
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'success': True,
                        'coins': updated_user[0] + coins_earned,
                        'level': new_level
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'buy_item':
                item_name = body_data.get('item_name')
                item_price = body_data.get('item_price', 0)
                
                cursor.execute("SELECT coins FROM users WHERE id = %s", (user_id,))
                user_coins = cursor.fetchone()[0]
                
                if user_coins < item_price:
                    cursor.close()
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Not enough coins'}),
                        'isBase64Encoded': False
                    }
                
                cursor.execute(
                    "UPDATE users SET coins = coins - %s WHERE id = %s",
                    (item_price, user_id)
                )
                
                cursor.execute(
                    "INSERT INTO shop_purchases (user_id, item_name, item_price) VALUES (%s, %s, %s)",
                    (user_id, item_name, item_price)
                )
                
                conn.commit()
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'success': True,
                        'coins': user_coins - item_price
                    }),
                    'isBase64Encoded': False
                }
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid request'}),
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
