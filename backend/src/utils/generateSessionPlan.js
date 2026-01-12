const generateSessionPlan = ({ frequency, totalSessions, startDate }) => {
  const sessions = [];
  const start = new Date(startDate);

  for (let i = 0; i < totalSessions; i++) {
    let sessionDate = new Date(start.getTime());

    if (frequency === "weekly") {
      sessionDate.setDate(start.getDate() + i * 7);
    } else if (frequency === "monthly") {
      sessionDate.setMonth(start.getMonth() + i);
    } else if (frequency === "minute") {
      sessionDate.setMinutes(start.getMinutes() + i);
    }

    sessions.push({
      weekNumber: i + 1,
      sessionDate,
      isActive: i === 0,
      isCompleted: false,
    });
  }

  return sessions;
};

export { generateSessionPlan };
