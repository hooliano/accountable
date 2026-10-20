import bcrypt from "bcrypt";
import prisma from "../../lib/prisma.js";

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    // Check for existing username/email
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username }] },
    });
    if (existing) {
      return res.status(409).json({ error: "Username or email already in use." });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { username, email: email.toLowerCase(), passwordHash },
      select: { id: true, username: true, email: true, role: true, createdAt: true },
    });

    return res.status(201).json({ user });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}