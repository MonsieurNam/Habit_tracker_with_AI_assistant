import { Box, Button, LinearProgress, Paper, Typography } from '@mui/material';
import React from 'react';
import type { AppDispatch, RootState } from '../store/store';
import { useDispatch, useSelector } from 'react-redux';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { removeHabit, toggleHabit, type Habit } from '../store/habit-slice';

const HabitList: React.FC = () => {
    const { habits = [] } = useSelector((state: RootState) => state.habits);
    const dispatch = useDispatch<AppDispatch>();
    const today = new Date().toISOString().split("T")[0];

    const getStreak = (habit: Habit) => {
        let streak = 0;
        const currentDate = new Date();
        while (true) {
            const dateString = currentDate.toISOString().split("T")[0];
            if (habit.completeDates.includes(dateString)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 4 }}>
            {habits.length === 0 ? (
                <Typography>No habits found.</Typography>
            ) : (
                habits.map((habit) => (
                    <Paper key={habit.id} elevation={2} sx={{ p: 2 }}>
                        <Box sx={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "flex-start",
                            mb: 2 
                        }}>
                            <Box>
                                <Typography variant="h6">{habit.name}</Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ textTransform: "capitalize" }}
                                >
                                    {habit.frequency}
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 1,
                                }}
                            >
                                <Button
                                    variant="outlined"
                                    color={habit.completeDates.includes(today) ? "success" : "primary"}
                                    startIcon={<CheckCircleIcon />}
                                    onClick={() => {dispatch(toggleHabit({ id: habit.id, date: today }))}}
                                >
                                    {habit.completeDates.includes(today) 
                                    ? "Complete" 
                                    : "Mark Complete"}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => dispatch(removeHabit({ id: habit.id }))}
                                >
                                    Remove
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ mt:2 }}>
                            <Typography variant='body2'>
                                Current Streak: {getStreak(habit)} days
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(getStreak(habit)/30)*100}
                                sx={{ mt:1 }}
                            />
                        </Box>
                    </Paper>
                ))
            )}
        </Box>
    );
};

export default HabitList;