import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface Habit{
    id: string;
    name: string;
    frequency: "daily"|"weekly";
    completeDates: string[];
    createsAt: string;
}

interface Habitstage{
    habits: Habit[];
    isLoading: boolean;
    error: string | null;
}

const initialState: Habitstage = {
    habits: [],
    isLoading: false,
    error: null,
};

export const fetchHabits = createAsyncThunk("habit/fetchHabits", async () => {
    //simulate an API call
    const mockHabits: Habit[] = [
        {
            id: "1",
            name: "Exercise",
            frequency: "daily",
            completeDates: [],
            createsAt: new Date().toISOString(),
        },
        {
            id: "2",
            name: "Read a book",
            frequency: "weekly",
            completeDates: [],
            createsAt: new Date().toISOString(),
        },
    ];
    return mockHabits;
})

const habitSlice = createSlice({
    name: "habits",
    initialState,
    reducers: {
        addHabit: (
            state,
            actions: PayloadAction<{
                name: string;
                frequency: "daily" | "weekly";
            }>) => {
                const newHabit: Habit = {
                id: Date.now().toString(),
                name: actions.payload.name,
                frequency: actions.payload.frequency,
                completeDates: [],
                createsAt: new Date().toISOString(),
                };
                state.habits.push(newHabit);
                },

        toggleHabit: (
            state,
            actions: PayloadAction<{
                id: string;
                date: string;
            }>) => {
                const habit = state.habits.find(h => h.id === actions.payload.id);
                if (habit) {
                    const index = habit.completeDates.indexOf(actions.payload.date);
                    if (index >= 0) {
                        habit.completeDates.splice(index, 1);
                    } else {
                        habit.completeDates.push(actions.payload.date);
                    }
                }
                },

        removeHabit: (
            state,
            action: PayloadAction<{id:string}>) => {
                state.habits = state.habits.filter(h => h.id !== action.payload.id);
            }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchHabits.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchHabits.fulfilled, (state, action) => {
                state.isLoading = false;
                state.habits = action.payload;
            })
            .addCase(fetchHabits.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || "Failed to fetch habits";
            });
    },
});

export const { addHabit, toggleHabit, removeHabit } = habitSlice.actions;
export default habitSlice.reducer;