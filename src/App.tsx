import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Task {
  id: string;
  name: string;
  minutes: number;
}

export default function App() {
  const [task, setTask] = useState("");
  const [minutes, setMinutes] = useState<number>(0);
  const [tasks, setTasks] = useState<Task[]>([]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const q = query(
      collection(db, "tasks"),
      where("createdAt", ">=", Timestamp.fromDate(today))
    );

    return onSnapshot(q, (snapshot) => {
      const data: Task[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        data.push({
          id: doc.id,
          name: d.name,
          minutes: d.minutes,
        });
      });
      console.log("📦 Firebase data received:", data);
      setTasks(data);
    });
  }, []);

  const handleAdd = async () => {
    if (!task || minutes <= 0) return;
    const ref = await addDoc(collection(db, "tasks"), {
      name: task,
      minutes,
      createdAt: Timestamp.now(),
    });
    console.log("✅ Task added with ID:", ref.id);
    setTask("");
    setMinutes(0);
  };

  const chartData = {
    labels: tasks.map((t) => t.name),
    datasets: [
      {
        data: tasks.map((t) => t.minutes),
        backgroundColor: [
          "#f87171", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa"
        ],
      },
    ],
  };

  console.log("📊 Chart data:", chartData);

  return (
    <div className="container">
      <h1>🕒 Where Did My Time Go?</h1>
  
      <div className="input-group">
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Task"
          type="text"
        />
        <input
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          placeholder="Minutes"
          type="number"
        />
      </div>
  
      <button onClick={handleAdd}>Add</button>
  
      <div className="chart-container">
        <Pie data={chartData} />
      </div>
    </div>
  );  
}
