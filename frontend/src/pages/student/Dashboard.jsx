import { Progress, Card, Avatar, Tooltip, Badge } from "antd";
import { TrophyOutlined } from "@ant-design/icons";

export default function StudentDashboard() {
  const xp = 320;
  const nextLevelXP = 500;
  const level = 3;

  const minigames = [
    { name: "Sentence Builder", icon: "🧱" },
    { name: "Number Race", icon: "🏁" },
    { name: "Logic Puzzles", icon: "🧠" },
    { name: "Fact Checker", icon: "🔍" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Welcome, Explorer!</h1>
        <span className="text-sm text-gray-500 mt-2 sm:mt-0">Level {level}</span>
      </div>

      {/* XP Progress */}
      <Card className="rounded-xl">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Avatar size={64} src="https://i.pravatar.cc/100?img=5" />
          <div className="w-full">
            <p className="font-semibold text-center sm:text-left">Kibundo says: "Great work! 💪"</p>
            <Progress
              percent={Math.round((xp / nextLevelXP) * 100)}
              status="active"
              showInfo={false}
              strokeColor="#00b96b"
              className="my-2"
            />
            <p className="text-xs text-gray-500 text-center sm:text-left">{xp}/{nextLevelXP} XP</p>
          </div>
        </div>
      </Card>

      {/* Homework & Games */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="📚 Homework Assistant" className="rounded-xl">
          <p className="text-sm mb-3">Scan your homework and get step-by-step help!</p>
          <button className="bg-blue-600 text-white w-full py-2 rounded-md hover:bg-blue-700 transition">
            Scan Homework
          </button>
        </Card>

        <Card title="🎮 Play Minigames" className="rounded-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {minigames.map((game) => (
              <div
                key={game.name}
                className="bg-purple-100 p-3 rounded-md flex flex-col items-center justify-center text-sm"
              >
                <span className="text-xl">{game.icon}</span>
                <span className="mt-1">{game.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Badges */}
      <Card title="🏅 Badges & Rewards" className="rounded-xl">
        <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
          <Tooltip title="100 Questions Solved">
            <Badge count={<TrophyOutlined />} offset={[5, -5]}>
              <Avatar shape="square" size={64} src="/badge1.png" />
            </Badge>
          </Tooltip>
          <Tooltip title="Logic Master">
            <Avatar shape="square" size={64} src="/badge2.png" />
          </Tooltip>
        </div>
      </Card>
    </div>
  );
}
