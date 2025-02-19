import { useState } from "react";
import { useAuth } from "../AuthContext";

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const signin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5001/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        throw new Error(data.message || "ログインに失敗しました");
      }

      login(data.token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={signin} className="flex flex-col gap-4">
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex flex-col">
        <label htmlFor="email">email</label>
        <input
          id="email"
          type="email"
          value={email}
          placeholder="メールアドレスを入力してください"
          className="border border-gray-200 rounded"
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="password">password</label>
        <input
          id="password"
          type="password"
          value={password}
          placeholder="パスワードを入力してください"
          className="border border-gray-200 rounded"
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="bg-black text-white text-sm p-2">
        signin
      </button>
    </form>
  );
};
