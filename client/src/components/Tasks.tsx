import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string;
  completed: boolean;
}

export const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { token } = useAuth();

  const updateTask = (newTask: Task) => {
    setTasks([newTask, ...tasks]);
  };

  const updateCompleted = async (id: number) => {
    const res = await fetch(`http://localhost:5001/tasks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error(res.statusText);
    }

    const data = await res.json();
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          return { ...task, completed: data.completed };
        } else {
          return task;
        }
      })
    );
  };

  const deleteTask = async (id: number) => {
    const res = await fetch(`http://localhost:5001/tasks/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error(res.statusText);
    }

    const data = await res.json();
    console.log(data);

    const { deletedTask } = data;
    setTasks(tasks.filter((task) => task.id !== deletedTask.id));
  };

  useEffect(() => {
    const getTasks = async () => {
      try {
        const res = await fetch("http://localhost:5001/tasks", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.error(res.status);
        }

        const data = await res.json();
        setTasks(data);
      } catch (err) {
        console.error("Fetch error", err);
      }
    };

    getTasks();
  }, []);

  return (
    <>
      <AddTaskForm updateTask={updateTask} />
      {tasks ? (
        tasks.map((task) => (
          <div key={task.id}>
            <input
              type="checkbox"
              defaultChecked={task.completed}
              onChange={() => updateCompleted(task.id)}
            />
            {task.title}: {task.description}
            <button onClick={() => deleteTask(task.id)}>delete</button>
          </div>
        ))
      ) : (
        <p>no tasks ...</p>
      )}
    </>
  );
};

const AddTaskForm = ({
  updateTask,
}: {
  updateTask: (newTask: Task) => void;
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { token } = useAuth();

  // taskの追加
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5001/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description }),
      });

      if (!res.ok) {
        console.error(res.status);
      }

      const data = await res.json();
      updateTask(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={addTask}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button type="submit">add task</button>
    </form>
  );
};
