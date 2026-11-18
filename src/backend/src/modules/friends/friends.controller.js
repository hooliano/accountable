import prisma from "../../lib/prisma.js";

const PUBLIC_USER = { id: true, username: true };

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function findRelation(a, b) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

export async function areFriends(a, b) {
  const relation = await findRelation(a, b);
  return relation?.status === "ACCEPTED";
}

export async function sendRequest(req, res) {
  try {
    const me = req.user.id;
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    const target = await prisma.user.findUnique({ where: { username }, select: PUBLIC_USER });
    if (!target) return res.status(404).json({ error: "User not found." });
    if (target.id === me) return res.status(400).json({ error: "You can't friend yourself." });

    const existing = await findRelation(me, target.id);
    if (existing) {
      if (existing.status === "ACCEPTED") {
        return res.status(409).json({ error: "You're already friends." });
      }
      if (existing.requesterId === me) {
        return res.status(409).json({ error: "Friend request already sent." });
      }
      await prisma.friendship.update({
        where: { requesterId_addresseeId: { requesterId: target.id, addresseeId: me } },
        data: { status: "ACCEPTED" },
      });
      return res.json({ message: `You and ${target.username} are now friends.` });
    }

    await prisma.friendship.create({ data: { requesterId: me, addresseeId: target.id } });
    return res.status(201).json({ message: "Friend request sent." });
  } catch (err) {
    console.error("Send request error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

export async function listRequests(req, res) {
  try {
    const me = req.user.id;
    const [incoming, outgoing] = await Promise.all([
      prisma.friendship.findMany({
        where: { addresseeId: me, status: "PENDING" },
        include: { requester: { select: PUBLIC_USER } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.friendship.findMany({
        where: { requesterId: me, status: "PENDING" },
        include: { addressee: { select: PUBLIC_USER } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.json({
      incoming: incoming.map((f) => ({ user: f.requester, sentAt: f.createdAt })),
      outgoing: outgoing.map((f) => ({ user: f.addressee, sentAt: f.createdAt })),
    });
  } catch (err) {
    console.error("List requests error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}