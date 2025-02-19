import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";

// 環境変数の読み込み
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// データベース接続
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ユーザー登録
app.post("/signup", async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username, email, hashedPassword]
    );

    const user = result.rows[0];
    res
      .status(201)
      .json({ id: user.id, username: user.username, email: user.email });
  } catch (error) {
    res.status(500).json({ message: "Error signing up user", error });
  }
});

// ログイン
app.post("/signin", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error signing in", error });
  }
});

// 認証ミドルウェア
const authenticateJWT = (
  req: Request,
  res: Response,
  next: express.NextFunction
): void => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access denied. No token provided." });
    return;
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your_jwt_secret",
    (err, decoded) => {
      if (err) {
        res.status(403).json({ message: "Invalid token" });
        return;
      }

      req.user = decoded as { userId: string; username: string };

      next();
    }
  );
};

// タスクの取得
app.get("/tasks", authenticateJWT, async (req, res) => {
  const { userId } = req.user as { userId: string }; // リクエストにユーザーIDを含めておく

  try {
    const result = await pool.query("SELECT * FROM tasks WHERE user_id = $1", [
      userId,
    ]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching tasks", err });
  }
});

// タスクの追加
app.post("/tasks", authenticateJWT, async (req, res) => {
  const { title, description } = req.body;
  const { userId } = req.user as { userId: string }; // リクエストにユーザーIDを含めておく

  try {
    const result = await pool.query(
      "INSERT INTO tasks (user_id, title, description) VALUES ($1, $2, $3) RETURNING id, title, description, completed",
      [userId, title, description]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error insert task", err });
  }
});

// タスクの削除
app.delete(
  "/tasks/:id",
  authenticateJWT,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { userId } = req.user as { userId: string };

    try {
      const result = await pool.query(
        "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ message: "Task not found or unauthorized" });
        return;
      }

      res.json({
        message: "Task deleted successfully",
        deletedTask: result.rows[0],
      });
    } catch (err) {
      res.status(500).json({ message: "Error delete task", err });
    }
  }
);

// TODO: タスクの更新
app.put("/tasks/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user as { userId: string };

  try {
    // 現在のタスクのステータスを取得
    const result = await pool.query(
      "SELECT completed FROM tasks WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    // 現在のタスクのステータスを反転
    const newCompleted = !result.rows[0].completed;

    await pool.query(
      "UPDATE tasks SET completed = $1 WHERE id = $2 AND user_id = $3",
      [newCompleted, id, userId]
    );
    res.json({ message: "Task updated successfully", completed: newCompleted });
  } catch (err) {
    res.status(500).json({ message: "Error updating task", err });
  }
});

// 認証が必要なルート
app.get("/protected", authenticateJWT, (req, res) => {
  res.send("This is a protected route");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
