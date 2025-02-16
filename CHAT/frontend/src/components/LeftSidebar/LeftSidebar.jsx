import React, { useContext, useState } from 'react';
import './LeftSidebar.css';
import assets from '../../assets/assets';
import { useNavigate } from 'react-router-dom';
import { arrayUnion, collection, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, doc } from 'firebase/firestore'; // Import Firestore methods
import { AppContext } from '../../context/AppContext';
import { db } from '../../config/firebase'; // Import the Firestore instance
import { toast } from 'react-toastify';

const LeftSidebar = () => {
    const navigate = useNavigate();
    const { userData, chatData, setChatUser, setMessagesId, messagesId } = useContext(AppContext);
    const [user, setUser] = useState(null);
    const [showSearch, setShowSearch] = useState(false);

    // Handles input search for users
    const inputHandler = async (e) => {
        try {
            const input = e.target.value;
            if (input) {
                setShowSearch(true);
                const userRef = collection(db, 'users');
                const q = query(userRef, where("username", "==", input.toLowerCase()));
                const querySnap = await getDocs(q);

                // Safeguard to check for undefined user data
                if (!querySnap.empty && querySnap.docs[0].data().id && userData?.id && querySnap.docs[0].data().id !== userData.id) {
                    let userExist = false;

                    chatData.forEach((chatUser) => {
                        if (chatUser.rId === querySnap.docs[0].data().id) {
                            userExist = true;
                        }
                    });

                    if (!userExist) {
                        setUser(querySnap.docs[0].data());
                    }
                } else {
                    setUser(null); // No user found
                }
            } else {
                setShowSearch(false);
            }
        } catch (error) {
            console.error("Error in inputHandler:", error);
        }
    };

    // Function to add a new chat with a user
    const addChat = async () => {
        // Added check for user object and id
        if (!user || !user.id) {
            toast.error('User not found.');
            return;
        }

        const messagesRef = collection(db, 'messages');
        const chatsRef = collection(db, 'chats');

        try {
            const newMessageRef = doc(messagesRef); // Create a new message doc

            // Create an empty message set for the new chat
            await setDoc(newMessageRef, {
                createAt: serverTimestamp(),
                messages: []
            });

            // Add chat data for the other user
            await updateDoc(doc(chatsRef, user.id), {
                chatsData: arrayUnion({
                    messageId: newMessageRef.id,
                    lastMessage: "",
                    rId: userData.id,
                    updatedAt: Date.now(),
                    messageseen: true
                })
            });

            // Add chat data for the current user
            await updateDoc(doc(chatsRef, userData.id), {
                chatsData: arrayUnion({
                    messageId: newMessageRef.id,
                    lastMessage: "",
                    rId: user.id,
                    updatedAt: Date.now(),
                    messageseen: true
                })
            });
        } catch (error) {
            toast.error(error.message);
            console.error("Error in addChat:", error);
        }
    };

    // Set the selected chat
    const setChat = async (item) => {
        try {
            if (!item?.messageId) return; // Added check to avoid undefined error
            setMessagesId(item.messageId);
            setChatUser(item);

            const userChatsRef = doc(db, 'chats', userData.id);
            const userChatsSnapshot = await getDoc(userChatsRef);
            const userChatsData = userChatsSnapshot.data();

            const chatIndex = userChatsData.chatsData.findIndex((c) => c.messageId === item.messageId);
            if (chatIndex !== -1) {
                userChatsData.chatsData[chatIndex].messageseen = true;

                // Update message seen status
                await updateDoc(userChatsRef, {
                    chatsData: userChatsData.chatsData
                });
            }
        } catch (error) {
            toast.error(error.message);
            console.error("Error in setChat:", error);
        }
    };

    return (
        <div className="ls">
            <div className="ls-top">
                <div className="ls-nav">
                    <img src={assets.logo} className="logo" alt="Logo" />
                    <div className="menu">
                        <img src={assets.menu_icon} alt="Menu" />
                        <div className="sub-menu">
                            <p onClick={() => navigate('/profile')}>Edit Profile</p>
                            <hr />
                            <p>Logout</p>
                        </div>
                    </div>
                </div>
                <div className="ls-search">
                    <img src={assets.search_icon} alt="Search" />
                    <input onChange={inputHandler} type="text" placeholder="Search here..." />
                </div>
            </div>
            <div className="ls-list">
                {showSearch && user ? (
                    <div onClick={addChat} className="friends add-user">
                        <img src={user.avatar} alt="User Avatar" />
                        <p>{user.name}</p>
                    </div>
                ) : (
                    // Render dummy data with proper structure to avoid errors
                    Array(12).fill({ messageId: "dummyMessageId", messageseen: false }).map((item, index) => (
                        <div
                            onClick={() => setChat(item)}
                            key={index}
                            className={`friends ${item.messageseen || item.messageId === messagesId ? "" : "border"}`}
                        >
                            <img src={assets.profile_img} alt="Profile" />
                            <div>
                                <p>Richard Sanford</p>
                                <span>Hello, How are you?</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LeftSidebar;
