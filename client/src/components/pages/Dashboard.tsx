import { useAuth } from "../../AuthContext";
import { Tasks } from "../Tasks";

export const Dashboard = () => {
  const { logout } = useAuth();

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">ダッシュボード</h1>
      <Tasks />
      <button onClick={logout} className="bg-red-500 text-white p-2 mt-4">
        ログアウト
      </button>
    </div>
  );
};
