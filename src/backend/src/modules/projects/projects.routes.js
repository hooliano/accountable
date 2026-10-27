import { Router } from "express";
import prisma from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
router.use(requireAuth);
const person = { id: true, username: true };
const statuses = ["TODO", "IN_PROGRESS", "DONE"];
const taskInclude = {
  assignee: { select: person },
  createdBy: { select: person },
};
function visibleTo(user) {
  if (user.role === "ADMIN") {
    return {};
  }

  return {
    OR: [
      { ownerId: user.id },
      { collaborators: { some: { userId: user.id } } },
    ],
  };
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;

  return error;
}

function id(value) {
  const number = Number(value);

  if (!Number.isSafeInteger(number) || number < 1) {
    throw fail(400, "Invalid ID.");
  }

  return number;
}

function text(value, field, required = false) {
  if (value == null && !required) {
    return null;
  }

  if (
    typeof value !== "string" ||
    (required && !value.trim()) ||
    value.length > (required ? 200 : 10000)
  ) {
    throw fail(
      400,
      `${field} must be ${required ? "1–200" : "at most 10000"} characters.`,
    );
  }

  return value.trim() || null;
}

function date(value) {
  if (value == null || value === "") {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw fail(400, "Invalid due date.");
  }

  const parsed = new Date(value);

  if (parsed.toISOString().slice(0, 10) !== value.slice(0, 10)) {
    throw fail(400, "Invalid due date.");
  }

  return parsed;
}

function projectData(body, partial = false) {
  const data = {};

  if (!partial || "name" in body) {
    data.name = text(body.name, "Project name", true);
  }

  if (!partial || "description" in body) {
    data.description = text(body.description, "Description");
  }

  if (!partial || "dueDate" in body) {
    data.dueDate = date(body.dueDate);
  }

  return data;
}

async function projectAccess(req, mode = "read") {
  const project = await prisma.project.findFirst({
    where: { id: id(req.params.projectId), ...visibleTo(req.user) },
    include: {
      collaborators: { include: { user: { select: person } } },
      owner: { select: person },
    },
  });

  if (!project) {
    throw fail(404, "Project not found.");
  }

  const manages = project.ownerId === req.user.id || req.user.role === "ADMIN";
  const edits =
    manages ||
    project.collaborators.some(
      (c) => c.userId === req.user.id && c.permission === "EDITOR",
    );

  if ((mode === "manage" && !manages) || (mode === "edit" && !edits)) {
    throw fail(403, "You do not have permission to make this change.");
  }

  return { ...project, canManage: manages, canEdit: edits };
}

async function taskData(body, project, partial = false) {
  const data = {};

  if (!partial || "title" in body) {
    data.title = text(body.title, "Task title", true);
  }

  if (!partial || "description" in body) {
    data.description = text(body.description, "Description");
  }

  if (!partial || "dueDate" in body) {
    data.dueDate = date(body.dueDate);
  }

  if ("status" in body) {
    if (!statuses.includes(body.status)) {
      throw fail(400, "Invalid task status.");
    }

    data.status = body.status;
  }

  if ("assigneeId" in body) {
    data.assigneeId =
      body.assigneeId == null || body.assigneeId === ""
        ? null
        : id(body.assigneeId);

    if (
      data.assigneeId !== null &&
      data.assigneeId !== project.ownerId &&
      !project.collaborators.some((c) => c.userId === data.assigneeId)
    ) {
      throw fail(400, "Assign tasks to the project owner or a collaborator.");
    }
  }

  return data;
}

router.use((req, res, next) => {
  if (
    ["POST", "PATCH", "PUT"].includes(req.method) &&
    (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
  ) {
    return res.status(400).json({ error: "A JSON object is required." });
  }

  next();
});

router.get("/", async (req, res) => {
  const projects = await prisma.project.findMany({
    where: visibleTo(req.user),
    orderBy: { updatedAt: "desc" },
    include: {
      owner: { select: person },
      _count: { select: { tasks: true, collaborators: true } },
    },
  });
  res.json({ projects });
});

router.post("/", async (req, res) => {
  const project = await prisma.project.create({
    data: { ...projectData(req.body), ownerId: req.user.id },
  });
  res.status(201).json({ project });
});

router.get("/:projectId", async (req, res) => {
  const project = await projectAccess(req);
  const tasks = await prisma.task.findMany({
    where: { projectId: project.id },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: taskInclude,
  });
  res.json({ project: { ...project, tasks } });
});

router.patch("/:projectId", async (req, res) => {
  const project = await projectAccess(req, "manage");
  res.json({
    project: await prisma.project.update({
      where: { id: project.id },
      data: projectData(req.body, true),
    }),
  });
});

router.delete("/:projectId", async (req, res) => {
  const project = await projectAccess(req, "manage");
  await prisma.project.delete({ where: { id: project.id } });
  res.sendStatus(204);
});

router.post("/:projectId/collaborators", async (req, res) => {
  const project = await projectAccess(req, "manage");
  const username = text(req.body.username, "Username", true);
  const permission = req.body.permission ?? "VIEWER";

  if (!["VIEWER", "EDITOR"].includes(permission)) {
    throw fail(400, "Invalid permission.");
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: person,
  });

  if (!user) {
    throw fail(404, "No account found with that username.");
  }

  if (user.id === project.ownerId) {
    throw fail(400, "The owner already has full access.");
  }

  const collaborator = await prisma.projectCollaborator.upsert({
    where: { projectId_userId: { projectId: project.id, userId: user.id } },
    create: { projectId: project.id, userId: user.id, permission },
    update: { permission },
    include: { user: { select: person } },
  });
  res.json({ collaborator });
});

router.delete("/:projectId/collaborators/:userId", async (req, res) => {
  const project = await projectAccess(req, "manage");
  const userId = id(req.params.userId);
  await prisma.$transaction([
    prisma.task.updateMany({
      where: { projectId: project.id, assigneeId: userId },
      data: { assigneeId: null },
    }),
    prisma.projectCollaborator.deleteMany({
      where: { projectId: project.id, userId },
    }),
  ]);
  res.sendStatus(204);
});

router.post("/:projectId/tasks", async (req, res) => {
  const project = await projectAccess(req, "edit");
  const data = await taskData(req.body, project);
  const status = data.status ?? "TODO";
  const task = await prisma.$transaction(async (tx) => {
    const last = await tx.task.aggregate({
      where: { projectId: project.id, status },
      _max: { position: true },
    });

    return tx.task.create({
      data: {
        ...data,
        status,
        projectId: project.id,
        createdById: req.user.id,
        position: (last._max.position ?? -1) + 1,
        completedAt: status === "DONE" ? new Date() : null,
      },
      include: taskInclude,
    });
  });
  res.status(201).json({ task });
});

router.patch("/:projectId/tasks/:taskId", async (req, res) => {
  const project = await projectAccess(req, "edit");
  const taskId = id(req.params.taskId);
  const current = await prisma.task.findFirst({
    where: { id: taskId, projectId: project.id },
  });

  if (!current) {
    throw fail(404, "Task not found.");
  }

  const data = await taskData(req.body, project, true);

  if (data.status && data.status !== current.status) {
    data.completedAt = data.status === "DONE" ? new Date() : null;
  }

  if (
    "position" in req.body &&
    (!Number.isSafeInteger(req.body.position) || req.body.position < 0)
  ) {
    throw fail(400, "Position must be a nonnegative integer.");
  }

  const task = await prisma.$transaction(async (tx) => {
    const status = data.status ?? current.status;

    if ("position" in req.body || status !== current.status) {
      const siblings = await tx.task.findMany({
        where: { projectId: project.id, status, id: { not: taskId } },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      });
      const position = Math.min(
        req.body.position ?? siblings.length,
        siblings.length,
      );
      siblings.splice(position, 0, { id: taskId });
      for (const [index, sibling] of siblings.entries()) {
        if (sibling.id !== taskId) {
          await tx.task.update({
            where: { id: sibling.id },
            data: { position: index },
          });
        }
      }

      data.position = position;
    }

    return tx.task.update({
      where: { id: taskId },
      data,
      include: taskInclude,
    });
  });
  res.json({ task });
});

router.delete("/:projectId/tasks/:taskId", async (req, res) => {
  const project = await projectAccess(req, "edit");
  const result = await prisma.task.deleteMany({
    where: { id: id(req.params.taskId), projectId: project.id },
  });

  if (!result.count) {
    throw fail(404, "Task not found.");
  }

  res.sendStatus(204);
});

router.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found." });
  }

  console.error("Project API error:", err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

export default router;
