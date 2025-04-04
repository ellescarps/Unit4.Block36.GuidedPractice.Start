require("dotenv").config();
const express = require("express");
const {
  client,
  createTables,
  createUser,
  createSkill,
  fetchUsers,
  fetchSkills,
  createUserSkill,
  fetchUserSkills,
  deleteUserSkill,
  authenticate,
  findUserByToken,
} = require("./db");

const app = express();
app.use(express.json());

// Middleware: Checks if user is logged in and sets req.user
const isLoggedIn = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      throw new Error("Authorization token required");
    }
    req.user = await findUserByToken(req.headers.authorization);
    next();
  } catch (ex) {
    next({ status: 401, message: "Not authorized" });
  }
};

// User login route
app.post("/api/auth/login", async (req, res, next) => {
  try {
    res.send(await authenticate(req.body));
  } catch (ex) {
    next(ex);
  }
});

// Fetch logged-in user info
app.get("/api/auth/me", isLoggedIn, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

// Fetch all skills
app.get("/api/skills", async (req, res, next) => {
  try {
    res.send(await fetchSkills());
  } catch (ex) {
    next(ex);
  }
});

// Fetch all users
app.get("/api/users", async (req, res, next) => {
  try {
    res.send(await fetchUsers());
  } catch (ex) {
    next(ex);
  }
});

// Fetch a user's skills (only if logged-in user matches requested user)
app.get("/api/users/:id/userSkills", isLoggedIn, async (req, res, next) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).send({ error: "Access denied" });
    }
    res.send(await fetchUserSkills(req.params.id));
  } catch (ex) {
    next(ex);
  }
});

// Delete a user's skill (only if logged-in user matches)
app.delete("/api/users/:userId/userSkills/:id", isLoggedIn, async (req, res, next) => {
  try {
    if (req.params.userId !== req.user.id) {
      return res.status(403).send({ error: "Access denied" });
    }
    await deleteUserSkill({ user_id: req.params.userId, id: req.params.id });
    res.sendStatus(204);
  } catch (ex) {
    next(ex);
  }
});

// Add a skill to a user (only if logged-in user matches)
app.post("/api/users/:id/userSkills", isLoggedIn, async (req, res, next) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).send({ error: "Access denied" });
    }
    const newUserSkill = await createUserSkill({
      user_id: req.params.id,
      skill_id: req.body.skill_id,
    });
    res.status(201).send(newUserSkill);
  } catch (ex) {
    next(ex);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).send({ error: err.message || "Internal Server Error" });
});

// Initialize and seed the database
const init = async () => {
  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected!");

    console.log("Creating tables...");
    await createTables();
    console.log("Tables created!");

    const [logan, chase, lincoln, boots, running, barking, dogTricks, meowing] =
      await Promise.all([
        createUser({ username: "logan", password: "password1" }),
        createUser({ username: "chase", password: "password2" }),
        createUser({ username: "lincoln", password: "password3" }),
        createUser({ username: "boots", password: "password4" }),
        createSkill({ name: "running" }),
        createSkill({ name: "barking" }),
        createSkill({ name: "dogTricks" }),
        createSkill({ name: "meowing" }),
      ]);

    console.log("Users:", await fetchUsers());
    console.log("Skills:", await fetchSkills());

    const userSkills = await Promise.all([
      createUserSkill({ user_id: logan.id, skill_id: running.id }),
      createUserSkill({ user_id: logan.id, skill_id: dogTricks.id }),
      createUserSkill({ user_id: chase.id, skill_id: running.id }),
      createUserSkill({ user_id: chase.id, skill_id: barking.id }),
      createUserSkill({ user_id: chase.id, skill_id: meowing.id }),
      createUserSkill({ user_id: lincoln.id, skill_id: barking.id }),
      createUserSkill({ user_id: lincoln.id, skill_id: dogTricks.id }),
      createUserSkill({ user_id: boots.id, skill_id: meowing.id }),
    ]);

    console.log("Chase's skills before deletion:", await fetchUserSkills(chase.id));
    await deleteUserSkill({ user_id: chase.id, id: userSkills[4].id });
    console.log("Chase's skills after deletion:", await fetchUserSkills(chase.id));

    console.log("Data seeded successfully!");

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
  } catch (error) {
    console.error("Initialization failed:", error);
  }
};

// Start the server
init();
