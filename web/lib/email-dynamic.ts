/**
 * 🎭 DYNAMIC EMAIL CONTENT GENERATOR
 * 
 * Makes emails feel human with:
 * - Time-aware greetings
 * - Contextual messages based on day/time
 * - Personality variations
 * - Emotional intelligence
 */

// Get time-appropriate greeting
export function getGreeting(name: string): string {
    const hour = new Date().getHours();
    const firstName = name.split(' ')[0];
    
    if (hour < 12) {
        const morningGreetings = [
            `Good morning, ${firstName}! ☀️`,
            `Rise and shine, ${firstName}! 🌅`,
            `Morning, ${firstName}! Hope you slept well 😊`,
            `Hi ${firstName}! Ready to start the day? 💪`,
        ];
        return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
    } else if (hour < 17) {
        const afternoonGreetings = [
            `Good afternoon, ${firstName}! 🌤️`,
            `Hi ${firstName}! Hope your day is going well 😊`,
            `Hey ${firstName}! Quick update for you 📬`,
            `Hello ${firstName}! Just a heads up 👋`,
        ];
        return afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
    } else {
        const eveningGreetings = [
            `Good evening, ${firstName}! 🌙`,
            `Hi ${firstName}! Wrapping up the day? 🏠`,
            `Hey ${firstName}! Hope you had a great day ✨`,
        ];
        return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
    }
}

// Get day-aware context
export function getDayContext(): { isMonday: boolean; isFriday: boolean; isWeekend: boolean; dayMessage: string } {
    const day = new Date().getDay();
    const isMonday = day === 1;
    const isFriday = day === 5;
    const isWeekend = day === 0 || day === 6;
    
    let dayMessage = '';
    if (isMonday) {
        const mondayMessages = [
            "Hope you had a restful weekend! 🌟",
            "New week, fresh start! 💪",
            "Let's make this week count! 🚀",
        ];
        dayMessage = mondayMessages[Math.floor(Math.random() * mondayMessages.length)];
    } else if (isFriday) {
        const fridayMessages = [
            "Almost there! TGIF 🎉",
            "Finish strong, weekend awaits! 🏖️",
            "One more push before the weekend! 💪",
        ];
        dayMessage = fridayMessages[Math.floor(Math.random() * fridayMessages.length)];
    }
    
    return { isMonday, isFriday, isWeekend, dayMessage };
}

// Humanized check-in reminder messages
export function getCheckInReminderContent(name: string, reminderNumber: 1 | 2): { subject: string; intro: string; body: string; cta: string } {
    const firstName = name.split(' ')[0];
    const { isMonday, dayMessage } = getDayContext();
    
    if (reminderNumber === 1) {
        // Friendly first reminder
        const subjects = [
            `⏰ Hey ${firstName}, don't forget to check in!`,
            `☀️ Good morning! Quick check-in reminder`,
            `👋 Friendly reminder to mark your attendance`,
        ];
        const intros = [
            `${getGreeting(name)}`,
            `Hey ${firstName}! ${isMonday ? dayMessage : 'Hope you\'re doing well! 😊'}`,
        ];
        const bodies = [
            `Just a friendly nudge - I noticed you haven't checked in yet today. No worries if you're running a bit late!`,
            `Quick heads up! The system shows you haven't checked in yet. If you're already working, just pop into the portal when you get a chance.`,
            `Gentle reminder that attendance helps us keep everything running smoothly. Mind marking yourself present when you have a moment?`,
        ];
        const ctas = [
            "Check In Now",
            "Mark Attendance",
            "I'm Here! 👋",
        ];
        
        return {
            subject: subjects[Math.floor(Math.random() * subjects.length)],
            intro: intros[Math.floor(Math.random() * intros.length)],
            body: bodies[Math.floor(Math.random() * bodies.length)],
            cta: ctas[Math.floor(Math.random() * ctas.length)],
        };
    } else {
        // Urgent final reminder
        return {
            subject: `⚠️ ${firstName}, please check in - HR will be notified soon`,
            intro: `Hi ${firstName},`,
            body: `This is your final reminder. I haven't seen you check in today, and HR will be notified in a few minutes if I don't hear from you. If everything's okay and you're just busy, please take a quick moment to mark your attendance. If you're having any issues or need to take leave, just reply to this email!`,
            cta: "Check In Now - Urgent",
        };
    }
}

// Humanized check-out reminder messages
export function getCheckOutReminderContent(name: string, checkInTime: string, reminderNumber: 1 | 2): { subject: string; intro: string; body: string; cta: string } {
    const firstName = name.split(' ')[0];
    const { isFriday, dayMessage } = getDayContext();
    
    if (reminderNumber === 1) {
        const subjects = [
            `☕ ${firstName}, heading out soon?`,
            `🕓 End of day reminder - don't forget to check out!`,
            `📝 Quick reminder to log your hours`,
        ];
        const bodies = [
            `You checked in at ${checkInTime} - nice and early! 👏 Just a heads up that it's almost end of day. Whenever you're wrapping up, remember to check out so your hours are logged correctly.`,
            `I see you've been at it since ${checkInTime}! ${isFriday ? dayMessage : ''} When you're ready to call it a day, don't forget to check out.`,
        ];
        
        return {
            subject: subjects[Math.floor(Math.random() * subjects.length)],
            intro: `${getGreeting(name)}`,
            body: bodies[Math.floor(Math.random() * bodies.length)],
            cta: "Check Out",
        };
    } else {
        return {
            subject: `⚠️ ${firstName}, you're still checked in from ${checkInTime}`,
            intro: `Hey ${firstName}!`,
            body: `It's past normal working hours and you're still showing as checked in (since ${checkInTime}). If you're working late - you rock! 🌟 But if you forgot to check out, please do so now so your timesheet is accurate. Long day = make sure you get credit for it!`,
            cta: "Check Out Now",
        };
    }
}

// Humanized leave approval messages
export function getLeaveApprovalContent(name: string, leaveType: string, startDate: string, endDate: string, totalDays: number, approvedBy: string): { subject: string; intro: string; body: string } {
    const firstName = name.split(' ')[0];
    
    const isVacation = leaveType.toLowerCase().includes('annual') || leaveType.toLowerCase().includes('vacation');
    const isSick = leaveType.toLowerCase().includes('sick');
    
    let emoji = '✅';
    let message = '';
    
    if (isVacation) {
        emoji = '🎉';
        if (totalDays >= 5) {
            message = `Woohoo! Your ${totalDays}-day getaway is all set! 🏖️ You totally deserve this break. Have an amazing time and don't worry about a thing here - we've got it covered!`;
        } else {
            message = `Great news! Your time off is approved. Enjoy the break - you've earned it! 🌟`;
        }
    } else if (isSick) {
        emoji = '🤒';
        message = `Your sick leave has been approved. Please take all the time you need to recover. Your health comes first! 💚 We'll handle everything here - just focus on getting better.`;
    } else {
        message = `Your ${leaveType.toLowerCase()} request has been approved! Everything is sorted, and ${approvedBy} has given the green light. 👍`;
    }
    
    return {
        subject: `${emoji} Leave Approved - ${startDate} to ${endDate}`,
        intro: `Great news, ${firstName}! 🎊`,
        body: message,
    };
}

// Humanized leave rejection messages (empathetic)
export function getLeaveRejectionContent(name: string, leaveType: string, reason: string): { subject: string; intro: string; body: string } {
    const firstName = name.split(' ')[0];
    
    return {
        subject: `📋 Update on your ${leaveType} request`,
        intro: `Hi ${firstName},`,
        body: `I wanted to personally reach out about your leave request. Unfortunately, we weren't able to approve it this time. I know this isn't the news you were hoping for, and I'm sorry about that.

<strong>Here's why:</strong> ${reason}

Please know this isn't a reflection of you at all - sometimes timing and circumstances just don't align. If you'd like to discuss alternatives or submit for different dates, I'd be happy to help work something out. We value you and want to support your work-life balance as much as possible. 💙`,
    };
}

// Export all helper functions
export const DynamicEmail = {
    getGreeting,
    getDayContext,
    getCheckInReminderContent,
    getCheckOutReminderContent,
    getLeaveApprovalContent,
    getLeaveRejectionContent,
};
