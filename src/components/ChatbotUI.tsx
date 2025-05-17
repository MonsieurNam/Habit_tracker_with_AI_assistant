import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Button, Paper, Typography, CircularProgress, IconButton } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { addHabit, type Habit as HabitType } from '../store/habit-slice';
import { getStreak, isHabitCompletedThisPeriod } from '../utils/habitUtils';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat'; // For the toggle button
import CloseIcon from '@mui/icons-material/Close';
//mistral-7b-instruct-v0.2-q4_k_m.gguf

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    actions?: {
        label: string;
        type: 'ADD_HABIT';
        payload: { name: string; frequency: 'daily' | 'weekly' };
    }[];
}

const ChatbotUI: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false); // State để mở/đóng chatbot
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { habits } = useSelector((state: RootState) => state.habits);
    const dispatch = useDispatch<AppDispatch>();
    const messagesEndRef = useRef<null | HTMLDivElement>(null); // Để scroll xuống tin nhắn mới nhất

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const constructHabitContext = () => {
        const today = new Date().toISOString().split("T")[0];

        const habitDetails = habits.map(habit => {
            const streak = getStreak(habit); // Sử dụng hàm getStreak từ utils
            const completedThisPeriod = isHabitCompletedThisPeriod(habit, today); // Sử dụng hàm mới từ utils

            return `- Name: "${habit.name}", Frequency: ${habit.frequency}, Current Streak: ${streak} day${streak !== 1 ? 's' : ''}, Completed this period: ${completedThisPeriod ? 'Yes' : 'No'}`;
        }).join('\n');

        const longestStreakOverall = habits.length > 0
            ? Math.max(0, ...habits.map(h => getStreak(h)))
            : 0;

        const dailyHabits = habits.filter(h => h.frequency === 'daily');
        const completedDailyTodayCount = dailyHabits.filter(h => h.completeDates.includes(today)).length;

        return `
User's current habits:
${habitDetails.length > 0 ? habitDetails : "No habits set yet."}

Overall Stats:
Total habits: ${habits.length}.
Daily habits completed today: ${completedDailyTodayCount} out of ${dailyHabits.length} daily habits.
Longest streak across all habits: ${longestStreakOverall} day${longestStreakOverall !== 1 ? 's' : ''}.
Today's date is: ${today}.
        `;
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMessage: Message = { id: 'user-' + Date.now().toString(), sender: 'user', text: inputValue };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        const habitContext = constructHabitContext();
        // Lịch sử chat đơn giản: lấy 5 cặp tin nhắn cuối (user+bot)
        const conversationHistory = messages.slice(-10).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');

        const systemPrompt = `You are "HabitHelper", a friendly and encouraging Habit Coach AI. Your goal is to help the user understand their habits, stay motivated, and discover new beneficial habits. You have access to the user's current habit list, their streaks, and completion data. Use this data to provide personalized advice. Keep your responses concise, empathetic, and actionable.

When you identify a good opportunity to suggest a new habit that the user might find beneficial and is likely to accept, you can directly ask for confirmation to add it. To do this, end your suggestion message (and only that message) with the special tag:
ACTION_SUGGESTION:ADD_HABIT:NAME=[THE_HABIT_NAME]:FREQ=[daily/weekly]

Example: "Considering your goal to reduce stress, 'Meditate 5 mins' daily could be very helpful. I can add this for you. Would you like to proceed? ACTION_SUGGESTION:ADD_HABIT:NAME=[Meditate 5 mins]:FREQ=[daily]"

IMPORTANT:
- Only use the ACTION_SUGGESTION tag when making a direct, confirmable offer to add a habit.
- Ensure [THE_HABIT_NAME] is a concise name for the habit.
- Ensure [daily/weekly] is one of those two exact lowercase values.
- Do not use the tag for general advice or questions that don't involve adding a habit.
- For weekly habits, 'Completed this period: Yes' means it was marked complete on at least one day within the current week. The user aims to do it once per week.

Current user habit data:
${habitContext}
---
Conversation history (if any):
${conversationHistory}
---
User: ${userMessage.text}
Assistant:`; // LLM sẽ tiếp tục từ đây

        try {
            // Đảm bảo Llama.cpp server đang chạy, ví dụ: build/bin/server -m models/your-model.gguf -c 2048 --port 8080
            const response = await fetch('http://localhost:8080/completion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: systemPrompt, // System prompt đã bao gồm cả user message và context
                    n_predict: 256,       // Số token tối đa LLM sẽ sinh ra
                    temperature: 0.7,
                    stop: ["User:", "\nUser:", "ACTION_SUGGESTION:"], // Dừng khi gặp các token này
                    // Thêm các tham số khác của Llama.cpp nếu cần
                }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Llama.cpp server error: ${response.status} ${errorData}`);
            }

            const data = await response.json();
            let botText = data.content ? data.content.trim() : "I'm not sure how to respond to that.";

            // Regex để tìm action suggestion (phải khớp với định dạng trong system prompt)
            const actionRegex = /ACTION_SUGGESTION:ADD_HABIT:NAME=\[(.+?)\]:FREQ=\[(daily|weekly)\]/i;
            const match = botText.match(actionRegex);
            let botActions: Message['actions'] = undefined;

            if (match && match[1] && match[2]) {
                // Loại bỏ phần tag ACTION_SUGGESTION khỏi text hiển thị cho người dùng
                botText = botText.replace(actionRegex, "").trim();
                botActions = [{
                    label: `Yes, add "${match[1]}"`, // Label cho nút
                    type: 'ADD_HABIT',
                    payload: { name: match[1], frequency: match[2].toLowerCase() as 'daily' | 'weekly' }
                }];
            }
            // Nếu botText vẫn chứa phần còn lại của stop token (ví dụ "ACTION_SUGGESTION:"), loại bỏ nó
            if (botText.endsWith("ACTION_SUGGESTION:")) {
                 botText = botText.substring(0, botText.lastIndexOf("ACTION_SUGGESTION:")).trim();
            }


            const botMessage: Message = {
                id: 'bot-' + Date.now().toString(),
                sender: 'bot',
                text: botText,
                actions: botActions
            };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("Error fetching from Llama.cpp:", error);
            const errorMessage: Message = {
                id: 'err-' + Date.now().toString(),
                sender: 'bot',
                text: "Sorry, I encountered an issue. Please make sure the AI assistant server is running correctly and try again."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleActionClick = (action: NonNullable<Message['actions']>[0], messageId: string) => {
        if (action.type === 'ADD_HABIT') {
            dispatch(addHabit({
                name: action.payload.name,
                frequency: action.payload.frequency
            }));
            // Phản hồi cho người dùng là đã thêm
            const confirmationMessage: Message = {
                id: 'bot-confirm-' + Date.now().toString(),
                sender: 'bot',
                text: `Okay, I've added the habit "${action.payload.name}" (${action.payload.frequency}) for you!`
            };
            setMessages(prev => [...prev, confirmationMessage]);

            // Xóa action khỏi tin nhắn gốc để không click lại được (hoặc disable nút)
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, actions: undefined } : msg
            ));
        }
    };

    if (!isOpen) {
        return (
            <IconButton
                onClick={() => setIsOpen(true)}
                sx={{
                    position: 'fixed',
                    bottom: 20,
                    right: 20,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': { backgroundColor: 'primary.dark' },
                    zIndex: 1000, // Đảm bảo nút nổi trên các thành phần khác
                    width: 56,
                    height: 56,
                }}
            >
                <ChatIcon />
            </IconButton>
        );
    }

    return (
        <Paper
            elevation={5}
            sx={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                width: { xs: 'calc(100% - 40px)', sm: 350 }, // Responsive width
                height: { xs: '70vh', sm: 500 },
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1000, // Đảm bảo chatbot nổi trên các thành phần khác
                borderRadius: '12px', // Bo tròn góc đẹp hơn
                overflow: 'hidden' // Để bo tròn có hiệu lực với nội dung bên trong
            }}
        >
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                backgroundColor: 'primary.main',
                color: 'white'
            }}>
                <Typography variant="h6" sx={{ml:1}}>Habit Helper</Typography>
                <IconButton onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, backgroundColor: 'background.paper' }}>
                {messages.map((msg) => (
                    <Box
                        key={msg.id}
                        sx={{
                            mb: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        }}
                    >
                        <Typography
                            variant="body2"
                            component="div" // Sử dụng div để có thể chứa các element khác nếu cần
                            sx={{
                                display: 'inline-block',
                                p: '8px 12px',
                                borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                bgcolor: msg.sender === 'user' ? 'primary.light' : 'grey.200',
                                color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                                maxWidth: '80%',
                                wordWrap: 'break-word',
                            }}
                        >
                            {msg.text}
                        </Typography>
                        {msg.actions && (
                            <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                {msg.actions.map(action => (
                                    <Button
                                        key={action.label}
                                        size="small"
                                        variant="contained"
                                        color="secondary" // Màu khác cho nút action
                                        onClick={() => handleActionClick(action, msg.id)}
                                        sx={{ mt: 0.5, textTransform: 'none' }}
                                    >
                                        {action.label}
                                    </Button>
                                ))}
                            </Box>
                        )}
                    </Box>
                ))}
                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}
                <div ref={messagesEndRef} /> {/* Để scroll tới cuối */}
            </Box>

            <Box sx={{ p: 1, borderTop: '1px solid #ddd', backgroundColor: 'background.default' }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter' && !isLoading) { handleSendMessage(); e.preventDefault(); }}}
                    placeholder="Ask Habit Helper..."
                    disabled={isLoading}
                    InputProps={{
                        endAdornment: (
                            <IconButton onClick={handleSendMessage} disabled={isLoading} edge="end">
                                <SendIcon />
                            </IconButton>
                        )
                    }}
                />
            </Box>
        </Paper>
    );
};

export default ChatbotUI;