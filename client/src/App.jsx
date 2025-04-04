import { useState, useEffect } from "react";

const Login = ({ login }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (ev) => {
    ev.preventDefault();
    login({ username, password });
  };
  return (
    <form onSubmit={submit}>
      <input
        value={username}
        onChange={(ev) => setUsername(ev.target.value)}
        placeholder="username"
      />
      <input
        type="password"
        value={password}
        onChange={(ev) => setPassword(ev.target.value)}
        placeholder="password"
      />
      <button>Login</button>
    </form>
  );
};

function App() {
  const [skills, setSkills] = useState([]);
  const [userSkills, setUserSkills] = useState([]);
  const [auth, setAuth] = useState({});

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    if (token) {
      attemptLoginWithToken();
    }
  }, []);

  useEffect(() => {
    const fetchSkills = async () => {
      const response = await fetch("/api/skills");
      const json = await response.json();
      if (response.ok) {
        setSkills(json);
      } else {
        console.log(json);
      }
    };
    fetchSkills();
  }, []);

  useEffect(() => {
    const fetchUserSkills = async () => {
      /* TODO - send authorization header
        authorization: window.localStorage.getItem('token')
      */
      const response = await fetch(`/api/users/${auth.id}/userSkills`, {
        headers: {
          authorization: window.localStorage.getItem("token"),
        },
      });
      const json = await response.json();
      if (response.ok) {
        setUserSkills(json);
      } else {
        console.log(json);
      }
    };
    if (auth.id) {
      fetchUserSkills();
    } else {
      setUserSkills([]);
    }
  }, [auth]);

  const attemptLoginWithToken = async () => {
    const token = window.localStorage.getItem("token");
    const response = await fetch("/api/auth/me", {
      headers: {
        authorization: token,
      },
    });
    const json = await response.json();
    if (response.ok) {
      setAuth(json);
    } else {
      window.localStorage.removeItem("token");
    }
  };

  const login = async (credentials) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const json = await response.json();
    if (response.ok) {
      window.localStorage.setItem("token", json.token);
      attemptLoginWithToken();
    }
  };

  const addUserSkill = async (skill_id) => {
    const response = await fetch(`/api/users/${auth.id}/userSkills`, {
      method: "POST",
      body: JSON.stringify({ skill_id }),
      headers: {
        "Content-Type": "application/json",
        authorization: window.localStorage.getItem('token')
      },
    });
    const json = await response.json();
    if (response.ok) {
      setUserSkills([...userSkills, json]);
    } else {
      console.log(json);
    }
  };

  const removeUserSkill = async (id) => {
    const response = await fetch(`/api/users/${auth.id}/userSkills/${id}`, {
      method: "DELETE",
      headers: {
        authorization: window.localStorage.getItem("token"),
      },
    });
    setUserSkills(userSkills.filter((userSkill) => userSkill.id !== id));
  };

  const logout = () => {
    window.localStorage.removeItem("token");
    setAuth({});
  };

  return (
    <>
      {auth.id ? (
        <button onClick={logout}>Logout {auth.username}</button>
      ) : (
        <Login login={login} />
      )}
      <ul>
        {skills.map((skill) => {
          const userSkill = userSkills.find(
            (userSkill) => userSkill.skill_id === skill.id
          );
          return (
            <li key={skill.id}>
              {skill.name}
              {auth.id && userSkill && (
                <button onClick={() => removeUserSkill(userSkill.id)}>
                  <span style={{ color: "red" }}>Remove</span> User Skill
                </button>
              )}
              {auth.id && !userSkill && (
                <button onClick={() => addUserSkill(skill.id)}>
                  <span style={{ color: "green" }}>Add</span> User Skill
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default App;
