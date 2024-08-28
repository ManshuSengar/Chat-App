import React, { useState } from "react";
import Login from "./Login";
import Chat from "./Chat";

const App = () => {
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState("");

  return (
    <div>
      {!user ? (
        <Login setUser={setUser} setUserToken={setUserToken} />
      ) : (
        <Chat user={user} userToken={userToken} />
      )}
    </div>
  );
};

export default App;
