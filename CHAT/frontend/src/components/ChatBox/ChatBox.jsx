import React, { useContext, useEffect, useState } from 'react';
import './ChatBox.css';
import assets from '../../assets/assets';
import { AppContext } from '../../context/AppContext';
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const ChatBox = () => {
    const { userData, messagesId, chatUser = {}, messages, setMessages } = useContext(AppContext);
    const [input, setInput] = useState("");

    useEffect(() => {
        console.log("ChatUser Data:", chatUser); // Debugging log

        if (!chatUser || !chatUser.userData) {
            console.warn("chatUser or chatUser.userData is missing");
        }
    }, [chatUser]);

    const sendMessage = async () => {
        try {
            if (!input.trim()) return;
            if (!messagesId) {
                toast.error("Chat not selected!");
                return;
            }

            await updateDoc(doc(db, 'messages', messagesId), {
                messages: arrayUnion({
                    sId: userData?.id,
                    text: input,
                    createdAt: new Date()
                })
            });

            const userIDs = [chatUser?.rId, userData?.id];

            for (const id of userIDs) {
                if (!id) continue;
                
                const userChatsRef = doc(db, 'chats', id);
                const userChatsSnapshot = await getDoc(userChatsRef);

                if (userChatsSnapshot.exists()) {
                    const userChatData = userChatsSnapshot.data();
                    const chatIndex = userChatData.chatsData.findIndex(c => c.messagesId === messagesId);

                    if (chatIndex !== -1) {
                        userChatData.chatsData[chatIndex].lastMessage = input.slice(0, 30);
                        userChatData.chatsData[chatIndex].updatedAt = Date.now();
                        if (userChatData.chatsData[chatIndex].rId === userData?.id) {
                            userChatData.chatsData[chatIndex].messageSeen = false;
                        }
                        await updateDoc(userChatsRef, { chatsData: userChatData.chatsData });
                    }
                }
            }

        } catch (error) {
            toast.error(error.message);
            console.error("Error sending message:", error);
        }
        setInput("");
    };

    const sendImage = async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;

            const fileUrl = await upload(file);
            if (!fileUrl || !messagesId) {
                toast.error("Failed to upload image or chat not selected");
                return;
            }

            await updateDoc(doc(db, 'messages', messagesId), {
                messages: arrayUnion({
                    sId: userData?.id,
                    image: fileUrl,
                    createdAt: new Date()
                })
            });

            const userIDs = [chatUser?.rId, userData?.id];

            for (const id of userIDs) {
                if (!id) continue;

                const userChatsRef = doc(db, 'chats', id);
                const userChatsSnapshot = await getDoc(userChatsRef);

                if (userChatsSnapshot.exists()) {
                    const userChatData = userChatsSnapshot.data();
                    const chatIndex = userChatData.chatsData.findIndex(c => c.messagesId === messagesId);

                    if (chatIndex !== -1) {
                        userChatData.chatsData[chatIndex].lastMessage = "Image";
                        userChatData.chatsData[chatIndex].updatedAt = Date.now();
                        if (userChatData.chatsData[chatIndex].rId === userData?.id) {
                            userChatData.chatsData[chatIndex].messageSeen = false;
                        }
                        await updateDoc(userChatsRef, { chatsData: userChatData.chatsData });
                    }
                }
            }

        } catch (error) {
            toast.error(error.message);
            console.error("Error sending image:", error);
        }
    };

    const convertTimestamp = (timestamp) => {
        if (!timestamp?.toDate) return "N/A";
        let date = timestamp.toDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        return hour > 12 ? `${hour - 12}:${minute} PM` : `${hour}:${minute} AM`;
    };

    useEffect(() => {
        if (messagesId) {
            const unSub = onSnapshot(doc(db, 'messages', messagesId), (res) => {
                setMessages(res.data()?.messages?.reverse() || []);
            });

            return () => unSub();
        }
    }, [messagesId]);

    return chatUser?.userData ? (
        <div className='chat-box'>
            <div className="chat-user">
                <img src={chatUser.userData.avatar || assets.default_avatar} alt="User Avatar" />
                <p>{chatUser.userData.name} <img className="dot" src={assets.green_dot} alt="Status" /></p>
                <img src={assets.help_icon} alt="Help Icon" />
            </div>

            <div className="chat-msg">
                {messages && messages.length > 0 ? messages.map((msg, index) => (
                    <div key={index} className={msg.sId === userData?.id ? "s-msg" : "r-msg"}>
                        {msg.image ? 
                            <img className='msg-img' src={msg.image} alt="Sent Image" /> 
                            : <p className="msg">{msg.text}</p>}
                        <div>
                            <img src={msg.sId === userData?.id ? userData?.avatar : chatUser.userData.avatar} alt="User Avatar" />
                            <p>{convertTimestamp(msg.createdAt)}</p>
                        </div>
                    </div>
                )) : <p>No messages yet.</p>}
            </div>

            <div className="chat-input">
                <input onChange={(e) => setInput(e.target.value)} value={input} type="text" placeholder='Send a message' />
                <input onChange={sendImage} type="file" id='image' accept='image/png, image/jpeg' hidden />
                <label htmlFor="image">
                    <img src={assets.gallery_icon} alt="Gallery Icon" />
                </label>
                <img onClick={sendMessage} src={assets.send_button} alt="Send Button" />
            </div>
        </div>
    ) : (
        <div className='chat-welcome'>
            <img src={assets.logo_icon} alt="Logo Icon" />
            <p>Chat anytime, anywhere</p>
        </div>
    );
};

export default ChatBox;
