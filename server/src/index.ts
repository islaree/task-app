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

// 認証が必要なルート
app.get("/protected", authenticateJWT, (req, res) => {
  res.send("This is a protected route");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
