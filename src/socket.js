import { io } from "socket.io-client";

const SOCKET_URL = "http://3.110.252.174:8080"; // Replace with your backend URL

const socket = io(SOCKET_URL, {
  withCredentials: true,
});

export default socket;
