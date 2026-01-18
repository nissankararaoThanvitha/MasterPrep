import { useEffect, useState } from "react";

export default function StreakCalendar({
  email,
  onDateHover,
  onDateClick,
  refresh,
}) {
  const [days, setDays] = useState([]);
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  useEffect(() => {
    if (!email) return;

    const solvedKey = `dailySolvedList_${email}`;
    const solved =
      JSON.parse(localStorage.getItem(solvedKey)) || [];

    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();

    const today = new Date();
    const todayStr = today.toDateString();

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const temp = [];

    for (let i = 0; i < firstDay; i++) temp.push(null);

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dateString = dateObj.toDateString();

      temp.push({
        day: d,
        dateString,
        solved: solved.includes(dateString),
        today: dateString === todayStr,
        future: dateObj > today,
      });
    }

    setDays(temp);
  }, [email, visibleMonth, refresh]);

  const monthName = visibleMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const isFutureMonth = () => {
    const today = new Date();
    return (
      visibleMonth.getFullYear() > today.getFullYear() ||
      (visibleMonth.getFullYear() === today.getFullYear() &&
        visibleMonth.getMonth() > today.getMonth())
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-md">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            setVisibleMonth(
              new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth() - 1,
                1
              )
            )
          }
          className="w-8 h-8 flex items-center justify-center rounded-full
                     bg-gray-100 hover:bg-gray-200 transition"
        >
          ◀
        </button>

        <h4 className="font-semibold text-gray-800">
          {monthName}
        </h4>

        <button
          disabled={isFutureMonth()}
          onClick={() =>
            setVisibleMonth(
              new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth() + 1,
                1
              )
            )
          }
          className={`w-8 h-8 flex items-center justify-center rounded-full
            transition ${
              isFutureMonth()
                ? "bg-gray-100 opacity-40 cursor-not-allowed"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
        >
          ▶
        </button>
      </div>

      {/* WEEK DAYS */}
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map(
          (d, i) => (
            <div key={i}>{d}</div>
          )
        )}
      </div>

      {/* DAYS */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) =>
          !d ? (
            <div key={i}></div>
          ) : (
            <div
              key={i}
              onMouseEnter={() =>
                !d.future &&
                onDateHover?.(d.dateString)
              }
              onMouseLeave={() =>
                onDateHover?.(null)
              }
              onClick={() =>
                !d.future &&
                onDateClick?.(d.dateString)
              }
              className={`
                w-9 h-9 mx-auto
                flex items-center justify-center
                rounded-full text-sm font-medium
                transition
                ${
                  d.solved
                    ? "bg-green-500 text-white shadow"
                    : "bg-gray-50 text-gray-800 hover:bg-indigo-50"
                }
                ${
                  d.today
                    ? "ring-2 ring-green-400"
                    : ""
                }
                ${
                  d.future
                    ? "opacity-30 cursor-not-allowed"
                    : "cursor-pointer"
                }
              `}
            >
              {d.day}
            </div>
          )
        )}
      </div>
    </div>
  );
}
