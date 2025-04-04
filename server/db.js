require("dotenv").config();
const pg = require("pg");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const client = new pg.Client(process.env.DATABASE_URL);
const JWT_SECRET = process.env.JWT; // Ensure this is set in your .env file

// Function to create tables
const createTables = async () => {
  const SQL = `
    DROP TABLE IF EXISTS user_skills;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS skills;

    CREATE TABLE users(
      id UUID PRIMARY KEY,
      username VARCHAR(20) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );

    CREATE TABLE skills(
      id UUID PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    );

    CREATE TABLE user_skills(
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) NOT NULL,
      skill_id UUID REFERENCES skills(id) NOT NULL,
      CONSTRAINT unique_user_id_skill_id UNIQUE (user_id, skill_id)
    );
  `;
  await client.query(SQL);
};

// Function to create a user with hashed password
const createUser = async ({ username, password }) => {
  const SQL = `
    INSERT INTO users(id, username, password) VALUES($1, $2, $3) RETURNING id, username
  `;
  const hashedPassword = await bcrypt.hash(password, 10); // More secure hashing rounds
  const response = await client.query(SQL, [uuid.v4(), username, hashedPassword]);
  return response.rows[0];
};

// Function to create a skill
const createSkill = async ({ name }) => {
  const SQL = `
    INSERT INTO skills(id, name) VALUES ($1, $2) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), name]);
  return response.rows[0];
};

// Function to authenticate user and generate a JWT
const authenticate = async ({ username, password }) => {
  const SQL = `
    SELECT id, password FROM users WHERE username = $1
  `;
  const response = await client.query(SQL, [username]);

  if (!response.rows.length) {
    throw new Error("User not found");
  }

  const user = response.rows[0];

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error("Invalid password");
  }

  // Generate JWT with expiration
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });

  return { token };
};

// Function to associate a user with a skill
const createUserSkill = async ({ user_id, skill_id }) => {
  const SQL = `
    INSERT INTO user_skills(id, user_id, skill_id) VALUES ($1, $2, $3) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), user_id, skill_id]);
  return response.rows[0];
};

// Fetch all users
const fetchUsers = async () => {
  const SQL = `SELECT id, username FROM users`;
  const response = await client.query(SQL);
  return response.rows;
};

// Fetch all skills
const fetchSkills = async () => {
  const SQL = `SELECT * FROM skills`;
  const response = await client.query(SQL);
  return response.rows;
};

// Fetch skills for a specific user
const fetchUserSkills = async (user_id) => {
  const SQL = `
    SELECT * FROM user_skills WHERE user_id = $1
  `;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
};

// Delete a user skill entry
const deleteUserSkill = async ({ user_id, id }) => {
  const SQL = `
    DELETE FROM user_skills WHERE user_id = $1 AND id = $2
  `;
  await client.query(SQL, [user_id, id]);
};

// Function to validate JWT and fetch user by token
const findUserByToken = async (token) => {
  let id;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    id = payload.id;
  } catch (ex) {
    throw new Error("Invalid or expired token");
  }

  const SQL = `
    SELECT id, username FROM users WHERE id = $1
  `;
  const response = await client.query(SQL, [id]);

  if (!response.rows.length) {
    throw new Error("User not found");
  }

  return response.rows[0];
};

module.exports = {
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
};
