import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  Button,
  CircularProgress,
  Paper,
  IconButton,
  Badge,
} from "@mui/material";
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

const socket = io("http://localhost:8080"); // Adjust the URL as needed

const Chat = ({ user, userToken }) => {
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    console.log("user--> ", user);
    socket.emit("init_user", user.id);

    const handleNewMessage = (newMsg) => {
      if (selectedChat && newMsg.chat._id === selectedChat._id) {
        setMessages((prevMessages) => {
          if (!prevMessages.some((msg) => msg._id === newMsg._id)) {
            markMessagesAsRead(selectedChat._id);
            return [...prevMessages, newMsg];
          }
          return prevMessages;
        });
      }
      console.log("enter first time--> ", newMsg);
      updateChatWithNewMessage(newMsg);
    };

    const handleUnreadCount = ({ chatId, unreadCount }) => {
      updateUnreadCount(chatId, unreadCount);
    };

    const handleMessagesMarkedRead = ({ chatId, userId }) => {
      if (userId !== user.id) {
        updateMessageReadStatus(chatId);
      }
    };

    const handleUserOnline = (userId) => {
      console.log("eneter--> ", userId);
      setOnlineUsers((prev) => new Set(prev).add(userId));
    };

    const handleUserOffline = (userId) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    socket.on("new_msg_received", handleNewMessage);
    socket.on("update_unread_count", handleUnreadCount);
    socket.on("messages_marked_read", handleMessagesMarkedRead);
    socket.on("getUserOnline", handleUserOnline);
    socket.on("getUserOffline", handleUserOffline);

    return () => {
      socket.off("new_msg_received", handleNewMessage);
      socket.off("update_unread_count", handleUnreadCount);
      socket.off("messages_marked_read", handleMessagesMarkedRead);
      socket.on("getUserOnline", handleUserOnline);
      socket.on("getUserOffline", handleUserOffline);
    };
  }, [selectedChat, user.id]);

  useEffect(() => {
    fetchChats();
  }, [userToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // useEffect(() => {
  //   socket.on("getUserOnline", (userId) => {
  //     setChats((prevChats) =>
  //       prevChats.map((chat) =>
  //         chat.users.some((u) => u._id === userId)
  //           ? {
  //               ...chat,
  //               users: chat.users.map((user) =>
  //                 user._id === userId ? { ...user, online: true } : user
  //               ),
  //             }
  //           : chat
  //       )
  //     );
  //   });

  //   socket.on("getUserOffline", (userId) => {
  //     setChats((prevChats) =>
  //       prevChats.map((chat) =>
  //         chat.users.some((u) => u._id === userId)
  //           ? {
  //               ...chat,
  //               users: chat.users.map((user) =>
  //                 user._id === userId ? { ...user, online: false } : user
  //               ),
  //             }
  //           : chat
  //       )
  //     );
  //   });

  //   return () => {
  //     socket.off("user_online");
  //     socket.off("user_offline");
  //   };
  // }, []);

  const fetchChats = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/chat", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setChats(response.data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/message/${chatId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      setMessages(response.data);
      markMessagesAsRead(chatId);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markMessagesAsRead = async (chatId) => {
    try {
      await axios.post(
        `http://localhost:8080/api/message/read/${chatId}`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      socket.emit("mark_messages_read", { chatId, userId: user.id });
      updateUnreadCount(chatId, 0);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const updateUnreadCount = (chatId, count) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat._id === chatId
          ? {
              ...chat,
              unreadCounts: chat.unreadCounts.map((uc) =>
                uc.user === user.id ? { ...uc, count } : uc
              ),
            }
          : chat
      )
    );
  };

  const updateChatWithNewMessage = (newMsg) => {
    console.log("newMs--> ", newMsg);
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat?._id === newMsg?.chat?._id
          ? {
              ...chat,
              lastMessage: newMsg,
              unreadCounts: chat.unreadCounts.map((uc) =>
                uc.user === user.id ? { ...uc, count: uc.count + 1 } : uc
              ),
            }
          : chat
      )
    );
  };

  const updateMessageReadStatus = (chatId) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.chat === chatId && !msg.readBy.includes(user.id)
          ? { ...msg, readBy: [...msg.readBy, user.id] }
          : msg
      )
    );
  };
  const sendMessage = useCallback(async () => {
    if ((!newMessage.trim() && !file) || !selectedChat) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", newMessage);
      formData.append("chatId", selectedChat._id);
      if (file) {
        formData.append("file", file);
      }

      const response = await axios.post(
        "http://localhost:8080/api/message",
        formData,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const newMsg = response.data;
      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
      clearFileSelection();
      socket.emit("new_msg_sent", newMsg);
      updateChatWithNewMessage(newMsg);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  }, [newMessage, file, selectedChat, userToken]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      if (selectedFile?.type?.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target.result);
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(selectedFile.name);
      }
    } else {
      setFilePreview(null);
    }
  };

  const clearFileSelection = () => {
    setFile(null);
    setFilePreview(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const renderMessageContent = (message) => {
    if (message?.fileUrl) {
      if (message?.file_name?.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return (
          <img
            src={message.fileUrl}
            alt="Sent image"
            style={{ maxWidth: "200px", maxHeight: "200px" }}
          />
        );
      } else {
        return (
          <a href={message?.fileUrl} target="_blank" rel="noopener noreferrer">
            {message?.file_name}
          </a>
        );
      }
    }
    return message?.content;
  };

  return (
    <Box display="flex" height="100vh">
      <Paper elevation={3} sx={{ width: "30%", overflow: "auto" }}>
        <Typography variant="h6" p={2}>
          Chats
        </Typography>
        <List>
          {chats.map((chat) => {
            const otherUser = chat.users.find((u) => u?.id !== user?.id);
            const unreadCount =
              chat.unreadCounts.find((uc) => uc?.user === user?.id)?.count || 0;
            const isOnline = onlineUsers.has(otherUser?.id);
            return (
              <ListItem
                key={chat._id}
                button
                onClick={() => {
                  setSelectedChat(chat);
                  fetchMessages(chat?._id);
                }}
                selected={selectedChat && selectedChat?._id === chat?._id}
              >
                <ListItemAvatar>
                  <Badge
                    badgeContent={unreadCount}
                    color="primary"
                    overlap="circular"
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "right",
                    }}
                  >
                    <Avatar
                      src={otherUser?.basicInfo?.profilePic || ""}
                      sx={{
                        border: isOnline ? "2px solid green" : "none",
                      }}
                    />
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    otherUser?.basicInfo?.displayName || otherUser?.email
                  }
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="textSecondary"
                      >
                        {chat?.lastMessage?.content || "No messages yet"}
                      </Typography>
                      {isOnline && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="success.main"
                          sx={{ ml: 1 }}
                        >
                          • Online
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Paper>
      <Box flexGrow={1} display="flex" flexDirection="column" p={2}>
        {selectedChat ? (
          <>
            <Paper
              elevation={3}
              sx={{ flexGrow: 1, overflow: "auto", mb: 2, p: 2 }}
            >
              <List>
                {messages.map((msg) => (
                  <ListItem key={msg._id} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar src={msg?.sender?.basicInfo?.profilePic || ""} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={renderMessageContent(msg)}
                      secondary={
                        <>
                          {msg?.sender?.id === user?.id
                            ? "You"
                            : msg?.sender?.basicInfo?.displayName ||
                              msg?.sender?.email}
                          <br />
                          <Typography
                            component="span"
                            variant="caption"
                            color="textSecondary"
                          >
                            {new Date(msg.createdAt).toLocaleString()}
                          </Typography>
                          {msg?.sender?.id === user?.id && (
                            <Typography
                              component="span"
                              variant="caption"
                              color="primary"
                              sx={{ ml: 1 }}
                            >
                              {msg?.readBy?.some((id) => id !== user?.id)
                                ? "• Seen"
                                : "• Sent"}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
                <div ref={messagesEndRef} />
              </List>
            </Paper>
            <Box display="flex" flexDirection="column">
              {filePreview && (
                <Box mb={1} display="flex" alignItems="center">
                  {typeof filePreview === "string" ? (
                    <Typography>{filePreview}</Typography>
                  ) : (
                    <img
                      src={filePreview}
                      alt="Preview"
                      style={{ maxWidth: "100px", maxHeight: "100px" }}
                    />
                  )}
                  <IconButton onClick={clearFileSelection} size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>
              )}
              <Box display="flex">
                <TextField
                  variant="outlined"
                  fullWidth
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && !loading && sendMessage()
                  }
                  disabled={loading}
                />
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  id="file-input"
                  disabled={loading}
                />
                <label htmlFor="file-input">
                  <IconButton component="span" disabled={loading}>
                    <AttachFileIcon />
                  </IconButton>
                </label>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={sendMessage}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : <SendIcon />}
                </Button>
              </Box>
            </Box>
          </>
        ) : (
          <Typography variant="h6" align="center">
            Select a chat to start messaging
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Chat;
