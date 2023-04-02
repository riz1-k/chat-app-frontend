/* eslint-disable react/no-array-index-key */
/* eslint-disable react-hooks/exhaustive-deps */
import type { NextPage } from 'next';
import { useState, useEffect, type FC } from 'react';
import { toast } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

type TypeMessage = {
    message: string;
    sender: string;
    date: Date;
};

const randomNameGen = () => {
    const names = ['John', 'Jane', 'Bob', 'Alice', 'Jack', 'Jill', 'Joe', 'Mary', 'Tom', 'Jerry'];
    return names[Math.floor(Math.random() * names.length)];
};

const ChatForm: FC<{ myName: string; socket: Socket | undefined }> = ({ myName, socket }) => {
    const [newMessage, setNewMessage] = useState<string>('');

    const sendMessage = () => {
        if (!socket) return toast.error('Socket not connected');
        socket.emit('send_message', {
            message: newMessage,
            sender: myName,
            date: new Date(),
        });
        setNewMessage('');
    };

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (!socket) return;

        if (newMessage.length > 0) {
            socket.emit('typing', {
                sender: myName,
                typing: true,
            });
            timer = setTimeout(() => {
                socket.emit('typing', {
                    sender: myName,
                    typing: false,
                });
            }, 3000);
            return;
        }
        if (timer !== null) clearTimeout(timer);
        socket.emit('typing', {
            sender: myName,
            typing: false,
        });

        return () => {
            if (timer !== null) clearTimeout(timer);
        };
    }, [newMessage]);

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
            }}
            className="form-control "
        >
            <div className="input-group m-2 ">
                <input
                    type="text"
                    placeholder={`Message as ${myName}...`}
                    className="input w-[85%] input-bordered"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    autoComplete="off"
                    name="message"
                />
                <button type="submit" className="btn btn-primary w-20">
                    Send
                </button>
            </div>
        </form>
    );
};

const Home: NextPage = () => {
    const [allMessages, setAllMessages] = useState<TypeMessage[]>([]);
    const [allTypers, setAllTypers] = useState<
        {
            sender: string;
            typing: boolean;
        }[]
    >([]);
    const [myName, setMyName] = useState<string>('');
    const [socket, setSocket] = useState<Socket>();

    const connectSocket = () => {
        const newSocket = io('http://localhost:4000');
        setSocket(newSocket);
        setMyName(randomNameGen());
    };

    useEffect(() => connectSocket(), []);

    useEffect(() => {
        if (socket) {
            socket.on('connect', () => {
                socket.on('receive_message', (message: TypeMessage) => {
                    setAllMessages((prev) => [...prev, message]);
                });
                socket.on('typing', (typer: { sender: string; typing: boolean }) => {
                    setAllTypers((prev) => {
                        const temp = [...prev];
                        const index = temp.findIndex((t) => t.sender === typer.sender);
                        if (index === -1) {
                            temp.push(typer);
                        } else {
                            temp[index] = typer;
                        }
                        return temp;
                    });
                });
            });
        }
    }, [socket]);

    return (
        <div className="flex flex-col justify-between items-center space-y-4 m-5">
            <h1 className="font-bold text-2xl">Your Temporary Name is: {myName}</h1>
            <section className="h-[80vh] w-[60vw] flex flex-col-reverse bg-gray-900 ">
                <ChatForm myName={myName} socket={socket} />
                <div className="flex flex-col overflow-y-auto ">
                    {allMessages.map((message, index) => (
                        <div
                            key={index}
                            className={
                                myName === message.sender ? 'chat chat-end' : 'chat chat-start'
                            }
                        >
                            <div
                                className={
                                    myName === message.sender
                                        ? 'chat-bubble font-medium  chat-bubble-primary'
                                        : 'chat-bubble font-medium  chat-bubble-secondary'
                                }
                            >
                                {message.message}
                            </div>
                            <div className="chat-header">
                                <span>{myName !== message.sender && message.sender}</span>
                                <time className="text-xs opacity-50 ml-2">
                                    {new Intl.DateTimeFormat('en-US', {
                                        hour: 'numeric',
                                        minute: 'numeric',
                                    }).format(new Date(message.date))}
                                </time>
                            </div>
                        </div>
                    ))}
                    {allTypers.map(
                        (typer, index) =>
                            typer.typing && (
                                <div key={index} className="chat chat-start">
                                    <div className="chat-header">
                                        {typer.sender}
                                        <time className="text-xs opacity-50 ml-2">Typing...</time>
                                    </div>
                                </div>
                            )
                    )}
                </div>
            </section>
        </div>
    );
};

export default Home;
