import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// 🔐 SUPABASE KONFIGURACIJA
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 📅 Danes v Ljubljani
const today = dayjs().tz("Europe/Ljubljana").format("YYYY-MM-DD");

// PIN
const REQUIRED_PIN = "110925";

export default function App() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [answer, setAnswer] = useState(null);
  const [intervals, setIntervals] = useState([{ start: "", end: "" }]);
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, []);

  async function fetchResponses() {
    if (supabaseUrl && supabaseAnonKey) {
      const { data, error } = await supabase.from("responses").select("*").eq("day", today);
      if (!error && data) setResponses(data);
    }
  }

  function addInterval() {
    if (intervals.length < 5) setIntervals([...intervals, { start: "", end: "" }]);
  }

  async function handleSubmit() {
    if (!name || !pin) return setError("Vnesi ime in PIN.");
    if (pin !== REQUIRED_PIN) return setError("Napačen PIN!");
    setIsAuthorized(true);

    const filteredIntervals = intervals.filter(i => i.start && i.end);
    const newResponse = {
      day: today,
      name,
      answer,
      intervals: filteredIntervals,
      inserted_at: new Date().toISOString(),
    };

    // Takoj dodamo v local state, da se prikaže v pregledu
    setResponses(prev => [...prev, newResponse]);

    // Poizkusimo shraniti v Supabase, če je konfiguriran
    if (supabaseUrl && supabaseAnonKey) {
      const { error } = await supabase
        .from("responses")
        .upsert(newResponse, { onConflict: ["day", "name"] });
      if (error) console.error(error);
    }

    // Reset form
    setAnswer(null);
    setIntervals([{ start: "", end: "" }]);
    setName("");
    setPin("");
    setError("");
  }

  return (
    <div className="p-6 max-w-3xl mx-auto font-sans text-gray-800">
      <h1 className="text-3xl font-bold mb-4 text-center">🍽️ Kosilo</h1>

      {!isAuthorized ? (
        <div className="bg-gray-100 p-4 rounded-lg shadow">
          <input
            className="border p-2 mr-2 rounded w-full mb-2"
            placeholder="Tvoje ime"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border p-2 mr-2 rounded w-full mb-2"
            placeholder="PIN"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button
            onClick={() => {
              if (pin === REQUIRED_PIN) setIsAuthorized(true);
              else setError("Napačen PIN!");
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Potrdi PIN
          </button>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mt-4 mb-2">Ali imaš danes čas za super kosilo?</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setAnswer("yes")}
              className={`px-4 py-2 rounded ${answer === "yes" ? "bg-green-500 text-white" : "bg-gray-200"}`}
            >
              DA :)
            </button>
            <button
              onClick={() => setAnswer("no")}
              className={`px-4 py-2 rounded ${answer === "no" ? "bg-red-500 text-white" : "bg-gray-200"}`}
            >
              NE :(
            </button>
          </div>

          {answer === "yes" && (
            <div>
              <h3 className="font-medium mb-2">Vnesi časovne intervale (max 5):</h3>
              {intervals.map((interval, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="time"
                    className="border p-2 rounded"
                    value={interval.start}
                    onChange={(e) => {
                      const newIntervals = [...intervals];
                      newIntervals[idx].start = e.target.value;
                      setIntervals(newIntervals);
                    }}
                  />
                  <input
                    type="time"
                    className="border p-2 rounded"
                    value={interval.end}
                    onChange={(e) => {
                      const newIntervals = [...intervals];
                      newIntervals[idx].end = e.target.value;
                      setIntervals(newIntervals);
                    }}
                  />
                </div>
              ))}
              {intervals.length < 5 && (
                <button onClick={addInterval} className="bg-gray-200 px-3 py-1 rounded">
                  Dodaj interval
                </button>
              )}
            </div>
          )}

          <button onClick={handleSubmit} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
            Shrani odgovor
          </button>

          <h2 className="text-2xl font-semibold mt-8 mb-4">📋 Pregled odgovorov</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-3 rounded">
              <h3 className="font-bold text-green-700 mb-2">DA :)</h3>
              {responses
                .filter((r) => r.answer === "yes")
                .map((r, idx) => (
                  <div key={idx} className="mb-2">
                    <strong>{r.name}</strong>
                    {r.intervals?.length > 0 && (
                      <ul className="text-sm">
                        {r.intervals.map((i, j) => (
                          <li key={j}>
                            {i.start} - {i.end}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
            </div>

            <div className="bg-red-50 p-3 rounded">
              <h3 className="font-bold text-red-700 mb-2">NE :(</h3>
              {responses
                .filter((r) => r.answer === "no")
                .map((r, idx) => (
                  <div key={idx} className="mb-1">
                    <strong>{r.name}</strong>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
