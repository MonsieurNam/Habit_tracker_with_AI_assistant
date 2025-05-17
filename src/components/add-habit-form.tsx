import { Box, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import React, { useState } from 'react';
import type { AppDispatch } from '../store/store';
import { useDispatch } from 'react-redux';
import { addHabit } from '../store/habit-slice';

const AddHabitForm:React.FC  = () => {
    const [name, setName] = useState<string>("");
    const [frequency, setFrequency] = useState<"daily"|"weekly">("daily");
    const dispatch = useDispatch<AppDispatch>();
    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (name.trim()) {
            dispatch(
                addHabit({
                    name,
                    frequency
                })
            );
            setName("");
            setFrequency("daily");
        }
    }
    return (<form onSubmit={handleSubmit}>
        <Box
            sx={{
                display:"flex",
                flexDirection:"column",
                gap: 2,
            }}
        >
            <TextField
                label="Habit Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Enter habit name'
                fullWidth
            />
            <FormControl>
            <InputLabel>Frequency</InputLabel>
            <Select
                value={frequency}
                onChange={(e)=> setFrequency(e.target.value as "daily" | "weekly")}
            >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
            </Select>
            </FormControl>
            <button
                type='submit'
                style={{
                    backgroundColor: "#1976d2",
                    color: "white",
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer"
                }}
            >
                Add Habit
            </button>
        </Box>
    </form>
    );
}

export default AddHabitForm;    

