import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { getUserData, getLeaderboard, playGame as apiPlayGame, buyItem as apiBuyItem } from '@/lib/api';

type GameSection = 'home' | 'games' | 'leaderboard' | 'achievements' | 'shop' | 'quests';

interface UserStats {
  coins: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  achievements: number;
  totalAchievements: number;
}

interface ShopItem {
  id: string;
  name: string;
  price: number;
  icon: string;
  description: string;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  completed: boolean;
}

const Index = () => {
  const [activeSection, setActiveSection] = useState<GameSection>('home');
  const [userStats, setUserStats] = useState<UserStats>({
    coins: 1250,
    level: 8,
    xp: 650,
    xpToNextLevel: 1000,
    achievements: 12,
    totalAchievements: 50,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    loadUserData();
    loadLeaderboard();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await getUserData();
      setUserStats({
        coins: data.coins,
        level: data.level,
        xp: data.xp,
        xpToNextLevel: data.xp_to_next_level,
        achievements: data.achievements_count,
        totalAchievements: 50,
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setIsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const [quests] = useState<Quest[]>([
    {
      id: '1',
      title: 'Игровой марафон',
      description: 'Сыграй 5 игр',
      reward: 100,
      progress: 3,
      target: 5,
      completed: false,
    },
    {
      id: '2',
      title: 'Коллекционер монет',
      description: 'Собери 1000 монет',
      reward: 250,
      progress: 750,
      target: 1000,
      completed: false,
    },
    {
      id: '3',
      title: 'Ежедневный вход',
      description: 'Заходи 7 дней подряд',
      reward: 500,
      progress: 4,
      target: 7,
      completed: false,
    },
  ]);

  const [shopItems] = useState<ShopItem[]>([
    { id: '1', name: 'Аватар Легенда', price: 500, icon: 'Crown', description: 'Эпический аватар' },
    { id: '2', name: 'Удвоитель XP', price: 800, icon: 'Zap', description: 'x2 опыт на 1 час' },
    { id: '3', name: 'Золотой сундук', price: 1000, icon: 'Gift', description: 'Случайная награда' },
    { id: '4', name: 'Редкая рамка', price: 350, icon: 'Award', description: 'Уникальная рамка профиля' },
  ]);

  const playGame = async (gameName: string, coinReward: number, xpReward: number) => {
    try {
      const result = await apiPlayGame(gameName, coinReward, xpReward);
      
      setUserStats(prev => ({
        ...prev,
        coins: result.coins,
        level: result.level,
        xp: prev.xp + xpReward >= prev.xpToNextLevel ? 0 : prev.xp + xpReward,
      }));
      
      toast.success(`🎮 ${gameName}`, {
        description: `+${coinReward} монет, +${xpReward} XP`,
      });
      
      await loadLeaderboard();
    } catch (error) {
      console.error('Error playing game:', error);
      toast.error('Ошибка при сохранении игры');
    }
  };

  const buyItem = async (item: ShopItem) => {
    if (userStats.coins >= item.price) {
      try {
        const result = await apiBuyItem(item.name, item.price);
        
        setUserStats(prev => ({ ...prev, coins: result.coins }));
        toast.success(`Куплено: ${item.name}! 🎉`);
      } catch (error) {
        console.error('Error buying item:', error);
        toast.error('Ошибка при покупке');
      }
    } else {
      toast.error('Недостаточно монет! 💰');
    }
  };

  const xpPercentage = (userStats.xp / userStats.xpToNextLevel) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🎮</div>
          <p className="text-xl text-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/20">
      <div className="container max-w-6xl mx-auto p-4 pb-24">
        <header className="mb-6 animate-fade-in">
          <Card className="gradient-game p-6 border-none shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center text-3xl border-4 border-white/20">
                  🎮
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Game Bot</h1>
                  <p className="text-white/80 text-sm">Играй и побеждай!</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-2">
                  <div className="gradient-gold rounded-full px-4 py-2 flex items-center gap-2 font-bold text-lg shadow-lg animate-pulse-glow">
                    <Icon name="Coins" size={20} />
                    {userStats.coins}
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm">
                  Уровень {userStats.level}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/90">
                <span>Опыт до уровня {userStats.level + 1}</span>
                <span className="font-bold">{userStats.xp}/{userStats.xpToNextLevel}</span>
              </div>
              <Progress value={xpPercentage} className="h-3 bg-white/20" />
            </div>
          </Card>
        </header>

        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="container max-w-6xl mx-auto px-2">
            <div className="flex justify-around items-center py-3">
              {[
                { id: 'home' as GameSection, icon: 'Home', label: 'Главная' },
                { id: 'games' as GameSection, icon: 'Gamepad2', label: 'Игры' },
                { id: 'quests' as GameSection, icon: 'Target', label: 'Квесты' },
                { id: 'shop' as GameSection, icon: 'ShoppingBag', label: 'Магазин' },
                { id: 'leaderboard' as GameSection, icon: 'Trophy', label: 'Топ' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                    activeSection === item.id
                      ? 'bg-primary text-primary-foreground scale-110'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name={item.icon} size={24} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="animate-scale-in">
          {activeSection === 'home' && (
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-br from-card to-muted border-primary/50">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Icon name="Star" className="text-yellow-400" />
                  Твой прогресс
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 rounded-xl p-4 border border-border">
                    <div className="text-3xl mb-2">🏆</div>
                    <div className="text-2xl font-bold text-primary">{userStats.achievements}</div>
                    <div className="text-sm text-muted-foreground">Достижений</div>
                  </div>
                  <div className="bg-background/50 rounded-xl p-4 border border-border">
                    <div className="text-3xl mb-2">📊</div>
                    <div className="text-2xl font-bold text-game-xp">Уровень {userStats.level}</div>
                    <div className="text-sm text-muted-foreground">Твой ранг</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Icon name="Sparkles" className="text-accent" />
                  Быстрый старт
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => setActiveSection('games')} className="h-20 gradient-game text-white font-bold">
                    <div className="flex flex-col items-center gap-1">
                      <Icon name="Gamepad2" size={24} />
                      Играть
                    </div>
                  </Button>
                  <Button onClick={() => setActiveSection('quests')} variant="secondary" className="h-20 font-bold">
                    <div className="flex flex-col items-center gap-1">
                      <Icon name="Target" size={24} />
                      Квесты
                    </div>
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'games' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Gamepad2" className="text-primary" />
                Выбери игру
              </h2>
              {[
                { name: 'Викторина', icon: '🧠', coins: 50, xp: 30, color: 'from-purple-600 to-pink-600' },
                { name: 'Угадай число', icon: '🎲', coins: 40, xp: 25, color: 'from-blue-600 to-cyan-600' },
                { name: 'Быстрые кнопки', icon: '⚡', coins: 60, xp: 35, color: 'from-orange-600 to-red-600' },
                { name: 'Пазлы', icon: '🧩', coins: 45, xp: 28, color: 'from-green-600 to-teal-600' },
              ].map((game, index) => (
                <Card key={index} className="overflow-hidden hover:scale-105 transition-transform">
                  <div className={`bg-gradient-to-r ${game.color} p-1`}>
                    <div className="bg-card p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-5xl">{game.icon}</div>
                          <div>
                            <h3 className="text-xl font-bold">{game.name}</h3>
                            <div className="flex gap-3 mt-2">
                              <Badge variant="secondary" className="gradient-gold text-background">
                                <Icon name="Coins" size={14} className="mr-1" />
                                +{game.coins}
                              </Badge>
                              <Badge className="bg-game-xp">
                                <Icon name="Zap" size={14} className="mr-1" />
                                +{game.xp} XP
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="lg"
                          onClick={() => playGame(game.name, game.coins, game.xp)}
                          className="gradient-game font-bold"
                        >
                          Играть
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeSection === 'quests' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Target" className="text-accent" />
                Ежедневные квесты
              </h2>
              {quests.map((quest) => (
                <Card key={quest.id} className="p-6 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{quest.title}</h3>
                      <p className="text-sm text-muted-foreground">{quest.description}</p>
                    </div>
                    <Badge className="gradient-gold text-background font-bold">
                      <Icon name="Coins" size={14} className="mr-1" />
                      {quest.reward}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Прогресс</span>
                      <span className="font-bold">{quest.progress}/{quest.target}</span>
                    </div>
                    <Progress value={(quest.progress / quest.target) * 100} className="h-2" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeSection === 'shop' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icon name="ShoppingBag" className="text-secondary" />
                Магазин
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shopItems.map((item) => (
                  <Card key={item.id} className="p-6 hover:scale-105 transition-transform">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                        <Icon name={item.icon} size={32} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="gradient-gold rounded-full px-3 py-1 font-bold text-background flex items-center gap-1">
                        <Icon name="Coins" size={16} />
                        {item.price}
                      </div>
                      <Button onClick={() => buyItem(item)} className="gradient-game">
                        Купить
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'leaderboard' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Trophy" className="text-yellow-400" />
                Таблица лидеров
              </h2>
              {(leaderboardData.length > 0 ? leaderboardData : [
                { rank: 1, name: 'Загрузка...', coins: 0, level: 1 },
              ]).map((player, index) => (
                <Card key={index} className={`p-6 ${index < 3 ? 'border-2 border-primary/50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${
                        player.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                        player.rank === 2 ? 'bg-gray-300 text-gray-800' :
                        player.rank === 3 ? 'bg-amber-600 text-amber-50' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {player.rank}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{player.name}</h3>
                        <p className="text-sm text-muted-foreground">Уровень {player.level}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="gradient-gold rounded-full px-4 py-2 inline-flex items-center gap-2 font-bold text-background">
                        <Icon name="Coins" size={18} />
                        {player.coins.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;