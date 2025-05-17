import type { Habit } from '../store/habit-slice'; 

export const getStreak = (habit: Habit, referenceDate: Date = new Date()): number => {
    let streak = 0;
    const todayForStreakCalc = new Date(referenceDate); 
    while (true) {
        const dateString = todayForStreakCalc.toISOString().split("T")[0];
        if (habit.completeDates.includes(dateString)) {
            streak++;
            todayForStreakCalc.setDate(todayForStreakCalc.getDate() - 1); 
        } else {
           
            break;
        }
    }
    return streak;
};


export const isHabitCompletedThisPeriod = (habit: Habit, today: string): boolean => {
    if (habit.frequency === 'daily') {
        return habit.completeDates.includes(today);
    }
    if (habit.frequency === 'weekly') {
        const todayDate = new Date(today);
        const currentDayOfWeek = todayDate.getDay(); 
        const firstDayOfWeek = new Date(todayDate);
        firstDayOfWeek.setDate(todayDate.getDate() - currentDayOfWeek);
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

        return habit.completeDates.some(dateString => {
            const completedDate = new Date(dateString);
            return completedDate >= firstDayOfWeek && completedDate <= lastDayOfWeek;
        });
    }
    return false; 
};